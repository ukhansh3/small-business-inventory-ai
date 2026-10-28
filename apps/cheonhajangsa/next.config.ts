import type {NextConfig} from 'next';
const android=process.env.CHEON_ANDROID_EXPORT==='1';
const config:NextConfig={distDir:android?'.next-android':process.env.NODE_ENV==='development'?'.next-dev':'.next',devIndicators:false,...(android?{output:'export' as const,images:{unoptimized:true}}:{})};
export default config;
