import { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export const colors = {
  orange: "#F04B24",
  ink: "#18283A",
  muted: "#626B78",
  cream: "#FFF5EF",
  line: "#E7E9ED",
  white: "#FFFFFF",
};
export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Brand() {
  return (
    <View style={s.brand}>
      <Text style={s.logo}>천하장사</Text>
      <Text style={s.caption}>우리 동네 거래처를 만나다</Text>
    </View>
  );
}
export function Heading({ children }: PropsWithChildren) {
  return (
    <Text style={s.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}
export function Note({ children }: PropsWithChildren) {
  return <Text style={s.note}>{children}</Text>;
}
export function Card({ children }: PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.orange }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#737B87"
        style={s.input}
        {...props}
      />
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: {
    padding: 20,
    gap: 16,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingBottom: 28,
  },
  brand: { gap: 4, paddingBottom: 4 },
  logo: { fontSize: 27, fontWeight: "900", color: colors.ink },
  caption: { fontSize: 13, color: colors.muted },
  heading: { fontSize: 25, fontWeight: "800", color: colors.ink },
  note: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.muted,
    backgroundColor: colors.cream,
    padding: 13,
    borderRadius: 14,
  },
  card: {
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  title: { fontSize: 19, fontWeight: "700", color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  price: { fontSize: 21, fontWeight: "800", color: colors.orange },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 48,
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: colors.cream },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    minHeight: 48,
  },
  error: { color: "#A52C14", fontSize: 14, lineHeight: 21 },
});
