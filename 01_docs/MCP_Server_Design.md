# K-Beauty Skincare Routine - MCP Server 설계 문서

> ChatGPT Apps를 위한 Model Context Protocol 서버 설계 및 Tool 정의

**문서 버전**: 1.0
**작성 일자**: 2026-02-09
**상태**: Design Phase (Phase 2)

---

## 목차

1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [Tool 정의 (7개)](#tool-정의)
4. [Resource 설계](#resource-설계)
5. [세션 관리 전략](#세션-관리-전략)
6. [인증 전략](#인증-전략)
7. [데이터 흐름도](#데이터-흐름도)
8. [구현 체크리스트](#구현-체크리스트)
9. [배포 체크리스트](#배포-체크리스트)

---

## 개요

### 프로젝트 개요

- **앱 이름**: K-Beauty Skincare Routine (피부미 - AI 스킨케어 어시스턴트)
- **핵심 기능**: AM/PM 6단계 루틴 안내, 피부 기록, 상품 추천, 성분 정보
- **타겟 사용자**: K-뷰티 관심 사용자, 스킨케어 루틴 학습자
- **기술 스택**:
  - Backend: Node.js + TypeScript + MCP SDK
  - Frontend: React 18 + Vite + Tailwind CSS (esbuild 번들)
  - Hosting: Fly.io / Render (프로덕션)
  - UI: structuredContent (ChatGPT Native Widget)

### 앱의 3가지 핵심 가치

| 가치 | 구현 | 예시 |
|------|------|------|
| **Know** | 실시간 피부 데이터 및 제품 정보 | skin_history 조회, product_details |
| **Do** | 사용자 대신 행동 수행 | log_skin_condition 저장 |
| **Show** | 정보를 나은 UI로 표시 | Widget으로 6단계 루틴 비주얼화 |

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      ChatGPT Client                          │
│  (Web / Mobile / ChatGPT Plus Developer Mode)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ JSON-RPC 2.0 (HTTP POST)
                     │
┌────────────────────▼────────────────────────────────────────┐
│          MCP Server (Node.js + TypeScript)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Core Server Components                               │   │
│  │ - McpServer (MCP SDK)                                │   │
│  │ - HTTP Transport (StreamableHTTPServerTransport)     │   │
│  │ - Session Management (Map<sessionId, transport>)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Resources (UI Templates)                             │   │
│  │ - ui://skincare/widget.html (React Bundle + HTML)    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tools (7개)                                          │   │
│  │ 1. get_routine_guide (AM/PM 6단계)                  │   │
│  │ 2. search_products (스킨케어 상품 검색)             │   │
│  │ 3. get_product_details (상품 성분 정보)             │   │
│  │ 4. log_skin_condition (피부 상태 기록)              │   │
│  │ 5. get_skin_history (저장된 피부 기록 조회)         │   │
│  │ 6. get_routine_tips (단계별 팁/교육)                │   │
│  │ 7. recommend_routine (피부 타입별 루틴 추천)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Data Layer                                           │   │
│  │ - Mock Data (개발/테스트) 또는 Supabase (프로덕션)  │   │
│  │ - Products: productsData (4개 K-뷰티 제품)         │   │
│  │ - Routines: AM/PM 6단계 (multilingual)             │   │
│  │ - Ingredients: 성분 정보 (multilingual)             │   │
│  │ - SkinLogs: 사용자 피부 기록 (Supabase RLS)        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 기술 결정사항

| 항목 | 선택 | 이유 |
|------|------|------|
| **Transport** | HTTP POST + SSE (GET) | StatelessHTTP 모드 불안정, 세션 유지 필수 |
| **Session 관리** | Map<sessionId, transport> | Stateful 세션 관리, UUID 기반 sessionId |
| **Resource Delivery** | 인라인 (readFileSync) | 번들된 React 컴포넌트를 HTML에 임베드 |
| **UI Framework** | React 18 + esbuild | window.openai API 이용, 상태 관리 필수 |
| **Data Storage** | Mock (개발) → Supabase (프로덕션) | 초기: 프론트엔드 데이터, 확장: DB 통합 |
| **인증** | noauth (초기) → OAuth2 (향후) | MVP에서는 인증 불필요, 향후 추가 |
| **Hosting** | Fly.io (권장) / Render | 빠른 설정, 자동 TLS, 고정 IP |

---

## Tool 정의

### Tool 설계 원칙

1. **명확한 이름**: `동사_명사` 형태 (예: `get_routine_guide`)
2. **설명**: "Use this when..." 으로 시작
3. **하나의 책임**: 각 Tool은 단 하나의 기능만 수행
4. **Annotation**: 모든 Tool에 `readOnlyHint`, `destructiveHint` 설정 필수
5. **Widget 연결**: Tool 결과를 Widget으로 렌더링하려면 `openai/outputTemplate` 설정

---

### Tool 1: get_routine_guide

**목적**: AM/PM 6단계 루틴 안내 조회

**API 스펙**

```typescript
{
  name: "get_routine_guide",
  description: "Use this when the user wants to learn the 6-step Korean skincare routine for morning or evening",
  inputSchema: {
    type: "object" as const,
    properties: {
      routine_type: {
        type: "string",
        enum: ["morning", "evening"],
        description: "Time of day for the routine"
      },
      language: {
        type: "string",
        enum: ["en", "ko"],
        description: "Response language (English or Korean)",
        default: "en"
      }
    },
    required: ["routine_type"]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Loading routine guide...",
    "openai/toolInvocation/invoked": "Routine guide ready"
  }
}
```

**입력 예시**

```json
{
  "routine_type": "morning",
  "language": "en"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "routine_type": "morning",
    "total_steps": 6,
    "estimated_time": "8-10 minutes",
    "steps": [
      {
        "step_number": 1,
        "name": "Gentle Cleanser",
        "description": "Low-pH gel cleanser to maintain skin barrier",
        "tip": "Use lukewarm water, massage for 60 seconds",
        "duration": "1-2 min",
        "ingredient_focus": ["ceramides", "amino acids"]
      },
      {
        "step_number": 2,
        "name": "Essence",
        "description": "Hydrating galactomyces ferment filtrate base",
        "tip": "Pat gently until fully absorbed, do not rub",
        "duration": "1-2 min",
        "ingredient_focus": ["hyaluronic acid", "peptides"]
      },
      {
        "step_number": 3,
        "name": "Vitamin C Serum",
        "description": "Brightening treatment with 15% ascorbic acid",
        "tip": "Apply to clean skin, wait 1 minute before next step",
        "duration": "2 min",
        "ingredient_focus": ["vitamin c", "antioxidants"]
      },
      {
        "step_number": 4,
        "name": "Eye Cream",
        "description": "Peptide-rich formula for fine lines",
        "tip": "Use ring finger, tap gently around orbital bone",
        "duration": "1 min",
        "ingredient_focus": ["peptides", "caffeine"]
      },
      {
        "step_number": 5,
        "name": "Moisturizer",
        "description": "Lightweight gel-cream with ceramides",
        "tip": "Apply in upward strokes, allow to settle",
        "duration": "2 min",
        "ingredient_focus": ["ceramides", "squalane"]
      },
      {
        "step_number": 6,
        "name": "SPF 50+ PA++++",
        "description": "Chemical sunscreen, no white cast",
        "tip": "Apply liberally, reapply every 2 hours",
        "duration": "2-3 min",
        "ingredient_focus": ["UV filters", "antioxidants"]
      }
    ],
    "skin_type_notes": "This routine is optimized for combination skin",
    "alternatives": {
      "for_oily_skin": "Use lightweight, oil-free products",
      "for_dry_skin": "Add extra hydration layers and heavier moisturizer",
      "for_sensitive_skin": "Skip exfoliating toner, use gentle essences"
    }
  },
  "content": [
    {
      "type": "text",
      "text": "Morning routine: 6 steps, 8-10 minutes. Start with gentle cleansing and end with SPF protection."
    }
  ]
}
```

**Widget HTML 필드명 매핑**

```typescript
// Widget에서 접근할 필드명 (정확히 일치 필수!)
window.openai.toolOutput.routine_type  // "morning" | "evening"
window.openai.toolOutput.total_steps   // 6
window.openai.toolOutput.estimated_time // "8-10 minutes"
window.openai.toolOutput.steps         // Step[]
  .step_number                        // 1-6
  .name                               // "Gentle Cleanser"
  .description                        // "..."
  .tip                                // "..."
  .duration                           // "1-2 min"
  .ingredient_focus                   // ["ceramides", ...]
```

---

### Tool 2: search_products

**목적**: 스킨케어 상품 검색 (브랜드, 카테고리, 성분별)

**API 스펙**

```typescript
{
  name: "search_products",
  description: "Use this when the user wants to search for K-beauty skincare products by brand, category, or ingredients",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search keyword (brand name, product type, or ingredient)"
      },
      category: {
        type: "string",
        enum: ["cleanser", "essence", "serum", "moisturizer", "mask", "sunscreen", "all"],
        description: "Product category filter",
        default: "all"
      },
      min_rating: {
        type: "number",
        description: "Minimum rating (0-5)",
        default: 0
      },
      language: {
        type: "string",
        enum: ["en", "ko"],
        description: "Response language",
        default: "en"
      }
    },
    required: ["query"]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Searching products...",
    "openai/toolInvocation/invoked": "Results found"
  }
}
```

**입력 예시**

```json
{
  "query": "essence",
  "category": "essence",
  "min_rating": 4.0,
  "language": "en"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "query": "essence",
    "total_results": 2,
    "results": [
      {
        "id": "cosrx-snail",
        "brand": "COSRX",
        "name": "Advanced Snail 96 Mucin Power Essence",
        "description": "Lightweight essence which absorbs into skin fast to give skin a natural glow from the inside",
        "category": "essence",
        "rating": 4.6,
        "price_range": "$",
        "image_url": "https://images.unsplash.com/...",
        "main_ingredients": ["snail_mucin", "hyaluronic_acid"],
        "benefits": ["hydration", "brightening", "soothing"],
        "skin_type_suitable": ["all", "sensitive"],
        "recommended_for_routine_step": 2
      },
      {
        "id": "innisfree-greentea",
        "brand": "Innisfree",
        "name": "Green Tea Seed Serum",
        "description": "A daily moisture-barrier strengthening serum, formulated with Green Tea Biome",
        "category": "essence",
        "rating": 4.5,
        "price_range": "$$",
        "image_url": "https://images.unsplash.com/...",
        "main_ingredients": ["green_tea", "niacinamide"],
        "benefits": ["hydration", "barrier_repair", "antioxidant"],
        "skin_type_suitable": ["combination", "dry"],
        "recommended_for_routine_step": 2
      }
    ]
  },
  "content": [
    {
      "type": "text",
      "text": "Found 2 essence products. Click on a product to view details and ingredients."
    }
  ]
}
```

---

### Tool 3: get_product_details

**목적**: 선택한 상품의 상세 정보 및 성분 조회

**API 스펙**

```typescript
{
  name: "get_product_details",
  description: "Use this when the user wants to view detailed information about a specific skincare product, including full ingredient list",
  inputSchema: {
    type: "object" as const,
    properties: {
      product_id: {
        type: "string",
        description: "Product ID to fetch details for"
      },
      language: {
        type: "string",
        enum: ["en", "ko"],
        description: "Response language",
        default: "en"
      }
    },
    required: ["product_id"]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Loading product details...",
    "openai/toolInvocation/invoked": "Product details ready"
  }
}
```

**입력 예시**

```json
{
  "product_id": "sulwhasoo-serum",
  "language": "en"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "product_id": "sulwhasoo-serum",
    "brand": "Sulwhasoo",
    "name": "First Care Activating Serum",
    "description": "A post-cleanse, preparatory serum to help with skin hydration and skin barrier absorption",
    "rating": 4.8,
    "price_range": "$$$",
    "image_url": "https://images.unsplash.com/...",
    "how_to_use": "Use day and night after cleansing. Pump 2-3 times onto your palm and spread evenly across your face.",
    "ingredients": {
      "all_ingredients": "JAUM Activator (Peony, Sacred Lotus, Solomon's Seal, White Lily, Rehmannia), Ginseng, Honey, Licorice",
      "main_ingredients": [
        {
          "ingredient": "Ginseng",
          "benefit": "Antioxidant, anti-aging, energizing",
          "concentration": "high"
        },
        {
          "ingredient": "Peptides",
          "benefit": "Firming, anti-aging, collagen support",
          "concentration": "medium"
        },
        {
          "ingredient": "Honey",
          "benefit": "Humectant, soothing, antibacterial",
          "concentration": "medium"
        },
        {
          "ingredient": "Licorice",
          "benefit": "Anti-inflammatory, brightening, soothing",
          "concentration": "medium"
        }
      ]
    },
    "benefits": [
      "hydration",
      "barrier_repair",
      "anti_aging",
      "brightening",
      "soothing"
    ],
    "suitable_for_skin_types": [
      "all",
      "combination",
      "dry",
      "sensitive"
    ],
    "contraindications": [
      "None known",
      "Patch test recommended for very sensitive skin"
    ],
    "routine_position": 2,
    "routine_position_name": "Essence",
    "complementary_products": [
      "cosrx-snail",
      "innisfree-greentea"
    ],
    "reviews_summary": {
      "total_reviews": 1240,
      "common_benefits": [
        "Improved hydration",
        "Better skin texture",
        "Enhanced glow",
        "Reduced sensitivity"
      ],
      "common_concerns": [
        "High price point",
        "Strong herbal scent"
      ]
    }
  },
  "content": [
    {
      "type": "text",
      "text": "Sulwhasoo First Care Activating Serum - Premium K-beauty essence with traditional Korean herbal ingredients. Highly rated for hydration and anti-aging."
    }
  ]
}
```

---

### Tool 4: log_skin_condition

**목적**: 사용자 피부 상태 기록 저장 (Supabase 통합)

**API 스펙**

```typescript
{
  name: "log_skin_condition",
  description: "Use this when the user wants to save or update their skin condition, hydration level, and notes",
  inputSchema: {
    type: "object" as const,
    properties: {
      skin_type: {
        type: "string",
        enum: ["oily", "dry", "combination", "normal", "sensitive"],
        description: "Current skin type classification"
      },
      hydration_level: {
        type: "number",
        description: "Hydration level 0-100 (0=very dry, 100=very hydrated)"
      },
      sensitivity_level: {
        type: "number",
        description: "Skin sensitivity level 0-100 (0=not sensitive, 100=very sensitive)"
      },
      notes: {
        type: "string",
        description: "User notes about skin condition"
      }
    },
    required: ["skin_type", "hydration_level"]
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Saving skin condition...",
    "openai/toolInvocation/invoked": "Condition saved successfully"
  }
}
```

**입력 예시**

```json
{
  "skin_type": "combination",
  "hydration_level": 72,
  "sensitivity_level": 20,
  "notes": "T-zone is a bit oily today, but cheeks feel hydrated after using the new essence"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "success": true,
    "log_id": "log_20260209_abc123",
    "timestamp": "2026-02-09T14:30:00Z",
    "recorded_data": {
      "skin_type": "combination",
      "hydration_level": 72,
      "sensitivity_level": 20,
      "notes": "T-zone is a bit oily today, but cheeks feel hydrated after using the new essence"
    },
    "message": "Your skin condition has been recorded. Track your progress over time!"
  },
  "content": [
    {
      "type": "text",
      "text": "Skin condition logged successfully. You can view your history anytime to track skin changes."
    }
  ]
}
```

**Supabase 스키마 (RLS 적용)**

```sql
CREATE TABLE skin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_type TEXT NOT NULL,
  hydration_level INT NOT NULL CHECK (hydration_level >= 0 AND hydration_level <= 100),
  sensitivity_level INT CHECK (sensitivity_level >= 0 AND sensitivity_level <= 100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_daily_log UNIQUE(user_id, DATE(created_at))
);

-- RLS Policy: 사용자는 자신의 로그만 조회/작성 가능
ALTER TABLE skin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON skin_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON skin_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON skin_logs FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### Tool 5: get_skin_history

**목적**: 저장된 피부 기록 조회 (시간대별, 기간별)

**API 스펙**

```typescript
{
  name: "get_skin_history",
  description: "Use this when the user wants to review their past skin condition logs and track changes",
  inputSchema: {
    type: "object" as const,
    properties: {
      days_back: {
        type: "number",
        description: "Number of days to look back (default: 30)",
        default: 30
      },
      include_stats: {
        type: "boolean",
        description: "Include calculated statistics (avg hydration, trends)",
        default: true
      }
    }
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Loading skin history...",
    "openai/toolInvocation/invoked": "History ready"
  }
}
```

**입력 예시**

```json
{
  "days_back": 30,
  "include_stats": true
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "period": {
      "from": "2026-01-10",
      "to": "2026-02-09",
      "days": 30
    },
    "total_logs": 12,
    "statistics": {
      "avg_hydration": 68,
      "hydration_trend": "improving",
      "avg_sensitivity": 25,
      "sensitivity_trend": "stable",
      "most_common_skin_type": "combination",
      "most_oily_date": "2026-02-08",
      "most_hydrated_date": "2026-02-07"
    },
    "logs": [
      {
        "date": "2026-02-09",
        "skin_type": "combination",
        "hydration_level": 72,
        "sensitivity_level": 20,
        "notes": "T-zone oily, cheeks hydrated"
      },
      {
        "date": "2026-02-08",
        "skin_type": "oily",
        "hydration_level": 65,
        "sensitivity_level": 15,
        "notes": "Very oily due to humidity"
      },
      {
        "date": "2026-02-07",
        "skin_type": "combination",
        "hydration_level": 75,
        "sensitivity_level": 30,
        "notes": "Used new essence, very hydrated"
      }
    ],
    "insights": [
      "Your skin hydration has improved by 10% over the past month",
      "T-zone tends to get oily on humid days",
      "Sensitivity improved after adding the new essence",
      "Consistency is key - maintain your routine!"
    ]
  },
  "content": [
    {
      "type": "text",
      "text": "You have 12 skin logs from the past 30 days. Your skin hydration is improving!"
    }
  ]
}
```

---

### Tool 6: get_routine_tips

**목적**: 루틴 각 단계별 팁, 교육 정보 제공

**API 스펙**

```typescript
{
  name: "get_routine_tips",
  description: "Use this when the user wants to learn tips, techniques, and best practices for specific skincare routine steps",
  inputSchema: {
    type: "object" as const,
    properties: {
      routine_type: {
        type: "string",
        enum: ["morning", "evening"],
        description: "AM or PM routine"
      },
      step_number: {
        type: "number",
        description: "Step number (1-6)"
      },
      topic: {
        type: "string",
        enum: ["technique", "ingredient", "product_type", "benefits", "common_mistakes"],
        description: "Type of information to get",
        default: "technique"
      },
      language: {
        type: "string",
        enum: ["en", "ko"],
        description: "Response language",
        default: "en"
      }
    },
    required: ["routine_type", "step_number"]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Loading tips...",
    "openai/toolInvocation/invoked": "Tips ready"
  }
}
```

**입력 예시**

```json
{
  "routine_type": "morning",
  "step_number": 1,
  "topic": "technique",
  "language": "en"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "routine_type": "morning",
    "step_number": 1,
    "step_name": "Gentle Cleanser",
    "topic": "technique",
    "content": {
      "title": "The Art of Gentle Cleansing",
      "overview": "Proper cleansing is the foundation of any skincare routine. The goal is to remove impurities without disrupting your skin barrier.",
      "techniques": [
        {
          "name": "Temperature",
          "description": "Use lukewarm water (around 32-35°C). Hot water can strip natural oils and damage the barrier."
        },
        {
          "name": "Duration",
          "description": "Massage gently for 60-90 seconds. Longer is not better - over-cleansing can cause irritation."
        },
        {
          "name": "Pressure",
          "description": "Use light to medium pressure. Focus on T-zone, be gentle on sensitive areas like under eyes."
        },
        {
          "name": "Direction",
          "description": "Follow skin texture upward (against gravity). This helps with circulation and prevents sagging."
        }
      ],
      "common_mistakes": [
        "Using scalding hot water",
        "Scrubbing too vigorously",
        "Using fingers instead of specific cleanser",
        "Rinsing with ice-cold water (can shock the skin)",
        "Cleansing for too long"
      ],
      "best_practices": [
        "Double cleanse at night (oil + water-based)",
        "Morning: single gentle cleanse",
        "Always pat dry, don't rub",
        "Cleanse within 1-2 minutes after waking",
        "Choose pH-balanced cleansers (4.5-6.5)"
      ],
      "skin_type_adaptations": {
        "oily_skin": "Use foam or gel cleansers, may cleanse twice in PM",
        "dry_skin": "Use creamy or oil cleansers, cleanse gently once",
        "sensitive_skin": "Use non-foaming, fragrance-free cleansers",
        "combination_skin": "Use gentle cleanser that balances both areas"
      }
    }
  },
  "content": [
    {
      "type": "text",
      "text": "Cleansing is the most important step! Learn the proper technique to protect your skin barrier while removing impurities effectively."
    }
  ]
}
```

---

### Tool 7: recommend_routine

**목적**: 사용자 피부 타입/상태에 맞는 맞춤 루틴 추천

**API 스펙**

```typescript
{
  name: "recommend_routine",
  description: "Use this when the user wants personalized skincare routine recommendations based on their skin type, concerns, or goals",
  inputSchema: {
    type: "object" as const,
    properties: {
      skin_type: {
        type: "string",
        enum: ["oily", "dry", "combination", "normal", "sensitive"],
        description: "User's skin type"
      },
      primary_concern: {
        type: "string",
        enum: ["acne", "dryness", "sensitivity", "aging", "hyperpigmentation", "none"],
        description: "Main skin concern",
        default: "none"
      },
      budget: {
        type: "string",
        enum: ["budget", "mid_range", "premium"],
        description: "Product budget preference",
        default: "mid_range"
      },
      language: {
        type: "string",
        enum: ["en", "ko"],
        description: "Response language",
        default: "en"
      }
    },
    required: ["skin_type"]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false
  },
  _meta: {
    "openai/outputTemplate": "ui://skincare/widget.html",
    "openai/toolInvocation/invoking": "Creating personalized routine...",
    "openai/toolInvocation/invoked": "Routine recommendations ready"
  }
}
```

**입력 예시**

```json
{
  "skin_type": "combination",
  "primary_concern": "sensitivity",
  "budget": "mid_range",
  "language": "en"
}
```

**출력 구조 (structuredContent)**

```json
{
  "structuredContent": {
    "user_profile": {
      "skin_type": "combination",
      "primary_concern": "sensitivity",
      "budget": "mid_range"
    },
    "morning_routine_recommendation": {
      "routine_type": "morning",
      "total_steps": 6,
      "modifications": [
        "Skip harsh exfoliants (use gentle physical or enzymatic exfoliation once a week)",
        "Focus on barrier-strengthening ingredients like ceramides and niacinamide",
        "Use calming essences instead of heavy serums"
      ],
      "recommended_products": [
        {
          "step": 1,
          "step_name": "Gentle Cleanser",
          "suggested_product": "cosrx-snail",
          "reason": "Non-irritating, soothing formula",
          "alternative": "innisfree-greentea"
        },
        {
          "step": 2,
          "step_name": "Essence",
          "suggested_product": "cosrx-snail",
          "reason": "Snail mucin is highly soothing and hydrating",
          "alternative": "innisfree-greentea"
        },
        {
          "step": 3,
          "step_name": "Vitamin C Serum",
          "suggested_product": "custom",
          "reason": "Use low-concentration vitamin C (5-8%) for sensitive skin",
          "alternative": "Stabilized vitamin C L-ascorbic acid"
        },
        {
          "step": 4,
          "step_name": "Eye Cream",
          "suggested_product": "custom",
          "reason": "Use fragrance-free, gentle peptide eye cream",
          "alternative": "Caffeine + niacinamide combination"
        },
        {
          "step": 5,
          "step_name": "Moisturizer",
          "suggested_product": "custom",
          "reason": "Rich moisturizer with ceramides (1/3/6 ratio)",
          "alternative": "Centella asiatica + ceramide blend"
        },
        {
          "step": 6,
          "step_name": "SPF 50+ PA++++",
          "suggested_product": "custom",
          "reason": "Mineral sunscreen (physical blocker) often better tolerated by sensitive skin",
          "alternative": "Hybrid sunscreen with both mineral + chemical filters"
        }
      ]
    },
    "evening_routine_recommendation": {
      "routine_type": "evening",
      "total_steps": 6,
      "modifications": [
        "Double cleanse is optional - single gentle cleanse usually sufficient",
        "Skip strong actives (AHA/BHA) if irritation occurs",
        "Use soothing essences and gentle retinol alternatives (bakuchiol) first"
      ],
      "recommended_products": [
        {
          "step": 1,
          "step_name": "Oil Cleanser",
          "suggested_product": "custom",
          "reason": "Use oil cleansers specifically formulated to not clog sensitive skin",
          "alternative": "Micellar oil or jojoba-based cleanser"
        },
        {
          "step": 2,
          "step_name": "Foam Cleanser",
          "suggested_product": "custom",
          "reason": "Use amino acid-based foam, not sulfate foam",
          "alternative": "Gentle creamy cleanser"
        },
        {
          "step": 3,
          "step_name": "Exfoliating Toner",
          "suggested_product": "skip_or_modify",
          "reason": "For sensitive skin, use gentle enzymatic exfoliant instead of AHA/BHA",
          "alternative": "Gentle PHA (polyhydroxy acid) 1-2x per week"
        },
        {
          "step": 4,
          "step_name": "Treatment Essence",
          "suggested_product": "cosrx-snail",
          "reason": "Snail mucin + fermented ingredients are very soothing",
          "alternative": "Centella asiatica ferment"
        },
        {
          "step": 5,
          "step_name": "Retinol Serum",
          "suggested_product": "bakuchiol_alternative",
          "reason": "Start with bakuchiol (gentler retinol alternative) before active retinol",
          "alternative": "Retinol 0.25-0.5% encapsulated"
        },
        {
          "step": 6,
          "step_name": "Night Cream",
          "suggested_product": "custom",
          "reason": "Rich occlusive with barrier-repairing ingredients",
          "alternative": "Ceramide + peptide night cream"
        }
      ]
    },
    "introduction_schedule": {
      "week_1": "Establish basic routine (cleanser, essence, moisturizer, SPF)",
      "week_2": "Add eye cream if needed",
      "week_3": "Introduce one active at a time (start with mild)",
      "week_4": "Evaluate tolerance, add next step if needed"
    },
    "budget_breakdown": {
      "total_estimated_cost": "$80-150",
      "breakdown": {
        "cleanser": "$15-20",
        "essence": "$15-25",
        "serum": "$20-40",
        "eye_cream": "$20-30",
        "moisturizer": "$20-40",
        "sunscreen": "$12-20"
      }
    },
    "next_steps": [
      "Try one product at a time to identify sensitivities",
      "Patch test on small area first",
      "Give each product 2-3 weeks to see results",
      "Log your skin condition regularly",
      "Adjust based on feedback"
    ]
  },
  "content": [
    {
      "type": "text",
      "text": "Personalized recommendation for combination skin with sensitivity. Start with barrier-repairing products and introduce actives slowly."
    }
  ]
}
```

---

## Resource 설계

### UI Resource: widget.html

**목적**: React 기반 스킨케어 위젯 (기존 프론트엔드 재활용)

**기술 스택**

```
React 18 (with hooks)
  ↓
Vite + esbuild (번들)
  ↓
HTML 템플릿 (인라인 CSS + JS)
  ↓
MCP Server (readFileSync로 로드)
  ↓
ChatGPT Widget (mimeType: text/html+skybridge)
```

**Resource 메타데이터**

```typescript
{
  uri: "ui://skincare/widget.html",
  mimeType: "text/html+skybridge",
  text: widgetHtml,  // 번들된 React 컴포넌트 + CSS 인라인
  _meta: {
    "openai/widgetPrefersBorder": true,  // 위젯 테두리 표시
    "openai/widgetCSP": {
      // Content Security Policy (신뢰 도메인만 허용)
      connect_domains: [
        "https://supabase-project.supabase.co"  // Supabase API
      ],
      resource_domains: [
        "https://images.unsplash.com",  // 상품 이미지
        "https://cdn.example.com"       // 정적 자산 (향후)
      ]
    }
  }
}
```

**빌드 프로세스**

```bash
# 1. React 컴포넌트를 esbuild로 번들
esbuild src/index.tsx \
  --bundle \
  --format=esm \
  --outfile=dist/widget.js \
  --external:react \
  --external:react-dom

# 2. HTML 템플릿 생성 (CSS + JS 인라인)
cat > dist/widget.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Tailwind CSS 스타일 인라인 */
    ... (전체 빌드된 CSS)
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // React + 위젯 로직 인라인
    ... (빌드된 JS)
  </script>
</body>
</html>
EOF

# 3. Server에서 readFileSync로 로드
const widgetHtml = readFileSync("../web/dist/widget.html", "utf8");
```

**Widget 컴포넌트 구조**

```tsx
// web/src/App.tsx
import React, { useState, useEffect } from 'react';

export function SkincareWidget() {
  // 1. Tool Output에서 데이터 읽기
  const toolOutput = window.openai?.toolOutput ?? {};
  const toolInput = window.openai?.toolInput ?? {};

  // 2. 현재 Tool에 따라 다른 컴포넌트 렌더링
  switch (window.openai?.currentTool) {
    case 'get_routine_guide':
      return <RoutineGuideWidget data={toolOutput} />;
    case 'search_products':
      return <SearchProductsWidget data={toolOutput} />;
    case 'get_product_details':
      return <ProductDetailWidget data={toolOutput} />;
    case 'get_skin_history':
      return <SkinHistoryWidget data={toolOutput} />;
    case 'get_routine_tips':
      return <RoutineTipsWidget data={toolOutput} />;
    case 'recommend_routine':
      return <RecommendRoutineWidget data={toolOutput} />;
    default:
      return <DefaultWidget />;
  }
}

// 각 컴포넌트는:
// - window.openai?.toolOutput에서 데이터 읽음
// - window.openai?.widgetState로 상태 저장
// - window.openai?.callTool()로 다른 Tool 호출
// - window.openai?.theme로 다크/라이트 모드 구분
```

**window.openai API 구현**

```typescript
// Server에서 Resource 반환 시, Widget 렌더링 전에 이 API 주입
// (ChatGPT 플랫폼에서 자동 처리)

interface WindowOpenAI {
  // 데이터
  toolOutput: any;              // Tool 결과 데이터 (structuredContent)
  toolInput: any;               // Tool 호출 인자
  widgetState: any;             // 저장된 위젯 상태
  theme: 'light' | 'dark';      // 현재 테마
  locale: string;               // 사용자 언어 (en, ko, ...)
  currentTool: string;          // 현재 실행된 Tool 이름

  // 함수
  setWidgetState(state: any): Promise<void>;
  callTool(toolName: string, args: any): Promise<ToolCallResult>;
  sendFollowUpMessage(args: {prompt: string}): Promise<void>;
  uploadFile(file: File): Promise<string>;
  requestDisplayMode(args: {mode: 'inline' | 'fullscreen' | 'pip'}): Promise<void>;
}
```

---

## 세션 관리 전략

### 세션 생명주기

```
┌─────────────────────────────────────────────────────────────┐
│ 클라이언트 (ChatGPT)                                       │
│                                                              │
│ 1. POST /mcp (신규 세션 요청)                              │
│    Headers: { "Accept": "application/json, ..." }          │
│    Body: { "jsonrpc": "2.0", "method": "initialize" }      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ MCP Server                                                   │
│                                                              │
│ 2a. SessionID 생성 (UUID)                                  │
│ const newSessionId = randomUUID();                          │
│                                                              │
│ 2b. Transport 생성 및 초기화                               │
│ const transport = new StreamableHTTPServerTransport({       │
│   sessionIdGenerator: () => randomUUID(),                   │
│   enableJsonResponse: true                                  │
│ });                                                         │
│ await server.connect(transport);                           │
│                                                              │
│ 2c. Transport 저장소에 추가                                 │
│ transports.set(newSessionId, transport);                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 응답 헤더                                                    │
│                                                              │
│ res.setHeader("mcp-session-id", newSessionId);             │
│ res.setHeader("Access-Control-Expose-Headers",             │
│   "mcp-session-id");                                        │
│ res.setHeader("Access-Control-Allow-Origin", "*");         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 클라이언트 (ChatGPT) - sessionId 저장                      │
│                                                              │
│ 3. 후속 요청에 sessionId 포함                              │
│    GET /mcp (SSE 스트림)                                   │
│    Headers: { "mcp-session-id": sessionId }                │
│    또는                                                     │
│    POST /mcp (Tool 호출)                                   │
│    Headers: { "mcp-session-id": sessionId }                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ MCP Server - 세션 재사용                                    │
│                                                              │
│ 3. 기존 세션 확인                                          │
│ const sessionId = req.headers["mcp-session-id"];           │
│ if (sessionId && transports.has(sessionId)) {              │
│   const transport = transports.get(sessionId)!;            │
│   await transport.handleRequest(req, res);                 │
│ }                                                          │
│                                                              │
│ → Tool 실행, 상태 유지됨                                    │
└─────────────────────────────────────────────────────────────┘
```

### Session 저장소 구현

```typescript
// server/src/session.ts
import { v4 as randomUUID } from 'uuid';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export class SessionManager {
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private sessions = new Map<string, SessionData>();

  private SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

  createSession(): string {
    const sessionId = randomUUID();

    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {}
    });

    // 세션 타임아웃 설정
    setTimeout(() => {
      this.removeSession(sessionId);
    }, this.SESSION_TIMEOUT);

    return sessionId;
  }

  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      return this.transports.get(sessionId);
    }
    return undefined;
  }

  setTransport(sessionId: string, transport: StreamableHTTPServerTransport) {
    this.transports.set(sessionId, transport);
  }

  removeSession(sessionId: string) {
    this.transports.delete(sessionId);
    this.sessions.delete(sessionId);
    console.log(`Session ${sessionId} expired`);
  }

  getSessionData(sessionId: string): any {
    return this.sessions.get(sessionId)?.data ?? {};
  }

  setSessionData(sessionId: string, key: string, value: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.data[key] = value;
    }
  }
}

