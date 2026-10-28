import {
  endpoint,
  rpc,
  routeId,
  parseDatabase,
  serviceDb,
  ApiError,
  noStore,
} from "@/lib/server/vendor-api";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const id = await routeId(context);
    const path = parseDatabase(
      z.string().min(1),
      await rpc(db, "resolve_vendor_image", { p_image_id: id }),
    );
    const { data, error } = await serviceDb()
      .storage.from("vendor-images")
      .download(path);
    if (error || !data)
      throw new ApiError(404, "NOT_FOUND", "사진을 찾을 수 없습니다.");
    // Recheck visibility after downloading; never return a long-lived signed URL.
    if ((await rpc(db, "resolve_vendor_image", { p_image_id: id })) !== path)
      throw new ApiError(404, "NOT_FOUND", "사진을 찾을 수 없습니다.");
    const mime = path.endsWith(".png")
      ? "image/png"
      : path.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return new Response(await data.arrayBuffer(), {
      headers: {
        ...noStore,
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  });
}
