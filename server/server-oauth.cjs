#!/usr/bin/env node
// K-Beauty MCP Server with OAuth 2.0 (Auth0)
// Implements PKCE flow with JWT validation

const express = require('express');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { JwksClient } = require('jwks-rsa');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8787;

// OAuth Configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'your-domain.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'your_client_id';
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || 'your_client_secret';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8787/oauth/callback';
const NGROK_URL = process.env.NGROK_URL || 'http://localhost:8787';

// JWKS Client for token validation
const jwksClient = new JwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 600000
});

// In-memory storage (development only - use database in production)
const userSkinLogs = new Map(); // user_id -> [logs]
const sessions = new Map();
const authorizationCodes = new Map(); // code -> { userId, expiresAt }
const pkceStates = new Map(); // state -> { codeChallenge, expiresAt }

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Mock Data
const morningRoutine = [
  { order: 1, name_en: 'Cleanser', name_ko: '클렌저', description_en: 'Use a gentle cleanser suitable for morning', description_ko: '아침에 사용하기 좋은 부드러운 클렌저', product_category: 'cleanser', estimated_time_minutes: 2, tips_en: 'Use lukewarm water, massage gently for 60 seconds', tips_ko: '미온수 사용, 60초간 부드럽게 마사지' },
  { order: 2, name_en: 'Essence', name_ko: '에센스', description_en: 'Apply essence for hydration', description_ko: '수분 공급을 위해 에센스 사용', product_category: 'essence', estimated_time_minutes: 1, tips_en: 'Lightly pat into skin with fingertips', tips_ko: '손가락으로 살짝 두드려 흡수시키기' },
  { order: 3, name_en: 'Vitamin C Serum', name_ko: '비타민C 세럼', description_en: 'Apply Vitamin C serum for brightening', description_ko: '밝은 피부 톤을 위해 비타민C 세럼 사용', product_category: 'serum', estimated_time_minutes: 2, tips_en: 'Use 3-4 drops, wait 1-2 minutes before next step', tips_ko: '3~4방울 사용, 다음 단계 전 1~2분 대기' },
  { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', description_en: 'Apply eye cream to prevent fine lines', description_ko: '잔주름 방지를 위해 아이크림 사용', product_category: 'eye_cream', estimated_time_minutes: 1, tips_en: 'Use ring finger, gently tap around eye area', tips_ko: '약지 사용, 눈 주변 부드럽게 톡톡 두드리기' },
  { order: 5, name_en: 'Moisturizer', name_ko: '모이스처라이저', description_en: 'Apply moisturizer to lock in hydration', description_ko: '수분 보습을 위해 모이스처라이저 사용', product_category: 'moisturizer', estimated_time_minutes: 2, tips_en: 'Use upward strokes, wait until fully absorbed', tips_ko: '상향 스트로크 사용, 완전히 흡수될 때까지 대기' },
  { order: 6, name_en: 'SPF 50+ Sunscreen', name_ko: 'SPF 50+ 선크림', description_en: 'Apply broad-spectrum sunscreen (SPF 50+)', description_ko: '광범위 자외선 차단 선크림 (SPF 50+) 사용', product_category: 'sunscreen', estimated_time_minutes: 2, tips_en: 'Apply generously, reapply every 2 hours if outdoors', tips_ko: '넉넉하게 사용, 야외 활동 시 2시간마다 재도포' }
];

const eveningRoutine = [
  { order: 1, name_en: 'Cleanser', name_ko: '클렌저', description_en: 'Double cleanse', description_ko: '더블 클렌징', product_category: 'cleanser', estimated_time_minutes: 3, tips_en: 'Oil then water-based', tips_ko: '오일 후 수성' },
  { order: 2, name_en: 'Essence', name_ko: '에센스', description_en: 'Extra hydration', description_ko: '추가 수분', product_category: 'essence', estimated_time_minutes: 1, tips_en: 'Layering ok', tips_ko: '레이어링 가능' },
  { order: 3, name_en: 'Niacinamide Serum', name_ko: '나이아신아마이드 세럼', description_en: 'Pore refinement', description_ko: '모공 정돈', product_category: 'serum', estimated_time_minutes: 2, tips_en: 'Oil control', tips_ko: '피지 조절' },
  { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', description_en: 'Overnight recovery', description_ko: '밤샘 회복', product_category: 'eye_cream', estimated_time_minutes: 1, tips_en: 'Rich formula', tips_ko: '진한 포뮬러' },
  { order: 5, name_en: 'Night Cream', name_ko: '나이트 크림', description_en: 'Intensive repair', description_ko: '집중 재생', product_category: 'night_cream', estimated_time_minutes: 2, tips_en: 'Heavy is ok', tips_ko: '진함 괜찮음' },
  { order: 6, name_en: 'Lip Balm', name_ko: '립 밤', description_en: 'Lip recovery', description_ko: '입술 케어', product_category: 'lip_balm', estimated_time_minutes: 1, tips_en: 'Apply thickly', tips_ko: '넉넉하게 사용' }
];

const products = [
  { id: 'sulwhasoo-serum', brand: 'Sulwhasoo', name_en: 'First Care Activating Serum EX', name_ko: '설화수 자음생 에센스 EX', category: 'essence', price_usd: 110, rating: 4.8, image_url: 'https://via.placeholder.com/300x300?text=Sulwhasoo', main_ingredients: ['Ginseng', 'Fermented botanicals'], skin_type_suitable: ['All'], texture_en: 'Lightweight serum', texture_ko: '가벼운 세럼' },
  { id: 'cosrx-snail', brand: 'COSRX', name_en: 'Advanced Snail 96 Mucin Power Essence', name_ko: 'COSRX 어드밴스드 스넬', category: 'essence', price_usd: 21, rating: 4.7, image_url: 'https://via.placeholder.com/300x300?text=COSRX', main_ingredients: ['Snail secretion', 'Hyaluronic acid'], skin_type_suitable: ['Dry', 'Sensitive'], texture_en: 'Viscous essence', texture_ko: '점성 에센스' },
  { id: 'innisfree-greentea', brand: 'Innisfree', name_en: 'Green Tea Seed Serum', name_ko: '이니스프리 그린티 씨드 세럼', category: 'serum', price_usd: 35, rating: 4.6, image_url: 'https://via.placeholder.com/300x300?text=Innisfree', main_ingredients: ['Green tea', 'Niacinamide'], skin_type_suitable: ['Oily', 'Combination'], texture_en: 'Lightweight serum', texture_ko: '가벼운 세럼' },
  { id: 'laneige-waterbank', brand: 'Laneige', name_en: 'Water Bank Hydro Cream', name_ko: '라네즈 워터뱅크 하이드로 크림', category: 'moisturizer', price_usd: 45, rating: 4.8, image_url: 'https://via.placeholder.com/300x300?text=Laneige', main_ingredients: ['Water bank complex', 'Hyaluronic acid'], skin_type_suitable: ['Dry', 'Normal'], texture_en: 'Light gel cream', texture_ko: '젤 크림' }
];

// Helper functions
function generateRandomString(length = 32) {
  return require('crypto').randomBytes(length).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

function getKeyFromToken(header) {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) reject(err);
      else resolve(key.getPublicKey());
    });
  });
}

