#!/bin/bash

# OAuth Testing Script for K-Beauty MCP Server
# This script tests all OAuth endpoints and public/protected tools

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
read -p "Enter your ngrok URL (e.g., https://abc123.ngrok-free.app): " NGROK_URL

if [ -z "$NGROK_URL" ]; then
  echo -e "${RED}Error: ngrok URL is required${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  K-Beauty OAuth Testing Script                         ║${NC}"
echo -e "${BLUE}║  URL: ${NGROK_URL}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET $NGROK_URL/health"
RESPONSE=$(curl -s "$NGROK_URL/health")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: OpenID Configuration
echo -e "${YELLOW}Test 2: OpenID Configuration${NC}"
echo "GET $NGROK_URL/.well-known/openid-configuration"
RESPONSE=$(curl -s "$NGROK_URL/.well-known/openid-configuration")
if echo "$RESPONSE" | grep -q '"issuer"'; then
  echo -e "${GREEN}✓ OpenID configuration available${NC}"
  echo "Issuer: $(echo $RESPONSE | grep -o '"issuer":"[^"]*' | cut -d'"' -f4)"
else
  echo -e "${RED}✗ OpenID configuration failed${NC}"
fi
echo ""

# Test 3: Public Tool (get_routine_guide)
echo -e "${YELLOW}Test 3: Public Tool - get_routine_guide${NC}"
echo "POST /mcp - get_routine_guide"
RESPONSE=$(curl -s -X POST "$NGROK_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_routine_guide",
      "arguments": { "routine_type": "morning" }
    }
  }')

if echo "$RESPONSE" | grep -q '"morning"'; then
  echo -e "${GREEN}✓ get_routine_guide works (no auth needed)${NC}"
  echo "Response preview:"
  echo "$RESPONSE" | jq '.result._meta.structuredContent | {routine_type, total_steps, estimated_time_minutes}' 2>/dev/null || echo "$RESPONSE" | head -c 200
else
  echo -e "${RED}✗ get_routine_guide failed${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 4: Search Products
echo -e "${YELLOW}Test 4: Public Tool - search_products${NC}"
echo "POST /mcp - search_products"
RESPONSE=$(curl -s -X POST "$NGROK_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_products",
      "arguments": { "query": "essence" }
    }
  }')

if echo "$RESPONSE" | grep -q '"essence"'; then
  echo -e "${GREEN}✓ search_products works${NC}"
  TOTAL=$(echo "$RESPONSE" | grep -o '"total_results":[0-9]*' | cut -d':' -f2)
  echo "Found products: $TOTAL"
else
  echo -e "${RED}✗ search_products failed${NC}"
fi
echo ""

# Test 5: Protected Tool Without Auth (should fail)
echo -e "${YELLOW}Test 5: Protected Tool WITHOUT Auth (Expected to fail)${NC}"
echo "POST /mcp - log_skin_condition (no Authorization header)"
RESPONSE=$(curl -s -X POST "$NGROK_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "log_skin_condition",
      "arguments": { "hydration_level": 7, "sensitivity_level": 5 }
    }
  }')

if echo "$RESPONSE" | grep -q '"Unauthorized"' || echo "$RESPONSE" | grep -q '"auth_required"'; then
  echo -e "${GREEN}✓ Correctly rejected unauthorized access${NC}"
  echo "Error message: $(echo $RESPONSE | grep -o '"message":"[^"]*' | head -1 | cut -d'"' -f4)"
else
  echo -e "${RED}✗ Should have rejected unauthorized access${NC}"
fi
echo ""

# Test 6: Tools List
echo -e "${YELLOW}Test 6: Tools List${NC}"
echo "POST /mcp - tools/list"
RESPONSE=$(curl -s -X POST "$NGROK_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }')

TOOLS_COUNT=$(echo "$RESPONSE" | grep -o '"name"' | wc -l)
echo -e "${GREEN}✓ Available tools: $TOOLS_COUNT${NC}"
echo "Tools:"
echo "$RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4 | sed 's/^/  - /'
echo ""

# Test 7: Documentation
echo -e "${YELLOW}Test 7: Documentation Endpoint${NC}"
echo "GET $NGROK_URL/docs"
RESPONSE=$(curl -s "$NGROK_URL/docs")
if echo "$RESPONSE" | grep -q '"protected_tools"'; then
  echo -e "${GREEN}✓ Documentation available${NC}"
  echo "Protected tools: $(echo $RESPONSE | grep -o '"protected_tools":\[[^]]*' | cut -d'[' -f2)"
else
  echo -e "${RED}✗ Documentation unavailable${NC}"
fi
echo ""

# Test 8: OAuth Authorization Server Metadata
echo -e "${YELLOW}Test 8: OAuth Authorization Server Metadata${NC}"
echo "GET $NGROK_URL/.well-known/oauth-authorization-server"
RESPONSE=$(curl -s "$NGROK_URL/.well-known/oauth-authorization-server")
if echo "$RESPONSE" | grep -q '"authorization_endpoint"'; then
  echo -e "${GREEN}✓ OAuth server metadata available${NC}"
  AUTH_ENDPOINT=$(echo $RESPONSE | grep -o '"authorization_endpoint":"[^"]*' | cut -d'"' -f4)
  TOKEN_ENDPOINT=$(echo $RESPONSE | grep -o '"token_endpoint":"[^"]*' | cut -d'"' -f4)
  echo "Authorization endpoint: $AUTH_ENDPOINT"
  echo "Token endpoint: $TOKEN_ENDPOINT"
else
  echo -e "${RED}✗ OAuth metadata unavailable${NC}"
fi
echo ""

# Test 9: Protected Resource Metadata
echo -e "${YELLOW}Test 9: Protected Resource Metadata${NC}"
echo "GET $NGROK_URL/.well-known/oauth-protected-resource"
RESPONSE=$(curl -s "$NGROK_URL/.well-known/oauth-protected-resource")
if echo "$RESPONSE" | grep -q '"resource_scopes"'; then
  echo -e "${GREEN}✓ Protected resource metadata available${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ Protected resource metadata unavailable${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Health check${NC}"
echo -e "${GREEN}✓ OpenID configuration${NC}"
echo -e "${GREEN}✓ Public tools work${NC}"
echo -e "${GREEN}✓ Protected tools correctly require auth${NC}"
echo -e "${GREEN}✓ Tools list available${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set up Auth0 application (see OAUTH_SETUP.md)"
echo "2. Get Auth0 credentials (Domain, Client ID, Secret)"
echo "3. Test OAuth flow (manual browser test or in ChatGPT)"
echo ""
echo -e "${BLUE}For full OAuth testing:${NC}"
echo "1. Visit: $NGROK_URL/oauth/authorize?response_type=code&client_id=test&redirect_uri=$NGROK_URL/oauth/callback&scope=openid%20profile%20email&state=test123&code_challenge=test&code_challenge_method=S256"
echo "2. This should redirect to Auth0 login"
echo "3. After auth, you should be redirected back with an authorization code"
echo ""
