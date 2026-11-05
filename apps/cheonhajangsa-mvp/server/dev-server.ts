import { existsSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { assistDeps, defaultDeps, priceCheckDeps, storesDeps } from "./deps";
import { handleAssistTurn } from "./handlers/assist";
import { handleLocations, handleRegisterDevice, handleUpdateDevice } from "./handlers/devices";
import { handleEvent } from "./handlers/events";
import { handleItemRequest } from "./handlers/item-requests";
import { handleStores } from "./handlers/stores";
import { handleVendorDetail } from "./handlers/vendors";
import { handleMarket, handlePhotoCheck, handleSharePriceCheck } from "./handlers/price-checks";
import { handleSearch } from "./handlers/search";
import { errorResponse } from "./http";

// 로컬 개발 서버: npm run dev:api. 배포(Vercel)와 같은 핸들러를 부른다.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.DEV_API_PORT) || 8787;
const DEV_ORIGIN = "http://localhost:8081"; // expo start --web 기본 주소(로컬에서만 CORS 허용)

type Route = (req: Request) => Promise<Response>;
const routes: Record<string, Route> = {
  "POST /api/v1/search": (req) => handleSearch(req, defaultDeps()),
  "POST /api/v1/assist/turns": (req) => handleAssistTurn(req, assistDeps(req)),
  "POST /api/v1/devices": (req) => handleRegisterDevice(req, defaultDeps()),
  "POST /api/v1/events": (req) => handleEvent(req, defaultDeps()),
  "POST /api/v1/item-requests": (req) => handleItemRequest(req, defaultDeps()),
  "PATCH /api/v1/devices/me": (req) => handleUpdateDevice(req, defaultDeps()),
  "GET /api/v1/locations": (req) => handleLocations(req, defaultDeps()),
  "GET /api/v1/vendors/:id": (req) => handleVendorDetail(req, defaultDeps()),
  "POST /api/v1/price-checks": (req) => handlePhotoCheck(req, priceCheckDeps(req)),
  "PATCH /api/v1/price-checks/:id": (req) => handleSharePriceCheck(req, defaultDeps()),
  "GET /api/v1/market": (req) => handleMarket(req, defaultDeps()),
  "GET /api/v1/stores": (req) => handleStores(req, storesDeps()),
};

async function toRequest(m: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of m) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(m.headers)) if (typeof v === "string") headers.set(k, v);
  const body = m.method === "GET" || m.method === "HEAD" ? undefined : Buffer.concat(chunks);
  return new Request(`http://localhost:${PORT}${m.url}`, { method: m.method, headers, body });
}

const cors = {
  "access-control-allow-origin": DEV_ORIGIN,
  "access-control-allow-headers": "content-type, x-device-id, x-debug-now, x-ai-mode, x-test-device",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
};

createServer(async (m, res) => {
  if (m.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }
  const path = (m.url ?? "/").split("?")[0] ?? "/";
  // 동적 경로: /api/v1/vendors/:id, /api/v1/price-checks/:id
  const key = path.startsWith("/api/v1/vendors/")
    ? `${m.method} /api/v1/vendors/:id`
    : path.startsWith("/api/v1/price-checks/")
      ? `${m.method} /api/v1/price-checks/:id`
      : `${m.method} ${path}`;
  const route = routes[key];
  const response = route ? await route(await toRequest(m)) : errorResponse("NOT_FOUND", "없는 주소예요.");
  res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...cors });
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`API 개발 서버: http://localhost:${PORT}`));
