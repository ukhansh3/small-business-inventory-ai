import { defaultDeps } from "../../server/deps";
import { handleMarket } from "../../server/handlers/price-checks";

// Vercel Function: GET /api/v1/market (API-17 동네 시세)
export function GET(req: Request): Promise<Response> {
  return handleMarket(req, defaultDeps());
}
