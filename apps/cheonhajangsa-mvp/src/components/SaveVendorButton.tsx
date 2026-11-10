import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getSavedLocation } from "../lib/location";
import { useMember } from "../lib/members";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";

type Activity = { saved_count: number; used_count: number; saved: boolean; used: boolean };

export function SaveVendorButton({ id, location }: { id: string; location?: string }) {
  const member = useMember();
  const api = useRef(member.api);
  useEffect(() => { api.current = member.api; }, [member.api]);
  const [activity, setActivity] = useState<Activity>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const saveLocation = location ?? getSavedLocation();
  const suffix = saveLocation ? "?location_id=" + encodeURIComponent(saveLocation) : "";
  const savedPath = "/me/saved-vendors/" + encodeURIComponent(id) + suffix;
  const signedIn = !!member.profile;

  useEffect(() => {
    let active = true;
    if (location && signedIn) {
      void api.current<Activity>(savedPath).then(
        (result) => { if (active) setActivity(result); },
        () => { if (active) setNotice("업체 기록을 불러오지 못했어요."); },
      );
    }
    return () => { active = false; };
  }, [location, savedPath, signedIn, reload]);

  async function change(useVendor = false) {
    if (!signedIn) {
      setNotice("내 정보 탭에서 로그인해 주세요.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const path = useVendor ? savedPath.replace("/saved-vendors/", "/used-vendors/") : savedPath;
      await member.api(path, !useVendor && activity?.saved ? "DELETE" : "PUT");
      if (location) setActivity(await member.api<Activity>(savedPath));
      else setNotice("저장 목록에 추가했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "기록을 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.actions}>
        {!!location && (
          <Pressable accessibilityRole="button" disabled={busy || activity?.used || (signedIn && !activity)}
            onPress={() => void change(true)} style={styles.button}>
            <Text style={styles.label}>{signedIn && activity?.used ? "사용 기록 완료" : "사용해봤어요"}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" disabled={busy || (!!location && signedIn && !activity)}
          onPress={() => void change()} style={styles.button}>
          <AppIcon name="bookmark" size={16} color={color.green} />
          <Text style={styles.label}>{signedIn && activity?.saved ? "저장 취소" : "이 업체 저장"}</Text>
        </Pressable>
      </View>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {!!location && signedIn && !activity && !!notice && (
        <Pressable onPress={() => { setNotice(""); setReload((value) => value + 1); }}>
          <Text style={styles.label}>다시 시도</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 38, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: color.greenSoft },
  label: { color: color.green, fontSize: 12, fontWeight: "600" },
  notice: { fontSize: 12, color: color.sub, lineHeight: 17 },
});
