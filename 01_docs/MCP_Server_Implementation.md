# K-Beauty MCP Server - 구현 수도코드 (TypeScript)

**문서 버전**: 1.0
**작성 일자**: 2026-02-09
**목적**: Phase 3 개발 시 참고할 TypeScript 구현 가이드

---

## 1. 프로젝트 구조

```
k-beauty-mcp-server/
├── server/
│   ├── src/
│   │   ├── index.ts                 # 메인 서버 진입점
│   │   ├── types.ts                 # 타입 정의
│   │   ├── session.ts               # 세션 관리
│   │   ├── tools/
│   │   │   ├── routine-guide.ts      # Tool 1
│   │   │   ├── search-products.ts    # Tool 2
│   │   │   ├── product-details.ts    # Tool 3
│   │   │   ├── log-skin.ts           # Tool 4
│   │   │   ├── skin-history.ts       # Tool 5
│   │   │   ├── routine-tips.ts       # Tool 6
│   │   │   └── recommend-routine.ts  # Tool 7
│   │   ├── data/
│   │   │   ├── products.ts           # 상품 Mock 데이터
│   │   │   ├── routines.ts           # 루틴 데이터
│   │   │   ├── ingredients.ts        # 성분 데이터
│   │   │   └── tips.ts               # 팁 데이터
│   │   ├── db/
│   │   │   └── supabase.ts           # Supabase 클라이언트
│   │   └── utils/
│   │       └── helpers.ts            # 유틸리티 함수
│   ├── package.json
│   └── tsconfig.json
│
├── web/
│   ├── src/
│   │   ├── App.tsx                   # 메인 위젯
│   │   ├── components/
│   │   │   ├── RoutineGuideWidget.tsx
│   │   │   ├── SearchProductsWidget.tsx
│   │   │   ├── ProductDetailWidget.tsx
│   │   │   ├── SkinHistoryWidget.tsx
│   │   │   ├── RoutineTipsWidget.tsx
│   │   │   └── RecommendRoutineWidget.tsx
│   │   ├── styles/
│   │   │   └── globals.css            # Tailwind 스타일
│   │   └── index.tsx                 # React 진입점
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 2. 메인 서버 (server/src/index.ts)

```typescript
// server/src/index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  StreamableHTTPServerTransport,
  StreamableHTTPServer,
} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { v4 as randomUUID } from "uuid";
import { z } from "zod";

// 세션 관리
import { SessionManager } from "./session";

// Tools
import { registerRoutineGuideTool } from "./tools/routine-guide";
import { registerSearchProductsTool } from "./tools/search-products";
import { registerProductDetailsTool } from "./tools/product-details";
import { registerLogSkinTool } from "./tools/log-skin";
import { registerSkinHistoryTool } from "./tools/skin-history";
import { registerRoutineTipsTool } from "./tools/routine-tips";
import { registerRecommendRoutineTool } from "./tools/recommend-routine";

// ============================================================================
// STEP 1: 전역 설정
// ============================================================================

const PORT = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const RESOURCE_BASE_URI = "ui://skincare";

// ============================================================================
// STEP 2: MCP Server 인스턴스 생성
// ============================================================================

