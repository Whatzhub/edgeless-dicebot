var Helpers = (function () {
    var getRandomArbitrary = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    var sleep = function (millSec) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, millSec);
        })
    }
    var initMessage = function(initObj) {
        chrome.runtime.sendMessage({ msg: 'init', data: initObj }, function (response) {
            // console.log('message sent!');
        });
    }
    var updateMessage = function(diceRollObj) {
        chrome.runtime.sendMessage({ msg: 'update', data: diceRollObj }, function (response) {
            // console.log('message sent!');
        });
    }
    var endMessage = function(diceRollObj) {
        chrome.runtime.sendMessage({ msg: 'end', data: diceRollObj }, function (response) {
            // console.log('message sent!');
        });
    }

    return {
        getRandomArbitrary: getRandomArbitrary,
        sleep: sleep,
        initMessage: initMessage,
        updateMessage: updateMessage,
        endMessage: endMessage
    }
})()