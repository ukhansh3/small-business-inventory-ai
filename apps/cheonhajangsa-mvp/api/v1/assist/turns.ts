import { assistDeps } from "../../../server/deps";
import { handleAssistTurn } from "../../../server/handlers/assist";

// Vercel Function: POST /api/v1/assist/turns (API-01)
export function POST(req: Request): Promise<Response> {
  return handleAssistTurn(req, assistDeps(req));
}