async function validateToken(bearerToken) {
  try {
    if (!bearerToken) return null;

    const token = bearerToken.replace('Bearer ', '');
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) return null;

    const key = await getKeyFromToken(decoded.header);
    const verified = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });

    return verified;
  } catch (error) {
    console.error('Token validation error:', error.message);
    return null;
  }
}

// Tool Handlers
const tools = {
  get_routine_guide: async (input) => {
    const routine = input.routine_type === 'morning' ? morningRoutine : eveningRoutine;
    const totalTime = routine.reduce((sum, step) => sum + step.estimated_time_minutes, 0);
    return {
      content: [{ type: 'text', text: `${input.routine_type} Skincare Routine - 6 Steps` }],
      structuredContent: {
        routine_type: input.routine_type,
        total_steps: 6,
        estimated_time_minutes: totalTime,
        steps: routine
      }
    };
  },

  search_products: async (input) => {
    const queryLower = input.query.toLowerCase();
    const results = products.filter(p =>
      p.name_en.toLowerCase().includes(queryLower) ||
      p.brand.toLowerCase().includes(queryLower)
    );
    return {
      content: [{ type: 'text', text: `Found ${results.length} products` }],
      structuredContent: {
        query: input.query,
        total_results: results.length,
        results
      }
    };
  },

  get_product_details: async (input) => {
    const product = products.find(p => p.id === input.product_id);
    if (!product) {
      return { content: [{ type: 'text', text: 'Product not found' }] };
    }
    return {
      content: [{ type: 'text', text: `${product.brand} ${product.name_en}` }],
      structuredContent: { ...product, how_to_use_en: 'Apply to face and neck.' }
    };
  },

  get_routine_tips: async (input) => {
    return {
      content: [{ type: 'text', text: `Tips for ${input.step_name}` }],
      structuredContent: {
        step_name: input.step_name,
        pro_tips: ['Use lukewarm water', 'Massage gently'],
        common_mistakes: ['Too hot water', 'Rubbing harshly']
      }
    };
  },

  recommend_routine: async (input) => {
    const recommendations = {
      dry: { focus: 'Hydration', morning_routine: ['Cleanser', 'Essence', 'Moisturizer'] },
      oily: { focus: 'Oil control', morning_routine: ['Foaming cleanser', 'Mattifying essence'] },
      combination: { focus: 'Balance', morning_routine: ['Mild cleanser', 'Essence'] },
      sensitive: { focus: 'Soothing', morning_routine: ['Gentle cleanser', 'Calming essence'] }
    };
    return {
      content: [{ type: 'text', text: `Routine for ${input.skin_type} skin` }],
      structuredContent: { skin_type: input.skin_type, ...recommendations[input.skin_type] }
    };
  },

  // Protected tools (require authentication)
  log_skin_condition: async (input, userId) => {
    if (!userId) {
      return {
        content: [{ type: 'text', text: 'Unauthorized' }],
        isError: true
      };
    }

    const logId = randomUUID().substring(0, 8).toUpperCase();
    const log = {
      id: logId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      hydration_level: input.hydration_level,
      sensitivity_level: input.sensitivity_level,
      notes: input.notes || '',
      created_at: new Date().toISOString()
    };

    if (!userSkinLogs.has(userId)) {
      userSkinLogs.set(userId, []);
    }
    userSkinLogs.get(userId).push(log);

    return {
      content: [{ type: 'text', text: `Skin log saved: ${logId}` }],
      structuredContent: {
        log_id: logId,
        timestamp: log.timestamp,
        hydration_level: input.hydration_level,
        sensitivity_level: input.sensitivity_level,
        saved: true,
        user_id: userId
      }
    };
  },

  get_skin_history: async (input, userId) => {
    if (!userId) {
      return {
        content: [{ type: 'text', text: 'Unauthorized' }],
        isError: true
      };
    }

    const days = input.days || 30;
    const logs = userSkinLogs.get(userId) || [];

    // Filter logs from the last N days
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filteredLogs = logs
      .filter(log => new Date(log.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      content: [{ type: 'text', text: `Skin history for ${days} days (${filteredLogs.length} logs)` }],
      structuredContent: {
        period_days: days,
        total_logs: filteredLogs.length,
        logs: filteredLogs,
        user_id: userId
      }
    };
  }
};

const toolDefinitions = [
  {
    name: 'get_routine_guide',
    description: 'Get AM or PM skincare routine with 6 steps',
    inputSchema: {
      type: 'object',
      properties: {
        routine_type: { type: 'string', enum: ['morning', 'evening'] }
      },
      required: ['routine_type']
    }
  },
  {
    name: 'search_products',
    description: 'Search for K-beauty products',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'get_product_details',
    description: 'Get product details',
    inputSchema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id']
    }
  },
  {
    name: 'get_routine_tips',
    description: 'Get routine tips',
    inputSchema: {
      type: 'object',
      properties: { step_name: { type: 'string' } },
      required: ['step_name']
    }
  },
  {
    name: 'recommend_routine',
    description: 'Recommend routine for skin type',
    inputSchema: {
      type: 'object',
      properties: {
        skin_type: { type: 'string', enum: ['dry', 'oily', 'combination', 'sensitive'] }
      },
      required: ['skin_type']
    }
  },
  {
    name: 'log_skin_condition',
    description: 'Log skin condition (requires authentication)',
    inputSchema: {
      type: 'object',
      properties: {
        hydration_level: { type: 'number', minimum: 1, maximum: 10 },
        sensitivity_level: { type: 'number', minimum: 1, maximum: 10 },
        notes: { type: 'string' }
      },
      required: ['hydration_level', 'sensitivity_level']
    },
    auth: {
      type: 'oauth2',
      scopes: ['openid', 'profile', 'email', 'skin:write']
    }
  },
  {
    name: 'get_skin_history',
    description: 'Get skin history (requires authentication)',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', minimum: 1, maximum: 365 } }
    },
    auth: {
      type: 'oauth2',
      scopes: ['openid', 'profile', 'email']
    }
  }
];

