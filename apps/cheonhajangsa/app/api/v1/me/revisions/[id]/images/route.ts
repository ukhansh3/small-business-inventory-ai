import {
  endpoint,
  json,
  rpc,
  routeId,
  parseDatabase,
  ApiError,
  bodyBytes,
} from "@/lib/server/vendor-api";
import { revisionSchema } from "@/lib/contracts/vendors";
import { imageType } from "@/lib/server/vendor-images";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db }) => {
    const id = await routeId(context);
    const revision = parseDatabase(
      revisionSchema,
      await rpc(db, "get_vendor_workspace", { p_revision_id: id }),
    );
    if (!["draft", "changes_requested"].includes(revision.status))
      throw new ApiError(
        409,
        "REVISION_LOCKED",
        "작성 중인 제출본에만 사진을 올릴 수 있습니다.",
      );
    const bytes = await bodyBytes(request, 4 * 1024 * 1024);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      throw new ApiError(
        400,
        "INVALID_IMAGE",
        "multipart/form-data 형식의 사진이 필요합니다.",
      );
    }
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 3 * 1024 * 1024
    )
      throw new ApiError(422, "INVALID_IMAGE", "3MB 이하의 사진이 필요합니다.");
    const data = new Uint8Array(await file.arrayBuffer());
    const type = imageType(data);
    const path = `${id}/${crypto.randomUUID()}.${type.extension}`;
    const uploaded = await db.storage.from("vendor-images").upload(path, data, {
      contentType: type.mime,
      upsert: false,
      cacheControl: "0",
    });
    if (uploaded.error)
      throw new ApiError(
        503,
        "UPLOAD_FAILED",
        "사진을 저장하지 못했습니다. 제출 상태와 Storage 설정을 확인해 주세요.",
      );
    const imageId = parseDatabase(
      z.string().uuid(),
      await rpc(db, "attach_vendor_image", {
        p_revision_id: id,
        p_object_path: path,
        p_position: revision.images.length,
        p_cover: revision.images.length === 0,
      }),
    );
    return json(
      {
        image_id: imageId,
        revision: parseDatabase(
          revisionSchema,
          await rpc(db, "get_vendor_workspace", { p_revision_id: id }),
        ),
      },
      201,
    );
  });
}
