import { Text } from "react-native";
export type IconName = "store" | "map" | "bot" | "users" | "bookmark" | "user" | "bell" | "search" | "chevron" | "locate" | "arrow" | "camera" | "edit";
export function AppIcon({name,size=22,color="#17191c"}:{name:IconName;size?:number;color?:string}) {
  const marks: Record<IconName,string>={store:"▤",map:"⌖",bot:"✦",users:"♧",bookmark:"♧",user:"○",bell:"♧",search:"⌕",chevron:"⌄",locate:"⊙",arrow:"↑",camera:"▣",edit:"✎"};
  return <Text style={{fontSize:size,color}}>{marks[name]}</Text>;
}
