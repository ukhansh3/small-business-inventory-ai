import { defaultDeps } from "../../../server/deps";
import { handleUpdateDevice } from "../../../server/handlers/devices";

// Vercel Function: PATCH /api/v1/devices/me (API-07)
export function PATCH(req: Request): Promise<Response> {
  return handleUpdateDevice(req, defaultDeps());
}
