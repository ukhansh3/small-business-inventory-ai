import { Text, View } from "react-native";
export type IconName = "store" | "map" | "bot" | "users" | "bookmark" | "user" | "bell" | "search" | "chevron" | "locate" | "arrow" | "camera" | "edit" | "eye" | "eyeOff";
export function AppIcon({name,size=22,color="#17191c"}:{name:IconName;size?:number;color?:string}) {
  if (name === "eye" || name === "eyeOff") {
    return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size * 0.85, height: size * 0.5, borderWidth: 1.5, borderColor: color, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: size * 0.23, height: size * 0.23, borderRadius: size / 2, backgroundColor: color }} />
      </View>
      {name === "eyeOff" && <View style={{ position: "absolute", width: size, height: 1.5, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />}
    </View>;
  }
  const marks: Record<Exclude<IconName, "eye" | "eyeOff">,string>={store:"▤",map:"⌖",bot:"✦",users:"♧",bookmark:"♧",user:"○",bell:"♧",search:"⌕",chevron:"⌄",locate:"⊙",arrow:"↑",camera:"▣",edit:"✎"};
  return <Text style={{fontSize:size,color}}>{marks[name]}</Text>;
}