const server = new McpServer(
  {
    name: "k-beauty-skincare",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// ============================================================================
// STEP 3: 세션 관리 초기화
// ============================================================================

const sessionManager = new SessionManager();

// ============================================================================
// STEP 4: Widget HTML 리소스 등록
// ============================================================================

// 주의: 프로덕션에서는 번들된 HTML 파일 경로 확인 필수
const widgetHtmlPath = join(__dirname, "../web/dist/widget.html");
let cachedWidgetHtml: string = "";

try {
  cachedWidgetHtml = readFileSync(widgetHtmlPath, "utf8");
  console.log(`Widget HTML loaded from ${widgetHtmlPath}`);
} catch (error) {
  console.error(`Failed to load widget HTML: ${error}`);
  cachedWidgetHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body><h1>Widget HTML not found</h1></body>
    </html>
  `;
}

// Resource 등록: 모든 Tool이 같은 Widget을 사용
server.registerResource(
  "widget",
  `${RESOURCE_BASE_URI}/widget.html`,
  {},
  async () => ({
    contents: [
      {
        uri: `${RESOURCE_BASE_URI}/widget.html`,
        mimeType: "text/html+skybridge",
        text: cachedWidgetHtml,
        _meta: {
          "openai/widgetPrefersBorder": true,
          "openai/widgetCSP": {
            // Supabase 및 이미지 CDN 신뢰
            connect_domains: [
              "https://supabase-project.supabase.co", // 실제 프로젝트 ID로 교체
              "https://images.unsplash.com",
            ],
            resource_domains: ["https://images.unsplash.com"],
          },
        } as any,
      },
    ],
  })
);

// ============================================================================
// STEP 5: Tools 등록 (7개)
// ============================================================================

// 각 Tool 등록 함수에서 Tool descriptor + handler를 등록
// 예: Tool 1 - Get Routine Guide
await registerRoutineGuideTool(server);

// Tool 2 - Search Products
await registerSearchProductsTool(server);

// Tool 3 - Get Product Details
await registerProductDetailsTool(server);

// Tool 4 - Log Skin Condition
await registerLogSkinTool(server);

// Tool 5 - Get Skin History
await registerSkinHistoryTool(server);

// Tool 6 - Get Routine Tips
await registerRoutineTipsTool(server);

// Tool 7 - Recommend Routine
await registerRecommendRoutineTool(server);

// ============================================================================
// STEP 6: HTTP 서버 생성
// ============================================================================

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    // CORS 프리플라이트 처리
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
        "Access-Control-Expose-Headers": "mcp-session-id",
      });
      res.end();
      return;
    }

    // MCP 엔드포인트 처리
    if (url.pathname === MCP_PATH) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

      // 세션 ID 추출 (헤더에서)
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // 시나리오 1: 기존 세션 (GET 또는 POST)
      if (sessionId && sessionManager.hasSession(sessionId)) {
        const transport = sessionManager.getTransport(sessionId);
        if (transport) {
          await transport.handleRequest(req, res);
          return;
        }
      }

      // 시나리오 2: 새 세션 생성 (POST만)
      if (req.method === "POST") {
        const newSessionId = randomUUID();

        // Transport 생성 및 Server 연결
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          enableJsonResponse: true,
        });

        await server.connect(transport);

        // 세션 저장
        sessionManager.setSession(newSessionId, transport);

        // Response 헤더에 sessionId 추가
        res.setHeader("mcp-session-id", newSessionId);

        // Request 처리
        await transport.handleRequest(req, res);
        return;
      }

      // 세션 없으면 404
      res.writeHead(404).end("Session not found");
      return;
    }

    // 건강 체크 엔드포인트
    if (url.pathname === "/health") {
      res.writeHead(200).end("OK");
      return;
    }

    // 그 외 경로
    res.writeHead(404).end("Not Found");
  }
);

// ============================================================================
// STEP 7: 서버 시작
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}${MCP_PATH}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log("Environment:");
  console.log(`  - Supabase: ${process.env.SUPABASE_URL ? "configured" : "not configured"}`);
  console.log(`  - Widget: ${cachedWidgetHtml.length} bytes loaded`);
});

// 종료 처리
process.on("SIGINT", () => {
  console.log("Shutting down...");
  httpServer.close();
  process.exit(0);
});

// ============================================================================
// STEP 8: 오류 처리
// ============================================================================

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
```

---

## 3. 세션 관리 (server/src/session.ts)

```typescript
// server/src/session.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
  metadata: Record<string, any>;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

  /**
   * 세션 생성
   */
  createSession(sessionId: string): Session {
    const session: Session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      metadata: {},
    };

    this.sessions.set(sessionId, session);

    // 타임아웃 설정
    setTimeout(() => {
      this.removeSession(sessionId);
    }, this.SESSION_TIMEOUT);

    return session;
  }

  /**
   * 세션 존재 여부 확인
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Transport 저장
   */
  setSession(
    sessionId: string,
    transport: StreamableHTTPServerTransport
  ): void {
    if (!this.sessions.has(sessionId)) {
      this.createSession(sessionId);
    }
    this.transports.set(sessionId, transport);
  }

  /**
   * Transport 조회
   */
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      return this.transports.get(sessionId);
    }
    return undefined;
  }

  /**
   * 세션 제거
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.transports.delete(sessionId);
    console.log(`Session ${sessionId} removed`);
  }

  /**
   * 세션 메타데이터 조회
   */
  getMetadata(sessionId: string): Record<string, any> {
    return this.sessions.get(sessionId)?.metadata ?? {};
  }

  /**
   * 세션 메타데이터 설정
   */
  setMetadata(sessionId: string, key: string, value: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata[key] = value;
    }
  }
}
```

---

## 4. Tool 예시: Get Routine Guide

```typescript
// server/src/tools/routine-guide.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRoutineData } from "../data/routines";

export async function registerRoutineGuideTool(server: McpServer): Promise<void> {
  // Tool descriptor
  const descriptor = {
    name: "get_routine_guide",
    title: "Get Skincare Routine Guide",
    description:
      "Use this when the user wants to learn the 6-step Korean skincare routine for morning or evening",

    // 입력 스키마 (Zod)
    inputSchema: z.object({
      routine_type: z.enum(["morning", "evening"]).describe(
        "Time of day for the routine (morning or evening)"
      ),
      language: z
        .enum(["en", "ko"])
        .default("en")
        .describe("Response language (English or Korean)"),
    }),

    // Tool 특성
    annotations: {
      readOnlyHint: true,  // 데이터 조회만
      destructiveHint: false,
    },

    // ChatGPT 메타데이터
    _meta: {
      "openai/outputTemplate": "ui://skincare/widget.html",
      "openai/toolInvocation/invoking": "Loading routine guide...",
      "openai/toolInvocation/invoked": "Routine guide ready",
    },
  };

  // Tool 핸들러
  const handler = async (input: {
    routine_type: "morning" | "evening";
    language?: "en" | "ko";
  }) => {
    const { routine_type, language = "en" } = input;

    try {
      // 데이터 조회
      const routineData = getRoutineData(routine_type, language);

      // structuredContent 구성
      const structuredContent = {
        routine_type,
        total_steps: routineData.steps.length,
        estimated_time: routineData.estimated_time,
        steps: routineData.steps.map((step, index) => ({
          step_number: index + 1,
          name: step.name,
          description: step.description,
          tip: step.tip,
          duration: step.duration,
          ingredient_focus: step.ingredient_focus,
        })),
        skin_type_notes: routineData.skin_type_notes,
        alternatives: routineData.alternatives,
      };

      return {
        structuredContent,
        content: [
          {
            type: "text",
            text: `${routine_type === "morning" ? "Morning" : "Evening"} routine: ${routineData.steps.length} steps, ${routineData.estimated_time}. ` +
              `Start with ${routineData.steps[0].name.toLowerCase()} and end with ${routineData.steps[routineData.steps.length - 1].name.toLowerCase()}.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_routine_guide:", error);
      return {
        content: [
          {
            type: "text",
            text: "Failed to load routine guide. Please try again.",
            isError: true,
          },
        ],
      };
    }
  };

  // Tool 등록
  server.tool(descriptor, handler);
}
```

---

## 5. Tool 예시: Log Skin Condition

```typescript
// server/src/tools/log-skin.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../db/supabase";
import { v4 as randomUUID } from "uuid";

