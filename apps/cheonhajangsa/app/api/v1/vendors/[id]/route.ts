import {
  endpoint,
  json,
  rpc,
  routeId,
  parseDatabase,
  ApiError,
} from "@/lib/server/vendor-api";
import { publishedVendorSchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const data = await rpc(db, "get_published_vendor", {
      p_vendor_id: await routeId(context),
    });
    if (!data)
      throw new ApiError(404, "NOT_FOUND", "공개된 업체를 찾을 수 없습니다.");
    return json(parseDatabase(publishedVendorSchema, data));
  });
}
