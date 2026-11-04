import {
  endpoint,
  json,
  rpc,
  readJson,
  routeId,
  parseDatabase,
} from "@/lib/server/vendor-api";
import { revisionSchema, versionSchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const input = versionSchema.parse(await readJson(request));
    return json(
      parseDatabase(
        revisionSchema,
        await rpc(db, "cancel_vendor_submission", {
          p_revision_id: await routeId(context),
          p_expected_version: input.expected_version,
        }),
      ),
    );
  });
}
