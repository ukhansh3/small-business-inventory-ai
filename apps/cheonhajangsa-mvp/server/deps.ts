import { createHash } from "node:crypto";
import publicStoresJson from "../data/public_stores.json";
import { loadDataset, rawDataset } from "../core/data";
import { type PublicStoresFile, validatePublicStores } from "../core/public-stores";
import type { Dataset } from "../core/types";
import { createClaudeAi } from "./ai/claude";
import { createStoredAi } from "./ai/stored";
import type { AiClient } from "./ai/types";
import { createClaudeVision, createStoredVision, type VisionClient } from "./ai/vision";
import { readEnv, type ServerEnv } from "./env";
import { requestAiMode } from "./http";
import type { Logger } from "./log/logger";
import { noopLogger } from "./log/noop";
import { createSupabaseLogger } from "./log/supabase";

// 배포·개발 서버에서 쓰는 기본 의존성. 테스트는 핸들러에 직접 주입한다.
type Base = { data: Dataset; env: ServerEnv; log: Logger; dataVersion: string; live: AiClient; stored: AiClient; liveVision: VisionClient; storedVision: VisionClient };
let cached: Base | null = null;

// 데이터 버전: 데이터 파일 4개 내용의 sha256 앞 12자(consistency-report U3). 세션 기록에 남겨 evals 비교에 쓴다.
export function dataVersionOf(raw: unknown): string {
  return createHash("sha256").update(JSON.stringify(raw)).digest("hex").slice(0, 12);
}

function base(): Base {
  if (!cached) {
    const env = readEnv();
    const log = env.supabaseUrl && env.supabaseServiceRoleKey ? createSupabaseLogger(env.supabaseUrl, env.supabaseServiceRoleKey) : noopLogger;
    if (!log.enabled) console.warn("SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 없어 기록을 건너뜁니다");
    cached = { data: loadDataset(), env, log, dataVersion: dataVersionOf(rawDataset), live: createClaudeAi(env), stored: createStoredAi(), liveVision: createClaudeVision(env), storedVision: createStoredVision() };
  }
  return cached;
}

// v2 지도용 공공데이터 가게. 형식이 틀리면 시작할 때 실패한다(AC-27)
let publicStores: PublicStoresFile | null = null;
export function storesDeps(): { data: Dataset; env: ServerEnv; publicStores: PublicStoresFile } {
  if (!publicStores) {
    const v = validatePublicStores(publicStoresJson);
    if (!v.ok) throw new Error(`공공데이터 가게 형식 오류:\n${v.errors.join("\n")}`);
    publicStores = v.data;
  }
  const { data, env } = base();
  return { data, env, publicStores };
}

export function defaultDeps(): { data: Dataset; env: ServerEnv; log: Logger; dataVersion: string } {
  const { data, env, log, dataVersion } = base();
  return { data, env, log, dataVersion };
}

// AI_MODE(또는 허용된 경우 X-AI-Mode 헤더)에 따라 실시간·저장된 응답을 고른다
export function assistDeps(req: Request): { data: Dataset; env: ServerEnv; log: Logger; dataVersion: string; ai: AiClient } {
  const b = base();
  return { ...defaultDeps(), ai: requestAiMode(req, b.env) === "live" ? b.live : b.stored };
}

// v2 사진 진단(API-15): AI_MODE를 따른다. 저장된 응답 모드에서는 사진을 읽지 않는다
export function priceCheckDeps(req: Request): { data: Dataset; env: ServerEnv; log: Logger; vision: VisionClient } {
  const b = base();
  return { ...defaultDeps(), vision: requestAiMode(req, b.env) === "live" ? b.liveVision : b.storedVision };
}
