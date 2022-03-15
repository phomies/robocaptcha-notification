const express = require('express')
const app = express()
const server = require('http').createServer(app);
const WebSocket = require('ws');
require('dotenv').config();
const port = 3000

const wss = new WebSocket.Server({ server: server });

wss.on('connection', function connection(ws) {
    console.log('A new client connected');
    ws.send('Welcome new client!');

    ws.on('message', function message(data) {
        console.log('received: %s', data);
        ws.send('Message received: ' + data);
    });

});

var AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-southeast-1' });

app.get('/', (req, res) => {
    res.send('Hello World!')
})

server.listen(port, () => {
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
