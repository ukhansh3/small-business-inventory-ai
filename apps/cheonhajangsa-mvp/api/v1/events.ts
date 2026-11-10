import { defaultDeps } from "../../server/deps";
import { handleEvent } from "../../server/handlers/events";

// Vercel Function: POST /api/v1/events (API-04)
export function POST(req: Request): Promise<Response> {
  return handleEvent(req, defaultDeps());
}
