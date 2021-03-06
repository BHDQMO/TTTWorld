# Talk To The World
A language exchange platform that allows users to chat with native speakers through text/video. The platform can recognize and record poor pronunciation for review.

>* Author: YuJang Huang
>* Email: huangyujang813@gmail.com
>* Phone: (+886)937873565
## Table of Contents
1. Technologies
2. Architecture
3. Database Schema
4. Socket.IO Flow
5. Features
6. Demo Account

## Technologies
  | Back-End     | Front-End  | AWS        | Others        |
  | :----------- | :--------- | :--------- | :------------ |
  | Node.js      | HTML       | EC2        | Socket.IO     |
  | Express      | CSS        | RDS        | MVC Framework |
  | MySQL        | JavaScript | S3         | CloudFlare    |
  | Nginx        | AJAX       | CloudFront |               |
  | Mocha & Chai | Bootstrap  |            |               |
  
  | Web API            | Google API     | Open Street Map API |
  | :----------------- | :------------- | :------------------ |
  | Geolocation        | Geocoding      | Reverse Geocoding   |
  | MediaDevice        | Translation    |                     |
  | SpeechSynthesis    | Speech-to-Text |                     |
  | SpeechRecognition  |                |                     |
  | RTCPeerConnections |                |                     |

  
## Architecture
![Imgur](https://i.imgur.com/lrE7RB2.png)

## Database Schema
![Imgur](https://i.imgur.com/kFLN9d7.png)

## Socket.IO Flow
![Imgur](https://i.imgur.com/h9XLSSx.png)

## Features
* **Language exchange**
  * **Booking system**

    ![Imgur](https://i.imgur.com/4K7CoFu.gif)
  * **Real-time video/audio chat**

    https://user-images.githubusercontent.com/74060604/123554442-94786200-d7b2-11eb-8a0f-8f4e2756698a.mov
  * **Recognize pronounce in the background**
  * **List incorrect or unclear sentences**
  * **Add them to favorite for review**
  
    https://user-images.githubusercontent.com/74060604/123701587-9f0b2800-d894-11eb-89d5-dff603c085e8.mp4
* **Message toolbox**
  * **Transfer text or audio message**
  * **Reply specific message**

    ![Imgur](https://i.imgur.com/7nfdLGA.gif)
  * **Translate text**

    ![Imgur](https://i.imgur.com/9i2fKEj.gif)
  * **Speak text**

    https://user-images.githubusercontent.com/74060604/123554289-de147d00-d7b1-11eb-9760-c48a8a590f04.mov
  * **Transcript audio**

    https://user-images.githubusercontent.com/74060604/123554338-161bc000-d7b2-11eb-9def-d92c12c0d66a.mov
  * **Correct each other???s sentences**

    ![Imgur](https://i.imgur.com/aijEzP5.gif)
  * **Add to favorite**

    ![Imgur](https://i.imgur.com/GFoQVrA.gif)
* **Notification system**
  * **Friend invitation**

    ![Imgur](https://i.imgur.com/BjRD8l4.gif)
  * **Friend online**

    ![Imgur](https://i.imgur.com/TyyafaG.gif)
  * **Language exchange invitation**

    ![Imgur](https://i.imgur.com/yRz7rZc.gif)
  * **10 mins reminder ahead of scheduled exchange**

    ![Imgur](https://i.imgur.com/cVyv4g6.gif)
  * **Time for exchange**

    ![Imgur](https://i.imgur.com/wMlxhKV.gif)
* **Geocode**
  * **Autofill address**

    ![Imgur](https://i.imgur.com/JsHDfax.gif)
  * **User distance**
 
## Demo Account
Website URL: https://www.talktotheworld.online/signin.html
  * Account: test1@test.com
  * Password: test1
  * Account: test2@test.com
  * Password: test2
