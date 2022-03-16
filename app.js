const express = require('express');
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');
const mongoose = require('mongoose');
require('dotenv').config();
const port = 3000;

// Websocket Server
const wss = new WebSocket.Server({ server: server });

wss.on('connection', function connection(ws) {
    console.log('A new client connected');
    ws.send('Welcome new client!');

    ws.on('message', function message(data) {
        console.log('received: %s', data);
        ws.send('Message received: ' + data);
    });

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

sqs.receiveMessage(params, async function (err, data) {
    if (err) {
        console.log("Receive Error", err);
    } else if (data.Messages) {
        // console.log(data.Messages);
        const notificationId = mongoose.Types.ObjectId(data.Messages[0].Body.substring(10, 34));

        // query notification from db
        const notification = await processNotification(notificationId);
        console.log('found notif: ', notification);

        // TODO: send to frontend


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
});

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