import { priceCheckDeps } from "../../server/deps";
import { handlePhotoCheck } from "../../server/handlers/price-checks";
import { traced } from "../../server/trace";

// Vercel Function: POST /api/v1/price-checks (API-15 사진 진단)
export function POST(req: Request): Promise<Response> {
  return traced("price_check", req, priceCheckDeps(req), handlePhotoCheck);
}
