'use strict';


var DegustaAPI = require('degusta-scrapper');
var degustaAPI = new DegustaAPI({
  url: 'https://www.degustapanama.com/',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
  }
});

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, cardOutput, cardImage, output, repromptText, shouldEndSession) {
  if (typeof cardOutput == 'undefined') {
    cardOutput = output;
  }

  return {
    outputSpeech: {
      type: 'PlainText',
      text: output,
    },
    card: {
      type: 'Standard',
      title: title,
      text: cardOutput,
      image: cardImage
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes,
    response: speechletResponse,
  };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
  // If we wanted to initialize the session to have some attributes we could add those here.
  const sessionAttributes = {};
  const cardTitle = 'Welcome to Degusta Panama';
  const speechOutput = `Welcome to Degusta Panama Skill,  I can suggest restaurants based on service, food or ambience`;
  // If the user either does not reply to the welcome message or says something that is not
  // understood, they will be prompted again with this text.
  const repromptText = 'what type or restaurant are you looking for? ' +
    'my favorite its italian.';
  const shouldEndSession = false;

  callback(sessionAttributes,
    buildSpeechletResponse(cardTitle, null, null, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
  const cardTitle = 'Session Ended';
  const speechOutput = 'Thank you for trying the Degusta Panama Skill. Have a nice day!';
  // Setting this to true ends the session and exits the skill.
  const shouldEndSession = true;

  callback({}, buildSpeechletResponse(cardTitle, null, null, speechOutput, null, shouldEndSession));
}

function createFavoriteColorAttributes(favoriteColor) {
  return {
    favoriteColor,
  };
}

/**
 * 
 */
function getTopRestaurants(intent, session, callback) {


  const category = intent.slots.category ? intent.slots.category.value : 'food';
  const price = intent.slots.price ? intent.slots.price.value : 'cheap';

  const cardTitle = 'Top Restaurants';

  let repromptText = '';
  let cardOutput = '';
  let sessionAttributes = {};
  const shouldEndSession = false;
  let speechOutput = '';


  degustaAPI.topRestaurants({
    price,
    category
  }, function(err, data) {
    var index = 0;
    var list = data.restaurants.map(function(restaurant) {
      index++;
      restaurant.name = restaurant.name.replace("&", "and");
      return `${index}) ${restaurant.name}`;
    });

    cardOutput = `the top 4, ${price} restaurants, based on ${category}, are :\n ${list.join('\n ')} \n` +
      `ask for a particular restaurant : \n
          "tell me about restaurant number 3" (to visit ${data.restaurants[2].name})\n
          "tell me about the third restaurant" (to visit ${data.restaurants[2].name})\n
          "tell me about the third one"  (to visit ${data.restaurants[2].name})`;
    speechOutput = `the top 4, ${price} restaurants, based on ${category}, are : ${list.join(', ')}`;
    repromptText = "you can ask: tell me about restaurant number 3 or show me the restaurant number 3.";

    sessionAttributes = data;
    callback(sessionAttributes,
      buildSpeechletResponse(cardTitle, cardOutput, null, speechOutput, repromptText, shouldEndSession));
  });
}

function gotoRestaurant(intent, session, callback) {
  let index;
  let cardTitle = "Restaurant Info";
  let cardOutput = "";
  let speechOutput = "";
  let repromptText = "";
  let cardImage = null;
  let shouldEndSession = false;
  let sessionAttributes = {};
  if (session.attributes && session.attributes.restaurants && session.attributes.restaurants.length > 0) {

    if (intent.slots.index && intent.slots.index.value) {
      index = intent.slots.index.value;
      if (index < 0 || index > 4) {
        speechOutput = `the restaurant number its invalid, please ask for a restaurant from 1 to ${session.attributes.restaurants.length }`;
        cardOutput = speechOutput;
        repromptText = "you can ask: tell me about restaurant number 3 or show me the restaurant number 3.";
      } else {
        let tmpRestaurant = session.attributes.restaurants[index];

        degustaAPI.goToRestaurant({
          url: tmpRestaurant.url
        }, function(err, restaurant) {
          cardTitle = `${restaurant.title} Restaurant`;
          if (err) {
            speechOutput = `sorry, but i could not get the restaurant info. try again later.`;
            cardOutput = speechOutput + '\n';
          } else {
            console.log(restaurant);

            restaurant.hours = restaurant.hours.toLowerCase().replace("hoy ", "");
            restaurant.hours = restaurant.hours.replace(" a ", " to ");
            speechOutput = `${restaurant.title} its located in ${restaurant.direction}. `;
            cardOutput = `Address : ${restaurant.direction} \n`;

            if (restaurant.hours == "cerrado") {
              speechOutput += `But it's closed today. `;
              cardOutput += `Hours : cloded today :( \n`;
            } else {
              speechOutput += `Today it's open from ${restaurant.hours}. `;
              cardOutput += `Hours : ${restaurant.hours} \n`;
            }
            speechOutput += `it have an average price of ${restaurant.ratings[4].value}. `;

            if (restaurant.phone) {
              cardOutput += `Phone : ${restaurant.phone} \n `;
            }

            let onlineBooking = "No";
            if (restaurant.hasOnlineBooking) {
              speechOutput += `And have online booking. `;
              onlineBooking = "Yes";
            }

            cardOutput += `Online Booking : ${onlineBooking} \n `;

            restaurant.ratings.forEach(function(rating) {
              cardOutput += `${rating.name} : ${rating.value} \n `;
            })



            cardImage = {
              "smallImageUrl": restaurant.image,
              "largeImageUrl": restaurant.image
            };
          }

          sessionAttributes = Object.assign({ lastRestaurant: restaurant }, session.attributes);
          callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, cardOutput, cardImage, speechOutput, repromptText, shouldEndSession));
        });
      }
    }
  } else {
    speechOutput = `i can't remember any restaurant from previous conversations`;
    cardOutput = 'ask: "get top pricy restaurants based on food" or "search italian restaurants"';
    repromptText = cardOutput;

    callback(session,
      buildSpeechletResponse(cardTitle, cardOutput, cardImage, speechOutput, repromptText, shouldEndSession));
  }


}
//
// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

  // Dispatch to your skill's launch.
  getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  // Dispatch to your skill's intent handlers
  if (intentName === 'GetTopRestaurants') {
    getTopRestaurants(intent, session, callback);
  } else if (intentName === 'GoToRestaurantNumber') {
    gotoRestaurant(intent, session, callback);
  } else if (intentName === 'AMAZON.HelpIntent') {
    getWelcomeResponse(callback);
  } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    handleSessionEndRequest(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false
    console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

    /**
     * Uncomment this if statement and populate with your skill's application ID to
     * prevent someone else from configuring a skill that sends requests to this function.
     */

    if (event.session.application.applicationId !== 'amzn1.ask.skill.089392ab-f41c-4c40-8fa2-80c78d305efa') {
      callback('Invalid Application ID');
    }


    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === 'LaunchRequest') {
      onLaunch(event.request,
        event.session,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request,
        event.session,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        });
    } else if (event.request.type === 'SessionEndedRequest') {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    callback(err);
  }
};