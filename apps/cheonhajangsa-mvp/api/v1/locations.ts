import { defaultDeps } from "../../server/deps";
import { handleLocations } from "../../server/handlers/devices";

// Vercel Function: GET /api/v1/locations (API-14)
export function GET(req: Request): Promise<Response> {
  return handleLocations(req, defaultDeps());
}
