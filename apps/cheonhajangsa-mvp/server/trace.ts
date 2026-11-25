import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Logger } from "./log/logger";
import { noopLogger } from "./log/noop";

// 추적 기록(최종평가 강의90): 요청마다 logs/trace.jsonl에 JSON 한 줄.
// 요청 id, 시각, 입력, 단계별 결과, 출력, 커밋, 모델, 지연, 오류를 남긴다.
// 키·토큰·실명·연락처는 남기지 않는다: 기기 id는 해시, 입력의 전화번호·이메일은 가린다, 사진은 크기만.
// 로컬 실행은 저장소 루트 logs/trace.jsonl에 쌓고, 배포(Vercel, 파일 쓰기 불가)는 같은 줄을 서버 로그에 낸다.
// 기록 실패는 응답을 막지 않는다(coding-rules 4절).

export const traceFile = (): string => resolve(process.cwd(), process.env.TRACE_FILE || "../../logs/trace.jsonl");

type Step = { step: string; [k: string]: unknown };

let cachedCommit: string | null = null;
function commit(): string {
  if (cachedCommit) return cachedCommit;
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromEnv) return (cachedCommit = fromEnv.slice(0, 7));
  try {
    cachedCommit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    cachedCommit = "unknown";
  }
  return cachedCommit;
}

// 전화번호·이메일 가리기(사장님이 문장에 적었을 수 있다)
export function maskPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[이메일]")
    .replace(/(?<!\d)0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g, "[전화번호]");
}

export const pseudonym = (deviceId: string | null): string | null =>
  deviceId ? "u_" + createHash("sha256").update(deviceId).digest("hex").slice(0, 8) : null;

// 요청 몸에서 기록할 입력만 고른다(사진은 크기만)
export function traceInput(route: string, body: unknown, url: URL): unknown {
  if (route === "stores" || route === "market") return Object.fromEntries(url.searchParams);
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const scrub = (v: unknown): unknown => {
    if (typeof v === "string") return v.length > 2000 ? `[${v.length}자 생략]` : maskPii(v);
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) =>
        /image|photo|base64/i.test(k) && typeof x === "string" ? [k, `[사진 ${Math.round((x.length * 3) / 4 / 1024)}KB]`] : [k, scrub(x)]));
    }
    return v;
  };
  return scrub(b);
}

// 응답에서 결과 요약만(전체 응답은 크다)
export function traceOutput(status: number, json: unknown): { outcome: string; summary: unknown } {
  if (!json || typeof json !== "object") return { outcome: `http_${status}`, summary: null };
  const r = json as Record<string, any>;
  if (status >= 400) return { outcome: "error", summary: { code: r.error?.code ?? r.code ?? null } };
  if (r.type === "ask") return { outcome: "ask", summary: { slot: r.ask?.slot } };
  if (r.type === "notice") return { outcome: r.notice?.kind ?? "notice", summary: { item: r.notice?.recognized_item?.item_id ?? null } };
  const results = r.results as { total?: number; groups?: { key: string; items: { vendor_id: string }[] }[] } | undefined;
  const pc = (r.price_check ?? (r.check_id ? r : null)) as { lines?: { item_id: string | null; verdict: string | null; verdict_title?: string | null }[]; message?: string | null } | null;
  if (pc && (r.type === "price_check" || r.check_id)) {
    return { outcome: "price_check", summary: { lines: (pc.lines ?? []).map((l) => ({ item_id: l.item_id, verdict: l.verdict, title: l.verdict_title ?? null })), message: pc.message ?? null } };
  }
  if (results) {
    const top = results.groups?.flatMap((g) => g.items.map((i) => i.vendor_id)).slice(0, 5) ?? [];
    const rec = r.recommendation as { situation: string; primary: { id: string } } | null | undefined;
    return { outcome: rec ? "recommended" : "results", summary: { total: results.total ?? null, top, recommendation: rec ? { situation: rec.situation, primary: rec.primary.id } : null } };
  }
  if (Array.isArray(r.stores)) return { outcome: "stores", summary: { count: r.stores.length } };
  return { outcome: "ok", summary: null };
}

