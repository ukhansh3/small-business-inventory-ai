import {
  endpoint,
  json,
  rpc,
  readJson,
  routeId,
} from "@/lib/server/vendor-api";
import { visibilitySchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const input = visibilitySchema.parse(await readJson(request));
    await rpc(db, "set_vendor_visibility", {
      p_vendor_id: await routeId(context),
      p_hidden: input.hidden,
      p_reason: input.reason,
    });
    return json({ ok: true });
  });
}
