#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// API 정보 저장소
const apiDatabase = [];
// API 의도와 키워드 매핑
const intentKeywords = {};
// API 검색 함수
function searchApiByIntent(intent) {
    // 모든 단어를 소문자로 변환하여 검색
    const normalizedIntent = intent.toLowerCase();
    // 일치하는 API 찾기
    const matchedApis = [];
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
const SEARCH_API_TOOL = {
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
// 서버에서 사용할 도구 목록
const TOOLS = [SEARCH_API_TOOL];
// API 검색 핸들러
async function handleSearchApi(intent) {
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
            responseExample: api.responseExample
        }));
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ apis: apiResults }, null, 2)
                }],
            isError: false
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `API 검색 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
                }],
            isError: true
        };
    }
}
// Server setup
const server = new Server({
    name: "mcp-server/api-finder",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case "search_api": {
                const { intent } = request.params.arguments;
                return await handleSearchApi(intent);
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
    }
    catch (error) {
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
        console.error("API Finder MCP 서버가 시작되었습니다.");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("API Finder MCP 서버가 stdio에서 실행 중입니다");
    }
    catch (error) {
        console.error("서버 초기화 중 오류 발생:", error);
        process.exit(1);
    }
}
// API 등록 함수 - 서버에 새로운 API 정보를 추가합니다
function registerApi(name, endpoint, method, description, parameters, responseExample, keywords) {
    // API 정보 등록
    apiDatabase.push({
        name,
        endpoint,
        method,
        description,
        parameters,
        responseExample
    });
    // 의도 키워드 매핑 등록
    intentKeywords[name] = keywords;
    console.error(`API ${name} 등록 완료`);
}
// API 등록
// 한국투자증권 국내주식주문(현금) API
registerApi("korea_investment_domestic_stock_order_cash", "/uapi/domestic-stock/v1/trading/order-cash", "POST", "한국투자증권 국내주식주문(현금) API - 주식 매수/매도 주문을 실행합니다.", {
    "CANO": "계좌번호(8자리)",
    "ACNT_PRDT_CD": "계좌상품코드(2자리)",
    "PDNO": "종목코드(6자리)",
    "ORD_DVSN": "주문구분(예: 00-지정가, 01-시장가)",
    "ORD_QTY": "주문수량",
    "ORD_UNPR": "주문단가"
}, '{"ODNO":"주문번호", "ORD_TMD":"주문시간", "KRX_FWDG_ORD_ORGNO":"한국거래소전송주문조직번호", "ODNO_TYPE":"주문번호구분"}', ["주식", "주문", "매수", "매도", "현금주문", "주식주문", "국내주식", "한국투자증권"]);
runServer().catch((error) => {
    console.error("서버 실행 중 치명적 오류 발생:", error);
    process.exit(1);
});
