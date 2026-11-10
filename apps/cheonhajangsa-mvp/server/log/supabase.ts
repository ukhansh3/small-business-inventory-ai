import { createClient } from "@supabase/supabase-js";
import { type AiGate, ItemRequestUnavailableError, LIMITS, type Logger } from "./logger";

// 내 Supabase에 기록한다. chj 스키마는 노출하지 않고, service_role만 실행할 수 있는 public.chj_* 함수를 부른다.
export function createSupabaseLogger(url: string, serviceRoleKey: string): Logger {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 기록 실패는 콘솔에만 남긴다(응답을 막지 않음)
  async function call(fn: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.code ?? ""} ${error.message}`);
    return data;
  }
  async function quiet(fn: string, p: unknown) {
    try {
      await call(fn, { p });
    } catch (e) {
      console.error("기록 실패", e instanceof Error ? e.message : e);
    }
  }

  return {
    enabled: true,
    async registerDevice(device_id, is_test) {
      try {
        return (await call("chj_register_device", { p_device_id: device_id, p_is_test: is_test })) as {
          is_new: boolean;
          location_id: string;
          business_type: string | null;
        };
      } catch (e) {
        console.error("기록 실패", e instanceof Error ? e.message : e);
        return null;
      }
    },
    logTurn: (entry) => quiet("chj_log_turn", entry),
    logSearch: (entry) => quiet("chj_log_search", entry),
    async logEvent(entry) {
      try {
        return (await call("chj_log_event", { p: { ...entry, minute_limit: LIMITS.eventsPerMinute } })) !== false;
      } catch (e) {
        console.error("기록 실패", e instanceof Error ? e.message : e);
        return true;
      }
    },
    async aiGate(entry) {
      try {
        return (await call("chj_ai_gate", { p: entry })) as AiGate;
      } catch (e) {
        console.error("한도 판정 실패(한도 미적용)", e instanceof Error ? e.message : e);
        return null;
      }
    },
    logPriceCheck: (entry) => quiet("chj_log_price_check", entry),
    async sharePriceCheck(entry) {
      try {
        return (await call("chj_share_price_check", { p: entry })) as number;
      } catch (e) {
        console.error("기록 실패", e instanceof Error ? e.message : e);
        return null;
      }
    },
    async marketSamples(itemId) {
      try {
        return ((await call("chj_market_samples", { p: { item_id: itemId, days: 30 } })) as number[] | null) ?? [];
      } catch (e) {
        console.error("시세 기록 읽기 실패", e instanceof Error ? e.message : e);
        return [];
      }
    },
    async setDevice(entry) {
      try {
        await call("chj_set_device", { p: entry });
        return true;
      } catch (e) {
        console.error("기록 실패", e instanceof Error ? e.message : e);
        return false;
      }
    },
    async requestItem(entry) {
      try {
        return (await call("chj_request_item", { p: entry })) as { request_id: string; created: boolean };
      } catch (e) {
        console.error("요청 저장 실패", e instanceof Error ? e.message : e);
        throw new ItemRequestUnavailableError("요청 저장 실패");
      }
    },
  };
}
