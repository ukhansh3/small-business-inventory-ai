import { defaultDeps } from "../../../server/deps";
import { handleVendorDetail } from "../../../server/handlers/vendors";

// Vercel Function: GET /api/v1/vendors/{vendorId} (API-03)
export function GET(req: Request): Promise<Response> {
  return handleVendorDetail(req, defaultDeps());
}
