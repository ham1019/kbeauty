# Phase 2 완료 요약: ChatGPT MCP Server 설계

**프로젝트**: K-Beauty Skincare Routine (피부미 - AI 스킨케어 어시스턴트)
**Phase**: 2 (Design) - 완료
**날짜**: 2026-02-09
**다음 Phase**: Phase 3 (Build)

---

## 📋 작업 완료 사항

### ✅ 1. Tool 정의 (7개)

모든 Tool을 JSON Schema + TypeScript 타입으로 완전히 정의했습니다.

| # | Tool | 기능 | 입력 | 출력 | 읽기/쓰기 |
|---|------|------|------|------|----------|
| 1 | `get_routine_guide` | AM/PM 6단계 루틴 조회 | routine_type (morning/evening), language | 단계별 설명, 팁, 시간 | 읽기 ✅ |
| 2 | `search_products` | 스킨케어 상품 검색 | query, category, min_rating | 상품 목록, 이미지, 등급 | 읽기 ✅ |
| 3 | `get_product_details` | 상품 상세 정보 & 성분 | product_id | 성분 분석, 효능, 사용법 | 읽기 ✅ |
| 4 | `log_skin_condition` | 피부 상태 기록 저장 | skin_type, hydration, notes | 저장 결과, log_id | 쓰기 ✅ |
| 5 | `get_skin_history` | 피부 기록 조회 | days_back, include_stats | 기록 목록, 통계, 트렌드 | 읽기 ✅ |
| 6 | `get_routine_tips` | 단계별 팁 & 교육 | routine_type, step_number, topic | 기술, 성분, 실수, 베스트 프랙티스 | 읽기 ✅ |
| 7 | `recommend_routine` | 맞춤 루틴 추천 | skin_type, concern, budget | AM/PM 루틴, 상품, 일정 | 읽기 ✅ |

**특징**:
- ✅ 모든 Tool에 명확한 `readOnlyHint` / `destructiveHint` 설정
- ✅ `_meta["openai/outputTemplate"]` 설정으로 Widget 렌더링 활성화
- ✅ 다국어 지원 (English, Korean)
- ✅ structuredContent로 Widget에 구조화된 데이터 전달

---

### ✅ 2. Resource 설계

**UI Resource**: `ui://skincare/widget.html`

```
┌─────────────────────────────────────────┐
│ Widget HTML (React 18 + esbuild)        │
│                                         │
│ - React 번들 (dist/widget.js)          │
│ - Tailwind CSS (인라인)                 │
│ - window.openai API 활용                │
│                                         │
│ 컴포넌트:                               │
│ - RoutineGuideWidget (카루셀 + 팁)     │
│ - SearchProductsWidget (그리드)        │
│ - ProductDetailWidget (상세정보)       │
│ - SkinHistoryWidget (차트 & 로그)      │
│ - RoutineTipsWidget (상세 가이드)      │
│ - RecommendRoutineWidget (맞춤 추천)   │
└─────────────────────────────────────────┘
```

**메타데이터 설정**:
```json
{
  "mimeType": "text/html+skybridge",
  "openai/widgetPrefersBorder": true,
  "openai/widgetCSP": {
    "connect_domains": ["https://supabase-*.supabase.co", "https://images.unsplash.com"],
    "resource_domains": ["https://images.unsplash.com"]
  }
}
```

---

### ✅ 3. 세션 관리 전략

**구현 방식**: Stateful HTTP 세션 관리

```typescript
┌────────────────┐
│ ChatGPT Client │
│                │
│ POST /mcp      │────────────────┐
│ (initialize)   │                │
└────────────────┘                │
                                  ▼
                ┌──────────────────────────────┐
                │ MCP Server                    │
                │                              │
                │ 1. SessionID 생성 (UUID)     │
                │ const sid = randomUUID()    │
                │                              │
                │ 2. Transport 생성 & 연결     │
                │ const t = new HttpTransport()│
                │ server.connect(t)            │
                │                              │
                │ 3. 저장                      │
                │ transports.set(sid, t)      │
                │                              │
                │ 4. Response                  │
                │ res.header("mcp-session-id") │
                └──────────────────────────────┘
                                  │
                ┌─────────────────┘
                │
┌───────────────▼──────┐
│ 후속 요청:           │
│ Headers: {           │
│  mcp-session-id: sid │
│ }                    │
│                      │
│ GET /mcp (SSE)       │
│ 또는                 │
│ POST /mcp (Tool)     │
└──────────────────────┘
```

