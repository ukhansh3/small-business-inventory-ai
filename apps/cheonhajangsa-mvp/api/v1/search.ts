import { defaultDeps } from "../../server/deps";
import { handleSearch } from "../../server/handlers/search";

// Vercel Function: POST /api/v1/search (API-02)
export function POST(req: Request): Promise<Response> {
  return handleSearch(req, defaultDeps());
}
