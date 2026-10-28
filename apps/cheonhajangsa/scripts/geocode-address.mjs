import {geocodeVendorAddress,GeocodeError} from '../lib/server/kakao-geocode.ts';
const address=process.argv.slice(2).join(' ').trim();
if(!address){console.error('사용법: pnpm geocode:address "검토할 공개 업체 주소"');process.exitCode=1;}
else{try{const result=await geocodeVendorAddress(address);console.log(JSON.stringify(result,null,2));}catch(error){console.error(JSON.stringify({error:{code:error instanceof GeocodeError?error.code:'UNEXPECTED_ERROR',message:error instanceof GeocodeError?error.message:'주소 변환 실행에 실패했습니다.'}}));process.exitCode=1;}}
