import { endpoint, json, rpc, parseDatabase } from "@/lib/server/vendor-api";
import {
  publishedSearchSchema,
  searchQuerySchema,
} from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(request, async ({ db }) => {
    const input = searchQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return json(
      parseDatabase(
        publishedSearchSchema,
        await rpc(db, "search_published_vendors", {
          p_latitude: input.latitude,
          p_longitude: input.longitude,
          p_radius: input.radius,
          p_query: input.query,
          p_category: input.category,
          p_offset: input.offset,
        }),
      ),
    );
  });
}
