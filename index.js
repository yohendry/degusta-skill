'use strict';


var request = require('request');
var cheerio = require('cheerio');
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */
// API


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Standard',
            title: title,
            text: output,
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
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Degusta Panama Skill. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
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
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
    

    var options = {
    url: 'https://www.degustapanama.com/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
    }
  };

  var tab = "tab201";

  if (typeof category != "undefined") {
    switch (category) {
      case "food":
        tab = "tab201";
        break;
      case "service":
        tab = "tab202";
        break;
      case "ambience":
        tab = "tab203";
        break;
      default:
        tab = "tab201";
        break;
    }
  }
  request(options, function(error, response, html) {

    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(html);

      var title, release, rating;
      var json = { title: "", release: "", rating: "" };

      $('div#' + tab + ' .holder').filter(function() {

        var data = $(this);


        var categoryPrices = [];
        data.children().map(function(index, category) {
          category = $(category);
          var tmpCategory = {};

          tmpCategory.children = [];
          tmpCategory.title = category.children('a').children('h3').text();

          category.children('ol').children('li').children('a').toArray().forEach(function(restaurantLink) {
            tmpCategory.children.push({
              'data-accion': restaurantLink.attribs['data-accion'],
              'data-etiqueta': restaurantLink.attribs['data-etiqueta'],
              'data-value': restaurantLink.attribs['data-value'],
              'class': restaurantLink.attribs['class'],
              'href': restaurantLink.attribs['href'],
            });
          });
          //console.log(tmpCategory);
          categoryPrices.push(tmpCategory)
        });
        var index = 0;
        // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
        var list = categoryPrices[0].children.map(function(restaurant) {
            index++;
            return `${index}) ${restaurant['data-etiqueta']}`;
        });

        speechOutput = `the top 4, ${price} restaurants, based on ${category}, are .\n ${list.join('\n ')}`;
        repromptText = "with restaurant would you like to check?";


        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));


        //title = data.children().first().text();

      });
    } else {
      console.error(response.statusCode);
    }
  });

    
}

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
