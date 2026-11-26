import { Platform } from "react-native";

// 웹 글꼴: Noto Sans KR(ui-ux-pro-max 'Korean Modern' 조합, Google Fonts, OFL).
// 웹 출력이 한 페이지 방식(app.json web.output "single")이라 +html.tsx를 쓰지 않고, 시작할 때 한 번 head에 넣는다.
const HREF = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap";

export function installWebFont(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById("chj-font")) return;
  const link = document.createElement("link");
  link.id = "chj-font";
  link.rel = "stylesheet";
  link.href = HREF;
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `body, input, textarea, button, div, span { font-family: "Noto Sans KR", -apple-system, "Apple SD Gothic Neo", sans-serif !important; }`;
  document.head.appendChild(style);
}