**핵심 구현**:
- ✅ `sessionIdGenerator: () => randomUUID()` 필수 (undefined 금지)
- ✅ `Map<sessionId, StreamableHTTPServerTransport>` 저장소
- ✅ 30분 자동 타임아웃
- ✅ CORS 헤더: `Access-Control-Expose-Headers: mcp-session-id`

---

### ✅ 4. 인증 전략

**Phase 1 (현재): noauth**
- 초기 MVP에서 인증 불필요
- 모든 사용자가 동일한 데이터 접근
- 빠른 개발 & 테스트 가능

**Phase 2 (향후): OAuth2**
```
사용자 "피부 기록 조회"
  ↓
Tool 호출 → 401 Unauthorized
  ↓
ChatGPT: OAuth 플로우 시작
  ↓
/.well-known/oauth-protected-resource 조회
  ↓
사용자 동의 → Token 발급
  ↓
Authorization: Bearer <token> 헤더 추가
  ↓
MCP Server: JWT 검증 → Supabase RLS 적용
  ↓
사용자의 데이터만 반환
```

---

### ✅ 5. 데이터 흐름도

**흐름 1: Tool 호출 → Widget 렌더링**

```
ChatGPT User: "아침 루틴 안내해줘"
  ↓
ChatGPT Model: Tool 선택 (get_routine_guide)
  ↓
MCP Server: Tool 실행 → structuredContent 반환
  ↓
ChatGPT Platform: _meta["openai/outputTemplate"] 확인
  ↓
Resource 요청: /resources/ui://skincare/widget.html
  ↓
Server: Widget HTML 반환 (React 번들 포함)
  ↓
ChatGPT UI: Widget 렌더링 (iframe)
  ↓
React App: window.openai.toolOutput에서 데이터 읽기
  ↓
UI 표시: 6단계 카드 렌더링
```

**흐름 2: Widget에서 Tool 호출**

```
사용자: Widget 내 상품 카드 클릭
  ↓
React Component: onClick={() => {
  const result = await window.openai.callTool(
    "get_product_details",
    {product_id: "cosrx-snail"}
  );
}}
  ↓
ChatGPT: Tool 호출 처리 (백그라운드)
  ↓
MCP Server: Tool 실행
  ↓
React: Promise 해결 → setSelectedProduct(result)
  ↓
UI 업데이트: 상품 상세 정보 표시
```

---

## 📚 생성된 문서

### 1. **MCP_Server_Design.md** (약 40KB)

**내용**:
- 시스템 아키텍처 다이어그램
- 7개 Tool의 완전한 정의 (JSON Schema + 예시)
- Resource 메타데이터 설정
- 세션 생명주기 상세 설명
- 인증 플로우 (OAuth2)
- 데이터 흐름도 (UML)
- 구현 체크리스트 (Phase 3-4)
- 배포 체크리스트 (Fly.io, Render, Railway)
- 트러블슈팅 가이드

**실행**: Phase 3 개발 시 기술 사양으로 참고

---

### 2. **MCP_Server_Implementation.md** (약 30KB)

**내용**:
- 완전한 TypeScript 수도코드
- 서버 진입점 (index.ts) - 270+ 줄
- 세션 관리 클래스 (SessionManager)
- Tool 구현 예시:
  - get_routine_guide (Tool 1)
  - log_skin_condition (Tool 4 - Write)
