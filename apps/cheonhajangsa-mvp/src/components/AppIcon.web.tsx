export type IconName = "store" | "map" | "bot" | "users" | "bookmark" | "user" | "bell" | "search" | "chevron" | "locate" | "arrow" | "camera" | "edit";
const paths: Record<IconName, string[]> = {
  store: ["M3 10v10h18V10", "M2 10l2-7h16l2 7", "M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0", "M9 20v-6h6v6"],
  map: ["M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z", "M9 3v15M15 6v15"],
  bot: ["M5 7h14a2 2 0 0 1 2 2v10H3V9a2 2 0 0 1 2-2Z", "M12 3v4M1 11v5M23 11v5M8 11v3M16 11v3M8 17h8"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87", "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  bookmark: ["M6 3h12v18l-6-4-6 4V3Z"],
  user: ["M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2", "M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"],
  search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"],
  chevron: ["m6 9 6 6 6-6"],
  locate: ["M12 2v4M12 18v4M2 12h4M18 12h4", "M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z", "M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"],
  arrow: ["M12 19V5m-6 6 6-6 6 6"],
  camera: ["M3 6h4l2-3h6l2 3h4v15H3V6Z", "M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  edit: ["m16 3 5 5-12 12-6 1 1-6L16 3Z", "m13 6 5 5"],
};
export function AppIcon({name,size=22,color="currentColor"}:{name:IconName;size?:number;color?:string}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name].map((d,i)=><path key={i} d={d}/>)}</svg>;
}
