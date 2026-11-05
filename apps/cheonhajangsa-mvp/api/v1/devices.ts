import { defaultDeps } from "../../server/deps";
import { handleRegisterDevice } from "../../server/handlers/devices";

// Vercel Function: POST /api/v1/devices (API-06)
export function POST(req: Request): Promise<Response> {
  return handleRegisterDevice(req, defaultDeps());
}
