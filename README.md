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

새로운 API를 등록하려면 `index.ts` 파일의 아래 부분에 `registerApi` 함수 호출을 추가합니다:

```typescript
registerApi(
  "api_name",              // API 이름
  "/api/endpoint",         // API 엔드포인트
  "GET",                   // HTTP 메서드
  "API 설명",              // API 설명
  {                        // API 파라미터
    "param1": "파라미터1 설명",
    "param2": "파라미터2 설명"
  },
  '{"result": "응답 예시"}', // 응답 예시 (JSON 문자열)
  ["키워드1", "키워드2"]    // 의도 매칭 키워드
);
```

## 예시 사용법

사용자가 "주식 종목 검색하는 방법 알려줘"라고 요청하면, 서버는 "주식", "종목", "검색" 키워드를 인식하여 관련 API 정보를 제공합니다.