'use strict';

var express = require('express');
var app = express();
var path = require('path');
var SmoochCore = require('smooch-core');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var request = require('request');
var Q = require('q');
import { KEY_ID, SECRET, YANDEX_KEY, APP_MAKER_LANGUAGE } from 'src/config';

// Initializing Smooch
const smooch = new SmoochCore({
    keyId: KEY_ID,
    secret: SECRET,
    scope: 'app'
});

const getAppUserLanguage = text => {
  var deferred = Q.defer();
  const req = `https://translate.yandex.net/api/v1.5/tr.json/detect?key=${YANDEX_KEY}&text=${text}`;

    request.get(req, (err, response) => {
        if (err) {
            deferred.reject(err);
        }
        deferred.resolve(response.body);
    });
    return deferred.promise;
};

const getTranslatedText = (text, fromLanguage, toLanguage) => {
  var deferred = Q.defer();
  const req = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${YANDEX_KEY}&text=${text}&lang=${fromLanguage}-${toLanguage}`;
  request.get(req, (err, response) => {
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(JSON.parse(response.body));
  });
  return deferred.promise;
};

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, '/public')));

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

    getAppUserLanguage(text)
      .then((result) => {
        const data = JSON.parse(result);
        if (data && data.lang) {
          // const resp = {
          //   language: data.lang,
          //   appUserId: appUserId
          // };
          smooch.appUsers.update(appUserId, {
            properties: {
              language: data.lang
            }
          }).then((response) => {
            console.log('updating APP_USER language');
            const resp = {
              language: response.appUser.properties.language,
              appUserId: response.appUser._id
            };
            return resp;
          }).then((data) => {
            const app_user_language = data.language;
            const app_user_id = data.appUserId;
            console.log(`[APPUSER] App User language: ${app_user_language}`);
            
            getTranslatedText(text, app_user_language, APP_MAKER_LANGUAGE).then((translatedText) => {
              const message = translatedText.text[0];
              console.log(`[APPUSER] Translated app user message: ${message}`);
              return message;
            })
            .then((translatedMessage) => {
              console.log(`[APPUSER] App User id: ${app_user_id}`);
              if (translatedMessage) {
                console.log(`[APPUSER] Posting translated message to app maker`);
                smooch.conversations.sendMessage(app_user_id, {
                    text: `Translation (${app_user_language}-->${APP_MAKER_LANGUAGE}): ${translatedMessage}`,
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
    console.log(`[APPMAKER] AppMaker thinks that AppUser language is ${app_user_language}`);
    const appUserId = payload.appUser._id;
    smooch.appUsers.get(appUserId).then((response) => {
      const appUserLanguage = response.appUser.properties.language;
      getTranslatedText(text, APP_MAKER_LANGUAGE, appUserLanguage).then((translatedText) => {
        const message = translatedText.text[0];
        console.log(`[APPMAKER] Translated app maker message: ${message}`);
        return message;
      })
      .then((translatedMessage) => {
        if (translatedMessage) {
          console.log(`[APPMAKER] Posting translated message to app user`);
          smooch.conversations.sendMessage(appUserId, {
            text: `Translation (${APP_MAKER_LANGUAGE}-->${app_user_language}): ${translatedMessage}`,
            role: 'appMaker'
          }).then(() => {
            return null;
          });
        }
      });
      res.status(200);
      res.send();
    });
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
