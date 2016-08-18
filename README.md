# smooch-translate

Add translation to your Smooch conversations!

![smooch-translate](http://i.imgur.com/NfxxqP0.png)

App users send you messages in the language of their choice. Your replies will automatically get translated to the last language they used. 

This was built using the [Smooch API](http://docs.smooch.io/rest/) and the [Yandex translation API](https://translate.yandex.com/developers). You can test it out [here](http://stark-wildwood-74035.herokuapp.com/).

1. Copy the `config.example.js` file and rename it to `config.js`. You'll have to fill it in with a few tokens and keys.
2. From the Smooch dashboard web settings page, retrieve your `APP_TOKEN`.
3. From Smooch app settings page, generate a `KEY_ID` and `SECRET_KEY`.
4. From Yandex, retrieve your developer key.
5. Set your `APP_MAKER_LANGUAGE`. The default is English.
6. Set up your webhooks in the Smooch dashboard!
