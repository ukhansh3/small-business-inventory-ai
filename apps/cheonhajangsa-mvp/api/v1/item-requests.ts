import { defaultDeps } from "../../server/deps";
import { handleItemRequest } from "../../server/handlers/item-requests";

// Vercel Function: POST /api/v1/item-requests (API-05)
export function POST(req: Request): Promise<Response> {
  return handleItemRequest(req, defaultDeps());
}
