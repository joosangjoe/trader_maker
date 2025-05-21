#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// API 정보 인터페이스
interface ApiInfo {
  name: string;
  endpoint: string;
  method: string;
  description: string;
  parameters: Record<string, string>;
  headers?: Record<string, string>; // 헤더 정보 추가
  responseExample: string;
}

// API 정보 저장소
let apiDatabase: ApiInfo[] = [];

// API 의도와 키워드 매핑
let intentKeywords: Record<string, string[]> = {};

// API 검색 함수
function searchApiByIntent(intent: string): ApiInfo[] {
  // 모든 단어를 소문자로 변환하여 검색
  const normalizedIntent = intent.toLowerCase();
  
  // 일치하는 API 찾기
  const matchedApis: ApiInfo[] = [];
  
  // 각 키워드 집합에 대해 의도 검색
  for (const [apiName, keywords] of Object.entries(intentKeywords)) {
    // 키워드 중 하나라도 의도에 포함되어 있으면 API를 결과에 추가
    if (keywords.some(keyword => normalizedIntent.includes(keyword.toLowerCase()))) {
      // 해당 apiName을 가진 API 찾기
      const api = apiDatabase.find(api => api.name === apiName);
      if (api) {
        matchedApis.push(api);
      }
    }
  }
  
  return matchedApis;
}

// API 찾기 도구 정의
const SEARCH_API_TOOL: Tool = {
  name: "search_api",
  description: "사용자 의도에 맞는 API 정보 검색",
  inputSchema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "사용자의 의도 또는 요청 내용"
      }
    },
    required: ["intent"]
  }
};

// list_all_apis 도구 정의
const LIST_ALL_APIS_TOOL: Tool = {
  name: "list_all_apis",
  description: "모든 등록된 API의 목록을 반환합니다.",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

// 서버에서 사용할 도구 목록
const TOOLS = [SEARCH_API_TOOL, LIST_ALL_APIS_TOOL] as const;

// API 검색 핸들러
async function handleSearchApi(intent: string) {
  try {
    // 사용자 의도에 맞는 API 검색
    const matchedApis = searchApiByIntent(intent);
    
    if (matchedApis.length === 0) {
      return {
        content: [{
          type: "text",
          text: "의도에 맞는 API를 찾을 수 없습니다. 다른 방식으로 요청해보세요."
        }],
        isError: false
      };
    }
    
    // 결과 형식화
    const apiResults = matchedApis.map(api => ({
      name: api.name,
      endpoint: api.endpoint,
      method: api.method,
      description: api.description,
      parameters: api.parameters,
      headers: api.headers, // 헤더 정보 추가
      responseExample: api.responseExample
    }));
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ apis: apiResults }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `API 검색 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// 모든 API 목록 반환 핸들러
async function handleListAllApis() {
  try {
    if (apiDatabase.length === 0) {
      return {
        content: [{
          type: "text",
          text: "등록된 API가 없습니다."
        }],
        isError: false
      };
    }

    const simplifiedApiList = apiDatabase.map(api => ({
      name: api.name,
      description: api.description
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ apis: simplifiedApiList }, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `API 목록 조회 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// Server setup
const server = new Server(
  {
    name: "mcp-server/api-finder",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "search_api": {
        const { intent } = request.params.arguments as { intent: string };
        return await handleSearchApi(intent);
      }
      case "list_all_apis": {
        return await handleListAllApis();
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// 서버 실행 함수
async function runServer() {
  try {
    // Load APIs from apis.json
    const fs = await import('fs');
    const apisJson = fs.readFileSync('apis.json', 'utf-8');
    const apiData = JSON.parse(apisJson) as Array<ApiInfo & { keywords: string[] }>;

    apiData.forEach(api => {
      const { keywords, ...apiInfo } = api;
      registerApi(
        apiInfo.name,
        apiInfo.endpoint,
        apiInfo.method,
        apiInfo.description,
        apiInfo.parameters,
        apiInfo.responseExample,
        keywords,
        apiInfo.headers
      );
    });

    console.error("API Finder MCP 서버가 시작되었습니다.");
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("API Finder MCP 서버가 stdio에서 실행 중입니다");
  } catch (error) {
    console.error("서버 초기화 중 오류 발생:", error);
    process.exit(1);
  }
}

// API 등록 함수 - 서버에 새로운 API 정보를 추가합니다
function registerApi(
  name: string,
  endpoint: string,
  method: string,
  description: string,
  parameters: Record<string, string>,
  responseExample: string,
  keywords: string[],
  headers?: Record<string, string> // 헤더 정보 파라미터 추가
) {
  // API 정보 등록
  apiDatabase.push({
    name,
    endpoint,
    method,
    description,
    parameters,
    headers, // 헤더 정보 포함
    responseExample
  });
  
  // 의도 키워드 매핑 등록
  intentKeywords[name] = keywords;
  
  console.error(`API ${name} 등록 완료`);
}

runServer().catch((error) => {
  console.error("서버 실행 중 치명적 오류 발생:", error);
  process.exit(1);
});