export async function registerLogSkinTool(server: McpServer): Promise<void> {
  const descriptor = {
    name: "log_skin_condition",
    title: "Log Skin Condition",
    description:
      "Use this when the user wants to save or update their skin condition, hydration level, and notes",

    inputSchema: z.object({
      skin_type: z
        .enum(["oily", "dry", "combination", "normal", "sensitive"])
        .describe("Current skin type classification"),
      hydration_level: z
        .number()
        .min(0)
        .max(100)
        .describe("Hydration level 0-100"),
      sensitivity_level: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Skin sensitivity level 0-100"),
      notes: z
        .string()
        .optional()
        .describe("User notes about skin condition"),
    }),

    annotations: {
      readOnlyHint: false,  // 데이터 생성 (Write)
      destructiveHint: false,
    },

    _meta: {
      "openai/outputTemplate": "ui://skincare/widget.html",
      "openai/toolInvocation/invoking": "Saving skin condition...",
      "openai/toolInvocation/invoked": "Condition saved successfully",
    },
  };

  const handler = async (input: {
    skin_type: string;
    hydration_level: number;
    sensitivity_level?: number;
    notes?: string;
  }) => {
    const {
      skin_type,
      hydration_level,
      sensitivity_level = 0,
      notes = "",
    } = input;

    try {
      // 개발/테스트 모드: Mock 데이터 저장 (localStorage 대신 메모리)
      // 프로덕션: Supabase에 저장

      const logId = randomUUID();
      const timestamp = new Date().toISOString();

      // TODO: Supabase RLS와 함께 저장
      // const supabase = createSupabaseClient();
      // await supabase
      //   .from('skin_logs')
      //   .insert({
      //     user_id: userId,
      //     skin_type,
      //     hydration_level,
      //     sensitivity_level,
      //     notes,
      //     created_at: timestamp,
      //   });

      const structuredContent = {
        success: true,
        log_id: logId,
        timestamp,
        recorded_data: {
          skin_type,
          hydration_level,
          sensitivity_level,
          notes,
        },
        message: "Your skin condition has been recorded. Track your progress over time!",
      };

      return {
        structuredContent,
        content: [
          {
            type: "text",
            text: "Skin condition logged successfully. You can view your history anytime to track skin changes.",
          },
        ],
      };
    } catch (error) {
      console.error("Error in log_skin_condition:", error);
      return {
        content: [
          {
            type: "text",
            text: "Failed to save skin log. Please try again later.",
            isError: true,
          },
        ],
      };
    }
  };

  server.tool(descriptor, handler);
}
```

---

## 6. Mock 데이터 (server/src/data/routines.ts)

```typescript
// server/src/data/routines.ts

