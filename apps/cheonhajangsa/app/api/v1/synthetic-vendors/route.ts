import { endpoint, json, rpc, parseDatabase } from "@/lib/server/vendor-api";
import { syntheticVendorQuerySchema, syntheticVendorSearchSchema } from "@cheon/vendor-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return endpoint(request, async ({ db }) => {
    const input = syntheticVendorQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return json(parseDatabase(syntheticVendorSearchSchema, await rpc(db, "search_mvp_synthetic_vendors", {
      p_query: input.query,
      p_category: input.category,
    })));
  });
}
