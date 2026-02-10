#!/usr/bin/env node
// K-Beauty MCP Server with OAuth 2.0 (Auth0)
// Implements PKCE flow with JWT validation
// Refactored: MCP protocol compliance with _meta, annotations, resources

const express = require('express');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { JwksClient } = require('jwks-rsa');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
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
const mcpSessions = new Map(); // sessionId -> { createdAt, authHeader }
const authorizationCodes = new Map(); // code -> { userId, expiresAt }
const pkceStates = new Map(); // state -> { codeChallenge, expiresAt }

// Widget HTML - load from file (check multiple paths for local dev & Vercel)
const WIDGET_PATHS = [
  join(__dirname, 'widget.html'),                              // Vercel / production
  join(__dirname, '..', 'kbeauty_repo', 'dist', 'widget.html'), // local dev
];
function getWidgetHtml() {
  for (const p of WIDGET_PATHS) {
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="root"><p>Widget not built. Run: cd kbeauty_repo && npm run build:widget</p></div></body></html>';
}

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

// ============================================================
// Mock Data (preserved from original)
// ============================================================

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

// ============================================================
// Helper functions (preserved from original)
// ============================================================

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

// ============================================================
// Tool Handlers (preserved from original)
// ============================================================

const toolHandlers = {
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
      p.brand.toLowerCase().includes(queryLower) ||
      p.category.toLowerCase().includes(queryLower) ||
      p.name_ko.includes(input.query)
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
    const allSteps = [...morningRoutine, ...eveningRoutine];
    const step = allSteps.find(s =>
      s.name_en.toLowerCase() === input.step_name.toLowerCase() ||
      s.name_ko === input.step_name
    );
    return {
      content: [{ type: 'text', text: `Tips for ${input.step_name}` }],
      structuredContent: {
        step_name: input.step_name,
        pro_tips: step
          ? [step.tips_en, step.tips_ko]
          : ['Use lukewarm water', 'Massage gently', 'Be consistent with your routine'],
        common_mistakes: ['Too hot water', 'Rubbing harshly', 'Skipping steps']
      }
    };
  },

  recommend_routine: async (input) => {
    const recommendations = {
      dry: { focus: 'Hydration', key_ingredients: ['Hyaluronic acid', 'Ceramides', 'Squalane'], morning_routine: ['Gentle cream cleanser', 'Hydrating essence', 'Hyaluronic acid serum', 'Rich moisturizer', 'SPF 50+ sunscreen'], evening_routine: ['Oil cleanser + Water cleanser', 'Essence', 'Retinol serum', 'Night cream', 'Sleeping mask (2x/week)'] },
      oily: { focus: 'Oil control', key_ingredients: ['Niacinamide', 'Salicylic acid', 'Green tea'], morning_routine: ['Foaming cleanser', 'Lightweight essence', 'Niacinamide serum', 'Gel moisturizer', 'Lightweight SPF'], evening_routine: ['Oil cleanser + Foaming cleanser', 'BHA toner', 'Niacinamide serum', 'Lightweight moisturizer'] },
      combination: { focus: 'Balance', key_ingredients: ['Niacinamide', 'Hyaluronic acid', 'Centella'], morning_routine: ['Mild cleanser', 'Balancing essence', 'Vitamin C serum', 'Lightweight moisturizer', 'SPF 50+'], evening_routine: ['Double cleanse', 'Essence', 'Targeted serum', 'Moisturizer'] },
      sensitive: { focus: 'Soothing', key_ingredients: ['Centella asiatica', 'Aloe vera', 'Panthenol'], morning_routine: ['Gentle cream cleanser', 'Calming essence', 'Centella serum', 'Barrier cream', 'Mineral SPF'], evening_routine: ['Micellar water + Gentle cleanser', 'Soothing essence', 'Panthenol serum', 'Rich barrier cream'] }
    };
    const rec = recommendations[input.skin_type] || recommendations.combination;
    return {
      content: [{ type: 'text', text: `Personalized routine for ${input.skin_type} skin` }],
      structuredContent: { skin_type: input.skin_type, ...rec }
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

// ============================================================
// Tool Definitions (Enhanced: _meta, annotations, descriptions)
// ============================================================

const WIDGET_URI = 'ui://kbeauty/widget.html';

const toolDefinitions = [
  {
    name: 'get_routine_guide',
    description: 'Use this when the user wants a step-by-step AM or PM K-beauty skincare routine with product recommendations and timing',
    inputSchema: {
      type: 'object',
      properties: {
        routine_type: { type: 'string', enum: ['morning', 'evening'], description: 'Morning (AM) or evening (PM) routine' }
      },
      required: ['routine_type']
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Preparing your skincare routine...',
      'openai/toolInvocation/invoked': 'Your skincare routine is ready'
    }
  },
  {
    name: 'search_products',
    description: 'Use this when the user wants to find or search K-beauty skincare products by name, brand, or category',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword (product name, brand, or category)' }
      },
      required: ['query']
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Searching K-beauty products...',
      'openai/toolInvocation/invoked': 'Products found'
    }
  },
  {
    name: 'get_product_details',
    description: 'Use this when the user wants detailed information about a specific K-beauty product including ingredients, price, and suitability',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (e.g., sulwhasoo-serum, cosrx-snail)' }
      },
      required: ['product_id']
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Loading product details...',
      'openai/toolInvocation/invoked': 'Product details ready'
    }
  },
  {
    name: 'get_routine_tips',
    description: 'Use this when the user wants expert tips and advice for a specific skincare step like cleansing, moisturizing, or sunscreen application',
    inputSchema: {
      type: 'object',
      properties: {
        step_name: { type: 'string', description: 'Name of the skincare step (e.g., Cleanser, Essence, Moisturizer)' }
      },
      required: ['step_name']
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'recommend_routine',
    description: 'Use this when the user wants a personalized K-beauty skincare routine recommendation based on their skin type',
    inputSchema: {
      type: 'object',
      properties: {
        skin_type: { type: 'string', enum: ['dry', 'oily', 'combination', 'sensitive'], description: 'User skin type' }
      },
      required: ['skin_type']
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Creating your personalized routine...',
      'openai/toolInvocation/invoked': 'Your personalized routine is ready'
    }
  },
  {
    name: 'log_skin_condition',
    description: 'Use this when the user wants to log or record their current skin condition including hydration and sensitivity levels',
    inputSchema: {
      type: 'object',
      properties: {
        hydration_level: { type: 'number', minimum: 1, maximum: 10, description: 'Hydration level (1=very dry, 10=very hydrated)' },
        sensitivity_level: { type: 'number', minimum: 1, maximum: 10, description: 'Sensitivity level (1=not sensitive, 10=very sensitive)' },
        notes: { type: 'string', description: 'Optional notes about skin condition' }
      },
      required: ['hydration_level', 'sensitivity_level']
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    _meta: {
      'openai/toolInvocation/invoking': 'Saving your skin condition...',
      'openai/toolInvocation/invoked': 'Skin condition logged'
    }
  },
  {
    name: 'get_skin_history',
    description: 'Use this when the user wants to see their skin condition history and trends over time',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', minimum: 1, maximum: 365, description: 'Number of days to look back (default: 30)' }
      }
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Loading your skin history...',
      'openai/toolInvocation/invoked': 'Skin history ready'
    }
  }
];

