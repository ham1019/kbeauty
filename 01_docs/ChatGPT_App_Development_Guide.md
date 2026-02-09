# ChatGPT App 개발 완전 가이드

> 요구사항 정의부터 배포까지 - 비개발자도 따라할 수 있는 단계별 체크리스트

---

## 목차

1. [개요](#1-개요)
2. [가이드 준수 원칙](#가이드-준수-원칙)
3. [Phase 0: 사전 준비](#phase-0-사전-준비)
3. [Phase 1: 기획 (Plan)](#phase-1-기획-plan)
4. [Phase 2: 설계 (Design)](#phase-2-설계-design)
5. [Phase 3: 개발 (Build)](#phase-3-개발-build)
6. [Phase 4: 테스트 (Test)](#phase-4-테스트-test)
7. [Phase 5: 배포 (Deploy)](#phase-5-배포-deploy)
8. [Phase 6: 심사 제출 (Submit)](#phase-6-심사-제출-submit)
9. [Phase 7: 유지보수 (Maintain)](#phase-7-유지보수-maintain)
10. [비개발자 필수 체크리스트](#비개발자-필수-체크리스트)
11. [트러블슈팅 가이드](#트러블슈팅-가이드)

---

## 1. 개요

### ChatGPT App이란?
ChatGPT App은 사용자가 ChatGPT 대화 중에 외부 서비스나 데이터에 접근할 수 있게 해주는 확장 기능입니다.

### 구성 요소
| 구성 요소 | 설명 |
|-----------|------|
| **MCP Server** | 앱의 기능(Tool)을 정의하고 데이터를 처리하는 백엔드 |
| **UI Component** | ChatGPT 내에서 렌더링되는 프론트엔드 (iframe) |
| **Model** | 사용자 의도를 파악하고 적절한 Tool을 호출하는 ChatGPT 모델 |

### 앱의 3가지 핵심 가치
1. **Know (알기)**: 새로운 데이터/컨텍스트 제공 (실시간 가격, 재고, 개인 데이터 등)
2. **Do (하기)**: 사용자 대신 액션 수행 (예약, 주문, 메시지 전송 등)
3. **Show (보여주기)**: 정보를 더 나은 UI로 표시 (차트, 테이블, 지도 등)

---

## 가이드 준수 원칙

> **중요**: 이 가이드는 반드시 준수해야 합니다. 가이드를 벗어나는 구현은 허용되지 않습니다.

### 절대 원칙

1. **가이드 우선**: 구현 시 반드시 이 가이드의 체크리스트를 따릅니다.
2. **임의 변경 금지**: 가이드에 명시된 기술 스택이나 방법론을 임의로 변경하지 않습니다.
3. **사전 승인 필수**: 가이드를 벗어나야 하는 경우, 반드시 사용자 확인을 받습니다.

### UI 개발 방식 선택 기준

| 앱 유형 | UI 방식 | 이유 |
|---------|---------|------|
| **읽기 전용** (데이터 표시만) | Vanilla HTML 가능 | 상호작용 없음, 단순 렌더링 |
| **상호작용 있음** (버튼, 폼, 상태) | **React 필수** | `useWidgetState`, `callTool` 필요 |
| **복잡한 UI** (라우팅, 다중 화면) | **React 필수** | React Router, 상태 관리 필요 |

### React가 필요한 기능

다음 기능을 사용하는 경우 **반드시 React로 개발**해야 합니다:

| 기능 | 용도 |
|------|------|
| `useOpenAiGlobal` | Tool output 변경 시 UI 자동 업데이트 |
| `useWidgetState` | 세션 간 상태 저장/복원 |
| `callTool` | UI에서 서버 Tool 직접 호출 |
| `sendFollowUpMessage` | 대화에 메시지 삽입 |
| `requestDisplayMode` | Fullscreen/PiP 전환 |
| React Router | 위젯 내 페이지 이동 |

### 실수 방지 체크리스트

구현 시작 전 반드시 확인:

- [ ] 이 앱에 사용자 상호작용(버튼, 폼, 필터 등)이 있는가?
- [ ] 상태를 저장/복원해야 하는가? (`widgetState`)
- [ ] UI에서 서버를 호출해야 하는가? (`callTool`)
- [ ] 위 중 하나라도 "예"면 → **React로 개발**

### 교훈 (2026-01-06)

```
문제: 가이드에서 React + esbuild를 명시했으나, 구현 시 임의로 vanilla HTML 사용
결과: Phase 3 체크리스트와 실제 구현 불일치, 재작업 필요
원인: "간단해 보여서" 임의로 단순화 → 가이드 무시
해결: 가이드 준수 원칙 문서화, 사전 승인 없이 변경 금지
```

---

## Phase 0: 사전 준비

### 0.1 OpenAI 정책 숙지

#### 체크리스트
- [ ] OpenAI Usage Policy 전체 읽기
- [ ] App Submission Guidelines 전체 읽기
- [ ] 금지 콘텐츠/서비스 목록 확인

#### 금지 사항 (반드시 확인)
| 카테고리 | 금지 항목 |
|----------|-----------|
| **성인 콘텐츠** | 포르노, 성인 제품, 성적 서비스 |
| **도박** | 실제 돈이 걸린 도박 서비스 |
| **약물** | 불법 약물, 처방약 판매 |
| **무기** | 총기류, 폭발물, 위험 물질 |
| **사기** | 위조 문서, 신용 사기, 피싱 |
| **디지털 상품** | 현재 디지털 상품/서비스 판매 불가 (물리적 상품만 가능) |

#### 체크 방법
```
1. Guide\0. OpenAI Policy.md 읽기
2. Guide\1. App submission guidelines.md 읽기
3. 자신의 앱 아이디어가 금지 항목에 해당하는지 확인
```

### 0.2 개발 환경 준비

#### 체크리스트
- [ ] Node.js 18+ 또는 Python 3.9+ 설치
- [ ] OpenAI Platform 계정 생성
- [ ] ChatGPT Plus/Pro 구독 (개발자 모드 필요)
- [ ] ngrok 또는 Cloudflare Tunnel 설치 (로컬 개발용)
- [ ] 코드 에디터 준비 (VS Code 권장)

#### 체크 방법
```powershell
# Node.js 버전 확인
node --version  # v18.0.0 이상

# ngrok 설치 확인
ngrok version
```

### 0.3 조직 인증 (필수)

#### 체크리스트
- [ ] OpenAI Platform에서 Organization 생성
- [ ] 개인 또는 비즈니스 인증 완료
- [ ] Owner 권한 보유 확인

#### 체크 방법
```
1. https://platform.openai.com/settings/organization/general 접속
2. "Verification" 섹션에서 인증 상태 확인
3. 인증 완료 시 녹색 체크 표시 확인
```

---

## Phase 1: 기획 (Plan)

### 1.1 Use Case 정의

#### 체크리스트
- [ ] 핵심 사용자(Persona) 정의
- [ ] 해결하려는 문제(Pain Point) 명확화
- [ ] ChatGPT 없이는 불가능한 가치 식별
- [ ] 경쟁 앱/서비스 조사

#### 작성 템플릿
```markdown
## Use Case 정의서

### 1. 타겟 사용자
- 누구인가?
- 어떤 상황에서 사용하는가?

### 2. 핵심 문제
- 기존에 어떻게 해결했는가?
- 왜 불편한가?

### 3. 앱의 가치
- Know: 어떤 새로운 정보를 제공하는가?
- Do: 어떤 행동을 대신 수행하는가?
- Show: 어떻게 더 나은 방식으로 보여주는가?

### 4. ChatGPT 활용 이점
- 자연어 인터페이스로 인한 이점
- 대화 컨텍스트 활용 방법
- 다른 앱과의 조합 가능성
```

### 1.2 Golden Prompt Set 작성

#### 체크리스트
- [ ] Direct Prompt 5개 이상 작성 (앱 이름/기능 직접 언급)
- [ ] Indirect Prompt 5개 이상 작성 (목표만 설명)
- [ ] Negative Prompt 3개 이상 작성 (앱이 반응하면 안 되는 경우)

#### 예시
```markdown
## Golden Prompt Set

### Direct Prompts (앱이 반드시 반응해야 함)
1. "피자 리스트 앱으로 근처 피자집 찾아줘"
2. "Pizzaz로 강남역 근처 피자 검색해줘"
3. "피자 리스트에서 평점 높은 곳 보여줘"

### Indirect Prompts (앱이 반응해야 함)
1. "오늘 저녁 피자 먹고 싶은데 추천해줘"
2. "배달 가능한 피자집 찾아줘"
3. "이탈리안 레스토랑 중 피자 맛있는 곳"

### Negative Prompts (앱이 반응하면 안 됨)
1. "중국집 추천해줘"
2. "피자 만드는 레시피 알려줘"
3. "피자 칼로리 알려줘"
```

### 1.3 Tool 정의

#### 체크리스트
- [ ] 핵심 기능 3-5개로 압축
- [ ] 각 Tool의 이름, 설명, 입력/출력 정의
- [ ] Read-only vs Write 구분
- [ ] 인증 필요 여부 결정

#### Tool 정의 템플릿
```markdown
## Tool 정의서

### Tool 1: search_places
- **설명**: "Use this when the user wants to find pizza restaurants nearby"
- **입력**:
  - city (string, required): 검색할 도시
  - cuisine (string, optional): 음식 종류
- **출력**: 레스토랑 목록 (id, name, rating, address)
- **타입**: Read-only (readOnlyHint: true)
- **인증**: 불필요 (noauth)

### Tool 2: add_favorite
- **설명**: "Use this when the user wants to save a restaurant to favorites"
- **입력**:
  - place_id (string, required): 저장할 장소 ID
- **출력**: 저장 결과
- **타입**: Write (readOnlyHint: false, destructiveHint: false)
- **인증**: 필요 (oauth2)
```

#### 주의사항 (비개발자 필독)
> - Tool 이름은 **동사_명사** 형태로 명확하게 (예: `get_orders`, `create_ticket`)
> - 설명은 반드시 **"Use this when..."**으로 시작
> - 하나의 Tool은 **하나의 기능만** 수행
> - 전체 제품을 복제하지 말고 **핵심 기능만** 추출

---

## Phase 2: 설계 (Design)

### 2.1 UI/UX 원칙 이해

#### 체크리스트
- [ ] UX Principles 문서 읽기
- [ ] UI Guidelines 문서 읽기
- [ ] Display Mode 선택 (Inline, Fullscreen, PiP)

#### Display Mode 선택 가이드
| 모드 | 사용 시점 | 예시 |
|------|----------|------|
| **Inline Card** | 단순 정보 표시, 빠른 확인 | 예약 확인, 검색 결과 카드 |
| **Inline Carousel** | 여러 항목 비교 | 레스토랑 목록, 상품 리스트 |
| **Fullscreen** | 복잡한 상호작용, 상세 탐색 | 지도, 편집기, 상세 목록 |
| **PiP (Picture-in-Picture)** | 진행 중인 세션 유지 | 게임, 라이브 협업, 퀴즈 |

### 2.2 컴포넌트 설계

#### 체크리스트
- [ ] 각 Tool별 렌더링할 UI 컴포넌트 결정
- [ ] 데이터 요구사항 정의 (structuredContent)
- [ ] 상태 관리 방식 결정
- [ ] 반응형 레이아웃 계획

#### 컴포넌트 설계 템플릿
```markdown
## Component 설계서

### Component 1: PlaceList
- **연결 Tool**: search_places
- **Display Mode**: Inline Carousel
- **필요 데이터**:
  - places: Array<{id, name, rating, image, address}>
- **상태**:
  - selectedId: 선택된 장소 ID
  - favorites: 즐겨찾기 목록
- **액션**:
  - 카드 클릭 → 상세 보기
  - 즐겨찾기 버튼 → add_favorite Tool 호출

### Component 2: PlaceDetail
- **연결 Tool**: get_place_detail
- **Display Mode**: Fullscreen
- **필요 데이터**:
  - place: {id, name, rating, images, menu, reviews}
- **상태**:
  - currentTab: 'info' | 'menu' | 'reviews'
```

### 2.3 인증 설계 (필요 시)

#### 체크리스트
- [ ] 인증 필요 여부 최종 결정
- [ ] OAuth Provider 선택 (Auth0, Stytch, Okta 등)
- [ ] 필요한 Scope 정의
- [ ] Protected Resource Metadata 설계

#### 인증 방식 결정 가이드
```markdown
## 인증 필요성 판단

Q1. 사용자별 개인 데이터를 다루는가?
    → Yes: 인증 필요
    → No: Q2로

Q2. Write 작업(생성, 수정, 삭제)이 있는가?
    → Yes: 인증 필요
    → No: 인증 불필요 (noauth)

## 권장 OAuth Provider
- Auth0: 가장 범용적, 문서 풍부
- Stytch: MCP 특화 가이드 제공
- Cognito: AWS 인프라 사용 시
```

---

## Phase 3: 개발 (Build)

### 3.1 프로젝트 구조 설정

#### 권장 폴더 구조
```
my-chatgpt-app/
├── server/                 # MCP Server
│   ├── src/
│   │   └── index.ts       # 메인 서버 파일
│   ├── package.json
│   └── tsconfig.json
├── web/                    # UI Component
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   └── index.tsx      # 진입점
│   ├── dist/              # 빌드 결과물
│   └── package.json
├── .env                    # 환경 변수 (git에 포함하지 않음)
└── README.md
```

#### 체크리스트
- [ ] 프로젝트 폴더 생성
- [ ] Git 저장소 초기화
- [ ] .gitignore 설정 (.env, node_modules, dist 등)
- [ ] package.json 생성 및 dependencies 설치

#### 명령어 (PowerShell)
```powershell
# 프로젝트 생성
mkdir my-chatgpt-app
cd my-chatgpt-app

# Server 설정
mkdir server; cd server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
cd ..

# Web 설정
mkdir web; cd web
npm init -y
npm install react react-dom
npm install -D typescript esbuild @types/react @types/react-dom
cd ..
```

### 3.2 MCP Server 개발

#### 체크리스트
- [ ] McpServer 인스턴스 생성
- [ ] Resource 등록 (UI 템플릿)
- [ ] Tool 등록 (각 기능별)
- [ ] HTTP 서버 설정 (/mcp 엔드포인트)

#### 기본 서버 구조 (TypeScript)
```typescript
// server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { readFileSync } from "fs";
import { z } from "zod";

// 1. 서버 인스턴스 생성
const server = new McpServer({
  name: "my-app",
  version: "1.0.0"
});

// 2. UI Resource 등록
const widgetHtml = readFileSync("../web/dist/widget.html", "utf8");

server.registerResource(
  "widget",
  "ui://widget/main.html",
  {},
  async () => ({
    contents: [{
      uri: "ui://widget/main.html",
      mimeType: "text/html+skybridge",
      text: widgetHtml,
      _meta: {
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": {
          connect_domains: ["https://api.example.com"],
          resource_domains: ["https://cdn.example.com"]
        }
      }
    }]
  })
);

// 3. Tool 등록
server.registerTool(
  "search_places",
  {
    title: "Search Places",
    description: "Use this when the user wants to find restaurants or places",
    inputSchema: {
      city: z.string().describe("City to search in"),
      query: z.string().optional().describe("Search keyword")
    },
    annotations: { readOnlyHint: true },
    _meta: {
      "openai/outputTemplate": "ui://widget/main.html",
      "openai/toolInvocation/invoking": "Searching...",
      "openai/toolInvocation/invoked": "Results ready"
    }
  },
  async ({ city, query }) => {
    // 실제 로직 구현
    const results = await fetchPlaces(city, query);
    return {
      structuredContent: { places: results },
      content: [{ type: "text", text: `Found ${results.length} places` }]
    };
  }
);

// 4. 세션 관리 (중요!)
// ⚠️ 주의: sessionIdGenerator: undefined (stateless 모드)는 작동하지 않음!
const transports = new Map<string, StreamableHTTPServerTransport>();

// 5. HTTP 서버 시작
const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);

  // CORS 프리플라이트
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

  if (url.pathname === MCP_PATH) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // 기존 세션 재사용
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // 새 세션 생성 (POST만)
    if (req.method === "POST") {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(), // ⚠️ undefined 사용 금지!
        enableJsonResponse: true,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);

      // 세션 저장
      const newSessionId = res.getHeader("mcp-session-id") as string;
      if (newSessionId) {
        transports.set(newSessionId, transport);
      }
      return;
    }
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/mcp`);
});
```

#### Tool Annotation 체크리스트
| Annotation | 값 | 의미 |
|------------|---|------|
| `readOnlyHint` | `true` | 데이터 조회만 (수정 없음) |
| `readOnlyHint` | `false` | 데이터 변경 가능 |
| `destructiveHint` | `true` | 삭제/덮어쓰기 가능 |
| `openWorldHint` | `true` | 외부 발송 (이메일, SNS 등) |

### 3.3 UI Component 개발

#### 체크리스트
- [ ] window.openai API 이해
- [ ] toolOutput에서 데이터 읽기
- [ ] setWidgetState로 상태 저장
- [ ] callTool로 서버 호출
- [ ] 반응형 레이아웃 구현

#### 기본 컴포넌트 구조 (React)
```tsx
// web/src/App.tsx
import React, { useState, useEffect } from 'react';

// window.openai 타입 정의
declare global {
  interface Window {
    openai: {
      toolOutput: any;
      toolInput: any;
      widgetState: any;
      setWidgetState: (state: any) => void;
      callTool: (name: string, args: any) => Promise<any>;
      theme: 'light' | 'dark';
      locale: string;
    };
  }
}

export function App() {
  // 1. Tool Output에서 데이터 읽기
  const places = window.openai?.toolOutput?.places ?? [];

  // 2. Widget State 관리
  const [selectedId, setSelectedId] = useState(
    window.openai?.widgetState?.selectedId ?? null
  );

  // 상태 변경 시 저장
  useEffect(() => {
    window.openai?.setWidgetState({ selectedId });
  }, [selectedId]);

  // 3. Tool 호출
  const handleFavorite = async (placeId: string) => {
    const result = await window.openai?.callTool('add_favorite', {
      place_id: placeId
    });
    // 결과 처리
  };

  return (
    <div className="container">
      {places.map((place) => (
        <div
          key={place.id}
          className={selectedId === place.id ? 'selected' : ''}
          onClick={() => setSelectedId(place.id)}
        >
          <h3>{place.name}</h3>
          <p>Rating: {place.rating}</p>
          <button onClick={() => handleFavorite(place.id)}>
            Add to Favorites
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### window.openai API 요약
| API | 용도 |
|-----|------|
| `toolOutput` | Tool 결과 데이터 (structuredContent) |
| `toolInput` | Tool 호출 시 전달된 인자 |
| `widgetState` | 저장된 UI 상태 |
| `setWidgetState(state)` | UI 상태 저장 |
| `callTool(name, args)` | 다른 Tool 호출 |
| `sendFollowUpMessage({prompt})` | 후속 메시지 전송 |
| `uploadFile(file)` | 파일 업로드 |
| `requestDisplayMode({mode})` | Fullscreen 등 전환 |
| `theme` | 현재 테마 ('light'/'dark') |
| `locale` | 사용자 언어 설정 |

### 3.4 빌드 설정

#### 체크리스트
- [ ] esbuild 또는 Vite 설정
- [ ] TypeScript 컴파일 설정
- [ ] HTML 템플릿 생성

#### esbuild 설정
```json
// web/package.json
{
  "scripts": {
    "build": "esbuild src/index.tsx --bundle --format=esm --outfile=dist/widget.js"
  }
}
```

#### HTML 템플릿 (Server에서 인라인)
```html
<!-- web/dist/widget.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>/* CSS 인라인 */</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">/* 빌드된 JS 인라인 */</script>
</body>
</html>
```

---

## Phase 4: 테스트 (Test)

### 4.1 로컬 테스트

#### 체크리스트
- [ ] MCP Server 실행 확인
- [ ] MCP Inspector로 Tool 테스트
- [ ] Widget 렌더링 확인
- [ ] 에러 핸들링 테스트

#### MCP Inspector 사용법
```powershell
# 1. 서버 실행
cd server
node dist/index.js

# 2. 다른 터미널에서 Inspector 실행
npx @modelcontextprotocol/inspector@latest --server-url http://localhost:8787/mcp --transport http
```

#### Inspector 체크 항목
- [ ] Tools 탭에서 모든 Tool 목록 확인
- [ ] 각 Tool 호출 테스트 (성공/실패 케이스)
- [ ] Widget이 제대로 렌더링되는지 확인
- [ ] Console에 에러 없는지 확인

### 4.2 ngrok 터널 설정

#### 체크리스트
- [ ] ngrok 계정 생성 및 설정
- [ ] 터널 실행
- [ ] HTTPS URL 확인

#### 명령어
```powershell
# ngrok 터널 시작
ngrok http 8787

# 출력 예시:
# Forwarding https://abc123.ngrok.app -> http://localhost:8787
```

### 4.3 ChatGPT Developer Mode 테스트

#### 체크리스트
- [ ] Developer Mode 활성화
- [ ] Connector 생성
- [ ] Golden Prompt Set으로 테스트
- [ ] Mobile에서 테스트

#### Developer Mode 활성화 단계
```
1. ChatGPT 접속 → Settings
2. Apps & Connectors 메뉴
3. 맨 아래 "Advanced settings" 클릭
4. "Developer mode" 토글 ON
5. "Create" 버튼으로 Connector 생성
```

#### Connector 생성 정보
| 필드 | 입력 값 |
|------|---------|
| Name | 앱 이름 (예: "Pizza Finder") |
| Description | 앱 설명 (모델이 참조) |
| URL | ngrok URL + /mcp (예: https://abc123.ngrok.app/mcp) |

#### 테스트 시나리오
```markdown
## 테스트 기록 템플릿

### Test 1: Direct Prompt
- **입력**: "피자 리스트 앱으로 강남역 피자집 찾아줘"
- **예상**: search_places Tool 호출
- **결과**: [ ] Pass / [ ] Fail
- **비고**:

### Test 2: Indirect Prompt
- **입력**: "배고픈데 피자 먹을만한 곳 있어?"
- **예상**: search_places Tool 호출
- **결과**: [ ] Pass / [ ] Fail
- **비고**:

### Test 3: Negative Prompt
- **입력**: "중국집 추천해줘"
- **예상**: Tool 호출 안 함
- **결과**: [ ] Pass / [ ] Fail
- **비고**:
```

---

## Phase 5: 배포 (Deploy)

### 5.1 프로덕션 환경 준비

#### 체크리스트
- [ ] 호스팅 플랫폼 선택
- [ ] 환경 변수 설정
- [ ] HTTPS 인증서 확인
- [ ] 로깅 설정

#### 호스팅 플랫폼 비교
| 플랫폼 | 장점 | 단점 | 권장 상황 |
|--------|------|------|-----------|
| **Fly.io** | 빠른 설정, 자동 TLS | 유료 | 빠른 출시 |
| **Render** | 무료 티어 있음 | Cold start | 초기 테스트 |
| **Vercel** | 쉬운 배포 | Serverless 제한 | 간단한 앱 |
| **Cloud Run** | 확장성 | 복잡한 설정 | 대규모 서비스 |
| **Railway** | 쉬운 설정 | 가격 | 소규모 팀 |

### 5.2 배포 단계

#### Fly.io 배포 예시
```powershell
# 1. Fly CLI 설치
# https://fly.io/docs/hands-on/install-flyctl/

# 2. 로그인
fly auth login

# 3. 앱 생성
fly launch

# 4. 시크릿 설정
fly secrets set API_KEY=your_api_key

# 5. 배포
fly deploy
```

#### 체크리스트
- [ ] 배포 완료 확인
- [ ] /mcp 엔드포인트 응답 확인
- [ ] Health check 통과 확인

### 5.3 배포 후 검증

#### 체크리스트
- [ ] 프로덕션 URL로 Connector 업데이트
- [ ] 모든 Golden Prompt 재테스트
- [ ] 성능 확인 (응답 시간 < 500ms 권장)
- [ ] 에러 로그 모니터링 설정

---

## Phase 6: 심사 제출 (Submit)

### 6.1 제출 전 최종 점검

#### 필수 요구사항 체크리스트
- [ ] OpenAI Platform Organization 인증 완료
- [ ] Owner 권한 보유
- [ ] MCP Server가 공개 도메인에서 운영 중 (ngrok 불가)
- [ ] CSP(Content Security Policy) 설정 완료
- [ ] Privacy Policy URL 준비
- [ ] Support Contact 정보 준비

### 6.2 CSP 설정 확인

```typescript
// 반드시 설정해야 하는 CSP
_meta: {
  "openai/widgetCSP": {
    connect_domains: ["https://your-api.com"],  // API 호출 도메인
    resource_domains: ["https://your-cdn.com"]   // 정적 자산 도메인
  }
}
```

### 6.3 제출 프로세스

#### 단계
```
1. https://platform.openai.com/apps-manage 접속
2. "Create App" 클릭
3. MCP Server URL 입력
4. OAuth 정보 입력 (인증 사용 시)
5. 앱 메타데이터 입력
   - 이름
   - 설명
   - 카테고리
   - 스크린샷 (필수)
   - Privacy Policy URL
   - Support Contact
6. 정책 준수 확인 체크박스 모두 체크
7. "Submit for Review" 클릭
```

### 6.4 심사 통과를 위한 팁

#### Do's (해야 할 것)
- [ ] Tool 이름과 설명이 명확하고 정확함
- [ ] readOnlyHint, destructiveHint, openWorldHint 정확히 설정
- [ ] 스크린샷이 실제 기능을 정확히 보여줌
- [ ] Privacy Policy가 수집하는 데이터를 명확히 설명
- [ ] 인증 필요 시 테스트 계정 제공

#### Don'ts (하지 말아야 할 것)
- [ ] 다른 앱을 비하하는 설명 사용 금지
- [ ] "best", "official" 등 과장 표현 금지
- [ ] 불필요한 데이터 수집 금지
- [ ] 전체 대화 기록 요청 금지
- [ ] GPS 좌표 같은 민감 정보 요청 금지

---

## Phase 7: 유지보수 (Maintain)

### 7.1 모니터링

#### 체크리스트
- [ ] 에러 로그 일일 확인
- [ ] Tool 호출 통계 주간 확인
- [ ] 사용자 피드백 수집 체계 구축

### 7.2 업데이트 프로세스

> **중요**: 앱이 게시된 후 Tool 이름, 시그니처, 설명을 변경하려면 다시 심사를 받아야 합니다.

#### 업데이트 유형별 처리
| 변경 사항 | 심사 필요 | 조치 |
|-----------|----------|------|
| 버그 수정 | 아니오 | 바로 배포 |
| UI 개선 | 아니오 | 바로 배포 |
| Tool 로직 변경 (시그니처 동일) | 아니오 | 바로 배포 |
| Tool 이름/설명 변경 | **예** | 재심사 제출 |
| 새 Tool 추가 | **예** | 재심사 제출 |
| Tool 삭제 | **예** | 재심사 제출 |

### 7.3 Metadata 최적화

#### 주기적 점검 항목
- [ ] 주간: Golden Prompt Set 테스트
- [ ] 월간: Tool 호출 정확도 분석
- [ ] 분기: 사용자 피드백 기반 개선

---

## 비개발자 필수 체크리스트

### 기획 단계에서 놓치기 쉬운 것들

#### 1. 정책 관련
- [ ] **디지털 상품 판매 불가**: 구독, 크레딧, 토큰 판매 금지 (물리적 상품만 가능)
- [ ] **13세 미만 타겟팅 금지**: 어린이 전용 앱 불가
- [ ] **광고 금지**: 앱 내 광고 표시 불가
- [ ] **의료/법률 조언 금지**: 전문가 없이 제공 불가

#### 2. 기능 범위 관련
- [ ] **전체 제품 이식 금지**: 핵심 기능 3-5개로 압축
- [ ] **복잡한 워크플로우 지양**: 간단한 대화형 인터랙션 권장
- [ ] **ChatGPT 기능 중복 금지**: 입력창, 검색창 등 재구현 금지

#### 3. 데이터 관련
- [ ] **최소 데이터 원칙**: 꼭 필요한 데이터만 요청
- [ ] **전체 대화 기록 요청 금지**: 특정 정보만 요청
- [ ] **민감 정보 수집 금지**: 주민번호, 카드번호, 비밀번호 등

### 개발 단계에서 놓치기 쉬운 것들

#### 1. Tool 설계
- [ ] **Tool 이름**: `동사_명사` 형태 (예: `get_orders`)
- [ ] **Tool 설명**: "Use this when..." 으로 시작
- [ ] **Annotation**: 모든 Tool에 `readOnlyHint` 설정 필수

#### 2. UI 개발
- [ ] **모바일 대응**: 반드시 모바일에서 테스트
- [ ] **다크 모드**: `window.openai.theme` 확인하여 대응
- [ ] **다국어**: `window.openai.locale` 활용

#### 3. 상태 관리
- [ ] **widgetState 사용**: 모든 UI 상태는 `setWidgetState`로 저장
- [ ] **localStorage 미사용**: iframe 제한으로 작동 안 함

### 배포 단계에서 놓치기 쉬운 것들

#### 1. 환경 설정
- [ ] **ngrok URL 사용 금지** (프로덕션): 공개 도메인 필수
- [ ] **CSP 필수 설정**: connect_domains, resource_domains
- [ ] **HTTPS 필수**: HTTP 불가

#### 2. 심사 제출
- [ ] **스크린샷 필수**: 실제 동작하는 화면 캡처
- [ ] **Privacy Policy 필수**: URL 준비
- [ ] **테스트 계정 제공** (인증 앱): 심사팀용 계정

---

## 트러블슈팅 가이드

### 자주 발생하는 문제와 해결법

#### 문제 1: Tool이 ChatGPT에서 보이지 않음
```
원인:
- MCP Server가 실행 중이지 않음
- /mcp 엔드포인트가 잘못됨
- Tool 등록에 오류가 있음

해결:
1. 서버 로그 확인
2. MCP Inspector로 Tool 목록 확인
3. Connector에서 "Refresh" 클릭
```

#### 문제 2: Widget이 렌더링되지 않음
```
원인:
- mimeType이 "text/html+skybridge"가 아님
- CSP 위반
- JavaScript 에러

해결:
1. Resource의 mimeType 확인
2. 브라우저 Console에서 CSP 에러 확인
3. widgetCSP에 필요한 도메인 추가
```

#### 문제 3: callTool이 작동하지 않음
```
원인:
- Tool에 widgetAccessible이 설정되지 않음
- Tool이 private으로 설정됨

해결:
1. Tool의 _meta에 "openai/widgetAccessible": true 추가
2. visibility가 "public"인지 확인
```

#### 문제 4: 상태가 저장되지 않음
```
원인:
- setWidgetState를 호출하지 않음
- widgetState를 읽지 않음

해결:
1. 상태 변경 시 window.openai.setWidgetState() 호출
2. 초기화 시 window.openai.widgetState에서 읽기
```

#### 문제 5: 인증 루프 발생
```
원인:
- WWW-Authenticate 헤더 누락
- OAuth metadata 설정 오류
- 리다이렉트 URI 미등록

해결:
1. 401 응답에 WWW-Authenticate 헤더 포함
2. /.well-known/oauth-protected-resource 확인
3. ChatGPT 리다이렉트 URI 등록:
   - 프로덕션: https://chatgpt.com/connector_platform_oauth_redirect
   - 심사용: https://platform.openai.com/apps-manage/oauth
```

#### 문제 6: "Server not initialized" 에러 (중요!)
```
원인:
- sessionIdGenerator: undefined (stateless 모드)가 실제로는 작동하지 않음
- 매 요청마다 새 서버 인스턴스를 생성하면 이전 initialize 상태가 유지되지 않음
- MCP 프로토콜은 세션 기반이므로 initialize → tools/list 순서가 필수

해결:
1. sessionIdGenerator를 undefined가 아닌 실제 함수로 설정
   sessionIdGenerator: () => randomUUID()

2. 세션 저장소 사용 (Map으로 transport 저장)
   const transports = new Map<string, StreamableHTTPServerTransport>();

3. 기존 세션 재사용
   if (sessionId && transports.has(sessionId)) {
     const transport = transports.get(sessionId)!;
     await transport.handleRequest(req, res);
   }

4. POST/GET/DELETE 메서드별 분리 처리
   - POST: 초기화 또는 도구 호출
   - GET: SSE 스트림 (알림용)
   - DELETE: 세션 종료
```

#### 문제 7: MCP Inspector 또는 ChatGPT 연결 실패
```
원인:
- Accept 헤더 누락: "application/json, text/event-stream" 필요
- CORS 헤더 누락: Access-Control-Expose-Headers: mcp-session-id
- 세션 관리 미구현

해결:
1. CORS 설정 확인
   res.setHeader("Access-Control-Allow-Origin", "*");
   res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

2. OPTIONS 프리플라이트 처리
   res.writeHead(204, {
     "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
     "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
   });
```

#### 문제 8: UI 위젯이 표시되지 않음 (Tool은 작동하지만 텍스트 응답만 표시)
```
원인 1: _meta["openai/outputTemplate"]를 Tool RESULT에 넣음 (잘못됨!)
원인 2: McpServer 생성 시 capabilities 미설정
원인 3: Widget HTML의 필드명이 서버 응답 데이터와 불일치

해결 1: _meta는 반드시 Tool DESCRIPTOR에 추가해야 함
   - server.tool()의 고수준 API는 _meta를 지원하지 않음
   - server.server.setRequestHandler()로 tools/list를 직접 구현해야 함

   // ✅ 올바른 방법: Tool 정의에 _meta 포함
   const TOOLS = [{
     name: "get_routine_guide",
     description: "...",
     inputSchema: { type: "object", properties: {...} },
     _meta: {
       "openai/outputTemplate": "ui://my-app/widget.html"
     }
   }];

   // tools/list 직접 구현
   server.server.setRequestHandler(ListToolsRequestSchema, async () => {
     return { tools: TOOLS };
   });

해결 2: McpServer 생성 시 반드시 capabilities 설정
   // ❌ 잘못된 방법
   const server = new McpServer({ name: "my-app", version: "1.0.0" });

   // ✅ 올바른 방법
   const server = new McpServer(
     { name: "my-app", version: "1.0.0" },
     { capabilities: { tools: {}, resources: {} } }  // 필수!
   );

해결 3: Widget HTML 필드명을 서버 응답과 정확히 일치시키기
   // 서버에서 반환하는 데이터:
   { routine_type: "morning", steps: [{ step_name: "...", tips: "..." }] }

   // Widget HTML에서 접근 (필드명 정확히 일치):
   routine.routine_type  // ✅ (routine.time_of_day ❌)
   step.step_name        // ✅ (step.name ❌)
   step.tips             // ✅ (step.tip ❌)

디버깅 팁:
1. MCP Inspector에서 tools/list 호출 → _meta가 포함되어 있는지 확인
2. tools/call 결과에서 structuredContent 데이터 구조 확인
3. resources/read로 widget.html이 정상 반환되는지 확인
4. 브라우저 개발자 도구에서 JavaScript 에러 확인
```

---

## 부록: 참고 자료

### 공식 문서
- [Apps SDK Quick Start](https://developers.openai.com/apps-sdk/quickstart)
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Apps SDK UI Library](https://openai.github.io/apps-sdk-ui/)
- [Figma Component Library](https://www.figma.com/community/file/1560064615791108827)

### 예제 코드
- [openai-apps-sdk-examples](https://github.com/openai/openai-apps-sdk-examples)

### 디버깅 도구
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)
- [API Playground](https://platform.openai.com/playground)

---

## 문서 버전 정보

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-06 | 최초 작성 |
| 1.1 | 2026-01-06 | 트러블슈팅 추가: 문제 8 - UI 위젯 미표시 해결법 (_meta 위치, capabilities 설정) |

---

> 이 문서는 OpenAI Apps SDK 공식 가이드를 기반으로 작성되었습니다.
> 최신 정보는 [developers.openai.com](https://developers.openai.com/apps-sdk) 에서 확인하세요.
