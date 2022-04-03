## RoboCaptcha Notification Microservice
Allow real-time notifications to reach users currently using the roboCaptcha web app, alerting them of any blocked robo calls detected by our filtering system or any legitimate human callers that successfully 
passed our verification.

Makes use of Amazon SQS to receive messages from the roboCaptcha service, sends notifications to the 
user on roboCaptcha frontend web app through a WebSocket connection. 

### Environment Variables
| Name                     | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| MONGODB_URL              | Connection string to establish an instance for MongoDB          |
| AWS_SQS_NOTIFICATION_URL | URL endpoint that receives messages in AWS Simple Queue Service |

### Local Deployment
```
git clone https://github.com/phomies/robocaptcha-notification.git

npm i
npm run start
```