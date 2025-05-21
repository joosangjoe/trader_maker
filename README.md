# API Finder MCP 서버

사용자의 의도를 파악하여 적절한 API 정보를 제공하는 MCP(Model Context Protocol) 서버입니다.

## 기능

`search_api` - 사용자 의도에 맞는 API 정보 검색
- 입력: `intent` (string) - 사용자의 의도 또는 요청 내용
- 반환: 사용자 의도에 맞는 API 목록과 상세 정보

## 설정 및 실행

### 필요 조건
- Node.js 18 이상
- npm 또는 yarn

### 설치
```bash
# 의존성 설치
npm install

# 빌드
npm run build
```

### 실행
```bash
# 직접 실행
node dist/index.js

# npm 스크립트로 실행
npm start
```

### Docker로 실행
```bash
# 이미지 빌드
docker build -t api-finder-mcp-server .

# 컨테이너 실행
docker run -it api-finder-mcp-server
```

## API 등록 방법

API는 주로 `apis.json` 파일을 통해 관리됩니다. 서버 시작 시 이 파일을 읽어 API 정보를 로드합니다.

`apis.json` 파일에 새로운 API를 추가하려면 다음 JSON 구조에 따라 정보를 입력합니다:

```json
[
  {
    "name": "api_name",
    "endpoint": "/api/endpoint",
    "method": "GET",
    "description": "API 설명",
    "parameters": {
      "param1": "파라미터1 설명",
      "param2": "파라미터2 설명"
    },
    "responseExample": "{\"result\": \"응답 예시\"}",
    "keywords": ["키워드1", "키워드2"],
    "headers": {
      "header1": "헤더1 값"
    }
  }
]
```

기존 `index.ts`의 `registerApi` 함수는 여전히 동적으로 API를 등록하는 데 사용할 수 있습니다. 하지만 이 방법으로 추가된 API는 메모리에만 저장되며, 서버 재시작 시 사라집니다. 변경 사항을 영구적으로 유지하려면 `apis.json` 파일을 직접 수정해야 합니다.

## 예시 사용법

사용자가 "주식 종목 검색하는 방법 알려줘"라고 요청하면, 서버는 "주식", "종목", "검색" 키워드를 인식하여 관련 API 정보를 제공합니다.

## AI 도구 연동 가이드 (Claude, Cursor 등)

### MCP 서버 연동 방식 (MCP Server Integration Method)
- 이 API Finder MCP 서버는 표준 입출력(stdio)을 통해 통신합니다. AI 도구나 관련 스크립트는 `mcp-server-api-finder` 실행 파일을 직접 실행하여 상호작용할 수 있습니다. (This API Finder MCP server communicates via standard input/output (stdio). AI tools or associated scripts can interact by directly executing the `mcp-server-api-finder` executable.)
-   실행 예: `node dist/index.js` (Example execution: `node dist/index.js`)
- AI 도구는 MCP 클라이언트 역할을 하여 서버에 JSON 형식의 요청을 보내고 응답을 받습니다. (The AI tool acts as an MCP client, sending JSON formatted requests to the server and receiving responses.)

### 사용 가능한 도구 확인 (Listing Available Tools)
- AI 도구는 먼저 `ListTools` 요청을 보내 사용 가능한 도구 목록을 확인할 수 있습니다. (AI tools can first send a `ListTools` request to check the list of available tools.)
- 요청 예 (Request Example): `{"type": "request", "id": "list-tools-1", "request": {"type": "ListTools"}}`
- 서버는 `search_api`와 `list_all_apis` 도구 정보를 반환합니다. (The server will return information about the `search_api` and `list_all_apis` tools.)

### `search_api` 도구 사용법 (Using the `search_api` Tool)
- 사용자의 의도에 맞는 API를 검색합니다. (Searches for APIs matching the user's intent.)
- **요청 (Request):**
  ```json
  {
    "type": "request",
    "id": "call-tool-search-1",
    "request": {
      "type": "CallTool",
      "params": {
        "name": "search_api",
        "arguments": {
          "intent": "사용자의 검색 의도 또는 질문"
        }
      }
    }
  }
  ```
- **응답 예시 (Response Example):** (성공 시 `content` 필드에 API 정보 포함)
  ```json
  {
    "type": "response",
    "id": "call-tool-search-1",
    "response": {
      "type": "CallTool",
      "result": {
        "content": [{
          "type": "text",
          "text": "{\"apis\": [{\"name\": \"korea_investment_stock_balance\", ...}]}"
        }],
        "isError": false
      }
    }
  }
  ```
- **AI 도구 연동 예시 (AI Tool Integration Example):**
    - 사용자: "내 주식 계좌 잔고를 보는 API 찾아줘." (User: "Find an API to see my stock account balance.")
    - AI 도구 (내부적으로): `search_api` 도구를 `{"intent": "주식 계좌 잔고 조회"}` 인자와 함께 호출합니다. (AI Tool (internally): Calls the `search_api` tool with the argument `{"intent": "주식 계좌 잔고 조회"}`.)
    - 사용자: "주식 매수 주문하는 방법 알려줘."
    - AI 도구 (내부적으로): `search_api` 도구를 `{"intent": "주식 매수 방법"}` 인자와 함께 호출합니다.
    - 사용자: "내 현재 보유 주식들을 확인하고 싶은데, 어떤 API를 써야해?"
    - AI 도구 (내부적으로): `search_api` 도구를 `{"intent": "보유 주식 확인 API"}` 인자와 함께 호출합니다.
    - 사용자: "OAuth 토큰 발급받는 API 있어?"
    - AI 도구 (내부적으로): `search_api` 도구를 `{"intent": "OAuth 토큰 발급"}` 인자와 함께 호출합니다.

### `list_all_apis` 도구 사용법 (Using the `list_all_apis` Tool)
- 등록된 모든 API의 목록을 반환합니다. (Returns a list of all registered APIs.)
- **요청 (Request):** (`arguments`는 비어있음)
  ```json
  {
    "type": "request",
    "id": "call-tool-list-1",
    "request": {
      "type": "CallTool",
      "params": {
        "name": "list_all_apis",
        "arguments": {}
      }
    }
  }
  ```
- **응답 예시 (Response Example):** (성공 시 `content` 필드에 API 목록 포함)
  ```json
  {
    "type": "response",
    "id": "call-tool-list-1",
    "response": {
      "type": "CallTool",
      "result": {
        "content": [{
          "type": "text",
          "text": "{\"apis\": [{\"name\": \"korea_investment_oauth_token\", \"description\": \"한국투자증권 접근토큰발급 API...\"}, ...]}"
        }],
        "isError": false
      }
    }
  }
  ```
- **AI 도구 연동 예시 (AI Tool Integration Example):**
    - 사용자: "여기서 어떤 API들을 사용할 수 있어?" (User: "What APIs can I use here?")
    - AI 도구 (내부적으로): `list_all_apis` 도구를 호출합니다. (AI Tool (internally): Calls the `list_all_apis` tool.)
    - 사용자: "이 시스템으로 할 수 있는 모든 작업을 나열해줘."
    - AI 도구 (내부적으로): `list_all_apis` 도구를 호출합니다.
    - 사용자: "금융 관련해서 어떤 기능들이 제공돼?"
    - AI 도구 (내부적으로): `list_all_apis` 도구를 호출하여 사용 가능한 API 목록을 확인하고, 사용자의 다음 질문에 따라 특정 API를 `search_api`로 검색할 수 있습니다.