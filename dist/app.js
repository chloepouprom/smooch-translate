'use strict';
//require("babel-core");

var _config = require('./config');

var express = require('express');
var app = express();
var path = require('path');
var SmoochCore = require('smooch-core');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var request = require('request');
var Q = require('q');


// Initializing Smooch
var smooch = new SmoochCore({
  keyId: _config.KEY_ID,
  secret: _config.SECRET,
  scope: 'app'
});

var getAppUserLanguage = function getAppUserLanguage(text) {
  var deferred = Q.defer();
  var req = 'https://translate.yandex.net/api/v1.5/tr.json/detect?key=' + _config.YANDEX_KEY + '&text=' + text;
  console.log(req);

  request.get(req, function (err, response) {
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(response.body);
  });
  return deferred.promise;
};

var getTranslatedText = function getTranslatedText(text, fromLanguage, toLanguage) {
  var deferred = Q.defer();
  var req = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=' + _config.YANDEX_KEY + '&text=' + text + '&lang=' + fromLanguage + '-' + toLanguage;
  console.log(req);
  request.get(req, function (err, response) {
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(JSON.parse(response.body));
  });
  return deferred.promise;
};

// Express Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Express Middleware to handle webhooks
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function (req, res) {
  res.redirect('index.html');
});

app.post('/fromAppUser', function (req, res) {
  var payload = req.body;
  var message = payload.messages[0];
  var text = message.text;

  if (text.indexOf('Translation') > -1) {
    res.status(200);
    res.send();
  } else {
    (function () {
      var appUserId = payload.appUser._id;
      console.log('[APPUSER] Message from app user: ' + text);

      getAppUserLanguage(text).then(function (result) {
        var data = JSON.parse(result);
        console.log(data);
        if (data && data.lang) {
          smooch.appUsers.update(appUserId, {
            properties: {
              language: data.lang
            }
          }).then(function (response) {
            console.log('updating APP_USER language');
            var resp = {
              language: response.appUser.properties.language,
              appUserId: response.appUser._id
            };
            console.log(response);
            return resp;
          }).then(function (data) {
            var app_user_language = data.language;
            var app_user_id = data.appUserId;
            console.log('[APPUSER] App User language: ' + app_user_language);

            getTranslatedText(text, app_user_language, _config.APP_MAKER_LANGUAGE).then(function (translatedText) {
              var message = translatedText.text[0];
              console.log('[APPUSER] Translated app user message: ' + message);
              return message;
            }).then(function (translatedMessage) {
              console.log('[APPUSER] App User id: ' + app_user_id);
              if (translatedMessage) {
                console.log('[APPUSER] Posting translated message to app maker');
                smooch.conversations.sendMessage(app_user_id, {
                  text: 'Translation (' + app_user_language + '-->' + _config.APP_MAKER_LANGUAGE + '): ' + translatedMessage,
                  role: 'appUser'
                }).then(function () {
                  return null;
                });
              }
            }).end();
          });;
        }
        throw new Error();
      });

      res.status(200);
      res.send();
    })();
  }
});

app.post('/fromAppMaker', function (req, res) {
  var payload = req.body;
  var message = payload.messages[0];
  var text = message.text;

  if (text.indexOf('Translation') > -1) {
    res.status(200);
    res.send();
  } else {
    (function () {
      console.log('[APPMAKER] Message from app maker: ' + text);

      var appUserId = payload.appUser._id;
      smooch.appUsers.get(appUserId).then(function (response) {
        console.log(response.appUser);
        var appUserLanguage = response.appUser.properties.language;
        console.log('[APPMAKER] AppMaker thinks that AppUser language is ' + appUserLanguage);
        return getTranslatedText(text, _config.APP_MAKER_LANGUAGE, appUserLanguage).then(function (translatedText) {
          var message = translatedText.text[0];
          console.log('[APPMAKER] Translated app maker message: ' + message);
          return message;
        }).then(function (translatedMessage) {
          if (translatedMessage) {
            console.log('[APPMAKER] Posting translated message to app user');
            smooch.conversations.sendMessage(appUserId, {
              text: 'Translation (' + _config.APP_MAKER_LANGUAGE + '-->' + appUserLanguage + '): ' + translatedMessage,
              role: 'appMaker',
              name: 'Chloe',
              email: 'chloe@smooch.io'
            }).then(function () {
              return null;
            });
          }
        }).end();
      });

      res.status(200);
      res.send();
    })();
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});