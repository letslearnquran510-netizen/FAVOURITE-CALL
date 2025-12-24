# Favourite Call Server

Backend server for Favourite Call VoIP application with Custom Caller ID support.

## Features

- ✅ Custom Caller ID (shows your name on receiver's phone)
- ✅ Auto-reject incoming callbacks
- ✅ Works with Twilio Voice API

## Deploy to Render.com

1. Fork this repository
2. Go to [Render.com](https://render.com)
3. Create New Web Service
4. Connect your GitHub repo
5. Add Environment Variables (see below)
6. Deploy!

## Environment Variables

Set these in Render.com dashboard:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxx
```

## Endpoints

- `GET /` - Health check
- `GET /token` - Get Twilio access token
- `POST /voice` - Handle outgoing calls
- `POST /voice-incoming` - Reject incoming calls

## After Deployment

Update your Twilio settings:
1. TwiML App Voice URL: `https://your-app.onrender.com/voice`
2. Phone Number Incoming URL: `https://your-app.onrender.com/voice-incoming`