export interface RoutineStep {
  name: string;
  description: string;
  tip: string;
  duration: string;
  ingredient_focus: string[];
}

export interface RoutineData {
  routine_type: "morning" | "evening";
  steps: RoutineStep[];
  estimated_time: string;
  skin_type_notes: string;
  alternatives: Record<string, string>;
}

const amRoutineEn: RoutineStep[] = [
  {
    name: "Gentle Cleanser",
    description: "Low-pH gel cleanser to maintain skin barrier",
    tip: "Use lukewarm water, massage for 60 seconds",
    duration: "1-2 min",
    ingredient_focus: ["ceramides", "amino acids"],
  },
  {
    name: "Essence",
    description: "Hydrating galactomyces ferment filtrate base",
    tip: "Pat gently until fully absorbed, do not rub",
    duration: "1-2 min",
    ingredient_focus: ["hyaluronic acid", "peptides"],
  },
  // ... 나머지 4단계
];

const pmRoutineEn: RoutineStep[] = [
  // ... 저녁 루틴
];

const amRoutineKo: RoutineStep[] = [
  // ... 한국어 버전
];

const pmRoutineKo: RoutineStep[] = [
  // ... 한국어 버전
];

export function getRoutineData(
  type: "morning" | "evening",
  language: "en" | "ko"
): RoutineData {
  let steps: RoutineStep[];

  if (type === "morning") {
    steps = language === "en" ? amRoutineEn : amRoutineKo;
  } else {
    steps = language === "en" ? pmRoutineEn : pmRoutineKo;
  }

  return {
    routine_type: type,
    steps,
    estimated_time: type === "morning" ? "8-10 minutes" : "12-15 minutes",
    skin_type_notes:
      language === "en"
        ? "This routine is optimized for combination skin"
        : "이 루틴은 복합성 피부에 최적화되어 있습니다",
    alternatives: {
      for_oily_skin:
        language === "en"
          ? "Use lightweight, oil-free products"
          : "가벼운 오일프리 제품을 사용하세요",
      for_dry_skin:
        language === "en"
          ? "Add extra hydration layers and heavier moisturizer"
          : "추가 수분층을 더하고 무거운 보습제를 사용하세요",
      for_sensitive_skin:
        language === "en"
          ? "Skip exfoliating toner, use gentle essences"
          : "각질 토너는 건너뛰고 순한 에센스를 사용하세요",
    },
  };
}
```

---

## 7. Widget 컴포넌트 예시 (web/src/App.tsx)

```typescript
// web/src/App.tsx

import React, { useState, useEffect } from "react";

// Global type declarations
declare global {
  interface Window {
    openai: {
      toolOutput: any;
      toolInput: any;
      widgetState: any;
      setWidgetState: (state: any) => Promise<void>;
      callTool: (name: string, args: any) => Promise<any>;
      sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
      theme: "light" | "dark";
      locale: string;
    };
  }
}

