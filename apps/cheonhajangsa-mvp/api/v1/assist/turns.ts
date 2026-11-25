import { assistDeps } from "../../../server/deps";
import { handleAssistTurn } from "../../../server/handlers/assist";
import { traced } from "../../../server/trace";

// Vercel Function: POST /api/v1/assist/turns (API-01)
export function POST(req: Request): Promise<Response> {
  return traced("assist", req, assistDeps(req), handleAssistTurn);
}
