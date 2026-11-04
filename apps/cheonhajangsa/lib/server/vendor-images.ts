import { ApiError } from "./vendor-api";
export function imageType(bytes: Uint8Array): {
  mime: string;
  extension: string;
} {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  )
    return { mime: "image/png", extension: "png" };
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return { mime: "image/jpeg", extension: "jpg" };
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", extension: "webp" };
  throw new ApiError(
    422,
    "INVALID_IMAGE",
    "JPEG·PNG·WebP 사진만 업로드할 수 있습니다.",
  );
}
