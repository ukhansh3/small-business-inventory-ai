import { useState } from "react";
import { Image, Text, View } from "react-native";
import { useAuth } from "../auth/provider";
import { apiBase } from "../lib/supabase";
import { s } from "./ui";
export function ProtectedPhoto({ id }: { id: string }) {
  const { session } = useAuth();
  const [failed, setFailed] = useState(false);
  if (!session) return null;
  return (
    <View>
      {failed ? (
        <Text style={s.muted}>
          사진을 불러오지 못했습니다. 공개 상태와 권한을 확인해 주세요.
        </Text>
      ) : (
        <Image
          key={session.user.id + id}
          accessibilityLabel="업체 등록 사진"
          source={{
            uri: `${apiBase}/api/v1/images/${id}`,
            headers: { Authorization: "Bearer " + session.access_token },
            cache: "reload",
          }}
          style={{ width: "100%", height: 220, borderRadius: 14 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
