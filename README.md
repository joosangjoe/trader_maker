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