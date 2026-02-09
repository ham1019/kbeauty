# K-Beauty Skincare Routine - 개발 문서

> ChatGPT App 개발 완전 가이드 + 실행 가능한 설계

**프로젝트**: 피부미 - K-뷰티 AI 스킨케어 어시스턴트
**기술**: Node.js + TypeScript + React 18 + MCP SDK
**상태**: Phase 2 (Design) ✅ 완료 → Phase 3 (Build) 대기

---

## 📚 문서 구조

### 1. **ChatGPT_App_Development_Guide.md**
전체 개발 프로세스 (Phase 0-7)

**대상**: 모든 개발자, PM, 테스트 담당자
**내용**:
- OpenAI 정책 (금지 항목, 승인 절차)
- Phase 0: 사전 준비 (환경 설정, 계정 생성)
- Phase 1: 기획 (Use Case, Tool 정의, Golden Prompt)
- Phase 2: 설계 (UI/UX, Component 설계, 인증)
- Phase 3: 개발 (MCP Server, React UI, 빌드)
- Phase 4: 테스트 (MCP Inspector, ChatGPT Developer Mode)
- Phase 5: 배포 (Fly.io/Render, 환경 설정)
- Phase 6: 심사 제출 (스크린샷, Privacy Policy)
- Phase 7: 유지보수 (모니터링, 업데이트)

**읽는 순서**: Phase 0-1 완료한 상태라면, Phase 3부터 참고

---

### 2. **MCP_Server_Design.md** 🔴 중요
MCP Server의 완전한 기술 사양

**대상**: Backend 개발자, 아키텍처 검토
**포함 내용**:

#### 시스템 아키텍처
```
ChatGPT Client
    ↓ (JSON-RPC 2.0)
MCP Server
  ├─ Resources (Widget HTML)
  ├─ Tools (7개)
  │  ├─ get_routine_guide (읽기)
  │  ├─ search_products (읽기)
  │  ├─ get_product_details (읽기)
  │  ├─ log_skin_condition (쓰기)
  │  ├─ get_skin_history (읽기)
  │  ├─ get_routine_tips (읽기)
  │  └─ recommend_routine (읽기)
  ├─ Session Manager (UUID 기반)
  └─ Data Layer (Mock / Supabase)
```

#### 각 섹션
1. **개요**: 앱의 3가지 핵심 가치 (Know, Do, Show)
2. **시스템 아키텍처**: 전체 흐름도 + 기술 결정사항
3. **Tool 정의 (7개)**:
   - Tool 1-7의 완전한 스펙
   - 입력 (inputSchema) / 출력 (structuredContent) 예시
   - Widget HTML 필드명 매핑
   - 각 Tool이 반환할 정확한 JSON 구조

4. **Resource 설계**:
   - Widget HTML 기술 스택
   - CSP (Content Security Policy) 설정
   - 빌드 프로세스

5. **세션 관리**:
   - 세션 생명주기 (UML 다이어그램)
   - SessionManager 클래스 스펙
   - 30분 타임아웃 정책

6. **인증 전략**:
   - Phase 1: noauth (초기)
   - Phase 2: OAuth2 (향후)

7. **데이터 흐름도**:
   - 흐름 1: Tool 호출 → Widget 렌더링
   - 흐름 2: Widget에서 Tool 호출

8. **구현 체크리스트**: Phase 3-4용 상세 체크리스트
9. **배포 체크리스트**: Fly.io, Render, Railway 배포 가이드

**사용 방법**:
- Phase 3 개발 시 기술 사양서로 참고
- 각 Tool의 정확한 outputSchema 확인
- CSP 설정 시 필수 참고

---

### 3. **MCP_Server_Implementation.md** 🟢 코딩 시작
TypeScript 수도코드 (500+ 줄)

**대상**: Backend 개발자 (구현 시작)
**포함 내용**:

#### 파일 구조
```
k-beauty-mcp-server/
├── server/src/
│   ├── index.ts (메인 서버)
│   ├── session.ts (세션 관리)
│   ├── tools/ (7개 Tool)
│   ├── data/ (Mock 데이터)
│   └── db/ (Supabase)
├── web/src/
│   ├── App.tsx (메인 Widget)
│   └── components/ (6개 Widget)
└── build.sh
```

