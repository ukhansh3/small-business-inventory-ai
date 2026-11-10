import { defaultDeps } from "../../../server/deps";
import { handleSharePriceCheck } from "../../../server/handlers/price-checks";

// Vercel Function: PATCH /api/v1/price-checks/{checkId} (API-16 시세에 보태기)
export function PATCH(req: Request): Promise<Response> {
  return handleSharePriceCheck(req, defaultDeps());
}
