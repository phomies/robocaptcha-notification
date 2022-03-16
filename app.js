const express = require('express');
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');
const mongoose = require('mongoose');
require('dotenv').config();
const port = 3000;

// Websocket Server
const wss = new WebSocket.Server({ server: server });

const webSockets = {};

// ws: websocket of client, req: HTTP GET request from client
wss.on('connection', (ws, req) => {
    ws.send('Welcome new client!');

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
const res = require('express/lib/response');
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

const sqsHandler = async function (err, data) {
    if (err) {
        console.log("Receive Error", err);
    } else if (data.Messages) {
        console.log(data.Messages);

        const notificationId = mongoose.Types.ObjectId(data.Messages[0].Body);

        // query notification from db
        const notification = await processNotification(notificationId);
        console.log('found notif: ', notification);

        // send to frontend if connected
        if (notification.userId in webSockets) {
            var websocket = webSockets[notification.userId];
            websocket.send(JSON.stringify(notification));
        }

        // delete read messages from SQS queue
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