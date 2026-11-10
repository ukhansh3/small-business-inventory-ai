// 서버 환경 변수. 이름과 뜻은 docs/tech-stack.md 4절, .env.example과 같다.

export type ServerEnv = {
  aiMode: "live" | "stored";
  aiModel: string;
  aiTimeoutMs: number;
  aiDailyLimit: number;
  aiVisionTimeoutMs: number;
  allowDebugHeaders: boolean;
  anthropicApiKey: string | null;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
};

export function readEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const blank = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    aiMode: source.AI_MODE === "live" ? "live" : "stored",
    aiModel: blank(source.AI_MODEL) ?? "claude-haiku-5-5",
    aiTimeoutMs: Number(source.AI_TIMEOUT_MS) > 0 ? Number(source.AI_TIMEOUT_MS) : 8000,
    aiDailyLimit: Number(source.AI_DAILY_LIMIT) > 0 ? Number(source.AI_DAILY_LIMIT) : 500,
    aiVisionTimeoutMs: Number(source.AI_VISION_TIMEOUT_MS) > 0 ? Number(source.AI_VISION_TIMEOUT_MS) : 20000,
    allowDebugHeaders: source.ALLOW_DEBUG_HEADERS === "true",
    anthropicApiKey: blank(source.ANTHROPIC_API_KEY),
    supabaseUrl: blank(source.SUPABASE_URL),
    supabaseServiceRoleKey: blank(source.SUPABASE_SERVICE_ROLE_KEY),
  };
}
