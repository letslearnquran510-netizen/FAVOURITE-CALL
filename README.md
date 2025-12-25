# Favourite Call Backend Server

Backend server for Favourite Call app with real Twilio calling functionality.

## Deployment on Render.com

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `favourite-call-backend`
3. Upload these files:
   - `server.js`
   - `package.json`

### Step 2: Deploy on Render.com

1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** favourite-call
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Step 3: Environment Variables (Already Set)

Make sure these are configured:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/voice` | POST | Make announcement call |
| `/connect` | POST | Make two-way call |
| `/call/:sid` | GET | Get call status |

### Making a Call

```bash
curl -X POST https://favourite-call.onrender.com/connect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=+923001234567&CallerIdMode=custom&CustomCallerId=BankMgr"
```

### Caller ID Modes

- **normal**: Shows your Twilio number
- **private**: Announces "Call from private number"
- **custom**: Announces "Call from [CustomName]"

## Important Notes

1. Twilio can only show verified phone numbers as actual caller ID
2. Custom names are ANNOUNCED to receiver, not shown on phone screen
3. Free tier servers sleep after 15 min - first call takes longer
