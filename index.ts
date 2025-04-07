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
  responseExample: string;
}

// API 정보 저장소
const apiDatabase: ApiInfo[] = [];

// API 의도와 키워드 매핑
const intentKeywords: Record<string, string[]> = {};

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

// 서버에서 사용할 도구 목록
const TOOLS = [SEARCH_API_TOOL] as const;

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
  keywords: string[]
) {
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
registerApi(
  "korea_investment_domestic_stock_order_cash",
  "/uapi/domestic-stock/v1/trading/order-cash",
  "POST",
  "한국투자증권 국내주식주문(현금) API - 주식 매수/매도 주문을 실행합니다.",
  {
    "CANO": "계좌번호(8자리)",
    "ACNT_PRDT_CD": "계좌상품코드(2자리)",
    "PDNO": "종목코드(6자리)",
    "ORD_DVSN": "주문구분(예: 00-지정가, 01-시장가)",
    "ORD_QTY": "주문수량",
    "ORD_UNPR": "주문단가"
  },
  '{"ODNO":"주문번호", "ORD_TMD":"주문시간", "KRX_FWDG_ORD_ORGNO":"한국거래소전송주문조직번호", "ODNO_TYPE":"주문번호구분"}',
  ["주식", "주문", "매수", "매도", "현금주문", "주식주문", "국내주식", "한국투자증권"]
);

// 한국투자증권 주식잔고조회 API
registerApi(
  "korea_investment_stock_balance",
  "/uapi/domestic-stock/v1/trading/inquire-balance",
  "GET",
  "한국투자증권 주식잔고조회 API - 계좌의 보유 주식 종목 및 잔고 정보를 조회합니다.",
  {
    "CANO": "계좌번호(8자리)",
    "ACNT_PRDT_CD": "계좌상품코드(2자리)",
    "AFHR_FLPR_YN": "시간외단일가여부(N)",
    "OFL_YN": "오프라인여부",
    "INQR_DVSN": "조회구분(01: 합산)",
    "UNPR_DVSN": "단가구분(01: 평균단가)",
    "FUND_STTL_ICLD_YN": "펀드결제분포함여부(N)",
    "FNCG_AMT_AUTO_RDPT_YN": "융자금액자동상환여부(N)",
    "PRCS_DVSN": "처리구분(00)",
    "CTX_AREA_FK100": "연속조회검색조건100",
    "CTX_AREA_NK100": "연속조회키100"
  },
  '{"output1":[{"pdno":"종목번호","prdt_name":"종목명","hldg_qty":"보유수량","pchs_avg_pric":"매입평균가격","pchs_amt":"매입금액","prpr":"현재가","evlu_pfls_amt":"평가손익금액","evlu_pfls_rt":"평가손익율"}],"output2":{"dnca_tot_amt":"예수금총금액","scts_evlu_amt":"유가평가금액","tot_evlu_amt":"총평가금액","nass_amt":"순자산금액"}}',
  ["주식", "잔고", "잔고조회", "계좌", "보유종목", "포트폴리오", "주식잔고", "자산", "한국투자증권"]
);

// 한국투자증권 매수가능조회 API
registerApi(
  "korea_investment_inquire_psbl_order",
  "/uapi/domestic-stock/v1/trading/inquire-psbl-order",
  "GET",
  "한국투자증권 매수가능조회 API - 주식 매수 가능 수량 및 금액을 조회합니다.",
  {
    "CANO": "계좌번호(8자리)",
    "ACNT_PRDT_CD": "계좌상품코드(2자리)",
    "PDNO": "종목코드(6자리, 종목코드와 가격 모두 공란 입력 시 매수금액만 조회)",
    "ORD_UNPR": "주문단가(시장가(ORD_DVSN:01) 조회 시 공란)",
    "ORD_DVSN": "주문구분(01: 시장가로 조회해야 종목증거금율 반영됨)",
    "CMA_EVLU_AMT_ICLD_YN": "CMA평가금액포함여부(N)",
    "OVRS_ICLD_YN": "해외포함여부(N)"
  },
  '{"output":{"ord_psbl_cash":"주문가능현금(예수금)","nrcvb_buy_amt":"미수없는매수금액(미수 사용X)","nrcvb_buy_qty":"미수없는매수수량(미수 사용X)","max_buy_amt":"최대매수금액(미수 사용O)","max_buy_qty":"최대매수수량(미수 사용O)"}}',
  ["주식", "매수", "매수가능", "주문가능", "가능금액", "가능수량", "예수금", "매수수량", "한국투자증권"]
);


// 한국투자증권 주식주문(신용) API
registerApi(
  "korea_investment_stock_order_credit",
  "/uapi/domestic-stock/v1/trading/order-credit",
  "POST",
  "한국투자증권 주식주문(신용) API - 신용거래를 통한 주식 매수/매도 주문을 실행합니다. (모의투자 미지원)",
  {
    "CANO": "계좌번호(8자리)",
    "ACNT_PRDT_CD": "계좌상품코드(2자리)",
    "PDNO": "종목코드(6자리)",
    "CRDT_TYPE": "신용유형코드(21:자기융자신규, 23:유통융자신규, 25:자기융자상환, 26:유통대주상환 등)",
    "LOAN_DT": "대출일자(YYYYMMDD)",
    "ORD_DVSN": "주문구분(예: 00-지정가)",
    "ORD_QTY": "주문수량",
    "ORD_UNPR": "주문단가",
    "RSVN_ORD_YN": "예약주문여부(N)"
  },
  '{"output":{"krx_fwdg_ord_orgno":"거래소코드","odno":"주문번호","ord_tmd":"주문시간"}}',
  ["주식", "주문", "신용", "신용주문", "융자", "대주", "신용거래", "신용매수", "신용매도", "한국투자증권"]
);


runServer().catch((error) => {
  console.error("서버 실행 중 치명적 오류 발생:", error);
  process.exit(1);
});