#### 완전한 코드 예시
1. **index.ts**: 메인 서버 (270+ 줄)
   - McpServer 인스턴스 생성
   - SessionManager 초기화
   - HTTP 서버 설정
   - CORS + 세션 처리
   - Tool 등록

2. **session.ts**: SessionManager 클래스
   - createSession()
   - setSession() / getTransport()
   - 자동 타임아웃

3. **Tool 예시**:
   - get_routine_guide (Tool 1 - 읽기)
   - log_skin_condition (Tool 4 - 쓰기)
   - structuredContent 구성 방법

4. **Mock 데이터**: routines.ts
   - AM/PM 6단계 데이터
   - 다국어 (English, Korean)

5. **React Widget**: App.tsx (300+ 줄)
   - window.openai API 활용
   - 6개 Widget 컴포넌트
   - callTool() 사용 예시
   - setWidgetState() 상태 관리

6. **빌드 스크립트**: package.json + build.sh

**사용 방법**:
- 각 섹션 코드를 Copy-Paste 시작점으로 사용
- 프로젝트 구조대로 파일 생성
- Todo 항목들 구현

---

### 4. **PHASE2_Summary.md**
Phase 2 설계 완료 요약

**대상**: 모든 이해관계자
**포함 내용**:
- ✅ 완료된 7개 Tool 정의
- ✅ Resource 설계
- ✅ 세션 관리 전략
- ✅ 인증 플로우
- ✅ 데이터 흐름도
- 📋 핵심 설계 결정사항
- ⚠️ Phase 3 개발 시 필수 주의사항 (5개)
- 🚀 다음 단계 (Phase 3-6 일정)
- 📊 프로젝트 진행도

**사용 방법**:
- Phase 3 시작 전 필수 읽기
- "필수 주의사항" 5개 항목 숙지
- 개발 팀과 공유

---

## 🎯 어떤 문서부터 읽을까?

### 시나리오 1: "처음부터 시작하는 개발자"
1. **ChatGPT_App_Development_Guide.md** (Phase 0-3 섹션)
2. **MCP_Server_Design.md** (개요 + 시스템 아키텍처)
3. **MCP_Server_Implementation.md** (index.ts부터 시작)
4. **PHASE2_Summary.md** (주의사항 확인)

### 시나리오 2: "Backend 개발자"
1. **MCP_Server_Design.md** (Tool 정의 + 세션 관리)
2. **MCP_Server_Implementation.md** (코드 구현)
3. **PHASE2_Summary.md** (주의사항)

### 시나리오 3: "Frontend 개발자"
1. **MCP_Server_Design.md** (Resource 설계 섹션)
2. **MCP_Server_Implementation.md** (App.tsx 부터)
3. **ChatGPT_App_Development_Guide.md** (Phase 3-C 섹션)

### 시나리오 4: "PM / 검토자"
1. **PHASE2_Summary.md** (전체 개요)
2. **MCP_Server_Design.md** (Tool 정의 표)
3. **ChatGPT_App_Development_Guide.md** (전체 프로세스)

### 시나리오 5: "배포 담당자"
1. **MCP_Server_Design.md** (배포 체크리스트)
2. **ChatGPT_App_Development_Guide.md** (Phase 5-6)
3. **PHASE2_Summary.md** (다음 단계)

---

## 📊 문서 요약표

| 문서 | 크기 | 대상 | 주요 내용 | 읽는 시간 |
|------|------|------|----------|----------|
| ChatGPT_App_Development_Guide.md | ~50KB | 모두 | 전체 개발 프로세스 (Phase 0-7) | 30분 |
| MCP_Server_Design.md | ~40KB | Backend / 아키텍처 | 기술 사양 (Tool, Resource, Session) | 45분 |
| MCP_Server_Implementation.md | ~30KB | Backend / Frontend | TypeScript 수도코드 (500+ 줄) | 60분 |
| PHASE2_Summary.md | ~20KB | 모두 | Phase 2 완료 요약 + 주의사항 | 15분 |

**총 읽기 시간**: 약 2-3시간

---

## 🔧 Phase 3 (Build) 체크리스트

### Pre-Setup
- [ ] Node.js 18+ 설치
- [ ] TypeScript 설정
- [ ] Git 저장소 초기화
- [ ] MCP_Server_Implementation.md 읽기