// OAuth Routes

// 1. OpenID Configuration
app.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: `https://${AUTH0_DOMAIN}/`,
    authorization_endpoint: `${NGROK_URL}/oauth/authorize`,
    token_endpoint: `${NGROK_URL}/oauth/token`,
    userinfo_endpoint: `${NGROK_URL}/oauth/me`,
    jwks_uri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    scopes_supported: ['openid', 'profile', 'email', 'skin:read', 'skin:write'],
    grant_types_supported: ['authorization_code'],
    response_types_supported: ['code'],
    token_endpoint_auth_methods_supported: ['client_secret_basic']
  });
});

// 2. OAuth Authorization Server Metadata
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: `https://${AUTH0_DOMAIN}/`,
    authorization_endpoint: `${NGROK_URL}/oauth/authorize`,
    token_endpoint: `${NGROK_URL}/oauth/token`,
    introspection_endpoint: `${NGROK_URL}/oauth/introspect`,
    revocation_endpoint: `${NGROK_URL}/oauth/revoke`,
    scopes_supported: ['openid', 'profile', 'email', 'skin:read', 'skin:write'],
    grant_types_supported: ['authorization_code'],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256']
  });
});

// 3. Authorization Endpoint (redirect to Auth0)
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;

  // Validate request
  if (response_type !== 'code' || !client_id || !redirect_uri || !state) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  // Store PKCE state
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  pkceStates.set(state, { codeChallenge: code_challenge, codeMethod: code_challenge_method, expiresAt });

  // Redirect to Auth0
  const auth0AuthUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  auth0AuthUrl.searchParams.append('client_id', AUTH0_CLIENT_ID);
  auth0AuthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  auth0AuthUrl.searchParams.append('response_type', 'code');
  auth0AuthUrl.searchParams.append('scope', scope || 'openid profile email');
  auth0AuthUrl.searchParams.append('state', state);
  auth0AuthUrl.searchParams.append('code_challenge', code_challenge || '');
  auth0AuthUrl.searchParams.append('code_challenge_method', code_challenge_method || 'S256');

  res.redirect(auth0AuthUrl.toString());
});

