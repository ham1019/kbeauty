#!/usr/bin/env node

// Simple K-Beauty MCP Server - Stdio Transport
// No TypeScript compilation needed - runs directly with Node.js

const readline = require('readline');

// Mock Data
const morningRoutine = [
  {
    order: 1,
    name_en: 'Cleanser',
    name_ko: '클렌저',
    description_en: 'Use a gentle cleanser suitable for morning',
    description_ko: '아침에 사용하기 좋은 부드러운 클렌저 사용',
    product_category: 'cleanser',
    estimated_time_minutes: 2,
    tips_en: 'Use lukewarm water, massage gently for 60 seconds',
    tips_ko: '미온수 사용, 60초간 부드럽게 마사지'
  },
  {
    order: 2,
    name_en: 'Essence',
    name_ko: '에센스',
    description_en: 'Apply essence for hydration',
    description_ko: '수분 공급을 위해 에센스 사용',
    product_category: 'essence',
    estimated_time_minutes: 1,
    tips_en: 'Lightly pat into skin with fingertips',
    tips_ko: '손가락으로 살짝 두드려 흡수시키기'
  },
  {
    order: 3,
    name_en: 'Vitamin C Serum',
    name_ko: '비타민C 세럼',
    description_en: 'Apply Vitamin C serum for brightening',
    description_ko: '밝은 피부 톤을 위해 비타민C 세럼 사용',
    product_category: 'serum',
    estimated_time_minutes: 2,
    tips_en: 'Use 3-4 drops, wait 1-2 minutes before next step',
    tips_ko: '3~4방울 사용, 다음 단계 전 1~2분 대기'
  },
  {
    order: 4,
    name_en: 'Eye Cream',
    name_ko: '아이크림',
    description_en: 'Apply eye cream to prevent fine lines',
    description_ko: '잔주름 방지를 위해 아이크림 사용',
    product_category: 'eye_cream',
    estimated_time_minutes: 1,
    tips_en: 'Use ring finger, gently tap around eye area',
    tips_ko: '약지 사용, 눈 주변 부드럽게 톡톡 두드리기'
  },
  {
    order: 5,
    name_en: 'Moisturizer',
    name_ko: '모이스처라이저',
    description_en: 'Apply moisturizer to lock in hydration',
    description_ko: '수분 보습을 위해 모이스처라이저 사용',
    product_category: 'moisturizer',
    estimated_time_minutes: 2,
    tips_en: 'Use upward strokes, wait until fully absorbed',
    tips_ko: '상향 스트로크 사용, 완전히 흡수될 때까지 대기'
  },
  {
    order: 6,
    name_en: 'SPF 50+ Sunscreen',
    name_ko: 'SPF 50+ 선크림',
    description_en: 'Apply broad-spectrum sunscreen (SPF 50+)',
    description_ko: '광범위 자외선 차단 선크림 (SPF 50+) 사용',
    product_category: 'sunscreen',
    estimated_time_minutes: 2,
    tips_en: 'Apply generously, reapply every 2 hours if outdoors',
    tips_ko: '넉넉하게 사용, 야외 활동 시 2시간마다 재도포'
  }
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

// Tool Handlers
const tools = {
  get_routine_guide: (input) => {
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

  search_products: (input) => {
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

  get_product_details: (input) => {
    const product = products.find(p => p.id === input.product_id);
    if (!product) {
      return { content: [{ type: 'text', text: 'Product not found' }] };
    }
    return {
      content: [{ type: 'text', text: `${product.brand} ${product.name_en}` }],
      structuredContent: { ...product, how_to_use_en: 'Apply to face and neck.' }
    };
  },

  log_skin_condition: (input) => {
    const logId = Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      content: [{ type: 'text', text: `Skin log saved: ${logId}` }],
      structuredContent: {
        log_id: logId,
        timestamp: new Date().toISOString(),
        hydration_level: input.hydration_level,
        sensitivity_level: input.sensitivity_level,
        saved: true
      }
    };
  },

  get_skin_history: (input) => {
    const days = input.days || 30;
    const logs = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      hydration_level: Math.floor(Math.random() * 10) + 1,
      sensitivity_level: Math.floor(Math.random() * 10) + 1
    }));
    return {
      content: [{ type: 'text', text: `Skin history for ${days} days` }],
      structuredContent: { period_days: days, total_logs: logs.length, logs }
    };
  },

  get_routine_tips: (input) => {
    return {
      content: [{ type: 'text', text: `Tips for ${input.step_name}` }],
      structuredContent: {
        step_name: input.step_name,
        pro_tips: ['Use lukewarm water', 'Massage gently'],
        common_mistakes: ['Too hot water', 'Rubbing harshly']
      }
    };
  },

  recommend_routine: (input) => {
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
    name: 'log_skin_condition',
    description: 'Log skin condition',
    inputSchema: {
      type: 'object',
      properties: {
        hydration_level: { type: 'number' },
        sensitivity_level: { type: 'number' }
      },
      required: ['hydration_level', 'sensitivity_level']
    }
  },
  {
    name: 'get_skin_history',
    description: 'Get skin history',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number' } }
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
  }
];

// Simple stdio-based MCP protocol handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let isInitialized = false;

function sendMessage(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function handleMessage(line) {
  try {
    const message = JSON.parse(line);

    if (message.method === 'initialize') {
      isInitialized = true;
      sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'kbeauty-skincare',
            version: '1.0.0'
          }
        }
      });
    } else if (message.method === 'tools/list') {
      sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: { tools: toolDefinitions }
      });
    } else if (message.method === 'tools/call') {
      const toolName = message.params.name;
      const toolInput = message.params.arguments;

      if (tools[toolName]) {
        const result = tools[toolName](toolInput);
        sendMessage({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: result.content,
            isError: false,
            _meta: { structuredContent: result.structuredContent }
          }
        });
      } else {
        sendMessage({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32601, message: 'Tool not found' }
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

rl.on('line', handleMessage);

console.error('🌸 K-beauty MCP Server started (stdio mode)');
console.error('Waiting for initialize message...');