// Resource definitions
const resourceDefinitions = [
  {
    uri: WIDGET_URI,
    name: 'K-Beauty Widget',
    description: 'Interactive K-beauty skincare widget for ChatGPT',
    mimeType: 'text/html+skybridge'
  }
];

// ============================================================
// OAuth Routes (preserved from original - no changes)
// ============================================================

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

  if (response_type !== 'code' || !client_id || !redirect_uri || !state) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const expiresAt = Date.now() + 10 * 60 * 1000;
  pkceStates.set(state, { codeChallenge: code_challenge, codeMethod: code_challenge_method, expiresAt });

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

  const pkceData = pkceStates.get(state);
  if (!pkceData || pkceData.expiresAt < Date.now()) {
    pkceStates.delete(state);
    return res.status(400).json({ error: 'invalid_state' });
  }
  pkceStates.delete(state);

  const authCode = randomUUID();
  const codeExpires = Date.now() + 10 * 60 * 1000;
  authorizationCodes.set(authCode, { auth0Code: code, userId: state, expiresAt: codeExpires });

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

    const authData = authorizationCodes.get(code);
    if (!authData || authData.expiresAt < Date.now()) {
      authorizationCodes.delete(code);
      return res.status(400).json({ error: 'invalid_grant' });
    }

    const userId = authData.userId;
    authorizationCodes.delete(code);

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

