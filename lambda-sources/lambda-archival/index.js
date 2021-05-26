let uuid = require('uuid');
let AWS = require('aws-sdk');
let csvjson = require('csvjson');

AWS.config.update({ region: 'ap-southeast-1' });

let awsSDKHelper = require('./helper/aws-sdk-helper');
let dataStructureCleaner = require('./helper/data-structure-cleaner');

let totalNumberOfRecords = {};
let totalNumberOfRecordExecuted = {};

let recordDataHandler = (record, runningId, finalCallback) => {

    let pairName = record.pair_name;
    let dataType = record.data_type;
    let timestampFrame = Math.round(record.payload[0].timestamp / 100000);
    let filePath = dataType + '/' + pairName + '-' + timestampFrame + '.csv';

    console.log("- start record data handler with below information:");
    console.log("- - pair name: " + pairName);
    console.log("- - data type: " + dataType);
    console.log("- - timestamp frame: " + timestampFrame);
    console.log("- - file path: " + filePath);

    awsSDKHelper.getS3Object(filePath, (data) => {
        let finalDataFlag = {};
        let finalData = [];
        if (data) {
            data = csvjson.toObject(data, {
                checkType: true
            });
            data.forEach(x => {
                if (!finalDataFlag[x.unique_key]) {
                    finalDataFlag[x.unique_key] = finalData.length;
                    finalData.push(x);
                } else {
                    finalData[x.unique_key] = data;
                }
            });
        }
        record.payload.forEach(x => {
            if (!finalDataFlag[x.unique_key]) {
                finalDataFlag[x.unique_key] = finalData.length;
                finalData.push(x);
            } else {
                finalData[x.unique_key] = x;
            }
        });
        finalData = dataStructureCleaner.sortAoB(finalData, 'unique_key');
        finalData = dataStructureCleaner.duplicationRemoval(finalData, 'unique_key');
        awsSDKHelper.putS3Object(filePath, csvjson.toCSV(finalData, {
            delimiter: ",",
            wrap: false,
            headers: "key",
            checkType: true
        }), (response) => {
            totalNumberOfRecordExecuted[runningId]++;
            if (totalNumberOfRecordExecuted[runningId] >= totalNumberOfRecords[runningId]) {
                console.log("- finished task with running id: " + runningId);
                finalCallback(null, {
                    statusCode: 200,
                    body: JSON.stringify('Success from lambda!'),
                });
            }
        });
    });

}

let run = (records, callback) => {

    let runningId = uuid.v4();

    console.log("");
    console.log("start running with id: " + runningId);

    if (!totalNumberOfRecords[runningId]) totalNumberOfRecords[runningId] = records.length;
    if (!totalNumberOfRecordExecuted[runningId]) totalNumberOfRecordExecuted[runningId] = 0;

    records.forEach((record) => {
        console.log("")
        console.log("")
        recordDataHandler(JSON.parse(record['body']), runningId, callback);
    });

}


exports.handler = (event, context, callback) => {
    run(event['Records'], callback);
};