### Backend 개발 (MCP Server)
- [ ] 프로젝트 구조 생성
- [ ] SessionManager 구현
- [ ] HTTP 서버 + CORS 설정
- [ ] Widget Resource 등록
- [ ] Tool 1-2 구현 (get_routine_guide, search_products)
- [ ] Tool 3-7 구현
- [ ] 에러 핸들링 추가

### Frontend 개발 (React Widget)
- [ ] React 컴포넌트 6개 구현
- [ ] window.openai API 활용
- [ ] esbuild 번들링 설정
- [ ] HTML 템플릿 생성
- [ ] Tailwind CSS 스타일링

### 통합 & 테스트
- [ ] MCP Inspector 테스트
- [ ] 각 Tool 동작 확인
- [ ] Widget 렌더링 검증
- [ ] CSP 설정 확인

---

## 💡 핵심 설계 결정사항

### Session ID Generator (⚠️ 매우 중요)
```typescript
// ❌ 절대 금지 - 서버 초기화 오류 발생
sessionIdGenerator: undefined

// ✅ 필수
sessionIdGenerator: () => randomUUID()
```
**이유**: MCP 프로토콜은 세션 기반. initialize → tools/list 순서 필수.

### Tool 응답 구조
```typescript
// ✅ 반드시 structuredContent 포함
return {
  structuredContent: { /* 데이터 */ },
  content: [{ type: "text", text: "..." }]
};
```

### Widget 필드명 일치
```typescript
// Server: structuredContent.routine_type
// Widget: window.openai.toolOutput.routine_type
// ✅ 정확히 일치 필수 (snake_case 통일)
```

---

## 📞 문제 해결

### "Tool이 ChatGPT에서 안 보여요"
→ MCP_Server_Design.md의 "트러블슈팅" 섹션 참고

### "Widget이 렌더링 안 돼요"
→ MCP_Server_Implementation.md의 "주의사항" 항목 1-5 확인

### "세션 관리가 복잡해요"
→ PHASE2_Summary.md의 "세션 관리 전략" 다이어그램 참고

### "어떤 Tool부터 구현할까?"
→ MCP_Server_Implementation.md: 권장 순서 (Tool 1-2 먼저)

---

## 🚀 다음 단계

### Phase 3 시작 전에
1. ✅ MCP_Server_Design.md 읽기 (45분)
2. ✅ PHASE2_Summary.md "주의사항" 5개 숙지
3. ✅ MCP_Server_Implementation.md 구조 이해

### Phase 3 개발 중에
1. MCP_Server_Implementation.md를 옆에 두기
2. 각 섹션의 코드를 그대로 Copy-Paste (구조 참고)
3. MCP_Server_Design.md의 "Tool 정의"로 outputSchema 확인

### Phase 3 완료 후
1. MCP_Server_Design.md의 "테스트 체크리스트" 실행
2. Phase 4 (Test) 진행

---

## 📋 파일 목록

```
01_docs/
├── ChatGPT_App_Development_Guide.md      (전체 가이드)
├── MCP_Server_Design.md                  (기술 사양 ⭐)
├── MCP_Server_Implementation.md          (수도코드 ⭐)
├── PHASE2_Summary.md                     (완료 요약)
└── README.md                             (이 파일)
```

---

## 📞 연락처 & 문의

**기술 질문**: MCP_Server_Design.md의 "트러블슈팅"
**구현 질문**: MCP_Server_Implementation.md의 "주의사항"
**전체 프로세스**: ChatGPT_App_Development_Guide.md

---

## ✨ 마지막으로

이 문서 세트는 K-Beauty Skincare Routine ChatGPT App의 **완전한 설계**입니다.

**특징**:
- ✅ 7개 Tool의 완전한 JSON Schema
- ✅ 500+ 줄의 실행 가능한 TypeScript 수도코드
- ✅ 단계별 데이터 흐름도
- ✅ 트러블슈팅 가이드
- ✅ Phase 3-6 체크리스트

**준비 완료**: Phase 3 (Build) 시작 가능

---

**생성 일자**: 2026-02-09
**버전**: 1.0
**상태**: ✅ Phase 2 (Design) 완료

> **다음**: Phase 3 개발 시작
