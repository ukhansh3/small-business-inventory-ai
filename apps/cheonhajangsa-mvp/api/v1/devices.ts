import { defaultDeps } from "../../server/deps";
import { handleRegisterDevice, handleUpdateDevice } from "../../server/handlers/devices";

// Vercel Function: POST /api/v1/devices (API-06), PATCH /api/v1/devices/me (API-07)
// Hobby 요금제 함수 12개 제한 때문에 두 주소를 이 함수 하나로 받는다.
// /api/v1/devices/me 는 vercel.json rewrite로 여기로 온다. 두 핸들러는 주소를 보지 않고 메서드로만 나뉜다.
export function POST(req: Request): Promise<Response> {
  return handleRegisterDevice(req, defaultDeps());
}

export function PATCH(req: Request): Promise<Response> {
  return handleUpdateDevice(req, defaultDeps());
}