export function App() {
  const [widgetState, setWidgetState] = useState(
    window.openai?.widgetState ?? {}
  );

  // ============================================================================
  // 데이터 추출
  // ============================================================================

  // Tool 결과에서 데이터 읽기
  const toolOutput = window.openai?.toolOutput ?? {};
  const currentTool = window.openai?.currentTool ?? "";
  const theme = window.openai?.theme ?? "dark";

  // ============================================================================
  // 상태 변경 시 저장
  // ============================================================================

  useEffect(() => {
    if (window.openai?.setWidgetState) {
      window.openai.setWidgetState(widgetState);
    }
  }, [widgetState]);

  // ============================================================================
  // Tool별 렌더링
  // ============================================================================

  const renderContent = () => {
    switch (currentTool) {
      case "get_routine_guide":
        return <RoutineGuideWidget data={toolOutput} />;
      case "search_products":
        return <SearchProductsWidget data={toolOutput} />;
      case "get_product_details":
        return <ProductDetailWidget data={toolOutput} />;
      case "get_skin_history":
        return <SkinHistoryWidget data={toolOutput} />;
      case "get_routine_tips":
        return <RoutineTipsWidget data={toolOutput} />;
      case "recommend_routine":
        return <RecommendRoutineWidget data={toolOutput} />;
      default:
        return <DefaultWidget />;
    }
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="bg-white dark:bg-[#181211] text-[#181211] dark:text-[#D6D7D2] min-h-screen p-6">
        {renderContent()}
      </div>
    </div>
  );
}

// ============================================================================
// Widget 컴포넌트들
// ============================================================================

interface RoutineGuideWidgetProps {
  data: any;
}

