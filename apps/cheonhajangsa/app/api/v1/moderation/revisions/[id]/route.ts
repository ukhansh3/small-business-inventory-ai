import {
  endpoint,
  json,
  rpc,
  readJson,
  routeId,
  parseDatabase,
} from "@/lib/server/vendor-api";
import { revisionSchema, reviewSchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const input = reviewSchema.parse(await readJson(request));
    return json(
      parseDatabase(
        revisionSchema,
        await rpc(db, "review_vendor_revision", {
          p_revision_id: await routeId(context),
          p_expected_version: input.expected_version,
          p_decision: input.decision,
          p_owner_message: input.owner_message,
          p_internal_note: input.internal_note,
        }),
      ),
    );
  });
}
