## RoboCaptcha Notification Microservice

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