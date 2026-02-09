# OAuth 2.0 Setup Guide - Auth0 + K-Beauty App

This guide walks you through setting up OAuth 2.0 authentication for your K-Beauty MCP Server using Auth0.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Auth0 Account Setup](#auth0-account-setup)
3. [Application Configuration](#application-configuration)
4. [Environment Setup](#environment-setup)
5. [Running the Server](#running-the-server)
6. [Testing OAuth Flow](#testing-oauth-flow)
7. [ChatGPT Developer Mode Integration](#chatgpt-developer-mode-integration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- A computer with Node.js 16+ installed
- An ngrok account (for public URL tunneling)
- An Auth0 account (free tier available at https://auth0.com)
- ChatGPT Plus with Developer Mode access
- ngrok installed locally: `npm install -g ngrok`

---

## Auth0 Account Setup

### Step 1: Create an Auth0 Account

1. Go to https://auth0.com/signup
2. Sign up with your email address
3. Choose a region (e.g., "United States" or "Europe")
4. Confirm your email
5. Set up your Auth0 tenant

### Step 2: Create an Auth0 Application

1. Log in to Auth0 Dashboard: https://manage.auth0.com/dashboard
2. In the left sidebar, go to **Applications > Applications**
3. Click **Create Application** button
4. Fill in the details:
   - **Name**: `K-Beauty App` (or your preferred name)
   - **Application Type**: Select **Regular Web Application**
   - Click **Create**

### Step 3: Configure Application Settings

1. After creating the app, you'll be on the **Settings** tab
2. Scroll down to **Application URIs** section
3. Configure the following:

   **Allowed Callback URLs:**
   ```
   https://xxx.ngrok-free.app/oauth/callback
   ```
   Replace `xxx` with your ngrok URL (you'll get this in Step 4)

   **Allowed Logout URLs:**
   ```
   https://xxx.ngrok-free.app
   ```

   **Allowed Web Origins:**
   ```
   https://xxx.ngrok-free.app
   ```

4. Scroll to the top and note down:
   - **Domain**: `xxx.us.auth0.com` (you'll need this)
   - **Client ID**: Your application's client ID
   - **Client Secret**: Your application's secret key

5. Click **Save Changes**

---

## Application Configuration

### Step 1: Set Up ngrok Tunnel

ngrok creates a public HTTPS URL that forwards to your local server.

```bash
# Start ngrok tunneling to port 8787
ngrok http 8787
```

You'll see output like:
```
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:8787
```

Copy the public URL (e.g., `https://abc123def456.ngrok-free.app`)

### Step 2: Update Auth0 Configuration

Go back to Auth0 Dashboard and update your application settings with the actual ngrok URL:

1. **Allowed Callback URLs**:
   ```
   https://abc123def456.ngrok-free.app/oauth/callback
   ```

2. **Allowed Logout URLs**:
   ```
   https://abc123def456.ngrok-free.app
   ```

3. **Allowed Web Origins**:
   ```
   https://abc123def456.ngrok-free.app
   ```

Click **Save Changes**

---

## Environment Setup

### Step 1: Create .env File

1. Navigate to your server directory:
   ```bash
   cd D:\workspace\01_Apps In chatGPT\Kbeauty2\server
   ```

2. Copy the example file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your values:
   ```bash
   # .env file
   NODE_ENV=development
   PORT=8787

   # From Auth0 Dashboard
   AUTH0_DOMAIN=xxx.us.auth0.com
   AUTH0_CLIENT_ID=your_actual_client_id
   AUTH0_CLIENT_SECRET=your_actual_client_secret

   # Your ngrok URL
   REDIRECT_URI=https://abc123def456.ngrok-free.app/oauth/callback
   NGROK_URL=https://abc123def456.ngrok-free.app
   ```

### Step 2: Install Dependencies

```bash
npm install
# or if you haven't installed OAuth packages yet
npm install jsonwebtoken jwks-rsa dotenv
```

---

## Running the Server

### Step 1: Start the Server

From the server directory (`D:\workspace\01_Apps In chatGPT\Kbeauty2\server`):

```bash
npm start
# or with nodemon for development
npm run dev
```

You should see output like:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌸 K-Beauty MCP Server with OAuth 2.0                   ║
║                                                            ║
║   Endpoints:                                               ║
║   📡 MCP Server: http://localhost:8787/mcp               ║
║   🔐 OAuth: /.well-known/openid-configuration             ║
║   💚 Health: http://localhost:8787/health                 ║
║   📖 Docs: http://localhost:8787/docs                     ║
║                                                            ║
║   Auth0 Configuration:                                     ║
║   Domain: xxx.us.auth0.com                                ║
║   Client ID: your_client_id...                            ║
║                                                            ║
║   Status: READY                                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## Testing OAuth Flow

### Test 1: Health Check

```bash
curl https://xxx.ngrok-free.app/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2024-02-09T...",
  "auth0_domain": "xxx.us.auth0.com",
  "oauth_enabled": true
}
```

### Test 2: OpenID Configuration

```bash
curl https://xxx.ngrok-free.app/.well-known/openid-configuration
```

Expected response includes OAuth endpoints

### Test 3: Public Tool Call (No Auth Required)

```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_routine_guide",
      "arguments": { "routine_type": "morning" }
    }
  }'
```

Expected: Successfully returns morning routine

### Test 4: Protected Tool Call (Requires Auth)

Try calling a protected tool without authorization:

```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "log_skin_condition",
      "arguments": { "hydration_level": 7, "sensitivity_level": 5 }
    }
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Unauthorized: Valid OAuth token required",
    "data": {
      "auth_required": true,
      "scopes": ["openid", "profile", "email", "skin:write"]
    }
  }
}
```

---

## ChatGPT Developer Mode Integration

### Step 1: Add MCP Server to ChatGPT

1. Open ChatGPT
2. Click your profile icon > **Settings**
3. Go to **Developer Mode** (if available)
4. Add your MCP server:
   ```
   URL: https://xxx.ngrok-free.app/mcp
   Protocol: HTTP
   ```

### Step 2: Test with ChatGPT

1. Start a conversation with ChatGPT
2. Try calling a public tool:
   ```
   Show me the morning skincare routine
   ```
   ChatGPT should call `get_routine_guide` and display results.

3. Try calling a protected tool:
   ```
   Log my skin condition: hydration 8, sensitivity 4
   ```
   ChatGPT should:
   - Detect the `log_skin_condition` tool requires authentication
   - Automatically initiate OAuth flow
   - Display Auth0 login page
   - Once authenticated, execute the tool

### Step 3: Authorize with Auth0

When ChatGPT initiates OAuth:

1. A popup window appears
2. You're redirected to Auth0 login
3. Sign in with your email/password or social login
4. Auth0 asks for consent to share your profile info
5. You're redirected back to ChatGPT
6. The protected tool is now called with your authorization

---

## Understanding the OAuth Flow

### PKCE (Proof Key for Code Exchange) Flow

The server implements the OAuth 2.0 PKCE flow for maximum security:

```
┌─────────────┐                      ┌──────────────┐                ┌──────────┐
│   ChatGPT   │                      │   MCP Server │                │  Auth0   │
└──────┬──────┘                      └──────┬───────┘                └────┬─────┘
       │                                     │                             │
       │ 1. Call protected tool             │                             │
       ├────────────────────────────────────>│                             │
       │                                     │                             │
       │                                     │ 2. Generate PKCE            │
       │                                     │    code_challenge           │
       │                                     │                             │
       │                                     │ 3. Redirect to Auth0        │
       │    4. Auth0 login page              │    with code_challenge      │
       │<────────────────────────────────────┤                             │
       │                                     │                             │
       │ 5. User logs in                     │                             │
       ├─────────────────────────────────────────────────────────────────> │
       │                                     │                             │
       │                                     │ 6. Exchange auth code       │
       │                                     │    with code_challenge      │
       │                                     │<────────────────────────────┤
       │                                     │                             │
       │                                     │ 7. Access token             │
       │                                     │<────────────────────────────┤
       │                                     │                             │
       │ 8. Call tool with Bearer token      │                             │
       ├────────────────────────────────────>│                             │
       │                                     │                             │
       │ 9. Tool result                      │                             │
       │<────────────────────────────────────┤                             │
```

### Endpoints Explained

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/openid-configuration` | GET | OAuth discovery endpoint |
| `/oauth/authorize` | GET | Initiate authorization (redirects to Auth0) |
| `/oauth/token` | POST | Exchange authorization code for access token |
| `/oauth/me` | GET | Get authenticated user info (requires Bearer token) |
| `/oauth/callback` | GET | Callback endpoint after Auth0 authentication |
| `/.well-known/oauth-protected-resource` | GET | Resource metadata |

### Scopes

The app defines custom OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `openid` | Authentication (required) |
| `profile` | User's profile info (name, skin_type) |
| `email` | User's email address |
| `skin:read` | Permission to read skin history |
| `skin:write` | Permission to log skin conditions |

---

## Tool Authentication Status

### Public Tools (No Auth Required)
- `get_routine_guide` - Get AM/PM skincare routine
- `search_products` - Search K-beauty products
- `get_product_details` - Get product information
- `get_routine_tips` - Get tips for routine steps
- `recommend_routine` - Get personalized routine recommendations

### Protected Tools (Requires OAuth)
- `log_skin_condition` - Log user's skin condition (requires `skin:write` scope)
- `get_skin_history` - Retrieve user's skin logs (requires `skin:read` scope)

---

## Data Storage

### Development (Current)
In-memory storage using JavaScript Map objects. Data is lost when server restarts.

### Production (Recommended)

Update the server to use a database:

**Option 1: Supabase (PostgreSQL)**
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Store logs
await supabase.from('skin_logs').insert([
  {
    user_id: userId,
    hydration_level: input.hydration_level,
    sensitivity_level: input.sensitivity_level,
    created_at: new Date().toISOString()
  }
]);
```

**Option 2: MongoDB**
```javascript
const mongoose = require('mongoose');
const Schema = new mongoose.Schema({
  user_id: String,
  hydration_level: Number,
  sensitivity_level: Number,
  created_at: { type: Date, default: Date.now }
});
```

---

## Troubleshooting

### Issue: "ENOENT: no such file or directory, open '.env'"

**Solution:**
```bash
cp .env.example .env
# Then edit .env with your actual values
```

### Issue: Auth0 redirect fails with "Invalid redirect URI"

**Solution:**
1. Check your ngrok URL is correct
2. Update Auth0 application settings with exact ngrok URL
3. Ensure URL includes `https://` (not http)

### Issue: "invalid_state" error

**Solution:**
- PKCE state tokens expire after 10 minutes
- Ensure your system clock is synchronized
- Try the authorization flow again

### Issue: "Cannot verify signature" for access token

**Solution:**
- Check `AUTH0_CLIENT_SECRET` is correct in `.env`
- Ensure `AUTH0_DOMAIN` is correct
- Verify the token hasn't expired (default 1 hour)

### Issue: Token validation fails

**Causes:**
- Bearer token format is wrong (should be `Bearer <token>`)
- Token is expired
- Token is for a different client

**Check token payload:**
```bash
# Decode JWT (online tool: https://jwt.io)
echo "your_access_token" | jq '.'
```

### Issue: ngrok connection unstable

**Solution:**
- Use ngrok Pro for persistent URLs
- Keep ngrok terminal running while testing
- Check internet connection stability

---

## Security Considerations

### In Production

1. **Use HTTPS Always** - ngrok provides HTTPS automatically
2. **Rotate Secrets** - Periodically rotate `AUTH0_CLIENT_SECRET`
3. **Database Security** - Use encrypted connections (MongoDB Atlas, Supabase)
4. **Token Expiration** - Current: 1 hour access, 7 days refresh
5. **CORS** - Currently allows all origins for development. Restrict in production:
   ```javascript
   app.use(cors({
     origin: 'https://your-domain.com',
     credentials: true
   }));
   ```

6. **Rate Limiting** - Add in production:
   ```bash
   npm install express-rate-limit
   ```

### Compliance

- **GDPR**: Ensure user data deletion on request
- **Data Storage**: Store hashed passwords, encrypted sensitive data
- **Audit Logs**: Log all authentication events

---

## Next Steps

1. Start the OAuth server: `npm start`
2. Open ngrok tunnel: `ngrok http 8787`
3. Update Auth0 application with ngrok URL
4. Test public tools in ChatGPT
5. Test protected tools (OAuth flow will auto-trigger)
6. Deploy to production (Render, Heroku, or your preferred platform)

---

## Reference Links

- Auth0 Documentation: https://auth0.com/docs
- OAuth 2.0 PKCE Specification: https://datatracker.ietf.org/doc/html/rfc7636
- MCP OAuth Documentation: https://modelcontextprotocol.io/
- JWT.io Debugger: https://jwt.io

---

## Support

For issues:
1. Check the Troubleshooting section above
2. Review Auth0 Application settings
3. Verify .env configuration
4. Check browser console for errors
5. Review server logs (check terminal where server is running)

---

**Last Updated:** 2026-02-09
**Version:** 1.0.0
