from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import httpx
from dotenv import load_dotenv
import os

# 환경변수 로드
load_dotenv()

app = FastAPI()

# API 정보 모델
class ApiInfo(BaseModel):
    name: str
    endpoint: str
    method: str
    description: str
    parameters: Dict[str, str]
    headers: Optional[Dict[str, str]] = None
    responseExample: str

# API 검색 요청 모델
class SearchRequest(BaseModel):
    intent: str

# API 정보 저장소
api_database: List[ApiInfo] = []

# API 의도와 키워드 매핑
intent_keywords: Dict[str, List[str]] = {}

def search_api_by_intent(intent: str) -> List[ApiInfo]:
    """사용자 의도에 맞는 API를 검색합니다."""
    normalized_intent = intent.lower()
    matched_apis: List[ApiInfo] = []
    
    for api_name, keywords in intent_keywords.items():
        if any(keyword.lower() in normalized_intent for keyword in keywords):
            api = next((api for api in api_database if api.name == api_name), None)
            if api:
                matched_apis.append(api)
    
    return matched_apis

def register_api(
    name: str,
    endpoint: str,
    method: str,
    description: str,
    parameters: Dict[str, str],
    response_example: str,
    keywords: List[str],
    headers: Optional[Dict[str, str]] = None
):
    """새로운 API 정보를 등록합니다."""
    api_info = ApiInfo(
        name=name,
        endpoint=endpoint,
        method=method,
        description=description,
        parameters=parameters,
        headers=headers,
        responseExample=response_example
    )
    
    api_database.append(api_info)
    intent_keywords[name] = keywords
    print(f"API {name} 등록 완료")

@app.post("/search")
async def search_api(request: SearchRequest):
    """API 검색 엔드포인트"""
    try:
        matched_apis = search_api_by_intent(request.intent)
        
        if not matched_apis:
            return {
                "content": [{
                    "type": "text",
                    "text": "의도에 맞는 API를 찾을 수 없습니다. 다른 방식으로 요청해보세요."
                }],
                "isError": False
            }
        
        return {
            "content": [{
                "type": "text",
                "text": {"apis": matched_apis}
            }],
            "isError": False
        }
    except Exception as error:
        return {
            "content": [{
                "type": "text",
                "text": f"API 검색 중 오류 발생: {str(error)}"
            }],
            "isError": True
        }

@app.get("/apis", response_model=List[ApiInfo])
async def list_apis():
    """등록된 모든 API 목록을 반환합니다."""
    return api_database

# API 등록
# 한국투자증권 접근토큰발급 API
register_api(
    "korea_investment_oauth_token",
    "/oauth2/tokenP",
    "POST",
    "한국투자증권 접근토큰발급 API - API 호출에 필요한 OAuth 접근 토큰을 발급합니다.",
    {
        "grant_type": "client_credentials (고정값)",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret"
    },
    '{"access_token":"발급된 접근 토큰","token_type":"Bearer","expires_in":86400,"access_token_token_expired":"2023-12-31 23:59:59"}',
    ["토큰", "접근토큰", "인증", "OAuth", "로그인", "API키", "API 키", "인증키", "한국투자증권"],
    {
        "content-type": "application/json; charset=utf-8"
    }
)

# 한국투자증권 국내주식주문(현금) API
register_api(
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
    ["주식", "주문", "매수", "매도", "현금주문", "주식주문", "국내주식", "한국투자증권"],
    {
        "content-type": "application/json; charset=utf-8",
        "authorization": "Bearer {접근토큰}",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret",
        "tr_id": "TTTC0012U(매수-실전) / VTTC0012U(매수-모의) / TTTC0011U(매도-실전) / VTTC0011U(매도-모의)"
    }
)

# 한국투자증권 주식잔고조회 API
register_api(
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
    ["주식", "잔고", "잔고조회", "계좌", "보유종목", "포트폴리오", "주식잔고", "자산", "한국투자증권"],
    {
        "authorization": "Bearer {접근토큰}",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret",
        "tr_id": "TTTC8434R(실전) / VTTC8434R(모의)"
    }
)

# 한국투자증권 매수가능조회 API
register_api(
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
    ["주식", "매수", "매수가능", "주문가능", "가능금액", "가능수량", "예수금", "매수수량", "한국투자증권"],
    {
        "authorization": "Bearer {접근토큰}",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret",
        "tr_id": "TTTC8908R(실전) / VTTC8908R(모의)"
    }
)

# 한국투자증권 주식주문(신용) API
register_api(
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
    ["주식", "주문", "신용", "신용주문", "융자", "대주", "신용거래", "신용매수", "신용매도", "한국투자증권"],
    {
        "content-type": "application/json; charset=utf-8",
        "authorization": "Bearer {접근토큰}",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret",
        "tr_id": "TTTC0052U(매수-실전) / TTTC0051U(매도-실전)",
        "custtype": "P(개인) 또는 B(법인)"
    }
)

# 한국투자증권 주식현재가 시세 API
register_api(
    "korea_investment_stock_current_price",
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    "GET",
    "한국투자증권 주식현재가 시세 API - 주식의 현재가, 거래량, 시가총액 등 실시간 시세 정보를 조회합니다.",
    {
        "FID_COND_MRKT_DIV_CODE": "조건 시장 분류 코드 (J, NX, UN:통합)",
        "FID_INPUT_ISCD": "입력 종목코드 (ex 005930 삼성전자)"
    },
    '{"output":{"stck_prpr":"주식 현재가","prdy_vrss":"전일 대비","prdy_vrss_sign":"전일 대비 부호","prdy_ctrt":"전일 대비율","acml_vol":"누적 거래량","acml_tr_pbmn":"누적 거래 대금","stck_oprc":"주식 시가","stck_hgpr":"주식 최고가","stck_lwpr":"주식 최저가","stck_mxpr":"주식 상한가","stck_llam":"주식 하한가","hts_avls":"시가총액","per":"PER","pbr":"PBR","eps":"EPS","bps":"BPS","frgn_hldn_qty":"외국인 보유 수량","hts_frgn_ehrt":"외국인 소진율"}}',
    ["주식", "현재가", "시세", "주가", "주식시세", "주식가격", "종목정보", "종목시세", "한국투자증권"],
    {
        "content-type": "application/json; charset=utf-8",
        "authorization": "Bearer {접근토큰}",
        "appkey": "발급받은 appkey",
        "appsecret": "발급받은 appsecret",
        "tr_id": "FHKST01010100",
        "custtype": "P(개인) 또는 B(법인)"
    }
)

# 서버 실행
if __name__ == "__main__":
    import sys
    print("API Finder MCP 서버가 시작되었습니다.", file=sys.stderr)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 