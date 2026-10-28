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
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) =>
    json(
      parseDatabase(
        revisionSchema,
        await rpc(db, "get_vendor_workspace", {
          p_revision_id: await routeId(context),
        }),
      ),
    ),
  );
}
