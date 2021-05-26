let AWS = require('aws-sdk');
let uuid = require('uuid');

AWS.config.update({ region: 'ap-southeast-1' });

let dataStructureCleaner = require('./helper/data-structure-cleaner');
let bitcoinCoIdScraper = require('./helper/bitcoin-co-id-scraper');
let awsSDKHelper = require('./helper/aws-sdk-helper')

let dataFlag = {};
let dataResult = {};
let dataCounter = {};

let coinCollector_trade = (coinName, runningId, callback) => {

    if (!dataFlag[runningId]) dataFlag[runningId] = {};
    if (!dataResult[runningId]) dataResult[runningId] = [];
    if (!dataCounter[runningId]) dataCounter[runningId] = 0;

    console.log("- scraping trade data with iteration number: " + (dataCounter[runningId] + 1));
    bitcoinCoIdScraper.getTrades(coinName, (responseBody) => {

        responseBody.forEach(data => {
            data = bitcoinCoIdScraper.dataStructureCleaning_trades(coinName, data);
            let uniqueKey = data.pair_name + '-' + data.tid + '-' + data.timestamp;
            data.unique_key = uniqueKey;
            if (!dataFlag[runningId][uniqueKey]) {
                dataFlag[runningId][uniqueKey] = dataResult[runningId].length;
                dataResult[runningId].push(data);
            } else {
                dataResult[runningId][dataFlag[runningId][uniqueKey]] = data;
            }
        });

        console.log("- successfully scraped trade data with iteration number: " + (dataCounter[runningId] + 1));

        if (dataCounter[runningId] <= 80) {
            dataCounter[runningId]++;
            setTimeout(() => {
                coinCollector_trade(coinName, runningId, callback);
            }, 500);
        } else {
            dataResult[runningId] = dataStructureCleaner.sortAoB(dataResult[runningId], 'unique_key');
            dataResult[runningId] = dataStructureCleaner.duplicationRemoval(dataResult[runningId], 'unique_key');
            callback(dataResult[runningId]);
        }

    });


}

let coinCollector_price = (coinName, runningId, callback) => {

    if (!dataFlag[runningId]) dataFlag[runningId] = {};
    if (!dataResult[runningId]) dataResult[runningId] = [];
    if (!dataCounter[runningId]) dataCounter[runningId] = 0;

    console.log("- scraping price data with iteration number: " + (dataCounter[runningId] + 1));
    bitcoinCoIdScraper.getTicker(coinName, (responseBody) => {
        let data = bitcoinCoIdScraper.dataStructureCleaning_price(coinName, responseBody['ticker']);
        let uniqueKey = data.pair_name + '-' + data.timestamp;
        data.unique_key = uniqueKey;
        if (!dataFlag[runningId][uniqueKey]) {
            dataFlag[runningId][uniqueKey] = dataResult[runningId].length;
            dataResult[runningId].push(data);
        } else {
            dataResult[runningId][dataFlag[runningId][uniqueKey]] = data;
        }

        console.log("- successfully scraped price data with iteration number: " + (dataCounter[runningId] + 1));

        if (dataCounter[runningId] <= 80) {
            dataCounter[runningId]++;
            if (dataCounter[runningId] % 10 == 0) {
                awsSDKHelper.publishSNSNotification(dataResult[runningId][dataResult[runningId].length - 1], (response) => {

                });
            }
            setTimeout(() => {
                coinCollector_price(coinName, runningId, callback);
            }, 500);
        } else {
            dataResult[runningId] = dataStructureCleaner.sortAoB(dataResult[runningId], 'timestamp');
            dataResult[runningId] = dataStructureCleaner.duplicationRemoval(dataResult[runningId], 'timestamp');
            callback(dataResult[runningId]);
        }
    });

}

let run = (coinName, callback) => {

    let runningId = uuid.v4();
    let totalExecutionDone = 0;
    let totalFunctionTobeExecuted = 2;

    console.log("");
    console.log("start running with id: " + runningId);

    coinCollector_trade(coinName, "trade-" + runningId, (result) => {
        awsSDKHelper.publishSQS({
            'pair_name': coinName + '_idr',
            'data_type': 'trades',
            'payload': result
        }, (response) => {
            console.log("- successfully sent trades data to SQS")
            totalExecutionDone++;
            if (totalExecutionDone >= totalFunctionTobeExecuted) {
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify('Success from lambda!'),
                });
            }
        });
    });

    coinCollector_price(coinName, "price-" + runningId, (result) => {
        awsSDKHelper.publishSQS({
            'pair_name': coinName + '_idr',
            'data_type': 'price',
            'payload': result
        }, (response) => {
            console.log("- successfully sent price data to SQS")
            totalExecutionDone++;
            if (totalExecutionDone >= totalFunctionTobeExecuted) {
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify('Success from lambda!'),
                });
            }
        });
    });

}

exports.handler = (event, context, callback) => {
    run(event.coin_name, callback);
};