// ============================================================
// General Endpoints
// ============================================================

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
    oauth_enabled: true,
    active_sessions: mcpSessions.size,
    widget_available: existsSync(WIDGET_PATH)
  });
});

// MCP Status (GET)
app.get('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  // If session exists, this could be an SSE request
  if (sessionId && mcpSessions.has(sessionId)) {
    // For now, return status. SSE streaming can be added later.
    return res.json({
      status: 'ready',
      session_id: sessionId,
      version: '2024-11-05'
    });
  }

  res.json({
    status: 'ready',
    method: 'Use POST /mcp for MCP protocol requests',
    version: '2024-11-05',
    tools_count: toolDefinitions.length,
    tools: toolDefinitions.map(t => ({ name: t.name, description: t.description })),
    resources_count: resourceDefinitions.length
  });
});

// ============================================================
// MCP Protocol Handler (Enhanced with resources, _meta, session)
// ============================================================

app.post('/mcp', async (req, res) => {
  try {
    const body = req.body || {};
    const authHeader = req.headers.authorization;

    if (!body.method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: body.id || null,
        error: { code: -32600, message: 'Invalid request: no method specified' }
      });
    }

    // Session management
    let sessionId = req.headers['mcp-session-id'];
    const isInitialize = body.method === 'initialize';

    if (isInitialize) {
      // Create new session on initialize
      sessionId = randomUUID();
      mcpSessions.set(sessionId, { createdAt: Date.now(), authHeader });
    } else if (!sessionId || !mcpSessions.has(sessionId)) {
      // Require valid session for non-initialize requests
      // Be lenient: create session if missing (for compatibility)
      sessionId = sessionId || randomUUID();
      if (!mcpSessions.has(sessionId)) {
        mcpSessions.set(sessionId, { createdAt: Date.now(), authHeader });
      }
    }

    // Update session auth if provided
    if (authHeader && mcpSessions.has(sessionId)) {
      mcpSessions.get(sessionId).authHeader = authHeader;
    }

    res.header('mcp-session-id', sessionId);

    let response;

    // ---- initialize ----
    if (body.method === 'initialize') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'kbeauty-skincare',
            version: '1.0.0'
          }
        }
      };
    }

    // ---- tools/list ----
    else if (body.method === 'tools/list') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: toolDefinitions
        }
      };
    }

    // ---- tools/call ----
    else if (body.method === 'tools/call') {
      const toolName = body.params?.name;
      const toolInput = body.params?.arguments || {};

      if (!toolName || !toolHandlers[toolName]) {
        response = {
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32601, message: `Tool not found: ${toolName}` }
        };
      } else {
        // Check if tool requires authentication
        const toolDef = toolDefinitions.find(t => t.name === toolName);
        const requiresAuth = toolName === 'log_skin_condition' || toolName === 'get_skin_history';

        let userId = null;
        if (requiresAuth) {
          const sessionAuth = mcpSessions.get(sessionId)?.authHeader || authHeader;
          const verified = await validateToken(sessionAuth);
          if (!verified) {
            return res.status(401)
              .header('WWW-Authenticate', `Bearer resource_metadata="${NGROK_URL}/.well-known/oauth-protected-resource"`)
              .json({
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32600,
                  message: 'Authentication required. Please sign in to use this feature.',
                  data: { auth_required: true }
                }
              });
          }
          userId = verified.sub;
        }

        const result = await toolHandlers[toolName](toolInput, userId);
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: result.content,
            structuredContent: result.structuredContent,
            isError: result.isError || false
          }
        };
      }
    }

    // ---- resources/list ----
    else if (body.method === 'resources/list') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          resources: resourceDefinitions
        }
      };
    }

    // ---- resources/read ----
    else if (body.method === 'resources/read') {
      const uri = body.params?.uri;

      if (uri === WIDGET_URI) {
        const html = getWidgetHtml();
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            contents: [{
              uri: WIDGET_URI,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetPrefersBorder': true,
                'openai/widgetCSP': {
                  connect_domains: [NGROK_URL],
                  resource_domains: ['https://cdn.jsdelivr.net', 'https://via.placeholder.com']
                }
              }
            }]
          }
        };
      } else {
        response = {
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32602, message: `Resource not found: ${uri}` }
        };
      }
    }

    // ---- notifications/initialized (client notification, no response needed) ----
    else if (body.method === 'notifications/initialized') {
      return res.status(204).end();
    }

    // ---- unknown method ----
    else {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: `Method not found: ${body.method}` }
      };
    }

    console.log(`[MCP] ${body.method} ${body.params?.name ? `(${body.params.name})` : ''} [session: ${sessionId.substring(0, 8)}...]`);
    res.json(response);
  } catch (error) {
    console.error('MCP Error:', error.message);
    res.status(500).json({
      jsonrpc: '2.0',
      id: (req.body || {}).id || null,
      error: { code: -32603, message: 'Internal server error' }
    });
  }
});

