# OAuth 2.0 Quick Start - K-Beauty App

Get up and running with OAuth in 5 minutes.

## Quick Setup Checklist

- [ ] Create Auth0 account at https://auth0.com
- [ ] Create "Regular Web Application" in Auth0 Dashboard
- [ ] Note your Domain, Client ID, Client Secret
- [ ] Start ngrok: `ngrok http 8787`
- [ ] Copy ngrok URL (e.g., `https://abc123.ngrok-free.app`)
- [ ] Update Auth0 app settings with ngrok URL
- [ ] Create `.env` file in server directory
- [ ] Fill in Auth0 credentials and ngrok URL
- [ ] Run `npm install`
- [ ] Start server: `npm start`

## 5-Minute Setup

### 1. Auth0 Setup (2 min)

```bash
# Login to Auth0 Dashboard
https://manage.auth0.com/dashboard

# Go to: Applications > Applications
# Click: Create Application
# Select: Regular Web Application
# Name: K-Beauty App

# In Settings tab, note:
# - Domain: xxx.us.auth0.com
# - Client ID: ...
# - Client Secret: ...
```

### 2. ngrok Setup (1 min)

```bash
# Terminal 1: Start ngrok
ngrok http 8787

# Copy the URL shown:
# https://abc123def456.ngrok-free.app
```

### 3. Update Auth0 (1 min)

In Auth0 Application Settings, set:

```
Allowed Callback URLs:
https://abc123def456.ngrok-free.app/oauth/callback

Allowed Logout URLs:
https://abc123def456.ngrok-free.app

Allowed Web Origins:
https://abc123def456.ngrok-free.app
```

### 4. Configure Server (1 min)

```bash
# Navigate to server directory
cd server

# Create .env from template
cp .env.example .env

# Edit .env with your values:
AUTH0_DOMAIN=xxx.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
REDIRECT_URI=https://abc123def456.ngrok-free.app/oauth/callback
NGROK_URL=https://abc123def456.ngrok-free.app

# Install OAuth packages
npm install

# Start server
npm start
```

## Verify Setup

### Test 1: Health Check
```bash
curl https://abc123def456.ngrok-free.app/health
# Should return: { "ok": true, "oauth_enabled": true }
```

### Test 2: Public Tool
```bash
curl -X POST https://abc123def456.ngrok-free.app/mcp \
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
# Should return morning routine (no auth needed)
```

### Test 3: Protected Tool (No Auth)
```bash
curl -X POST https://abc123def456.ngrok-free.app/mcp \
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
# Should return: { "error": "Unauthorized: Valid OAuth token required" }
```

## Using with ChatGPT

1. Open ChatGPT
2. Go to Settings > Developer Mode
3. Add MCP Server:
   ```
   URL: https://abc123def456.ngrok-free.app/mcp
   Protocol: HTTP
   ```
4. Try public tool: "Show morning routine"
5. Try protected tool: "Log my skin: hydration 8, sensitivity 4"
   - ChatGPT auto-triggers OAuth flow
   - Auth0 login appears
   - After auth, tool executes

## Common Issues

| Problem | Solution |
|---------|----------|
| `ENOENT .env` | Run `cp .env.example .env` |
| Auth0 redirect fails | Update Auth0 Callback URLs with correct ngrok URL |
| Token validation fails | Check `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` |
| ngrok shows "timed out" | ngrok tunnel disconnected, restart it |
| "Port 8787 in use" | Change PORT in .env or kill other process |

## Key Files

- **server-oauth.cjs** - Main OAuth server implementation
- **.env** - Configuration (create from .env.example)
- **.env.example** - Template with all required variables
- **OAUTH_SETUP.md** - Full documentation
- **package.json** - Dependencies and scripts

## Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `AUTH0_DOMAIN` | `xxx.us.auth0.com` | Yes |
| `AUTH0_CLIENT_ID` | `abc123xyz789` | Yes |
| `AUTH0_CLIENT_SECRET` | `secret_key` | Yes |
| `REDIRECT_URI` | `https://xxx.ngrok-free.app/oauth/callback` | Yes |
| `NGROK_URL` | `https://xxx.ngrok-free.app` | Yes |
| `PORT` | `8787` | Optional (default 8787) |

## OAuth Flow Diagram

```
User → ChatGPT → "Log skin condition"
  ↓
ChatGPT detects "log_skin_condition" needs OAuth
  ↓
ChatGPT calls /oauth/authorize
  ↓
Server redirects to Auth0 login
  ↓
User logs in to Auth0
  ↓
Auth0 redirects to /oauth/callback
  ↓
Server validates & returns authorization code
  ↓
ChatGPT exchanges code for access token at /oauth/token
  ↓
ChatGPT calls "log_skin_condition" with Bearer token
  ↓
Server validates token & executes tool
  ↓
User's skin log is saved in database
```

## Protected Tools

### log_skin_condition
Log your current skin condition

**Requires:** OAuth with `skin:write` scope

**Example:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "log_skin_condition",
      "arguments": {
        "hydration_level": 8,
        "sensitivity_level": 4,
        "notes": "Skin felt dry after workout"
      }
    }
  }'
```

### get_skin_history
Get your skin logs history

**Requires:** OAuth with `skin:read` scope

**Example:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_skin_history",
      "arguments": { "days": 30 }
    }
  }'
```

## Data Storage

Currently uses in-memory storage (development only).

For production, update `server-oauth.cjs` to use:
- **Supabase** (PostgreSQL)
- **MongoDB**
- **Any REST API**

Example schema for `skin_logs`:
```
{
  id: uuid,
  user_id: string (from Auth0 'sub' claim),
  hydration_level: number (1-10),
  sensitivity_level: number (1-10),
  notes: string,
  created_at: timestamp
}
```

## Next Steps

1. Setup Auth0 and ngrok (see Quick Setup above)
2. Run `npm start`
3. Test with curl (see Verify Setup)
4. Test with ChatGPT (see Using with ChatGPT)
5. Review full guide: `OAUTH_SETUP.md`
6. Deploy to production (optional)

---

**Questions?** Check `OAUTH_SETUP.md` for detailed documentation and troubleshooting.
