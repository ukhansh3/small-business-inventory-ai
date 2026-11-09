import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import type { VendorCard } from "../../core/search-types";
import type { Store } from "../lib/api-types";
import { storefrontPhotos } from "./vendor-storefront-photos";

const photos: Readonly<Record<string, ImageSourcePropType>> = {
  v_002: require("../../assets/vendors/market.webp"),
  v_003: require("../../assets/vendors/mart.webp"),
};

const wordmarks: Readonly<Record<string, string>> = {
  v_001: "새벽채소",
  v_004: "푸른채소",
  v_005: "삼거리",
  v_006: "인계도매",
  v_007: "산들채소",
  v_008: "시장쌈채소",
  v_009: "알뜰식자재",
};

const palettes = {
  produce: [["#235438", "#e7efcf"], ["#7b373b", "#f8e5e0"], ["#3f5922", "#f4edc9"]],
  grocery: [["#204c68", "#e2eef2"], ["#a13f23", "#fbe9cf"], ["#4f3975", "#eee7f7"]],
  market: [["#793927", "#f6e3cf"], ["#355653", "#dfefdf"], ["#744c1e", "#faedcc"]],
} as const;

export function VendorArtwork({ card, store, large = false }: {
  card?: Pick<VendorCard, "vendor_id" | "name" | "is_example" | "kind"> | null;
  store?: Pick<Store, "store_id" | "name" | "category">;
  large?: boolean;
}) {
  const name = store?.name ?? card?.name;
  if (!name) return null;

  const id = store?.store_id ?? card?.vendor_id ?? name;
  const category = store?.category ?? card?.kind ?? "";
  const examplePhoto = card?.is_example ? photos[card.vendor_id] : undefined;
  const sign = (card?.is_example ? wordmarks[card.vendor_id] : undefined) ?? name;
  const type = /시장|공판장/.test(category + name) ? "market"
    : /마트|도매|슈퍼/.test(category + name) ? "grocery" : "produce";
  let seed = 0;
  for (const character of id) seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  const [baseInk, paper] = palettes[type][seed % palettes[type].length] ?? palettes[type][0];
  const hue = (type === "grocery" ? 195 : type === "market" ? 8 : 82) + seed % 47;
  const ink = seed % 2 === 0 ? baseInk : "hsl(" + hue + ", 46%, 29%)";
  const photo = examplePhoto ?? storefrontPhotos[id];
  const variant = Math.floor(seed / 17) % 3;
  const darkSign = variant === 0;
  const accent = darkSign ? paper : ink;
  const logoName = sign.trim();
  const markColor = darkSign ? ink : paper;

  return (
    <View style={[styles.frame, large && styles.large, { backgroundColor: darkSign && !photo ? ink : paper }]}>
      {photo ? (
        <Image source={photo} resizeMode="cover" style={styles.photo} accessibilityLabel="AI로 만든 업종 예시 사진" />
      ) : (
        <View style={styles.logo} accessible accessibilityLabel={name + " 예시 로고"}>
          <View pointerEvents="none" style={[
            styles.logoBorder,
            { borderColor: accent },
            variant === 1 && styles.roundBorder,
          ]} />
          {variant === 2 && <View style={[styles.colorBand, { backgroundColor: ink }]} />}
          <View style={[styles.badge, type === "produce" && styles.roundBadge, { backgroundColor: accent }]}>
            {type === "produce" ? (
              <View style={styles.leaves}>
                <View style={[styles.leaf, { backgroundColor: markColor }]} />
                <View style={[styles.leaf, styles.secondLeaf, { backgroundColor: markColor }]} />
              </View>
            ) : (
              <View style={[styles.shopMark, { borderColor: markColor }]}>
                <View style={[styles.shopRoof, { backgroundColor: markColor }, type === "market" && styles.marketRoof]} />
                <View style={[styles.shopDoor, { backgroundColor: markColor }]} />
              </View>
            )}
          </View>
          <Text numberOfLines={2} style={[styles.wordmark, large && styles.largeWordmark, { color: accent }]}>
            {logoName}
          </Text>
        </View>
      )}
      {(photo || large) && <Text style={styles.label}>{photo ? "예시 사진" : "예시 간판"}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 72, height: 78, borderRadius: 15, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  large: { width: "100%", height: 150, marginBottom: 8 },
  photo: { width: "100%", height: "100%" },
  logo: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, gap: 5 },
  logoBorder: { position: "absolute", top: 4, bottom: 4, left: 4, right: 4, borderWidth: 1, borderRadius: 10, opacity: 0.4 },
  roundBorder: { borderRadius: 24, borderWidth: 2 },
  colorBand: { position: "absolute", left: 0, right: 0, top: 0, height: 13 },
  badge: { width: 25, height: 23, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  roundBadge: { borderRadius: 13 },
  leaves: { flexDirection: "row", alignItems: "center" },
  leaf: { width: 8, height: 10, borderTopLeftRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: "-25deg" }] },
  secondLeaf: { marginLeft: -2, marginTop: 3, transform: [{ rotate: "18deg" }] },
  shopMark: { width: 13, height: 10, borderWidth: 1, alignItems: "center", justifyContent: "flex-end" },
  shopRoof: { position: "absolute", top: -2, width: 15, height: 3, borderRadius: 1 },
  marketRoof: { width: 17, height: 4, transform: [{ rotate: "-8deg" }] },
  shopDoor: { width: 3, height: 4 },
  wordmark: { maxWidth: "100%", fontSize: 11, lineHeight: 13, fontWeight: "900", textAlign: "center", letterSpacing: -0.4 },
  largeWordmark: { fontSize: 24, lineHeight: 29 },
  label: { position: "absolute", bottom: 4, right: 4, color: "#fff", backgroundColor: "#252722", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2, fontSize: 8 },
});