- Mock 데이터 (routines.ts)
- React Widget 컴포넌트 (App.tsx) - 300+ 줄
  - RoutineGuideWidget
  - SearchProductsWidget
  - ProductDetailWidget
  - SkinHistoryWidget
  - RoutineTipsWidget
  - RecommendRoutineWidget
- 빌드 스크립트 (package.json, build.sh)
- 주요 주의사항 & 피해야 할 것들

**실행**: Phase 3 개발 시 Copy-Paste 시작점으로 사용

---

## 🎯 핵심 설계 결정사항

| 항목 | 선택 | 이유 |
|------|------|------|
| **Tool 개수** | 7개 (6 읽기 + 1 쓰기) | MVP 범위 최적화 |
| **Transport** | HTTP POST + SSE | Stateless 모드 불안정 |
| **Session 관리** | UUID 기반 Stateful | 다중 사용자 지원 필수 |
| **Widget 방식** | React + esbuild | window.openai API 필수 |
| **데이터 저장** | Mock (개발) → Supabase (프로덕션) | 점진적 확장 |
| **인증** | noauth (초기) → OAuth2 (향후) | MVP 빠른 출시 |
| **호스팅** | Fly.io (권장) | 자동 TLS, 고정 IP |
| **CSP** | Supabase + Unsplash | 신뢰할 수 있는 도메인만 |

---

## ⚠️ Phase 3 개발 시 필수 주의사항

### 1. Session ID Generator
```typescript
// ❌ 절대 금지
sessionIdGenerator: undefined

// ✅ 필수
sessionIdGenerator: () => randomUUID()
```
원인: StatelessHTTP 모드는 실제로 작동하지 않음. MCP 프로토콜은 세션 기반이므로 initialize → tools/list 순서가 필수.

### 2. Tool 응답 구조
```typescript
// ❌ 불완전
return {
  content: [{type: "text", text: "..."}]
};

// ✅ 올바름
return {
  structuredContent: { /* 데이터 */ },
  content: [{type: "text", text: "..."}]
};
```
원인: Widget 렌더링에는 structuredContent가 필수.

### 3. Tool Meta 메타데이터
```typescript
// ❌ Tool Result에 설정 (잘못됨)
return {
  content: [...],
  _meta: { "openai/outputTemplate": "..." }
};

// ✅ Tool Descriptor에 설정 (올바름)
const descriptor = {
  name: "...",
  _meta: { "openai/outputTemplate": "..." }
};
server.tool(descriptor, handler);
```
원인: _meta는 Tool 정의 단계에서 설정되어야 tools/list에 포함됨.

### 4. Widget 필드명 일치
```typescript
// Server 응답
{ structuredContent: { routine_type: "morning", steps: [...] } }

// Widget 접근 (정확히 일치 필수!)
window.openai.toolOutput.routine_type  // ✅
window.openai.toolOutput.routineType   // ❌ 스네이크 케이스 vs 카멜 케이스 혼동
```

### 5. setWidgetState 활용
```typescript
// ❌ localStorage 사용 (iframe에서 작동 안 함)
localStorage.setItem("state", JSON.stringify(state));

// ✅ ChatGPT API 사용
window.openai.setWidgetState({ selectedId: "..." });
window.openai.widgetState.selectedId  // 초기화 시 읽음
```

---

## 🚀 다음 단계 (Phase 3: Build)

### 3-A: MCP Server 기본 구조 (1-2일)
- [ ] Node.js + TypeScript 프로젝트 생성
- [ ] HTTP 서버 + CORS 설정
- [ ] SessionManager 구현
- [ ] McpServer 인스턴스 생성
- [ ] Widget HTML 리소스 등록

### 3-B: Tool 구현 (3-5일)
- [ ] Tool 1-2: get_routine_guide, search_products (읽기)
- [ ] Tool 3: get_product_details (읽기)
- [ ] Tool 4: log_skin_condition (쓰기)
- [ ] Tool 5-7: 나머지 Tool들
- [ ] 에러 핸들링

