import {
  endpoint,
  json,
  rpc,
  readJson,
  routeId,
  parseDatabase,
  ApiError,
} from "@/lib/server/vendor-api";
import { revisionSchema, versionSchema } from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { serviceDb } from "@/lib/server/vendor-api";
import { geocodeVendorAddress, GeocodeError } from "@/lib/server/kakao-geocode";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async ({ db, userId }) => {
    const id = await routeId(context);
    const input = versionSchema.parse(await readJson(request));
    const revision = parseDatabase(
      revisionSchema,
      await rpc(db, "get_vendor_workspace", { p_revision_id: id }),
    );
    if (revision.version !== input.expected_version)
      throw new ApiError(
        409,
        "STALE_DRAFT",
        "최신 업체 정보를 다시 불러오세요.",
      );
    if (revision.status === "pending_review") return json(revision);
    if (!["draft", "changes_requested"].includes(revision.status))
      throw new ApiError(
        409,
        "REVISION_LOCKED",
        "검토 중이거나 승인된 제출본입니다.",
      );
    let result;
    try {
      result = await geocodeVendorAddress(revision.address);
    } catch (error) {
      if (error instanceof GeocodeError)
        throw new ApiError(
          error.code === "INVALID_ADDRESS" ? 422 : 503,
          error.code,
          error.message,
        );
      throw error;
    }
    if (result.status !== "ok")
      throw new ApiError(
        422,
        "ADDRESS_REVIEW_REQUIRED",
        result.status === "no_results"
          ? "주소를 찾지 못했습니다. 도로명·번지까지 확인해 주세요."
          : "주소 결과가 여러 개입니다. 더 정확한 주소를 입력해 주세요.",
      );
    const point = result.candidates[0];
    await rpc(serviceDb(), "apply_vendor_geocode", {
      p_revision_id: id,
      p_actor_id: userId,
      p_expected_version: revision.version,
      p_address: revision.address,
      p_latitude: point.latitude,
      p_longitude: point.longitude,
    });
    return json(
      parseDatabase(
        revisionSchema,
        await rpc(db, "submit_vendor_revision", {
          p_revision_id: id,
          p_expected_version: revision.version,
        }),
      ),
    );
  });
}
