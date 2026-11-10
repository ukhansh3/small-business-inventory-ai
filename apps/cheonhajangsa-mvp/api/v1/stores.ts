import { storesDeps } from "../../server/deps";
import { handleStores } from "../../server/handlers/stores";

// Vercel Function: GET /api/v1/stores (API-18 지도용 가게)
export function GET(req: Request): Promise<Response> {
  return handleStores(req, storesDeps());
}
