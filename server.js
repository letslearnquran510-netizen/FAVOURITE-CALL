/**
 * Favourite Call - Backend Server
 * Handles Twilio Voice Calls with Custom Caller ID
 * Auto-rejects incoming callbacks
 */

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Twilio Credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;

// Initialize Twilio Client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Favourite Call Server Running',
    message: 'Server is ready for calls!'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

/**
 * GET /token
 * Generate Twilio Access Token for browser calling
 */
app.get('/token', (req, res) => {
  try {
    const identity = 'user_' + Date.now();

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const accessToken = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY_SID,
      TWILIO_API_KEY_SECRET,
      { identity: identity }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: false
    });

    accessToken.addGrant(voiceGrant);

    res.json({
      success: true,
      token: accessToken.toJwt(),
      identity: identity
    });

  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * POST /voice
 * Handles OUTGOING calls - Sets Custom Caller ID
 */
app.post('/voice', (req, res) => {
  try {
    const { To, CallerIdMode, CustomCallerId } = req.body;

    console.log('📞 Outbound call:', { To, CallerIdMode, CustomCallerId });

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!To) {
      twiml.say('No phone number provided.');
      return res.type('text/xml').send(twiml.toString());
    }

    // Get Caller ID based on mode
    let callerId = TWILIO_PHONE_NUMBER;

    if (CallerIdMode === 'custom' && CustomCallerId) {
      // Alphanumeric Sender ID - shows NAME on receiver phone
      // Works in: Pakistan, India, UK, UAE, etc. (NOT USA/Canada)
      const alphanumericId = CustomCallerId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);
      if (alphanumericId.length >= 3) {
        callerId = alphanumericId;
        console.log('✅ Using Custom Caller ID:', callerId);
      }
    }

    // Make the call
    const dial = twiml.dial({
      callerId: callerId,
      answerOnBridge: true,
      timeout: 30
    });

    dial.number(To);

    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('Voice error:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('An error occurred.');
    res.type('text/xml').send(twiml.toString());
  }
});

/**
 * POST /voice-incoming
 * AUTO-REJECT all incoming calls (callbacks)
 */
app.post('/voice-incoming', (req, res) => {
  console.log('📵 Incoming call REJECTED from:', req.body.From);

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Reject the call
  twiml.reject({ reason: 'rejected' });

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /call-status
 * Webhook for call status updates
 */
app.post('/call-status', (req, res) => {
  console.log('📊 Call Status:', req.body.CallStatus);
  res.sendStatus(200);
});

// Start Server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║     🎉 Favourite Call Server Started!          ║
╠════════════════════════════════════════════════╣
║  Port: ${PORT}                                    ║
║  Status: Ready for calls                       ║
╚════════════════════════════════════════════════╝
  `);
});

module.exports = app;
