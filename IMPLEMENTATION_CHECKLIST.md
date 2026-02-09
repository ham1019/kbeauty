# OAuth 2.0 Implementation Checklist

Complete checklist for OAuth 2.0 implementation verification.

## Phase 1: Setup (Before Development)

### Pre-requisites
- [ ] Auth0 account created (https://auth0.com)
- [ ] Node.js 16+ installed
- [ ] ngrok account and client installed
- [ ] ChatGPT Plus with Developer Mode access
- [ ] Git installed for version control

### Initial Review
- [ ] Read `OAUTH_QUICK_START.md`
- [ ] Understand OAuth 2.0 PKCE flow
- [ ] Review tool categories (public vs protected)
- [ ] Check file structure

---

## Phase 2: Configuration

### Auth0 Setup
- [ ] Create Auth0 free account
- [ ] Navigate to Applications > Applications
- [ ] Click "Create Application"
- [ ] Select "Regular Web Application"
- [ ] Name application "K-Beauty App"
- [ ] Click "Create"
- [ ] Go to Settings tab
- [ ] Note Domain (e.g., xxx.us.auth0.com)
- [ ] Note Client ID
- [ ] Note Client Secret
- [ ] Don't share Client Secret!

### ngrok Setup
- [ ] Start ngrok in terminal: `ngrok http 8787`
- [ ] Copy public URL (e.g., https://abc123.ngrok-free.app)
- [ ] Keep ngrok terminal running

### Auth0 Redirect URLs
- [ ] Back in Auth0 Settings tab
- [ ] Find "Allowed Callback URLs"
- [ ] Add: `https://your-ngrok-url/oauth/callback`
- [ ] Find "Allowed Logout URLs"
- [ ] Add: `https://your-ngrok-url`
- [ ] Find "Allowed Web Origins"
- [ ] Add: `https://your-ngrok-url`
- [ ] Click "Save Changes"

### Environment Configuration
- [ ] Navigate to `server/` directory
- [ ] Run: `cp .env.example .env`
- [ ] Edit `.env` with your Auth0 credentials
- [ ] Fill in AUTH0_DOMAIN
- [ ] Fill in AUTH0_CLIENT_ID
- [ ] Fill in AUTH0_CLIENT_SECRET
- [ ] Fill in REDIRECT_URI (with ngrok URL)
- [ ] Fill in NGROK_URL
- [ ] Save `.env` file
- [ ] DON'T commit `.env` to git

---

## Phase 3: Installation

### Server Installation
- [ ] Navigate to `server/` directory
- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Check for any errors
- [ ] Verify node_modules directory created

### Dependency Verification
- [ ] Check `jsonwebtoken` installed
- [ ] Check `jwks-rsa` installed
- [ ] Check `dotenv` installed
- [ ] Check other dependencies present

---

## Phase 4: Startup & Verification

### Start Server
- [ ] Run: `npm start` (or `node server-oauth.cjs`)
- [ ] Should see startup message with ASCII art
- [ ] Should show "READY" status
- [ ] Note the server port (default 8787)
- [ ] Keep server running in terminal

### Health Check
- [ ] Open new terminal window
- [ ] Run: `curl http://localhost:8787/health`
- [ ] Should return: `{"ok":true,"oauth_enabled":true}`

### Configuration Verification
- [ ] Server should display:
  - [ ] Auth0 domain
  - [ ] Client ID (first 10 chars)
  - [ ] Status: READY
- [ ] All OAuth endpoints should be shown

---

## Phase 5: Testing

### Automated Testing
- [ ] Run: `chmod +x TEST_OAUTH.sh`
- [ ] Run: `./TEST_OAUTH.sh`
- [ ] Enter ngrok URL when prompted
- [ ] All 9 tests should pass:
  - [ ] Health check
  - [ ] OpenID configuration
  - [ ] Public tool (get_routine_guide)
  - [ ] Search products
  - [ ] Protected tool rejection
  - [ ] Tools list
  - [ ] Documentation
  - [ ] OAuth server metadata
  - [ ] Protected resource metadata

### Manual Testing

**Test 1: Public Tool**
- [ ] Run curl command for `get_routine_guide`
- [ ] Should return morning routine data
- [ ] No authentication required
- [ ] Response time < 200ms

**Test 2: Protected Tool Rejection**
- [ ] Run curl command for `log_skin_condition` (no auth)
- [ ] Should return: "Unauthorized: Valid OAuth token required"
- [ ] Should include scopes required

**Test 3: OpenID Configuration**
- [ ] Visit: `http://localhost:8787/.well-known/openid-configuration`
- [ ] Should return JSON with OAuth endpoints
- [ ] Should include issuer, token_endpoint, authorization_endpoint

**Test 4: Health Check**
- [ ] Visit: `http://localhost:8787/health`
- [ ] Should return ok=true
- [ ] Should show oauth_enabled=true

---

## Phase 6: ChatGPT Integration

### Add MCP Server to ChatGPT
- [ ] Open ChatGPT in browser
- [ ] Click profile icon
- [ ] Go to Settings
- [ ] Find "Developer Mode"
- [ ] Click "Add MCP Server" or similar
- [ ] Enter MCP Server URL: `https://your-ngrok-url/mcp`
- [ ] Select Protocol: HTTP
- [ ] Click "Add"

### Test Public Tool in ChatGPT
- [ ] Start new conversation with ChatGPT
- [ ] Ask: "What's the morning skincare routine?"
- [ ] ChatGPT should call `get_routine_guide`
- [ ] Should display 6-step routine
- [ ] No authentication needed

### Test Protected Tool in ChatGPT
- [ ] In same conversation
- [ ] Ask: "Log my skin condition - hydration 8, sensitivity 5"
- [ ] ChatGPT should detect OAuth required
- [ ] Auth0 login popup should appear
- [ ] Login to Auth0
- [ ] Grant permission when asked
- [ ] ChatGPT should call tool with Bearer token
- [ ] Should return success: "Skin log saved: [ID]"

### Test Data Isolation
- [ ] Ask ChatGPT: "Show my skin history for 30 days"
- [ ] ChatGPT should call `get_skin_history` with your Bearer token
- [ ] Should show only YOUR logs (logged in user)
- [ ] Should NOT show other users' logs

---

## Phase 7: Security Review

### Authentication
- [ ] PKCE implementation in place
- [ ] JWT signature validation working
- [ ] Token expiration configured (1 hour)
- [ ] Refresh token working (7 days)

### Authorization
- [ ] Scopes properly defined
- [ ] User isolation by Auth0 sub
- [ ] Protected tools require auth
- [ ] Public tools accessible

### Data Security
- [ ] User data stored per user_id
- [ ] No data leakage between users
- [ ] HTTPS enforced (via ngrok)
- [ ] No secrets in code

---

## Phase 8: Documentation Review

### Essential Documents
- [ ] Read `OAUTH_QUICK_START.md`
- [ ] Read `OAUTH_SETUP.md`
- [ ] Reviewed `TOOLS_REFERENCE.md`
- [ ] Checked `IMPLEMENTATION_SUMMARY.md`
- [ ] Read `README_OAUTH.md`

### Code Review
- [ ] Reviewed `server-oauth.cjs` code
- [ ] Understood OAuth flow implementation
- [ ] Understood token validation
- [ ] Understood user isolation mechanism

---

## Phase 9: Production Readiness

### Code Changes (if deploying)
- [ ] Replace in-memory storage with database
- [ ] Add rate limiting
- [ ] Configure CORS restrictions
- [ ] Add audit logging
- [ ] Add error handling improvements

### Infrastructure (if deploying)
- [ ] Choose hosting platform
- [ ] Set up custom domain
- [ ] Configure SSL/TLS certificates
- [ ] Set up database
- [ ] Configure environment variables

### Security (if deploying)
- [ ] Rotate secret keys
- [ ] Enable audit logging
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Plan disaster recovery

---

## Final Sign-Off

### Implementation Complete
- [ ] All phases completed
- [ ] All tests passing
- [ ] All documentation reviewed
- [ ] Security checklist verified
- [ ] Ready for ChatGPT integration or production

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| `OAUTH_QUICK_START.md` | 5-minute setup |
| `OAUTH_SETUP.md` | Complete setup guide |
| `TOOLS_REFERENCE.md` | API reference |
| `IMPLEMENTATION_SUMMARY.md` | Architecture |
| `README_OAUTH.md` | Overview |
| `TEST_OAUTH.sh` | Automated tests |

---

**Status:** Ready for Implementation
**Version:** 1.0.0
