var restify = require('restify');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
appId: process.env.MICROSOFT_APP_ID,
appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Recognizers
//=========================================================

  var qnarecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: '9d543af7-18bf-4254-b63c-fc82bc36d8fc', 
	subscriptionKey: '60a4625ac2dd4698ac93cfeb5783f10b',
	top: 4});

	var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
	recognizers: [qnarecognizer],
	defaultMessage: 'No match! Try changing the query terms!',
	qnaThreshold: 0.3
});

//var model='set your luis model uri';
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1e36add5-ac0f-430e-9e27-7aeef39000fa?subscription-key=5e134c07eb614b359077662778e60245&spellCheck=true&verbose=true&timezoneOffset=0&q=';

var recognizer = new builder.LuisRecognizer(model);

//=========================================================
// Bot Dialogs
//=========================================================
var intents = new builder.IntentDialog({ recognizers: [recognizer, qnarecognizer] });
bot.dialog('/', intents);

//intents.matches('SearchHotels', builder.DialogAction.send('Inside LUIS Intent 1.'));

intents.matches('SearchHotels', [

function (session, args, next) {
		console.log(' I am here 1---');
        session.send('Welcome to the Hotels finder! We are analyzing your message: \'%s\'', session.message.text);

        // try extracting entities
        var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
        var airportEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'AirportCode');
        if (cityEntity) {
            // city entity detected, continue to next step
            session.dialogData.searchType = 'city';
            next({ response: cityEntity.entity });
        } else if (airportEntity) {
            // airport entity detected, continue to next step
            session.dialogData.searchType = 'airport';
            next({ response: airportEntity.entity });
        } else {
            // no entities detected, ask user for a destination
            builder.Prompts.text(session, 'Please enter your destination');
        }
    },
    function (session, results) {
        var destination = results.response;

        var message = 'Looking for hotels';
        if (session.dialogData.searchType === 'airport') {
            message += ' near %s airport...';
        } else {
            message += ' in %s...';
        }

        session.send(message, destination);

        // Async search
        Store
            .searchHotels(destination)
            .then(function (hotels) {
                // args
                session.send('I found %d hotels:', hotels.length);

                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(hotels.map(hotelAsAttachment));

                session.send(message);

                // End
                session.endDialog();
            });
    }
	

]);

intents.matches('ShowHotelsReviews', builder.DialogAction.send('Inside LUIS Intent 2.'));

intents.matches('qna', [
    //bot.dialog('Help', basicQnAMakerDialog)
   // function(session){
   //     session.send('Sorry!! No match  HELP!!');
//	}
	function (session, args, next) {
        var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
        session.send(answerEntity.entity);
		//bot.dialog('/', basicQnAMakerDialog);
	}
]);

intents.onDefault([
    function(session){
        session.send('Sorry!! No match!!');
	}
]);