// 기존 기록기(Logger)를 감싸 단계별 결과(AI 해석·조건·검색 결과)를 모은다. 원래 기록도 그대로 한다.
export function recordingLogger(inner: Logger, steps: Step[], meta: { model?: string; prompt_version?: string; ai_mode?: string }): Logger {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== "function") return original;
      return (...args: any[]) => {
        const e = args[0] ?? {};
        if (prop === "logTurn" || prop === "logSearch") {
          if (e.session) Object.assign(meta, { model: e.session.model, prompt_version: e.session.prompt_version, ai_mode: e.session.ai_mode });
          steps.push({
            step: prop === "logTurn" ? "assist_turn" : "search",
            ai_called: e.ai_called,
            outcome: e.outcome,
            condition: e.condition ?? null,
            tool: e.tool_call ? { status: e.tool_call.status, result_count: e.tool_call.result_count, top: e.tool_call.result_vendor_ids?.slice(0, 5), latency_ms: e.tool_call.latency_ms } : null,
          });
        } else if (prop === "logPriceCheck") {
          Object.assign(meta, { model: e.model, ai_mode: e.ai_mode });
          steps.push({ step: "price_check", doc_type: e.doc_type, seller_type: e.seller_type, lines: e.lines });
        } else if (prop === "aiGate") {
          steps.push({ step: "ai_gate", ai_call: e.ai_call });
        }
        return original.apply(target, args);
      };
    },
  });
}

export type TraceLine = {
  request_id: string; ts: string; route: string; user: string | null; input: unknown; steps: Step[];
  outcome: string; output: unknown; status: number; commit: string; model: string | null; prompt_version: string | null;
  ai_mode: string | null; latency_ms: number; error: string | null;
};

export function writeTrace(line: TraceLine): void {
  const text = JSON.stringify(line);
  try {
    if (process.env.VERCEL) {
      console.log("TRACE " + text);
      return;
    }
    const file = traceFile();
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, text + "\n");
  } catch {
    // 기록 실패는 무시
  }
}

const seoulIso = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().replace("Z", "+09:00");

// 핸들러를 감싸 요청마다 한 줄을 남긴다. 응답 머리에 x-request-id를 붙여 화면·기록을 이어 볼 수 있게 한다.
export async function traced<D extends { log?: Logger; env?: { aiModel: string } }>(
  route: string, req: Request, deps: D, handler: (req: Request, deps: D) => Promise<Response>,
): Promise<Response> {
  if (process.env.TRACE === "off") return handler(req, deps);
  const started = Date.now();
  const requestId = "q-" + randomUUID().slice(0, 8);
  const steps: Step[] = [];
  const meta: { model?: string; prompt_version?: string; ai_mode?: string } = {};
  let body: unknown = null;
  try {
    body = req.method === "GET" ? null : await req.clone().json();
  } catch {
    body = null;
  }
  const wrapped = { ...deps, log: recordingLogger(deps.log ?? noopLogger, steps, meta) } as D;
  let res: Response;
  let error: string | null = null;
  try {
    res = await handler(req, wrapped);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    writeTrace({ request_id: requestId, ts: seoulIso(new Date(started)), route, user: pseudonym(req.headers.get("x-device-id")),
      input: traceInput(route, body, new URL(req.url)), steps, outcome: "exception", output: null, status: 500, commit: commit(),
      model: meta.model ?? deps.env?.aiModel ?? null, prompt_version: meta.prompt_version ?? null, ai_mode: meta.ai_mode ?? null,
      latency_ms: Date.now() - started, error });
    throw e;
  }
  let json: unknown = null;
  try {
    json = await res.clone().json();
  } catch {
    json = null;
  }
  const { outcome, summary } = traceOutput(res.status, json);
  if (res.status >= 400) error = (json as any)?.error?.code ?? (json as any)?.code ?? `HTTP ${res.status}`;
  writeTrace({ request_id: requestId, ts: seoulIso(new Date(started)), route, user: pseudonym(req.headers.get("x-device-id")),
    input: traceInput(route, body, new URL(req.url)), steps, outcome, output: summary, status: res.status, commit: commit(),
    model: meta.model ?? deps.env?.aiModel ?? null, prompt_version: meta.prompt_version ?? null, ai_mode: meta.ai_mode ?? null,
    latency_ms: Date.now() - started, error });
  const headers = new Headers(res.headers);
  headers.set("x-request-id", requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
