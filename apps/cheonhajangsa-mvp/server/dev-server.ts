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
import { handleMembers } from "./handlers/members";

// 로컬 개발 서버: npm run dev:api. 배포(Vercel)와 같은 핸들러를 부른다.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.DEV_API_PORT) || 8787;
const DEV_ORIGINS = new Set(["http://localhost:8081", "http://localhost:8082", "http://localhost:8084", "http://127.0.0.1:8081", "http://127.0.0.1:8082", "http://127.0.0.1:8084"]);

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
  "access-control-allow-origin": "http://localhost:8081",
  "access-control-allow-headers": "content-type, authorization, x-device-id, x-debug-now, x-ai-mode, x-test-device",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
};

createServer(async (m, res) => {
  const origin=typeof m.headers.origin==='string'?m.headers.origin:'';
  const responseCors={...cors,'access-control-allow-origin':DEV_ORIGINS.has(origin)?origin:'http://localhost:8081',vary:'Origin'};
  if (m.method === "OPTIONS") {
    res.writeHead(204, responseCors).end();
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
  const memberRoute=/^\/api\/v1\/(auth\/|community\/|me\/(profile|saved-vendors))/.test(path);
  const response = memberRoute ? await handleMembers(await toRequest(m)) : route ? await route(await toRequest(m)) : errorResponse("NOT_FOUND", "없는 주소예요.");
  res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...responseCors });
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`API 개발 서버: http://localhost:${PORT}`));
