const express = require('express');
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');
const mongoose = require('mongoose');
require('dotenv').config();
const port = 2999;

// Websocket Server
const wss = new WebSocket.Server({ server: server });

const webSockets = {};

// ws: websocket of client, req: HTTP GET request from client
wss.on('connection', (ws, req) => {
    // store userId 
    var userId = req.url.substring(1);
    webSockets[userId] = ws;
    console.log('A new client connected with id: ' + userId);

    // on ws close, delete userId from connected websockets
    ws.on('close', () => {
        delete webSockets[userId];
        console.log('ws closed, userId: ' + userId);
    })
});

// AWS SQS connection
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
    MaxNumberOfMessages: 1,
    MessageAttributeNames: [
        "All"
    ],
    QueueUrl: queueURL,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 20
};

const sqsHandler = async (err, data) => {
    if (err) {
        console.log("Received Error: ", err);
    } else if (data.Messages) {
        // parse notificationId to ObjectId type
        const notificationId = mongoose.Types.ObjectId(data.Messages[0].Body);

        // query notification from db
        const notification = await processNotification(notificationId);
        console.log('Notification: ', notification);

        // send to frontend if connected
        if (notification.userId in webSockets) {
            console.log('Sending to user id: ', notification.userId);
            var websocket = webSockets[notification.userId];
            websocket.send(JSON.stringify(notification));
        }
        if (notification.googleId in webSockets) {
            console.log('Sending to user id: ', notification.googleId);
            var websocket = webSockets[notification.googleId];
            websocket.send(JSON.stringify(notification));
        }

        // delete read messages from SQS queue
        var deleteParams = {
            QueueUrl: queueURL,
            ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        sqs.deleteMessage(deleteParams, (err, data) => {
            if (err) {
                console.log("Delete Error", err);
            } else {
                console.log("Message Deleted", data);
            }
        });
    }
    sqs.receiveMessage(params, sqsHandler);
}
sqs.receiveMessage(params, sqsHandler);

// MongoDB connection
const connectionString = process.env.MONGODB_URL;
mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const notificationSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    userId: { type: String, ref: 'User' },
    googleProviderUid: String,
    content: String,
    read: Boolean,
    url: String,
    dateTime: { type: Date, default: Date.now() },
});

const Notification = mongoose.model('Notification', notificationSchema);

const processNotification = async (notificationId) => {
    var notification = await Notification.findById(notificationId);
    return notification;
};