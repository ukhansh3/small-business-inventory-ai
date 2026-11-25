// 행안부 인허가 자료 좌표(EPSG:5174, 보정 중부원점 베셀 TM) → WGS84 위경도.
// 외부 라이브러리 없이: TM 역변환(베셀) → 지심좌표 → 7변수 변환(towgs84) → WGS84 위경도.
// 매개변수는 EPSG:5174 정의(proj4)와 같다.

const BESSEL = { a: 6377397.155, f: 1 / 299.1528128 };
const WGS84 = { a: 6378137, f: 1 / 298.257223563 };
const LAT0 = 38;
const LON0 = 127.0028902777778; // 127°00'10.405"
const K0 = 1;
const X0 = 200000; // 동쪽 가산값
const Y0 = 500000; // 북쪽 가산값
const TOWGS84 = { dx: -115.8, dy: 474.99, dz: 674.11, rx: 1.16, ry: -2.31, rz: -1.63, ds: 6.43 };

const RAD = Math.PI / 180;
const SEC = RAD / 3600;

function meridianArc(phi: number, a: number, e2: number): number {
  const e4 = e2 * e2, e6 = e4 * e2;
  return a * ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi
    - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi)
    + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi)
    - ((35 * e6) / 3072) * Math.sin(6 * phi));
}

// 가로(동쪽) x, 세로(북쪽) y → 베셀 위경도(라디안)
function tmInverse(x: number, y: number): { phi: number; lam: number } {
  const { a, f } = BESSEL;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const m = meridianArc(LAT0 * RAD, a, e2) + (y - Y0) / K0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu)
    + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu)
    + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu)
    + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(phi1), c = Math.cos(phi1), t = Math.tan(phi1);
  const n1 = a / Math.sqrt(1 - e2 * s * s);
  const r1 = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5;
  const t1 = t * t, c1 = ep2 * c * c;
  const d = (x - X0) / (n1 * K0);
  const phi = phi1 - ((n1 * t) / r1) * (d * d / 2
    - ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d ** 4) / 24
    + ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d ** 6) / 720);
  const lam = LON0 * RAD + (d - ((1 + 2 * t1 + c1) * d ** 3) / 6
    + ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d ** 5) / 120) / c;
  return { phi, lam };
}

function toEcef(phi: number, lam: number, ell: { a: number; f: number }): [number, number, number] {
  const e2 = ell.f * (2 - ell.f);
  const n = ell.a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  return [n * Math.cos(phi) * Math.cos(lam), n * Math.cos(phi) * Math.sin(lam), n * (1 - e2) * Math.sin(phi)];
}

function fromEcef([x, y, z]: [number, number, number], ell: { a: number; f: number }): { phi: number; lam: number } {
  const e2 = ell.f * (2 - ell.f);
  const p = Math.hypot(x, y);
  let phi = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 8; i++) {
    const n = ell.a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    phi = Math.atan2(z + e2 * n * Math.sin(phi), p);
  }
  return { phi, lam: Math.atan2(y, x) };
}

export function epsg5174ToWgs84(x: number, y: number): { lat: number; lng: number } {
  const { phi, lam } = tmInverse(x, y);
  const [X, Y, Z] = toEcef(phi, lam, BESSEL);
  const { dx, dy, dz, rx, ry, rz, ds } = TOWGS84;
  const k = 1 + ds * 1e-6, Rx = rx * SEC, Ry = ry * SEC, Rz = rz * SEC;
  // 위치 벡터 방식(proj4 towgs84와 같음)
  const out: [number, number, number] = [
    dx + k * (X - Rz * Y + Ry * Z),
    dy + k * (Rz * X + Y - Rx * Z),
    dz + k * (-Ry * X + Rx * Y + Z),
  ];
  const w = fromEcef(out, WGS84);
  return { lat: w.phi / RAD, lng: w.lam / RAD };
}
