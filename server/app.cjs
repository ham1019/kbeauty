#!/usr/bin/env node
// K-Beauty MCP Server - Simple version with OAuth support
const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json());

// Sessions
const sessions = new Map();

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Mock Data
const morningRoutine = [
  { order: 1, name_en: 'Cleanser', name_ko: '클렌저', description_en: 'Use a gentle cleanser', description_ko: '부드러운 클렌저', product_category: 'cleanser', estimated_time_minutes: 2, tips_en: 'Use lukewarm water', tips_ko: '미온수 사용' },
  { order: 2, name_en: 'Essence', name_ko: '에센스', description_en: 'Apply essence', description_ko: '에센스 사용', product_category: 'essence', estimated_time_minutes: 1, tips_en: 'Pat gently', tips_ko: '톡톡 두드리기' },
  { order: 3, name_en: 'Vitamin C Serum', name_ko: '비타민C 세럼', description_en: 'Vitamin C serum', description_ko: '비타민C 세럼', product_category: 'serum', estimated_time_minutes: 2, tips_en: 'Use 3-4 drops', tips_ko: '3~4방울' },
  { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', description_en: 'Eye cream', description_ko: '아이크림', product_category: 'eye_cream', estimated_time_minutes: 1, tips_en: 'Tap gently', tips_ko: '톡톡 두드리기' },
  { order: 5, name_en: 'Moisturizer', name_ko: '모이스처라이저', description_en: 'Moisturizer', description_ko: '모이스처라이저', product_category: 'moisturizer', estimated_time_minutes: 2, tips_en: 'Upward strokes', tips_ko: '상향 스트로크' },
  { order: 6, name_en: 'SPF 50+', name_ko: 'SPF 50+', description_en: 'Sunscreen SPF 50+', description_ko: '선크림 SPF 50+', product_category: 'sunscreen', estimated_time_minutes: 2, tips_en: 'Apply generously', tips_ko: '넉넉하게' }
];

const eveningRoutine = [
  { order: 1, name_en: 'Cleanser', name_ko: '클렌저', description_en: 'Double cleanse', description_ko: '더블 클렌징', product_category: 'cleanser', estimated_time_minutes: 3, tips_en: 'Oil then water', tips_ko: '오일 후 수성' },
  { order: 2, name_en: 'Essence', name_ko: '에센스', description_en: 'Extra hydration', description_ko: '추가 수분', product_category: 'essence', estimated_time_minutes: 1, tips_en: 'Can layer', tips_ko: '레이어링 가능' },
  { order: 3, name_en: 'Niacinamide', name_ko: '나이아신아마이드', description_en: 'Pore refinement', description_ko: '모공 정돈', product_category: 'serum', estimated_time_minutes: 2, tips_en: 'Oil control', tips_ko: '피지 조절' },
  { order: 4, name_en: 'Eye Cream', name_ko: '아이크림', description_en: 'Overnight', description_ko: '밤샘', product_category: 'eye_cream', estimated_time_minutes: 1, tips_en: 'Rich formula', tips_ko: '진한 포뮬러' },
  { order: 5, name_en: 'Night Cream', name_ko: '나이트 크림', description_en: 'Intensive', description_ko: '집중', product_category: 'night_cream', estimated_time_minutes: 2, tips_en: 'Heavy ok', tips_ko: '진함 괜찮음' },
  { order: 6, name_en: 'Lip Balm', name_ko: '립 밤', description_en: 'Lip care', description_ko: '입술 케어', product_category: 'lip_balm', estimated_time_minutes: 1, tips_en: 'Apply thickly', tips_ko: '넉넉하게' }
];

const products = [
  { id: 'sulwhasoo-serum', brand: 'Sulwhasoo', name_en: 'First Care Serum EX', name_ko: '설화수 자음생 에센스', category: 'essence', price_usd: 110, rating: 4.8, main_ingredients: ['Ginseng', 'Fermented botanicals'], skin_type_suitable: ['All'], texture_en: 'Lightweight', texture_ko: '가벼움' },
  { id: 'cosrx-snail', brand: 'COSRX', name_en: 'Snail 96 Essence', name_ko: 'COSRX 스넬 에센스', category: 'essence', price_usd: 21, rating: 4.7, main_ingredients: ['Snail secretion', 'Hyaluronic acid'], skin_type_suitable: ['Dry'], texture_en: 'Viscous', texture_ko: '점성' },
  { id: 'innisfree-greentea', brand: 'Innisfree', name_en: 'Green Tea Serum', name_ko: '이니스프리 그린티', category: 'serum', price_usd: 35, rating: 4.6, main_ingredients: ['Green tea', 'Niacinamide'], skin_type_suitable: ['Oily'], texture_en: 'Lightweight', texture_ko: '가벼움' },
  { id: 'laneige-waterbank', brand: 'Laneige', name_en: 'Water Bank Cream', name_ko: '라네즈 워터뱅크', category: 'moisturizer', price_usd: 45, rating: 4.8, main_ingredients: ['Water complex', 'Hyaluronic acid'], skin_type_suitable: ['Dry'], texture_en: 'Light gel', texture_ko: '젤' }
];

const tools = {
  get_routine_guide: (input) => {
    const routine = input.routine_type === 'morning' ? morningRoutine : eveningRoutine;
    const totalTime = routine.reduce((sum, s) => sum + s.estimated_time_minutes, 0);
    return {
      content: [{ type: 'text', text: `${input.routine_type} routine - ${totalTime} min` }],
      structuredContent: { routine_type: input.routine_type, total_steps: 6, estimated_time_minutes: totalTime, steps: routine }
    };
  },
  search_products: (input) => {
    const q = input.query.toLowerCase();
    const results = products.filter(p => p.name_en.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    return {
      content: [{ type: 'text', text: `Found ${results.length} products` }],
      structuredContent: { query: input.query, total_results: results.length, results }
    };
  },
  get_product_details: (input) => {
    const product = products.find(p => p.id === input.product_id);
    return product ? {
      content: [{ type: 'text', text: `${product.brand} ${product.name_en}` }],
      structuredContent: { ...product, how_to_use_en: 'Apply to face and neck.' }
    } : { content: [{ type: 'text', text: 'Not found' }] };
  },
  log_skin_condition: (input) => {
    const id = Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      content: [{ type: 'text', text: `Saved: ${id}` }],
      structuredContent: { log_id: id, timestamp: new Date().toISOString(), hydration_level: input.hydration_level, sensitivity_level: input.sensitivity_level, saved: true }
    };
  },
  get_skin_history: (input) => {
    const days = input.days || 30;
    const logs = Array.from({ length: Math.min(days, 30) }, (_, i) => ({ timestamp: new Date(Date.now() - i * 86400000).toISOString(), hydration_level: Math.random() * 10 | 0, sensitivity_level: Math.random() * 10 | 0 }));
    return { content: [{ type: 'text', text: `${days} day history` }], structuredContent: { period_days: days, total_logs: logs.length, logs } };
  },
  get_routine_tips: (input) => {
    return { content: [{ type: 'text', text: `Tips for ${input.step_name}` }], structuredContent: { step_name: input.step_name, pro_tips: ['Use lukewarm water', 'Be gentle'], common_mistakes: ['Too hot', 'Rubbing hard'] } };
  },
  recommend_routine: (input) => {
    const rec = { dry: { focus: 'Hydration' }, oily: { focus: 'Control' }, combination: { focus: 'Balance' }, sensitive: { focus: 'Soothing' } };
    return { content: [{ type: 'text', text: `${input.skin_type} routine` }], structuredContent: { skin_type: input.skin_type, ...rec[input.skin_type] } };
  }
};

const toolDefs = [
  { name: 'get_routine_guide', description: 'Get AM or PM skincare routine', inputSchema: { type: 'object', properties: { routine_type: { enum: ['morning', 'evening'] } }, required: ['routine_type'] } },
  { name: 'search_products', description: 'Search K-beauty products', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_product_details', description: 'Get product details', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
  { name: 'log_skin_condition', description: 'Log skin condition', inputSchema: { type: 'object', properties: { hydration_level: { type: 'number' }, sensitivity_level: { type: 'number' } }, required: ['hydration_level', 'sensitivity_level'] } },
  { name: 'get_skin_history', description: 'Get skin history', inputSchema: { type: 'object', properties: { days: { type: 'number' } } } },
  { name: 'get_routine_tips', description: 'Get routine tips', inputSchema: { type: 'object', properties: { step_name: { type: 'string' } }, required: ['step_name'] } },
  { name: 'recommend_routine', description: 'Recommend routine', inputSchema: { type: 'object', properties: { skin_type: { enum: ['dry', 'oily', 'combination', 'sensitive'] } }, required: ['skin_type'] } }
];

function handleMCP(msg) {
  if (msg.method === 'initialize') {
    return { jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'kbeauty-skincare', version: '1.0.0' } } };
  }
  if (msg.method === 'tools/list') {
    return { jsonrpc: '2.0', id: msg.id, result: { tools: toolDefs } };
  }
  if (msg.method === 'tools/call') {
    const tool = tools[msg.params.name];
    if (tool) {
      const result = tool(msg.params.arguments);
      return { jsonrpc: '2.0', id: msg.id, result: { content: result.content, isError: false, _meta: { structuredContent: result.structuredContent } } };
    }
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Tool not found' } };
  }
  return { jsonrpc: '2.0', id: msg.id, error: { code: -32700, message: 'Invalid' } };
}

app.post('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const response = handleMCP(req.body);

  if (!sessionId) {
    const newId = randomUUID();
    sessions.set(newId, { createdAt: Date.now() });
    res.header('mcp-session-id', newId);
    console.log(`✅ New session: ${newId.substring(0, 8)}...`);
  }

  console.log(`📨 ${req.body.method}`);
  res.json(response);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/.well-known/oauth-protected-resource', (req, res) => res.json({}));

app.listen(port, () => {
  console.log(`\n🌸 K-beauty MCP Server running on http://localhost:${port}/mcp\n`);
});

process.on('SIGINT', () => { console.log('\nServer stopped'); process.exit(0); });
