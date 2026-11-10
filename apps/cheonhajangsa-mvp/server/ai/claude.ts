import Anthropic from "@anthropic-ai/sdk";
import type { ServerEnv } from "../env";
import { loadSystemPrompt, TOOLS, userMessage } from "./prompt";
import { toDecision } from "./protocol";
import { type AiClient, type AiDecision, type AiInput, AiUnavailableError } from "./types";

// 실시간 AI(AI_MODE=live). 한 턴에 한 번 호출하고, 도구 호출 하나를 결정으로 돌려준다.
// 재시도 없이 AI_TIMEOUT_MS 안에 끝나지 않으면 실패로 본다(사장님 화면은 칩 편집으로 이어진다).
export function createClaudeAi(env: ServerEnv): AiClient {
  const client = env.anthropicApiKey
    ? new Anthropic({ apiKey: env.anthropicApiKey, timeout: env.aiTimeoutMs, maxRetries: 0 })
    : null;

  return {
    mode: "live",
    model: env.aiModel,
    async decide(input: AiInput): Promise<AiDecision> {
      if (!client) throw new AiUnavailableError("ANTHROPIC_API_KEY 없음");
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model: env.aiModel,
          max_tokens: 1024,
          output_config: { effort: "low" }, // 문장 하나 해석이라 낮은 effort로 충분하다
          system: loadSystemPrompt(),
          tools: TOOLS,
          tool_choice: { type: "auto", disable_parallel_tool_use: true },
          messages: [{ role: "user", content: userMessage(input) }],
        });
      } catch (e) {
        if (e instanceof Anthropic.APIError) {
          console.error("Claude API 오류", e.status, JSON.stringify(e.error)); // 관측: 원인 파악용(키는 포함되지 않음)
          throw new AiUnavailableError(`Claude API 오류 ${e.status ?? ""}`);
        }
        throw new AiUnavailableError("Claude 호출 실패");
      }
      if (response.stop_reason === "refusal") throw new AiUnavailableError("거절됨");
      const call = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!call) throw new AiUnavailableError("도구 호출 없음");
      return toDecision(call.name, call.input);
    },
  };
}
