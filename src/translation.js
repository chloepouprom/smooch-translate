import { YANDEX_KEY, APP_MAKER_LANGUAGE } from './config';
const Q = require('q');
const request = require('request');

export const getAppUserLanguage = text => {
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

export const getTranslatedText = (text, fromLanguage, toLanguage) => {
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