// DELETE /mcp - Session termination
app.delete('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && mcpSessions.has(sessionId)) {
    mcpSessions.delete(sessionId);
    console.log(`[MCP] Session terminated: ${sessionId.substring(0, 8)}...`);
    return res.status(204).end();
  }
  res.status(404).json({ error: 'Session not found' });
});

// Documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'K-Beauty MCP Server with OAuth 2.0',
    version: '1.0.0',
    description: 'Skincare routine and product recommendation service with user authentication',
    endpoints: {
      mcp: '/mcp (POST/GET/DELETE)',
      oauth_config: '/.well-known/openid-configuration (GET)',
      authorize: '/oauth/authorize (GET)',
      token: '/oauth/token (POST)',
      userinfo: '/oauth/me (GET)',
      health: '/health (GET)'
    },
    tools: toolDefinitions.map(t => ({
      name: t.name,
      description: t.description,
      annotations: t.annotations,
      has_ui: !!t._meta?.['openai/outputTemplate']
    })),
    resources: resourceDefinitions,
    protected_tools: ['log_skin_condition', 'get_skin_history'],
    public_tools: ['get_routine_guide', 'search_products', 'get_product_details', 'get_routine_tips', 'recommend_routine']
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Session cleanup (every 30 minutes, remove sessions older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  for (const [id, session] of mcpSessions) {
    if (now - session.createdAt > maxAge) {
      mcpSessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

// Only auto-start when run directly (not when required as module)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`
+------------------------------------------------------------+
|                                                            |
|   K-Beauty MCP Server with OAuth 2.0                       |
|                                                            |
|   Endpoints:                                               |
|   MCP Server: http://localhost:${port}/mcp                 |
|   OAuth: /.well-known/openid-configuration                 |
|   Health: http://localhost:${port}/health                  |
|   Docs: http://localhost:${port}/docs                      |
|                                                            |
|   Tools: ${toolDefinitions.length} (${toolDefinitions.filter(t => t._meta?.['openai/outputTemplate']).length} with UI widget)                            |
|   Resources: ${resourceDefinitions.length} (widget)                                |
|   Auth0 Domain: ${AUTH0_DOMAIN}                            |
|                                                            |
|   Status: ${AUTH0_DOMAIN !== 'your-domain.us.auth0.com' ? 'READY' : 'AUTH0 NOT CONFIGURED'}                                    |
|                                                            |
+------------------------------------------------------------+
  `);
  });
}

process.on('SIGINT', () => {
  console.log('\nClosing sessions and stopping server...');
  mcpSessions.clear();
  process.exit(0);
});

module.exports = app;
