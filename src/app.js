'use strict';
const express = require('express');
const app = express();
const path = require('path');
const SmoochCore = require('smooch-core');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const request = require('request');
import { KEY_ID, SECRET } from './config';
import { getAppUserLanguage, getTranslatedText } from './translation';

// Initializing Smooch
const smooch = new SmoochCore({
    keyId: KEY_ID,
    secret: SECRET,
    scope: 'app'
});

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Express Middleware to handle webhooks
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
    res.redirect('index.html');
});

app.post('/fromAppUser', function(req, res) {
    const payload = req.body;
    const message = payload.messages[0];
    const text = message.text;

    if (text.indexOf('Translation') > -1) {
        res.status(200);
        res.send();
    } else {
        const appUserId = payload.appUser._id;
        console.log(`[APPUSER] Message from app user: ${text}`);

        // Language detection
        getAppUserLanguage(text)
        .then((result) => {
            const data = JSON.parse(result);
            if (data && data.lang) {
                smooch.appUsers.update(appUserId, {
                    properties: {
                      language: data.lang
                    }
                }).then((response) => {
                    const {appUser} = response;
                    return {
                      language: appUser.properties.language,
                      appUserId: appUser._id
                    };
                }).then((data) => {
                    const {language, appUserId} = data;
                    console.log(`[APPUSER] App User language: ${language}`);
                    
                    // Translate to app maker language (default is English)
                    getTranslatedText(text, language, APP_MAKER_LANGUAGE).then((translatedText) => {
                        const message = translatedText.text[0];
                        console.log(`[APPUSER] Translated app user message: ${message}`);
                        return message;
                    })
                    .then((translatedMessage) => {

                      // Send translated message back to app maker
                      if (translatedMessage) {
                          console.log(`[APPUSER] Posting translated message to app maker`);
                          smooch.conversations.sendMessage(appUserId, {
                              text: `Translation (${language}-->${APP_MAKER_LANGUAGE}): ${translatedMessage}`,
                              role: 'appUser'
                          }).then(() => {
                              return null;
                          });
                      }
                    })
                .end();
                });;
            }
            throw new Error();
          })
          
        res.status(200);
        res.send();
    } 
});

app.post('/fromAppMaker', function(req, res) {
    const payload = req.body;
    const message = payload.messages[0];
    const text = message.text;

    if (text.indexOf('Translation') > -1) {
        res.status(200);
        res.send();
    } else {
        console.log(`[APPMAKER] Message from app maker: ${text}`);
        const appUserId = payload.appUser._id;

        // Retrieve app user language
        smooch.appUsers.get(appUserId).then((response) => {
            const appUserLanguage = response.appUser.properties.language;
            console.log(`[APPMAKER] AppMaker thinks that AppUser language is ${appUserLanguage}`);

            // Translate app maker message to app user's language
            return getTranslatedText(text, APP_MAKER_LANGUAGE, appUserLanguage).then((translatedText) => {
                const message = translatedText.text[0];
                console.log(`[APPMAKER] Translated app maker message: ${message}`);
                return message;
            })
            .then((translatedMessage) => {

              // Send translated message
              if (translatedMessage) {
                  console.log(`[APPMAKER] Posting translated message to app user`);
                  smooch.conversations.sendMessage(appUserId, {
                      text: `Translation (${APP_MAKER_LANGUAGE}-->${appUserLanguage}): ${translatedMessage}`,
                      role: 'appMaker'
                  }).then(() => {
                      return null;
                  });
              }
          })
          .end();

      })

      res.status(200);
      res.send();
    }
});

app.listen(process.env.PORT || 3000, function () {
    console.log('Example app listening on port 3000!');
});
