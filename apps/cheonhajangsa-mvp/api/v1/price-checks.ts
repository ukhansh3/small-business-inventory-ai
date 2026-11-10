import { priceCheckDeps } from "../../server/deps";
import { handlePhotoCheck } from "../../server/handlers/price-checks";

// Vercel Function: POST /api/v1/price-checks (API-15 사진 진단)
export function POST(req: Request): Promise<Response> {
  return handlePhotoCheck(req, priceCheckDeps(req));
}
