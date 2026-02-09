# K-Beauty Tools Reference

Complete reference for all available tools in the K-Beauty MCP Server with OAuth 2.0.

## Tool Categories

### Public Tools (No Authentication Required)
- get_routine_guide
- search_products
- get_product_details
- get_routine_tips
- recommend_routine

### Protected Tools (OAuth Required)
- log_skin_condition
- get_skin_history

---

## Public Tools

### 1. get_routine_guide

Get a complete AM or PM skincare routine with step-by-step instructions.

**Authentication:** None required

**Parameters:**
```json
{
  "routine_type": "morning" | "evening"
}
```

**Example Request:**
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

**Response Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Morning Skincare Routine - 6 Steps" }],
    "_meta": {
      "structuredContent": {
        "routine_type": "morning",
        "total_steps": 6,
        "estimated_time_minutes": 12,
        "steps": [
          {
            "order": 1,
            "name_en": "Cleanser",
            "name_ko": "클렌저",
            "description_en": "Use a gentle cleanser",
            "description_ko": "부드러운 클렌저 사용",
            "estimated_time_minutes": 2,
            "tips_en": "Use lukewarm water",
            "tips_ko": "미온수 사용"
          },
          ...
        ]
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "What's the morning skincare routine?"
ChatGPT: Calls get_routine_guide with routine_type="morning"
Result: Displays 6-step routine with timings
```

---

### 2. search_products

Search for K-beauty products by name or brand.

**Authentication:** None required

**Parameters:**
```json
{
  "query": "string (required)"
}
```

**Example Request:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_products",
      "arguments": { "query": "essence" }
    }
  }'
```

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Found 2 products" }],
    "_meta": {
      "structuredContent": {
        "query": "essence",
        "total_results": 2,
        "results": [
          {
            "id": "sulwhasoo-serum",
            "brand": "Sulwhasoo",
            "name_en": "First Care Activating Serum EX",
            "name_ko": "설화수 자음생 에센스",
            "category": "essence",
            "price_usd": 110,
            "rating": 4.8
          },
          {
            "id": "cosrx-snail",
            "brand": "COSRX",
            "name_en": "Advanced Snail 96 Mucin Power Essence",
            "name_ko": "COSRX 어드밴스드 스넬",
            "category": "essence",
            "price_usd": 21,
            "rating": 4.7
          }
        ]
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "Find K-beauty essences"
ChatGPT: Calls search_products with query="essence"
Result: Shows 2 essence products with ratings and prices
```

---

### 3. get_product_details

Get detailed information about a specific K-beauty product.

**Authentication:** None required

**Parameters:**
```json
{
  "product_id": "string (required)"
}
```

**Available Product IDs:**
- `sulwhasoo-serum`
- `cosrx-snail`
- `innisfree-greentea`
- `laneige-waterbank`

**Example Request:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_product_details",
      "arguments": { "product_id": "sulwhasoo-serum" }
    }
  }'
```

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Sulwhasoo First Care Activating Serum EX" }],
    "_meta": {
      "structuredContent": {
        "id": "sulwhasoo-serum",
        "brand": "Sulwhasoo",
        "name_en": "First Care Activating Serum EX",
        "name_ko": "설화수 자음생 에센스",
        "category": "essence",
        "price_usd": 110,
        "rating": 4.8,
        "main_ingredients": ["Ginseng", "Fermented botanicals"],
        "skin_type_suitable": ["All"],
        "texture_en": "Lightweight serum",
        "texture_ko": "가벼운 세럼",
        "how_to_use_en": "Apply to face and neck."
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "Tell me about Sulwhasoo serum"
ChatGPT: Calls get_product_details with product_id="sulwhasoo-serum"
Result: Shows full product details with ingredients and price
```

---

### 4. get_routine_tips

Get pro tips and common mistakes for a specific routine step.

**Authentication:** None required

**Parameters:**
```json
{
  "step_name": "string (required, e.g., 'Cleanser', 'Eye Cream')"
}
```

**Example Request:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_routine_tips",
      "arguments": { "step_name": "Cleanser" }
    }
  }'
```

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Tips for Cleanser" }],
    "_meta": {
      "structuredContent": {
        "step_name": "Cleanser",
        "pro_tips": [
          "Use lukewarm water",
          "Massage gently"
        ],
        "common_mistakes": [
          "Too hot water",
          "Rubbing harshly"
        ]
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "How do I properly cleanse?"
ChatGPT: Calls get_routine_tips with step_name="Cleanser"
Result: Shows best practices and mistakes to avoid
```

---

### 5. recommend_routine

Get personalized skincare routine recommendations based on skin type.

**Authentication:** None required

**Parameters:**
```json
{
  "skin_type": "dry" | "oily" | "combination" | "sensitive" (required)
}
```

**Example Request:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "recommend_routine",
      "arguments": { "skin_type": "dry" }
    }
  }'
```

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Routine for dry skin" }],
    "_meta": {
      "structuredContent": {
        "skin_type": "dry",
        "focus": "Hydration",
        "morning_routine": ["Cleanser", "Essence", "Moisturizer"]
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "I have dry skin, what routine should I follow?"
ChatGPT: Calls recommend_routine with skin_type="dry"
Result: Recommends hydration-focused routine
```

---

## Protected Tools (OAuth Required)

Protected tools require OAuth 2.0 authentication. When you try to use them in ChatGPT, it automatically:
1. Detects the OAuth requirement
2. Opens Auth0 login page
3. You sign in
4. Permission popup appears
5. Tool executes with your authorization

### 1. log_skin_condition

Log your current skin condition with hydration and sensitivity levels.

**Authentication:** OAuth 2.0 required (scope: `skin:write`)

**Parameters:**
```json
{
  "hydration_level": number (1-10, required),
  "sensitivity_level": number (1-10, required),
  "notes": string (optional)
}
```

**Example Request:**
```bash
# First, get access token via OAuth flow
# Then use it in the request:

curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "log_skin_condition",
      "arguments": {
        "hydration_level": 8,
        "sensitivity_level": 4,
        "notes": "Skin felt great after morning routine"
      }
    }
  }'
```

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Skin log saved: ABC12345" }],
    "_meta": {
      "structuredContent": {
        "log_id": "ABC12345",
        "timestamp": "2024-02-09T14:30:00Z",
        "hydration_level": 8,
        "sensitivity_level": 4,
        "saved": true,
        "user_id": "auth0|xxx"
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "Log my skin condition: hydration 8, sensitivity 4"
ChatGPT: Detects OAuth required → Opens Auth0 login
User: Logs in with Auth0
ChatGPT: Calls log_skin_condition with Bearer token
Result: "Skin log saved: ABC12345"
```

**Hydration Level Guide:**
- 1-3: Very dry (needs intensive moisture)
- 4-6: Normal (balanced)
- 7-9: Hydrated (healthy)
- 10: Over-hydrated (may cause sensitivity)

**Sensitivity Level Guide:**
- 1-3: Low (tolerates most products)
- 4-6: Moderate (occasional irritation)
- 7-9: High (reacts to many products)
- 10: Very high (careful product selection needed)

---

### 2. get_skin_history

Retrieve your skin condition logs from the past N days.

**Authentication:** OAuth 2.0 required (scope: `skin:read`)

**Parameters:**
```json
{
  "days": number (1-365, default: 30)
}
```

**Example Request:**
```bash
curl -X POST https://xxx.ngrok-free.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
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

**Response Example:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "Skin history for 30 days (15 logs)" }],
    "_meta": {
      "structuredContent": {
        "period_days": 30,
        "total_logs": 15,
        "user_id": "auth0|xxx",
        "logs": [
          {
            "id": "ABC12345",
            "user_id": "auth0|xxx",
            "timestamp": "2024-02-09T14:30:00Z",
            "hydration_level": 8,
            "sensitivity_level": 4,
            "notes": "Skin felt great after morning routine",
            "created_at": "2024-02-09T14:30:00Z"
          },
          {
            "id": "ABC12346",
            "user_id": "auth0|xxx",
            "timestamp": "2024-02-08T19:45:00Z",
            "hydration_level": 7,
            "sensitivity_level": 5,
            "notes": "Slightly irritated after trying new essence",
            "created_at": "2024-02-08T19:45:00Z"
          },
          ...
        ]
      }
    }
  }
}
```

**In ChatGPT:**
```
User: "Show me my skin history for the last 30 days"
ChatGPT: Detects OAuth required → Opens Auth0 login (if not already logged in)
User: Logs in with Auth0
ChatGPT: Calls get_skin_history with Bearer token
Result: Shows 15 logs with trends and insights
```

---

## Tool Usage Examples in ChatGPT

### Example 1: Create a Morning Routine

**User:** "I have oily skin. What's a good morning routine?"

**ChatGPT:**
1. Calls `recommend_routine` with skin_type="oily"
2. Calls `get_routine_guide` with routine_type="morning"
3. Calls `get_routine_tips` for key steps
4. Displays: Morning routine optimized for oil control

---

### Example 2: Log Skin Over Time

**User:** "Log my skin condition: hydration 8, sensitivity 3, notes 'feels great today'"

**ChatGPT:**
1. Detects `log_skin_condition` requires OAuth
2. Opens Auth0 login popup
3. User logs in
4. Calls `log_skin_condition` with hydration_level=8, sensitivity_level=3
5. Displays: "Skin log saved: ABC12345"

**Next Day - User:** "What was my skin like yesterday?"

**ChatGPT:**
1. Calls `get_skin_history` with days=30 (uses existing OAuth token)
2. Displays: 30-day trend showing improving hydration

---

### Example 3: Find a Product

**User:** "Find me a good moisturizer and tell me about Laneige Water Bank"

**ChatGPT:**
1. Calls `search_products` with query="moisturizer"
2. Calls `get_product_details` with product_id="laneige-waterbank"
3. Displays: Product details with price, ingredients, ratings

---

## OAuth Scopes

| Scope | Purpose | Tools |
|-------|---------|-------|
| `openid` | Authentication/identity | All protected tools |
| `profile` | User profile info | All protected tools |
| `email` | User email address | All protected tools |
| `skin:read` | Read skin history | `get_skin_history` |
| `skin:write` | Write skin logs | `log_skin_condition` |

---

## Error Handling

### Unauthorized (401)

**Scenario:** Calling protected tool without OAuth token

**Response:**
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

**Solution:** ChatGPT will automatically open OAuth login. Sign in with Auth0.

### Invalid Grant (400)

**Scenario:** Expired authorization code

**Response:**
```json
{
  "error": "invalid_grant"
}
```

**Solution:** Retry the OAuth flow. Authorization codes expire after 10 minutes.

### Token Expired (401)

**Scenario:** Using an expired access token

**Response:**
```json
{
  "error": "invalid_token"
}
```

**Solution:** ChatGPT handles refresh automatically. If not, re-login.

---

## Data Privacy

Your skin data is:
- ✅ Stored per user (identified by Auth0 sub claim)
- ✅ Never shared with other users
- ✅ Encrypted in transit (HTTPS)
- ✅ Only accessible with your Bearer token

---

## Performance

Expected response times:
- Public tools: < 100ms
- Protected tools: < 200ms (includes token validation)
- OAuth flow: 5-30 seconds (depends on Auth0)

---

**Last Updated:** 2026-02-09
**Version:** 1.0.0
