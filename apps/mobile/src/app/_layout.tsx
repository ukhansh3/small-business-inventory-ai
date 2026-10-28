import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../auth/provider";
export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: "#F04B24",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: "#FFF" },
          }}
        >
          <Stack.Screen name="login" options={{ title: "로그인" }} />
          <Stack.Screen name="moderation" options={{ title: "업체 검토" }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="vendor/[id]" options={{ title: "업체 상세" }} />
          <Stack.Screen
            name="register"
            options={{ title: "내 업체 등록", presentation: "modal" }}
          />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