// 4. OAuth Callback (from Auth0)
app.get('/oauth/callback', (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ error, error_description: req.query.error_description });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  // Verify state
  const pkceData = pkceStates.get(state);
  if (!pkceData || pkceData.expiresAt < Date.now()) {
    pkceStates.delete(state);
    return res.status(400).json({ error: 'invalid_state' });
  }
  pkceStates.delete(state);

  // Exchange code for token with Auth0
  const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;
  const tokenData = {
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  };

  // In production, use a proper HTTP client (axios, node-fetch, etc.)
  // For now, we'll store the code and let the token endpoint handle it
  const authCode = randomUUID();
  const codeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  authorizationCodes.set(authCode, { auth0Code: code, userId: state, expiresAt: codeExpires });

  // Return success response with the auth code
  res.json({
    code: authCode,
    state,
    message: 'Authorization successful. Exchange code for token at /oauth/token'
  });
});

// 5. Token Endpoint (PKCE + authorization code)
app.post('/oauth/token', async (req, res) => {
  try {
    const { grant_type, code, code_verifier, client_id, client_secret, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code' || !code) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    // Verify authorization code
    const authData = authorizationCodes.get(code);
    if (!authData || authData.expiresAt < Date.now()) {
      authorizationCodes.delete(code);
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Verify PKCE code_verifier (if provided)
    // Note: In production, you should validate the code_verifier against the stored code_challenge
    // For this demo, we'll skip PKCE verification

    const userId = authData.userId;
    authorizationCodes.delete(code);

    // Generate access token (valid for 1 hour)
    const accessToken = jwt.sign(
      {
        sub: userId,
        aud: AUTH0_CLIENT_ID,
        iss: `https://${AUTH0_DOMAIN}/`,
        scope: 'openid profile email skin:read skin:write',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      AUTH0_CLIENT_SECRET || 'your-secret-key',
      { algorithm: 'HS256' }
    );

    // Generate refresh token (valid for 7 days)
    const refreshToken = jwt.sign(
      {
        sub: userId,
        aud: AUTH0_CLIENT_ID,
        iss: `https://${AUTH0_DOMAIN}/`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800
      },
      AUTH0_CLIENT_SECRET || 'your-secret-key',
      { algorithm: 'HS256' }
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile email skin:read skin:write'
    });
  } catch (error) {
    console.error('Token endpoint error:', error.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// 6. User Info Endpoint
app.get('/oauth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const verified = await validateToken(authHeader);
    if (!verified) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    res.json({
      sub: verified.sub,
      email: verified.sub + '@example.com',
      name: 'K-Beauty User',
      email_verified: true,
      updated_at: new Date().toISOString(),
      skin_type: 'combination'
    });
  } catch (error) {
    console.error('User info error:', error.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// Protected Resource Metadata
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource_documentation_uri: `${NGROK_URL}/docs`,
    resource_authentication_methods: ['Bearer'],
    resource_scopes: ['skin:read', 'skin:write']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    app: 'K-Beauty MCP Server for ChatGPT',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      mcp: '/mcp (POST)',
      health: '/health (GET)',
      docs: '/docs (GET)',
      oauth_config: '/.well-known/openid-configuration (GET)',
      oauth_protected_resource: '/.well-known/oauth-protected-resource (GET)'
    },
    description: 'Skincare routine and product recommendation service with OAuth 2.0 authentication'
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    auth0_domain: AUTH0_DOMAIN,
    oauth_enabled: true
  });
});

// MCP Protocol Handler (HTTP version)
app.post('/mcp', async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = req.headers['mcp-session-id'] || randomUUID();
    const authHeader = req.headers.authorization;

    if (!body.method) {
      return res.status(400).json({ error: 'No method' });
    }

    let response;

    if (body.method === 'initialize') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'kbeauty-skincare',
            version: '1.0.0',
            auth: {
              type: 'oauth2',
              oauth_url: `${NGROK_URL}/.well-known/openid-configuration`
            }
          }
        }
      };
    } else if (body.method === 'tools/list') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: toolDefinitions }
      };
    } else if (body.method === 'tools/call') {
      const toolName = body.params.name;
      const toolInput = body.params.arguments;

      if (tools[toolName]) {
        // Check if tool requires authentication
        const toolDef = toolDefinitions.find(t => t.name === toolName);
        const requiresAuth = toolDef && toolDef.auth;

        let userId = null;
        if (requiresAuth) {
          const verified = await validateToken(authHeader);
          if (!verified) {
            return res.status(401).json({
              jsonrpc: '2.0',
              id: body.id,
              error: {
                code: -32600,
                message: 'Unauthorized: Valid OAuth token required',
                data: {
                  auth_required: true,
                  scopes: toolDef.auth.scopes
                }
              }
            });
          }
          userId = verified.sub;
        }

        const result = await tools[toolName](toolInput, userId);
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: result.content,
            isError: result.isError || false,
            _meta: { structuredContent: result.structuredContent }
          }
        };
      } else {
        response = {
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32601, message: 'Tool not found' }
        };
      }
    }

    if (!sessionId.includes('-')) {
      sessions.set(sessionId, { createdAt: Date.now() });
      res.header('mcp-session-id', sessionId);
    }

    console.log(`📨 ${body.method} ${body.params?.name ? `(${body.params.name})` : ''}`);
    res.json(response);
  } catch (error) {
    console.error('MCP Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'K-Beauty MCP Server with OAuth 2.0',
    version: '1.0.0',
    description: 'Skincare routine and product recommendation service with user authentication',
    endpoints: {
      mcp: '/mcp (POST)',
      oauth_config: '/.well-known/openid-configuration (GET)',
      authorize: '/oauth/authorize (GET)',
      token: '/oauth/token (POST)',
      userinfo: '/oauth/me (GET)',
      health: '/health (GET)'
    },
    protected_tools: ['log_skin_condition', 'get_skin_history'],
    public_tools: ['get_routine_guide', 'search_products', 'get_product_details', 'get_routine_tips', 'recommend_routine']
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌸 K-Beauty MCP Server with OAuth 2.0                   ║
║                                                            ║
║   Endpoints:                                               ║
║   📡 MCP Server: http://localhost:${port}/mcp             ║
║   🔐 OAuth: /.well-known/openid-configuration             ║
║   💚 Health: http://localhost:${port}/health              ║
║   📖 Docs: http://localhost:${port}/docs                  ║
║                                                            ║
║   Auth0 Configuration:                                     ║
║   Domain: ${AUTH0_DOMAIN}                                ║
║   Client ID: ${AUTH0_CLIENT_ID.substring(0, 10)}...      ║
║                                                            ║
║   Status: ${AUTH0_DOMAIN && AUTH0_CLIENT_ID ? 'READY' : 'INCOMPLETE'}                                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\nServer stopped');
  process.exit(0);
});

module.exports = app;
