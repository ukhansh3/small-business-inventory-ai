import {
  endpoint,
  json,
  rpc,
  routeId,
  parseDatabase,
} from "@/lib/server/vendor-api";
import { revisionSchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) =>
    json(
      parseDatabase(
        revisionSchema,
        await rpc(db, "start_vendor_revision", {
          p_vendor_id: await routeId(context),
        }),
      ),
    ),
  );
}
