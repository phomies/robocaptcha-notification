const express = require('express')
const app = express()
require('dotenv').config();
const port = 3000

var AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-southeast-1' });

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Notification service is listening on port ${port}`)
})

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

var queueURL = process.env.AWS_SQS_NOTIFICATION_URL;

var params = {
    AttributeNames: [
        "SentTimestamp"
    ],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: [
        "All"
    ],
    QueueUrl: queueURL,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0
};

sqs.receiveMessage(params, function (err, data) {
    if (err) {
        console.log("Receive Error", err);
    } else if (data.Messages) {
        console.log(data.Messages);
        var deleteParams = {
            QueueUrl: queueURL,
            ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        sqs.deleteMessage(deleteParams, function (err, data) {
            if (err) {
                console.log("Delete Error", err);
            } else {
                console.log("Message Deleted", data);
            }
        });
    }
});
