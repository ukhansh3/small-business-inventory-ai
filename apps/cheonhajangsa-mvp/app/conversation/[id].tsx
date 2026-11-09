import { Stack, useLocalSearchParams } from "expo-router";
import { VendorConversations } from "../../src/components/VendorConversations";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "업체 대화" }} />
      <VendorConversations key={id} threadId={id} />
    </>
  );
}