function RoutineGuideWidget({ data }: RoutineGuideWidgetProps) {
  const { routine_type, total_steps, steps, estimated_time } = data;

  if (!steps || steps.length === 0) {
    return <p>Loading routine...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        {routine_type === "morning" ? "Morning" : "Evening"} Skincare Routine
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {total_steps} steps • {estimated_time}
      </p>

      <div className="space-y-4">
        {steps.map((step: any, index: number) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-[#4A4743] p-4 rounded"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold text-[#C7372C]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold">{step.name}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-[#94938F] mb-2">
              {step.description}
            </p>
            <div className="bg-[#C7372C]/5 p-2 rounded text-xs italic border border-[#C7372C]/20">
              💡 {step.tip}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchProductsWidget({ data }: { data: any }) {
  const { results = [] } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleProductClick = async (productId: string) => {
    setSelectedId(productId);
    // callTool로 상세 정보 조회
    const details = await window.openai?.callTool("get_product_details", {
      product_id: productId,
    });
    console.log("Product details:", details);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Search Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((product: any) => (
          <div
            key={product.id}
            className="border border-gray-200 dark:border-[#4A4743] p-4 rounded cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleProductClick(product.id)}
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-32 object-cover rounded mb-3"
            />
            <p className="text-xs text-[#C7372C] uppercase font-bold">
              {product.brand}
            </p>
            <h3 className="font-semibold mb-2">{product.name}</h3>
            <div className="flex justify-between items-center text-xs">
              <span>⭐ {product.rating}</span>
              <span>{product.price_range}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetailWidget({ data }: { data: any }) {
  const { product_id, brand, name, description, ingredients } = data;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">{name}</h2>
      <p className="text-xs text-[#C7372C] uppercase font-bold mb-4">
        {brand}
      </p>
      <p className="text-gray-600 dark:text-[#94938F] mb-6">{description}</p>

      <h3 className="text-lg font-bold mb-4">Main Ingredients</h3>
      <div className="space-y-3">
        {ingredients?.main_ingredients?.map((ing: any, index: number) => (
          <div key={index} className="border-l-4 border-[#C7372C] pl-4">
            <p className="font-semibold">{ing.ingredient}</p>
            <p className="text-sm text-gray-600">{ing.benefit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkinHistoryWidget({ data }: { data: any }) {
  const { logs = [], statistics } = data;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Skin History</h2>

      {statistics && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-[#4A4743] p-4 rounded">
            <p className="text-xs text-gray-500">Avg Hydration</p>
            <p className="text-2xl font-bold">{statistics.avg_hydration}%</p>
          </div>
          <div className="bg-gray-50 dark:bg-[#4A4743] p-4 rounded">
            <p className="text-xs text-gray-500">Trend</p>
            <p className="text-lg font-bold">
              {statistics.hydration_trend === "improving"
                ? "📈 Improving"
                : "➡️ Stable"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {logs.map((log: any, index: number) => (
          <div key={index} className="border border-gray-200 dark:border-[#4A4743] p-4 rounded">
            <p className="font-semibold">{log.date}</p>
            <p className="text-sm text-gray-600">
              Hydration: {log.hydration_level}% • Type: {log.skin_type}
            </p>
            {log.notes && (
              <p className="text-sm text-gray-500 mt-2 italic">{log.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoutineTipsWidget({ data }: { data: any }) {
  const { step_name, topic, content } = data;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">{step_name}</h2>
      <p className="text-sm text-gray-500 mb-6">Topic: {topic}</p>

      <div className="prose dark:prose-invert max-w-none">
        <h3>{content?.title}</h3>
        <p>{content?.overview}</p>

        {content?.techniques && (
          <div>
            <h4>Techniques</h4>
            <ul>
              {content.techniques.map((tech: any, i: number) => (
                <li key={i}>
                  <strong>{tech.name}:</strong> {tech.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendRoutineWidget({ data }: { data: any }) {
  const { user_profile, morning_routine_recommendation } = data;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Personalized Routine</h2>

      <div className="bg-gray-50 dark:bg-[#4A4743] p-4 rounded mb-6">
        <p className="text-sm">
          <strong>Skin Type:</strong> {user_profile?.skin_type}
        </p>
        <p className="text-sm">
          <strong>Concern:</strong> {user_profile?.primary_concern}
        </p>
      </div>

      <h3 className="text-lg font-bold mb-4">Morning Routine</h3>
      <div className="space-y-3">
        {morning_routine_recommendation?.recommended_products?.map(
          (product: any, i: number) => (
            <div key={i} className="border-l-4 border-[#C7372C] pl-4">
              <p className="font-semibold">
                Step {product.step}: {product.step_name}
              </p>
              <p className="text-sm text-gray-600">{product.reason}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function DefaultWidget() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-2">K-Beauty Skincare</h2>
      <p className="text-gray-500">Select a tool to begin</p>
    </div>
  );
}
```

---

## 8. 빌드 및 배포 스크립트

```json
// server/package.json

{
  "name": "k-beauty-mcp-server",
  "version": "1.0.0",
  "description": "MCP Server for K-Beauty Skincare Routine ChatGPT App",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "echo 'No tests yet'"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.1.0",
    "@supabase/supabase-js": "^2.38.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

```bash
#!/bin/bash
# build.sh

# 1. Web 빌드
cd web
npm run build
cd ..

# 2. Server 빌드
cd server
npm run build
cd ..

# 3. Widget HTML을 Server에 복사
cp web/dist/widget.html server/dist/web/

echo "Build complete!"
```

---

## 9. 주요 주의사항

### ✅ 필수 구현 사항

1. **sessionIdGenerator 반드시 설정**
   ```typescript
   sessionIdGenerator: () => randomUUID()  // ✅ 필수
   sessionIdGenerator: undefined           // ❌ 작동 안 함
   ```

2. **Tool 응답에 structuredContent 포함**
   ```typescript
   return {
     structuredContent: { ... },  // ✅ 필수
     content: [{ type: "text", ... }]
   };
   ```

3. **Tool에 _meta["openai/outputTemplate"] 설정**
   ```typescript
   _meta: {
     "openai/outputTemplate": "ui://skincare/widget.html"  // ✅
   }
   ```

4. **Widget HTML의 필드명과 서버 응답 정확히 일치**
   ```typescript
   // Server: structuredContent.routine_type
   // Widget: window.openai.toolOutput.routine_type  ✅
   ```

5. **CORS 헤더 및 mcp-session-id 노출**
   ```typescript
   res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
   ```

### ❌ 피해야 할 것들

1. **Stateless HTTP (sessionIdGenerator: undefined)** → 서버 초기화 오류
2. **localStorage 사용** → iframe 내에서 작동하지 않음
3. **hardcoded sessionId** → 다중 사용자 지원 불가
4. **Tool 응답에서 content만 반환** → Widget 렌더링 안 됨
5. **CSP 도메인 누락** → CORS 오류

---

## 결론

이 수도코드는 K-Beauty MCP Server의 기본 구조를 제공합니다.

**구현 순서 권장**
1. 세션 관리 (SessionManager)
2. HTTP 서버 기본 구조
3. Tool 1-2개 구현 (get_routine_guide, search_products)
4. Widget 컴포넌트 1개 구현 (RoutineGuideWidget)
5. MCP Inspector에서 테스트
6. 나머지 Tool 5개 구현
7. Fly.io 배포

**다음: Phase 3 개발 시작**