### 3-C: Widget 구현 (2-3일)
- [ ] React 컴포넌트 6개
- [ ] window.openai API 활용
- [ ] esbuild 번들링
- [ ] HTML 템플릿 생성

### 3-D: 테스트 (1-2일)
- [ ] MCP Inspector 테스트
- [ ] 각 Tool 동작 확인
- [ ] Widget 렌더링 검증
- [ ] CSP 설정 확인

### Phase 4: 배포 (1-2일)
- [ ] Fly.io 배포 설정
- [ ] 프로덕션 환경 변수
- [ ] HTTPS 인증서 확인
- [ ] 모니터링 설정

### Phase 5: ChatGPT 테스트 (1일)
- [ ] Developer Mode 활성화
- [ ] ngrok 터널 설정
- [ ] Golden Prompt Set 테스트
- [ ] Mobile 테스트

### Phase 6: 제출 (1일)
- [ ] 앱 메타데이터 작성
- [ ] 스크린샷 5개 준비
- [ ] Privacy Policy URL
- [ ] OpenAI 앱 스토어 제출

---

## 📊 프로젝트 진행도

```
Phase 1: Analysis ✅ (완료)
  └─ 기존 프로젝트 분석
  └─ 데이터 모델 파악
  └─ API 설계

Phase 2: Design ✅ (완료)
  └─ Tool 정의 (7개)
  └─ Resource 설계
  └─ 세션 관리 전략
  └─ 인증 설계
  └─ 데이터 흐름도
  └─ 구현 체크리스트

Phase 3: Build ⏳ (시작 대기)
  └─ MCP Server 구현
  └─ Widget 개발
  └─ 통합 테스트

Phase 4: Test ⏳
  └─ MCP Inspector 테스트
  └─ ChatGPT Developer Mode 테스트

Phase 5: Deploy ⏳
  └─ Fly.io 배포
  └─ 모니터링 설정

Phase 6: Submit ⏳
  └─ OpenAI 앱 스토어 제출

Phase 7: Maintain ⏳
  └─ 모니터링 & 업데이트
```

---

## 📞 문서 참고 방법

### Phase 3 개발자용
1. **MCP_Server_Implementation.md** 먼저 읽기 (수도코드)
2. 각 섹션 순서대로 구현
3. MCP_Server_Design.md의 "주의사항" 참고

### 검토자용
1. **MCP_Server_Design.md** → 전체 아키텍처 이해
2. 각 Tool의 inputSchema 및 outputSchema 검토
3. 세션 관리 및 인증 플로우 확인

### 테스트 담당자용
1. **MCP_Server_Design.md**의 "구현 체크리스트" 참고
2. 각 Tool별 테스트 케이스 작성
3. Widget 렌더링 검증

---

## 📝 버전 정보

| 문서 | 버전 | 크기 | 섹션 수 |
|------|------|------|--------|
| MCP_Server_Design.md | 1.0 | ~40KB | 9개 |
| MCP_Server_Implementation.md | 1.0 | ~30KB | 9개 |

**최종 업데이트**: 2026-02-09

---

## ✨ 결론

Phase 2 설계 완료! K-Beauty Skincare Routine ChatGPT App의 MCP Server 아키텍처가 완전히 정의되었습니다.

**준비 완료**:
- ✅ 7개 Tool 정의서 (JSON Schema + 예시)
- ✅ Widget 컴포넌트 설계
- ✅ 세션 관리 전략
- ✅ 인증 플로우 (단계별)
- ✅ TypeScript 수도코드 (500+ 줄)
- ✅ 트러블슈팅 가이드

**Phase 3 (Build)에서**:
- 이 설계를 기반으로 구현
- 제공된 수도코드 사용 (구조 참고)
- MCP_Server_Design.md의 "주의사항" 체크

**예상 일정**: Phase 3 ~ Phase 6까지 약 4주 소요

---

> **다음**: Phase 3 개발 시작
>
> 의문사항 발생 시 MCP_Server_Design.md의 "트러블슈팅 가이드" 참고

