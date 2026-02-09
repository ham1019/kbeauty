import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { morningRoutine, eveningRoutine, products } from './data.js';

// Create MCP Server
const server = new McpServer({
  name: 'kbeauty-skincare',
  version: '1.0.0'
});

// Register Tool: get_routine_guide
server.tool(
  'get_routine_guide',
  {
    description: 'Get AM or PM skincare routine with 6 steps',
    inputSchema: z.object({
      routine_type: z.enum(['morning', 'evening']).describe('Type of routine')
    })
  },
  async ({ routine_type }) => {
    const routine = routine_type === 'morning' ? morningRoutine : eveningRoutine;
    const totalTime = routine.reduce((sum, step) => sum + step.estimated_time_minutes, 0);
    return {
      content: [{
        type: 'text',
        text: `${routine_type} Skincare Routine - 6 Steps`
      }],
      structuredContent: {
        routine_type,
        total_steps: 6,
        estimated_time_minutes: totalTime,
        steps: routine
      }
    };
  }
);

// Register Tool: search_products
server.tool(
  'search_products',
  {
    description: 'Search for K-beauty products',
    inputSchema: z.object({
      query: z.string().describe('Search query')
    })
  },
  async ({ query }) => {
    const queryLower = query.toLowerCase();
    const results = products.filter(p =>
      p.name_en.toLowerCase().includes(queryLower) ||
      p.brand.toLowerCase().includes(queryLower)
    );
    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} products`
      }],
      structuredContent: {
        query,
        total_results: results.length,
        results
      }
    };
  }
);

// Register Tool: get_product_details
server.tool(
  'get_product_details',
  {
    description: 'Get product details',
    inputSchema: z.object({
      product_id: z.string().describe('Product ID')
    })
  },
  async ({ product_id }) => {
    const product = products.find(p => p.id === product_id);
    if (!product) {
      return { content: [{ type: 'text', text: 'Product not found' }] };
    }
    return {
      content: [{ type: 'text', text: `${product.brand} ${product.name_en}` }],
      structuredContent: { ...product, how_to_use_en: 'Apply to face and neck.' }
    };
  }
);

// Register Tool: log_skin_condition
server.tool(
  'log_skin_condition',
  {
    description: 'Log skin condition',
    inputSchema: z.object({
      hydration_level: z.number().min(1).max(10),
      sensitivity_level: z.number().min(1).max(10)
    })
  },
  async ({ hydration_level, sensitivity_level }) => {
    const logId = Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      content: [{ type: 'text', text: `Skin log saved: ${logId}` }],
      structuredContent: {
        log_id: logId,
        timestamp: new Date().toISOString(),
        hydration_level,
        sensitivity_level,
        saved: true
      }
    };
  }
);

// Register Tool: get_skin_history
server.tool(
  'get_skin_history',
  {
    description: 'Get skin history',
    inputSchema: z.object({
      days: z.number().optional()
    })
  },
  async ({ days = 30 }) => {
    const logs = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      hydration_level: Math.floor(Math.random() * 10) + 1,
      sensitivity_level: Math.floor(Math.random() * 10) + 1
    }));
    const avgHydration = Math.round(logs.reduce((sum, l) => sum + l.hydration_level, 0) / logs.length);
    return {
      content: [{ type: 'text', text: `Skin history for ${days} days` }],
      structuredContent: {
        period_days: days,
        total_logs: logs.length,
        logs,
        statistics: { average_hydration: avgHydration }
      }
    };
  }
);

// Register Tool: get_routine_tips
server.tool(
  'get_routine_tips',
  {
    description: 'Get routine tips',
    inputSchema: z.object({
      step_name: z.string()
    })
  },
  async ({ step_name }) => {
    return {
      content: [{ type: 'text', text: `Tips for ${step_name}` }],
      structuredContent: {
        step_name,
        pro_tips: ['Use lukewarm water', 'Massage gently'],
        common_mistakes: ['Too hot water', 'Rubbing harshly']
      }
    };
  }
);

// Register Tool: recommend_routine
server.tool(
  'recommend_routine',
  {
    description: 'Recommend routine for skin type',
    inputSchema: z.object({
      skin_type: z.enum(['dry', 'oily', 'combination', 'sensitive'])
    })
  },
  async ({ skin_type }) => {
    const recommendations: any = {
      dry: { focus: 'Hydration', morning_routine: ['Cleanser', 'Essence', 'Moisturizer', 'SPF'] },
      oily: { focus: 'Oil control', morning_routine: ['Foaming cleanser', 'Mattifying essence', 'Light moisturizer', 'Sunscreen'] },
      combination: { focus: 'Balance', morning_routine: ['Mild cleanser', 'Essence', 'Light moisturizer', 'SPF'] },
      sensitive: { focus: 'Soothing', morning_routine: ['Gentle cleanser', 'Calming essence', 'Barrier cream', 'Sunscreen'] }
    };
    return {
      content: [{ type: 'text', text: `Routine for ${skin_type} skin` }],
      structuredContent: { skin_type, ...recommendations[skin_type] }
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('🌸 K-beauty MCP Server started');
}

main().catch(console.error);
