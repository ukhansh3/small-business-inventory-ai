// 사진 고르기와 줄이기(v2 1.4). 웹: 파일 선택(휴대폰이면 카메라도 고를 수 있음) → 긴 변 1600px JPEG로 줄인다.
// 서버 상한 3MB(API-15). 사진은 서버로 보내 진단에만 쓰고 저장하지 않는다(R-21).
export const MAX_SIDE = 1600;
export const MAX_BYTES = 3 * 1024 * 1024;

export type PickedPhoto = { media_type: "image/jpeg"; data: string; bytes: number };

export class PhotoError extends Error {}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const doc = globalThis.document;
    if (!doc) return resolve(null);
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoError("사진을 열 수 없어요. 다른 사진을 골라 주세요."));
    };
    img.src = url;
  });
}

// 긴 변을 maxSide에 맞춘 크기(작으면 그대로)
export function fitSize(w: number, h: number, maxSide = MAX_SIDE): { w: number; h: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

async function shrink(file: File): Promise<PickedPhoto> {
  const img = await loadImage(file);
  const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("사진을 처리할 수 없어요.");
  ctx.fillStyle = "#ffffff"; // 투명 PNG의 배경을 흰색으로
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  for (const q of [0.8, 0.6, 0.45]) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const bytes = Math.floor((data.length * 3) / 4);
    if (bytes <= MAX_BYTES) return { media_type: "image/jpeg", data, bytes };
  }
  throw new PhotoError("사진이 너무 커요. 다른 사진을 골라 주세요.");
}

// 고르지 않으면 null
export async function pickPhoto(): Promise<PickedPhoto | null> {
  if (!globalThis.document) throw new PhotoError("사진 진단은 지금 웹에서만 돼요.");
  const file = await pickFile();
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new PhotoError("사진 파일을 골라 주세요.");
  return shrink(file);
}
