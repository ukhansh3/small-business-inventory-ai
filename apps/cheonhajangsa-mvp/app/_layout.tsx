import { Stack } from "expo-router";
import { MemberProvider } from '../src/lib/members';
import { PhonePreview } from '../src/components/PhonePreview';

// 공통 틀: 휴대폰 폭(최대 430px) 가운데 정렬
export default function RootLayout() {
  return (
    <PhonePreview>
        <MemberProvider><Stack screenOptions={{ headerShown: false }} /></MemberProvider>
    </PhonePreview>
  );
}
