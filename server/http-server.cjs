#!/usr/bin/env node
const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
const port = process.env.PORT || 8787;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const sessions = new Map();

// Mock Data
const routines = {
  morning: [
    { order: 1, name_en: 'Cleanser', name_ko: '클렌저', product_category: 'cleanser', estimated_time_minutes: 2 },
    { order: 2, name_en: 'Essence', name_ko: '에센스', product_category: 'essence', estimated_time_minutes: 1 },
    { order: 3, name_en: 'Vitamin C', name_ko: '비타민C', product_category: 'serum', estimated_time_minutes: 2 },
    { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', product_category: 'eye_cream', estimated_time_minutes: 1 },
    { order: 5, name_en: 'Moisturizer', name_ko: '모이스처', product_category: 'moisturizer', estimated_time_minutes: 2 },
    { order: 6, name_en: 'SPF 50+', name_ko: 'SPF 50+', product_category: 'sunscreen', estimated_time_minutes: 2 }
  ],
  evening: [
    { order: 1, name_en: 'Cleanser', name_ko: '클렌저', product_category: 'cleanser', estimated_time_minutes: 3 },
    { order: 2, name_en: 'Essence', name_ko: '에센스', product_category: 'essence', estimated_time_minutes: 1 },
    { order: 3, name_en: 'Niacinamide', name_ko: '나이아신', product_category: 'serum', estimated_time_minutes: 2 },
    { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', product_category: 'eye_cream', estimated_time_minutes: 1 },
    { order: 5, name_en: 'Night Cream', name_ko: '나이트크림', product_category: 'night_cream', estimated_time_minutes: 2 },
    { order: 6, name_en: 'Lip Balm', name_ko: '립밤', product_category: 'lip_balm', estimated_time_minutes: 1 }
  ]
};

const products = [
  { id: 'sulwhasoo', brand: 'Sulwhasoo', name_en: 'First Care Serum', name_ko: '설화수', price_usd: 110, rating: 4.8 },
  { id: 'cosrx', brand: 'COSRX', name_en: 'Snail Essence', name_ko: 'COSRX 스넬', price_usd: 21, rating: 4.7 },
  { id: 'innisfree', brand: 'Innisfree', name_en: 'Green Tea', name_ko: '이니스프리', price_usd: 35, rating: 4.6 },
  { id: 'laneige', brand: 'Laneige', name_en: 'Water Bank', name_ko: '라네즈', price_usd: 45, rating: 4.8 }
];

// Tool handlers
const tools = {
  get_routine_guide: (args) => {
    const routine = routines[args.routine_type] || routines.morning;
    return {
      content: [{ type: 'text', text: `${args.routine_type} routine` }],
      structuredContent: { routine_type: args.routine_type, steps: routine, total_steps: routine.length }
    };
  },
  search_products: (args) => {
    const q = (args.query || '').toLowerCase();
    const results = products.filter(p => p.name_en.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    return {
      content: [{ type: 'text', text: `Found ${results.length} products` }],
      structuredContent: { results, total: results.length }
    };
  },
  get_product_details: (args) => {
    const p = products.find(x => x.id === args.product_id);
    return {
      content: [{ type: 'text', text: p ? `${p.brand} ${p.name_en}` : 'Not found' }],
      structuredContent: p || { error: 'Not found' }
    };
  },
  log_skin_condition: (args) => {
    return {
      content: [{ type: 'text', text: 'Logged' }],
      structuredContent: { log_id: randomUUID().substring(0, 8), hydration: args.hydration_level, sensitivity: args.sensitivity_level }
    };
  },
  get_skin_history: (args) => {
    return {
      content: [{ type: 'text', text: 'History retrieved' }],
      structuredContent: { days: args.days || 30, logs: [] }
    };
  },
  get_routine_tips: (args) => {
    return {
      content: [{ type: 'text', text: `Tips for ${args.step_name}` }],
      structuredContent: { step: args.step_name, tips: ['Use lukewarm water', 'Be gentle'] }
    };
  },
  recommend_routine: (args) => {
    return {
      content: [{ type: 'text', text: `Routine for ${args.skin_type}` }],
      structuredContent: { skin_type: args.skin_type, recommendation: 'Customized routine' }
    };
  }
};

const toolDefs = [
  { name: 'get_routine_guide', description: 'Get routine', inputSchema: { type: 'object', properties: { routine_type: { enum: ['morning', 'evening'] } } } },
  { name: 'search_products', description: 'Search products', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } },
  { name: 'get_product_details', description: 'Get details', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } } } },
  { name: 'log_skin_condition', description: 'Log skin', inputSchema: { type: 'object', properties: { hydration_level: { type: 'number' }, sensitivity_level: { type: 'number' } } } },
  { name: 'get_skin_history', description: 'Get history', inputSchema: { type: 'object', properties: { days: { type: 'number' } } } },
  { name: 'get_routine_tips', description: 'Get tips', inputSchema: { type: 'object', properties: { step_name: { type: 'string' } } } },
  { name: 'recommend_routine', description: 'Recommend', inputSchema: { type: 'object', properties: { skin_type: { enum: ['dry', 'oily', 'combination', 'sensitive'] } } } }
];

// Routes
app.post('/mcp', (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = req.headers['mcp-session-id'] || randomUUID();

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
          serverInfo: { name: 'kbeauty', version: '1.0.0' }
        }
      };
    } else if (body.method === 'tools/list') {
      response = {
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: toolDefs }
      };
    } else if (body.method === 'tools/call') {
      const tool = tools[body.params.name];
      if (tool) {
        const result = tool(body.params.arguments || {});
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: result.content,
            isError: false,
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

    console.log(`📨 ${body.method}`);
    res.json(response);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/.well-known/oauth-protected-resource', (req, res) => res.json({}));

app.listen(port, () => {
  console.log(`\n🌸 K-beauty MCP Server on http://localhost:${port}/mcp\n`);
});

process.on('SIGINT', () => {
  console.log('\nServer stopped');
  process.exit(0);
});
