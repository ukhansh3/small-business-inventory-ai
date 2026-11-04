import type { PublishedVendor } from "@cheon/vendor-contracts";
export type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  tax: string;
};
export type Vendor = {
  id: string;
  name: string;
  category: string;
  district: string;
  latitude: number;
  longitude: number;
  delivery: string;
  checkedAt: string;
  items: Item[];
  dataKind: "fixture" | "live";
};
export const demoCenter = { latitude: 37.2834, longitude: 127.0465 };
export const vendors: Vendor[] = [
  {
    id: "mobile-demo-a",
    name: "샘플 식자재 A",
    category: "식자재",
    district: "아주대 주변 · 가상 위치",
    latitude: 37.2854,
    longitude: 127.042,
    delivery: "배송 지역·비용 문의",
    checkedAt: "2026-10-28",
    dataKind: "fixture",
    items: [
      {
        id: "a-onion",
        name: "양파",
        quantity: 10,
        unit: "kg",
        price: 18000,
        tax: "부가세 포함",
      },
      {
        id: "a-potato",
        name: "감자",
        quantity: 10,
        unit: "kg",
        price: 22000,
        tax: "부가세 포함",
      },
    ],
  },
  {
    id: "mobile-demo-b",
    name: "샘플 포장재 B",
    category: "포장재",
    district: "아주대 주변 · 가상 위치",
    latitude: 37.279,
    longitude: 127.033,
    delivery: "방문 수령",
    checkedAt: "2026-10-28",
    dataKind: "fixture",
    items: [
      {
        id: "b-box",
        name: "포장 용기",
        quantity: 100,
        unit: "개",
        price: 24000,
        tax: "부가세 포함",
      },
    ],
  },
];
export function findVendors(query: string, category = "전체"): Vendor[] {
  const keyword = query.trim().toLocaleLowerCase();
  return vendors.filter(
    (v) =>
      (category === "전체" || v.category === category) &&
      (!keyword ||
        [v.name, ...v.items.map((i) => i.name)].some((n) =>
          n.toLocaleLowerCase().includes(keyword),
        )),
  );
}
export function won(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}
export type MapSelection = { type: "select"; vendorId: string };
export function parseMapSelection(
  raw: string,
  allowedIds: string[],
): MapSelection | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("type" in value) ||
      !("vendorId" in value) ||
      value.type !== "select" ||
      typeof value.vendorId !== "string" ||
      !allowedIds.includes(value.vendorId)
    )
      return null;
    return { type: "select", vendorId: value.vendorId };
  } catch {
    return null;
  }
}
export function validMapUrl(raw: string | undefined): string | null {
  try {
    const url = new URL(raw ?? "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname.replace(/\/$/, "") !== "/mobile-map" ||
      url.search ||
      url.hash
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Android may report just the security origin for a bridge message. Main-frame
// navigation is restricted separately; compare origins without trusting a prefix.
export function trustedMapMessageOrigin(
  messageUrl: string,
  mapUrl: string,
): boolean {
  try {
    return new URL(messageUrl).origin === new URL(mapUrl).origin;
  } catch {
    return false;
  }
}

export function fromPublishedVendor(v: PublishedVendor): Vendor {
  return {
    id: v.id,
    name: v.name,
    category: v.category,
    district: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
    delivery: v.delivery_terms,
    checkedAt: v.items.map((i) => i.checked_on).sort()[0] ?? "",
    dataKind: "live",
    items: v.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      tax: {
        included: "부가세 포함",
        excluded: "부가세 별도",
        exempt: "면세",
        "": "세금 확인 필요",
      }[i.tax],
    })),
  };
}
