import { defaultDeps } from "../../server/deps";
import { handleSearch } from "../../server/handlers/search";
import { traced } from "../../server/trace";

// Vercel Function: POST /api/v1/search (API-02)
export function POST(req: Request): Promise<Response> {
  return traced("search", req, defaultDeps(), handleSearch);
}
