import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../components/ui";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { backgroundColor: "#FFF" },
      }}
    >
      {(
        [
          { name: "index", title: "지도", icon: "location-outline" },
          {
            name: "assistant",
            title: "AI 도우미",
            icon: "chatbubble-ellipses-outline",
          },
          { name: "community", title: "커뮤니티", icon: "people-outline" },
          { name: "profile", title: "내 업체", icon: "storefront-outline" },
        ] as const
      ).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={tab.icon}
                color={typeof color === "string" ? color : colors.muted}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
