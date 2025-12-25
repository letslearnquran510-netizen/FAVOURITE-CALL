const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Twilio credentials from environment variables
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Favourite Call Server Running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'Favourite Call API',
    version: '1.0.0',
    endpoints: ['/health', '/voice', '/call-status']
  });
});

// Make outbound call
app.post('/voice', async (req, res) => {
  try {
    const { To, CallerIdMode, CustomCallerId } = req.body;
    
    console.log('=== NEW CALL REQUEST ===');
    console.log('To:', To);
    console.log('CallerIdMode:', CallerIdMode);
    console.log('CustomCallerId:', CustomCallerId);
    
    if (!To) {
      return res.status(400).json({ error: 'Phone number (To) is required' });
    }

    // Clean phone number
    let toNumber = To.replace(/[^\d+]/g, '');
    if (!toNumber.startsWith('+')) {
      toNumber = '+' + toNumber;
    }

    // Determine caller ID
    let callerId = TWILIO_PHONE;
    
    // For Private mode, we still use Twilio number but can add <Pause> message
    // For Custom mode, Twilio only allows verified numbers as caller ID
    // The custom name will be spoken to the receiver instead
    
    console.log('Calling from:', callerId);
    console.log('Calling to:', toNumber);

    // Create TwiML based on caller ID mode
    let twimlMessage = '';
    
    if (CallerIdMode === 'private') {
      twimlMessage = '<Response><Say voice="alice">You have a call from a private number.</Say><Pause length="1"/><Dial><Number>' + toNumber + '</Number></Dial></Response>';
    } else if (CallerIdMode === 'custom' && CustomCallerId) {
      twimlMessage = '<Response><Say voice="alice">You have a call from ' + CustomCallerId + '.</Say><Pause length="1"/><Dial><Number>' + toNumber + '</Number></Dial></Response>';
    } else {
      twimlMessage = '<Response><Dial><Number>' + toNumber + '</Number></Dial></Response>';
    }

    // Make the call
    const call = await client.calls.create({
      to: toNumber,
      from: callerId,
      twiml: '<Response><Say voice="alice">Connecting your call from Favourite Call app.</Say><Pause length="1"/></Response>',
      // For actual connection, we need a proper TwiML URL
      // This is a simple announcement call for testing
    });

    console.log('Call SID:', call.sid);
    console.log('Call Status:', call.status);

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      to: toNumber,
      from: callerId,
      callerIdMode: CallerIdMode
    });

  } catch (error) {
    console.error('Call Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Two-way call - connects caller to receiver
app.post('/connect', async (req, res) => {
  try {
    const { To, CallerIdMode, CustomCallerId } = req.body;
    
    console.log('=== CONNECT CALL REQUEST ===');
    console.log('To:', To);
    
    if (!To) {
      return res.status(400).json({ error: 'Phone number (To) is required' });
    }

    // Clean phone number
    let toNumber = To.replace(/[^\d+]/g, '');
    if (!toNumber.startsWith('+')) {
      toNumber = '+' + toNumber;
    }

    // Get the base URL for callbacks
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://favourite-call.onrender.com';

    // Make call that will connect to receiver
    const call = await client.calls.create({
      to: toNumber,
      from: TWILIO_PHONE,
      url: baseUrl + '/twiml/connect?target=' + encodeURIComponent(toNumber) + '&mode=' + (CallerIdMode || 'normal') + '&name=' + encodeURIComponent(CustomCallerId || ''),
      statusCallback: baseUrl + '/call-status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.log('Call initiated:', call.sid);

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status
    });

  } catch (error) {
    console.error('Connect Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TwiML endpoint for connecting calls
app.all('/twiml/connect', (req, res) => {
  const target = req.query.target || req.body.target;
  const mode = req.query.mode || req.body.mode || 'normal';
  const name = req.query.name || req.body.name || '';
  
  console.log('TwiML Connect - Target:', target, 'Mode:', mode, 'Name:', name);
  
  let announcement = '';
  if (mode === 'private') {
    announcement = '<Say voice="alice">Incoming call from private number.</Say><Pause length="1"/>';
  } else if (mode === 'custom' && name) {
    announcement = '<Say voice="alice">Incoming call from ' + name + '.</Say><Pause length="1"/>';
  }
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${announcement}
  <Dial callerId="${TWILIO_PHONE}" timeout="30">
    <Number>${target}</Number>
  </Dial>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Call status webhook
app.post('/call-status', (req, res) => {
  console.log('=== CALL STATUS UPDATE ===');
  console.log('CallSid:', req.body.CallSid);
  console.log('CallStatus:', req.body.CallStatus);
  console.log('To:', req.body.To);
  console.log('From:', req.body.From);
  console.log('Duration:', req.body.CallDuration);
  
  res.sendStatus(200);
});

// Get call status
app.get('/call/:sid', async (req, res) => {
  try {
    const call = await client.calls(req.params.sid).fetch();
    res.json({
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      to: call.to,
      from: call.from
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('  Favourite Call Server Started');
  console.log('  Port:', PORT);
  console.log('  Twilio Phone:', TWILIO_PHONE);
  console.log('=================================');
});
