import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'천하장사 · 우리 동네 거래 정보',description:'식자재와 소모품의 가격·거래 조건을 확인하는 로컬 화면 검증 앱'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
