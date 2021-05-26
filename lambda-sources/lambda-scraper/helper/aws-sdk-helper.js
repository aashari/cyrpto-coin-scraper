let AWS = require('aws-sdk');

let sns = new AWS.SNS({ apiVersion: '2012-11-05' });
let sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
let s3 = new AWS.S3({ apiVersion: '2012-11-05' });

AWS.config.update({ region: 'ap-southeast-1' });

const NOTIFICATION_SNS_PRICE = process.env.NOTIFICATION_SNS_PRICE;
const ARCHIVAL_SQS_URL = process.env.ARCHIVAL_SQS_URL;
const ARCHIVAL_S3_BUCKET_NAME = process.env.ARCHIVAL_S3_BUCKET_NAME;

module.exports = {
    publishSNSNotification: function(payload, callback) {
        console.log("- sending message to SNS");
        console.log("- trying to send this data: " + JSON.stringify(payload));
        sns.publish({
            Message: JSON.stringify(payload),
            TargetArn: NOTIFICATION_SNS_PRICE
        }, function(err, data) {
            if (err) {
                console.log("- error while publishing SNS data:");
                console.log(err.stack);
                return;
            }
            console.log("- successfully published SNS data:");
            console.log(data);
        });
    },
    publishSQS: function(payload, callback) {
        console.log("- sending message to SQS");
        console.log("- trying to send " + JSON.stringify(payload).length + " length of string");
        sqs.sendMessage({
            MessageBody: JSON.stringify(payload),
            QueueUrl: ARCHIVAL_SQS_URL
        }, function(err, data) {
            if (err) throw new Error(err);
            console.log("- successfully sent message to SQS with id: " + data.MessageId);
            callback(data);
        });
    },
    getS3Object: function(filePath, callback) {
        s3.getObject({
            Bucket: ARCHIVAL_S3_BUCKET_NAME,
            Key: filePath
        }, function(err, data) {
            let finalData = null;
            if (!err) finalData = data.Body.toString('utf-8');
            callback(finalData);
        });

    },
    putS3Object: function(filePath, data, callback) {
        s3.putObject({
            Bucket: ARCHIVAL_S3_BUCKET_NAME,
            Key: filePath,
            Body: data
        }, function(err, data) {
            if (err) throw new Error(err);
            console.log("- successfully put data to S3 with path: " + filePath);
            console.log("- successfully put data to S3 with e-tag: " + data.ETag);
            callback(data);
        });
    }
};