interface SessionData {
  id: string;
  createdAt: number;
  lastActivity: number;
  data: Record<string, any>;
}
```

---

## 인증 전략

### Phase 1: noauth (현재)

**개요**: 초기 MVP에서는 인증 불필요 (데모용)

**구현**

```typescript
// Tool 정의에 인증 필요 없음
{
  name: "get_routine_guide",
  description: "...",
  // ✅ 인증 정보 없음 (noauth 기본값)
}
```

**장점**
- 빠른 개발 및 테스트
- 사용자가 계정 생성 불필요
- 심사 단계에서 인증 우회

**단점**
- 사용자별 개인 데이터 저장 불가
- 추후 인증 추가 시 리팩토링 필요

---

### Phase 2: OAuth2 (향후)

**인증 플로우**

```
┌─────────────────────────────────────────────────────────┐
│ ChatGPT                                                 │
│                                                          │
│ 사용자: "피부 기록 조회해줘"                           │
│   ↓                                                      │
│ ChatGPT: Tool 호출 (get_skin_history)                   │
│   ↓                                                      │
│ 응답 상태: 401 Unauthorized                            │
│ WWW-Authenticate: Bearer scope="skin:read"             │
└─────────────────┬─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ ChatGPT: OAuth 플로우 시작                              │
│                                                          │
│ 1. /.well-known/oauth-protected-resource 조회           │
│    → OAuth 설정 메타데이터 반환                         │
│                                                          │
│ 2. 사용자에게 권한 동의 요청                             │
│    "스킨케어 앱이 당신의 피부 기록 접근을 요청합니다"  │
│                                                          │
│ 3. 사용자: 동의 클릭                                    │
│    → OAuth Provider로 리다이렉트                        │
│                                                          │
│ 4. OAuth Provider: 인증 및 토큰 발급                    │
│    authorization_code → access_token                    │
│                                                          │
│ 5. ChatGPT: Token 저장 및 재시도                        │
│    Tool 호출 (Authorization: Bearer <token>)           │
└─────────────────┬─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ MCP Server: JWT 검증 및 RLS 적용                        │
│                                                          │
│ 1. Authorization 헤더에서 토큰 추출                      │
│ 2. JWT 검증 (서명, 만료 시간 등)                        │
│ 3. User ID 추출                                         │
│ 4. Supabase RLS 정책으로 자신의 데이터만 반환           │
└─────────────────────────────────────────────────────────┘
```

**구현 예시**

```typescript
// Server에서 OAuth 메타데이터 제공
// /.well-known/oauth-protected-resource
{
  "client_id": "your-app-id",
  "client_secret": process.env.OAUTH_CLIENT_SECRET,
  "authorization_endpoint": "https://oauth-provider/authorize",
  "token_endpoint": "https://oauth-provider/token",
  "redirect_uri": "https://chatgpt.com/connector_platform_oauth_redirect",
  "scope": "skin:read skin:write profile",
  "token_format": "jwt"
}

