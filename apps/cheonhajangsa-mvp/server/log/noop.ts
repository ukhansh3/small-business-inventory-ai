import { ItemRequestUnavailableError, type Logger } from "./logger";

// Supabase 환경 변수가 없을 때(A8): 기록만 건너뛰고 검색·대화는 정상 동작한다.
export const noopLogger: Logger = {
  enabled: false,
  async registerDevice() {
    return null;
  },
  async logTurn() {},
  async logSearch() {},
  async logEvent() {
    return true;
  },
  async aiGate() {
    return null;
  },
  async logPriceCheck() {},
  async sharePriceCheck() {
    return null;
  },
  async marketSamples() {
    return [];
  },
  async setDevice() {
    return false;
  },
  async requestItem() {
    throw new ItemRequestUnavailableError("기록 저장소가 설정되지 않음");
  },
};
