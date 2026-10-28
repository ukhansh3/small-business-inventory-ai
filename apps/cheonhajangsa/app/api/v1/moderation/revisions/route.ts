import { endpoint, json, rpc, parseDatabase } from "@/lib/server/vendor-api";
import { revisionSchema, searchQuerySchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(request, async ({ db }) => {
    const offset = searchQuerySchema.shape.offset.parse(
      new URL(request.url).searchParams.get("offset") ?? 0,
    );
    return json(
      parseDatabase(
        revisionSchema.array(),
        await rpc(db, "list_vendor_reviews", { p_offset: offset }),
      ),
    );
  });
}