// Tool에서 인증 확인
server.tool(
  "get_skin_history",
  { /* ... */ },
  async (input, metadata) => {
    const token = metadata?.headers?.authorization?.split(" ")[1];

    if (!token) {
      return {
        content: [{type: "text", text: "Authorization required"}],
        isError: true,
        _meta: {
          "openai/requiresAuth": true,
          scope: "skin:read"
        }
      };
    }

    // JWT 검증
    const userId = verifyToken(token);

    // Supabase RLS 적용하여 조회
    const logs = await supabase
      .from('skin_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { structuredContent: logs, content: [...] };
  }
);
```

---

## 데이터 흐름도

### 흐름 1: Tool 호출 → Widget 렌더링

```
┌──────────────────┐
│   ChatGPT User   │
│ "루틴 안내해줘"   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ ChatGPT (Model)                       │
│ - 사용자 의도 파악                    │
│ - Tool 선택: get_routine_guide      │
│ - 매개변수: {routine_type: "morning"} │
└────────┬─────────────────────────────┘
         │ JSON-RPC 2.0
         ▼
┌──────────────────────────────────────┐
│ MCP Server                            │
│ 1. Tool 실행: get_routine_guide()   │
│ 2. 데이터 구성: structuredContent    │
│    {                                  │
│      routine_type: "morning",        │
│      total_steps: 6,                 │
│      steps: [...]                    │
│    }                                  │
│ 3. Response 반환:                    │
│    {                                  │
│      content: [{type: "text", ...}], │
│      structuredContent: {...}        │
│    }                                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ ChatGPT Platform                      │
│ 1. Tool 결과 수신                    │
│ 2. _meta["openai/outputTemplate"]   │
│    = "ui://skincare/widget.html"     │
│    확인 → Widget 렌더링 결정          │
│ 3. MCP Server에서 Resource 요청:    │
│    /resources/ui://skincare/widget.html
│                                       │
│ 4. Server 응답:                      │
│    {                                  │
│      uri: "ui://skincare/widget.html",
│      mimeType: "text/html+skybridge",
│      text: "<!DOCTYPE html>..."      │
│    }                                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ ChatGPT UI                           │
│ 1. Widget HTML 렌더링                │
│    (iframe 내부)                     │
│ 2. window.openai 주입:              │
│    {                                  │
│      toolOutput: structuredContent,  │
│      theme: "dark",                  │
│      setWidgetState: ...,            │
│      callTool: ...                   │
│    }                                  │
│ 3. React 앱 마운트                   │
│ 4. toolOutput에서 데이터 읽음        │
│ 5. 6단계 루틴 카드 렌더링            │
└──────────────────────────────────────┘
```

### 흐름 2: Widget에서 Tool 호출

```
┌──────────────────┐
│ Widget UI        │
│ (React)          │
│                  │
│ 사용자가 상품    │
│ 카드 클릭        │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Product Card Component              │
│ onClick={() => {                   │
│   const result = await             │
│     window.openai.callTool(        │
│       "get_product_details",      │
│       {product_id: "cosrx-snail"} │
│     );                             │
│   setWidgetState({                │
│     selectedProductId: "..."       │
│   });                              │
│ }}                                 │
└────────┬────────────────────────────┘
         │ (ChatGPT 백그라운드)
         ▼
┌────────────────────────────────────┐
│ ChatGPT Platform                   │
│ 1. Tool 호출 처리:                │
│    callTool("get_product_details") │
│ 2. MCP Server로 전달               │
│ 3. Tool 응답 대기                  │
└────────┬────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ MCP Server                         │
│ get_product_details Tool 실행      │
│ 응답:                              │
│ {                                  │
│   structuredContent: {             │
│     product_id: "cosrx-snail",    │
│     name: "Advanced Snail ...",   │
│     ingredients: {...}             │
│   }                                │
│ }                                  │
└────────┬────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Widget (React)                     │
│ 1. callTool Promise 해결           │
│ 2. result = structuredContent      │
│ 3. Component 상태 업데이트:        │
│    setSelectedProduct(result)      │
│ 4. setWidgetState() 호출:          │
│    {selectedProductId: "..."}      │
│ 5. UI 재렌더링:                    │
│    상품 상세 정보 표시              │
└────────────────────────────────────┘
```

---

## 구현 체크리스트

### Phase 3-A: MCP Server 기본 구조

- [ ] Node.js 프로젝트 생성
  - [ ] `npm init`
  - [ ] 의존성 설치: `@modelcontextprotocol/sdk`, `zod`, `uuid`

- [ ] TypeScript 설정
  - [ ] `tsconfig.json` 작성
  - [ ] 컴파일 설정

- [ ] McpServer 인스턴스 생성
  - [ ] Server 초기화 (name, version)
  - [ ] capabilities 설정

- [ ] HTTP 전송 계층 구현
  - [ ] createServer()로 HTTP 서버 생성
  - [ ] CORS 헤더 설정
  - [ ] OPTIONS 프리플라이트 처리

- [ ] 세션 관리 구현
  - [ ] SessionManager 클래스 작성
  - [ ] UUID 기반 sessionId 생성
  - [ ] Map<sessionId, transport> 저장소
  - [ ] 30분 타임아웃 설정

### Phase 3-B: Tool 구현 (7개)

**Tool 1: get_routine_guide**
- [ ] Tool 정의 (이름, 설명, 입력 스키마)
- [ ] Mock 데이터 로딩 (AM/PM 6단계)
- [ ] structuredContent 구성
- [ ] _meta["openai/outputTemplate"] 설정

**Tool 2: search_products**
- [ ] Tool 정의
- [ ] Mock 데이터: productsData 배열
- [ ] 검색 로직 (쿼리, 카테고리, 등급 필터)
- [ ] structuredContent 구성

**Tool 3: get_product_details**
- [ ] Tool 정의
- [ ] 상품 ID로 조회
- [ ] 상세 정보 + 성분 정보 반환
- [ ] structuredContent 구성

**Tool 4: log_skin_condition**
- [ ] Tool 정의
- [ ] Supabase 클라이언트 초기화 (또는 Mock DB)
- [ ] 데이터 유효성 검사
- [ ] INSERT 로직 + RLS 적용
- [ ] 성공/실패 응답

**Tool 5: get_skin_history**
- [ ] Tool 정의
- [ ] 날짜 범위 쿼리
- [ ] 통계 계산 (평균, 트렌드)
- [ ] Insight 생성
- [ ] structuredContent 구성

**Tool 6: get_routine_tips**
- [ ] Tool 정의
- [ ] 팁 데이터베이스 (기술, 성분, 실수 등)
- [ ] 단계별 + 주제별 필터링
- [ ] structuredContent 구성

**Tool 7: recommend_routine**
- [ ] Tool 정의
- [ ] 피부 타입별 루틴 템플릿
- [ ] 관심사별 추가 권장사항
- [ ] 예산별 상품 추천
- [ ] structuredContent 구성

### Phase 3-C: Resource 구현

- [ ] React UI 빌드
  - [ ] esbuild 설정
  - [ ] `npm run build` 스크립트
  - [ ] `dist/widget.js` 생성

- [ ] HTML 템플릿 생성
  - [ ] CSS 인라인 (Tailwind)
  - [ ] JS 인라인 (번들된 React)
  - [ ] `dist/widget.html` 생성

- [ ] Resource 등록
  - [ ] uri: "ui://skincare/widget.html"
  - [ ] mimeType: "text/html+skybridge"
  - [ ] _meta["openai/widgetPrefersBorder"]: true
  - [ ] _meta["openai/widgetCSP"] 설정

- [ ] readFileSync로 위젯 로드
  - [ ] 서버 시작 시 widget.html 읽음
  - [ ] Resource 핸들러에서 응답

### Phase 3-D: Tool Output → Widget 매핑

- [ ] window.openai.toolOutput 필드명 확인
  - [ ] 서버 응답 필드명과 Widget에서 사용하는 필드명 정확히 일치

예:
```typescript
// Server: structuredContent.routine_type
// Widget: window.openai.toolOutput.routine_type ✅

// Server: structuredContent.routineType (❌ 혼동)
// Widget: window.openai.toolOutput.routine_type (❌ 불일치)
```

- [ ] 각 Tool별 Widget 컴포넌트 구현
  - [ ] RoutineGuideWidget
  - [ ] SearchProductsWidget
  - [ ] ProductDetailWidget
  - [ ] SkinHistoryWidget
  - [ ] RoutineTipsWidget
  - [ ] RecommendRoutineWidget

- [ ] window.openai API 활용
  - [ ] window.openai.setWidgetState() (상태 저장)
  - [ ] window.openai.callTool() (다른 Tool 호출)
  - [ ] window.openai.theme (다크/라이트 모드)
  - [ ] window.openai.locale (다국어)

---

## 배포 체크리스트

### Pre-Deployment

- [ ] 환경 변수 설정
  - [ ] Supabase URL, API Key
  - [ ] OAuth 클라이언트 ID/Secret (필요 시)
  - [ ] PORT 설정

- [ ] 프로덕션 데이터 준비
  - [ ] Supabase 테이블 생성 (skin_logs)
  - [ ] RLS 정책 설정
  - [ ] 초기 데이터 로딩 (상품, 루틴, 성분)

- [ ] CSP 설정 최종 검토
  - [ ] Supabase 도메인 추가
  - [ ] CDN 도메인 확인
  - [ ] 불필요한 도메인 제거

- [ ] 테스트
  - [ ] MCP Inspector에서 모든 Tool 테스트
  - [ ] Widget 렌더링 확인
  - [ ] 에러 케이스 테스트

### Hosting 선택 및 배포

**옵션 1: Fly.io (권장)**

```bash
# 1. Fly.io 계정 생성 & CLI 설치
fly auth login

# 2. 앱 생성
fly launch
# → fly.toml 자동 생성

# 3. 환경 변수 설정
fly secrets set SUPABASE_URL=https://...
fly secrets set SUPABASE_ANON_KEY=...

# 4. 배포
fly deploy

# 5. 확인
curl https://your-app.fly.dev/mcp -X POST
```

**옵션 2: Render**

```bash
# 1. Render 대시보드에서 "New Web Service" 생성
# 2. GitHub 저장소 연결
# 3. 환경 변수 설정
# 4. 자동 배포 (git push 시)
```

**옵션 3: Railway**

```bash
# 1. Railway 계정 생성
# 2. 프로젝트 생성
# 3. package.json에 "start" 스크립트 추가
# 4. GitHub 연결 또는 CLI로 배포
```

- [ ] 프로덕션 URL 확인
  - [ ] HTTPS 지원 확인
  - [ ] `/mcp` 엔드포인트 응답 확인
  - [ ] CORS 헤더 확인

- [ ] 모니터링 설정
  - [ ] 에러 로깅 (예: Sentry)
  - [ ] Tool 호출 통계
  - [ ] 응답 시간 추적

### OpenAI 제출 준비

- [ ] 앱 메타데이터 작성
  - [ ] 앱 이름: "K-Beauty Skincare Routine"
  - [ ] 설명: "Learn Korean skincare routines, find K-beauty products, log skin conditions"
  - [ ] 카테고리: "Health & Wellness" 또는 "Lifestyle"
  - [ ] 스크린샷 5개 이상 (각 Tool의 Widget 화면)

- [ ] 정책 문서 준비
  - [ ] Privacy Policy URL
  - [ ] Terms of Service URL
  - [ ] Support Contact Email

- [ ] CSP 최종 검증
  - [ ] 모든 외부 도메인 나열
  - [ ] 불필요한 도메인 제거

- [ ] 테스트 계정 준비 (OAuth 사용 시)
  - [ ] 심사팀용 테스트 계정 생성
  - [ ] 로그인 자격증명 제공

---

## 문제 해결 가이드

### 일반적인 오류

**1. "Server not initialized" 오류**

원인: sessionIdGenerator가 undefined로 설정됨

```typescript
// ❌ 잘못됨
sessionIdGenerator: undefined

// ✅ 올바름
sessionIdGenerator: () => randomUUID()
```

**2. Widget이 렌더링되지 않음**

확인 사항:
- [ ] Tool 결과에 `structuredContent`가 있는가?
- [ ] _meta["openai/outputTemplate"]이 Tool에 설정되어 있는가?
- [ ] Resource의 mimeType이 "text/html+skybridge"인가?
- [ ] 브라우저 Console에 CSP 에러가 있는가?

**3. callTool이 작동하지 않음**

확인 사항:
- [ ] Tool이 widget에서 접근 가능한가? (private 아님)
- [ ] window.openai.callTool이 정의되어 있는가?
- [ ] Tool 이름 오타는 없는가?

**4. 상태가 저장되지 않음**

확인 사항:
- [ ] setWidgetState()를 호출했는가?
- [ ] widgetState 초기화 시 undefined 확인했는가?
- [ ] useEffect에서 저장하고 있는가?

---

## 결론

이 설계 문서는 K-Beauty Skincare Routine ChatGPT App의 MCP Server 아키텍처를 정의합니다.

**다음 단계**
1. Phase 3 (Build): MCP Server 구현
2. Phase 4 (Test): MCP Inspector + ChatGPT 테스트
3. Phase 5 (Deploy): Fly.io 배포
4. Phase 6 (Submit): OpenAI 앱 스토어 제출

**연락처**
- 기술 지원: [Support Email]
- 피드백: [Feedback Form]

---

**문서 버전 정보**

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-02-09 | 최초 작성 - Tool 정의 7개, Resource 설계, 세션 관리, 데이터 흐름도, 체크리스트 |

