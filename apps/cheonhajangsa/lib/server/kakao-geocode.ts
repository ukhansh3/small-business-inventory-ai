import {env} from 'node:process';
import {z} from 'zod';

const latitude=z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number).pipe(z.number().finite().min(-90).max(90));
const longitude=z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number).pipe(z.number().finite().min(-180).max(180));
const addressSchema=z.object({address_name:z.string()});
const responseSchema=z.object({meta:z.object({total_count:z.number().int().min(0)}),documents:z.array(z.object({address_name:z.string(),x:longitude,y:latitude,address:addressSchema.nullable().optional(),road_address:addressSchema.nullable().optional()}))});
const inputSchema=z.string().trim().min(1).max(200);
export type GeocodeErrorCode='INVALID_ADDRESS'|'MISSING_KAKAO_KEY'|'KAKAO_AUTH_FAILED'|'KAKAO_RATE_LIMIT'|'KAKAO_UNAVAILABLE'|'INVALID_KAKAO_RESPONSE';
export class GeocodeError extends Error {readonly code:GeocodeErrorCode;constructor(code:GeocodeErrorCode,message:string){super(message);this.name='GeocodeError';this.code=code;}}
export type GeocodeCandidate={address:string;road_address:string|null;latitude:number;longitude:number;source:'kakao_local';approval_status:'unreviewed'};
export type GeocodeResult={status:'ok'|'needs_review'|'no_results';candidates:GeocodeCandidate[];total_count:number;checked_at:string;source:'kakao_local'};

/** Server/CLI only. This module imports node:process and is never imported by client UI. */
export async function geocodeVendorAddress(address:string,options:{apiKey?:string;fetcher?:typeof fetch}={}):Promise<GeocodeResult>{
 if(typeof window!=='undefined')throw new GeocodeError('KAKAO_UNAVAILABLE','주소 변환은 서버에서만 실행할 수 있습니다.');
 const parsed=inputSchema.safeParse(address);
 if(!parsed.success)throw new GeocodeError('INVALID_ADDRESS','주소는 공백을 제외하고 1~200자로 입력해 주세요.');
 const key=(options.apiKey??env.KAKAO_REST_API_KEY??'').trim();
 if(!key)throw new GeocodeError('MISSING_KAKAO_KEY','서버의 KAKAO_REST_API_KEY 설정이 필요합니다.');
 const url=new URL('https://dapi.kakao.com/v2/local/search/address.json');
 url.searchParams.set('query',parsed.data);url.searchParams.set('analyze_type','exact');url.searchParams.set('size','30');
 let response:Response;
 try {response=await (options.fetcher??fetch)(url,{method:'GET',headers:{Authorization:`KakaoAK ${key}`,Accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store',redirect:'error'});}
 catch {throw new GeocodeError('KAKAO_UNAVAILABLE','카카오 주소 변환에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
 if(response.status===401||response.status===403)throw new GeocodeError('KAKAO_AUTH_FAILED','카카오 REST 키와 카카오맵 API 사용 설정을 확인해 주세요.');
 if(response.status===429)throw new GeocodeError('KAKAO_RATE_LIMIT','카카오 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
 if(!response.ok)throw new GeocodeError('KAKAO_UNAVAILABLE','카카오 주소 변환 서비스가 정상 응답하지 않았습니다.');
 let body:unknown;
 try {body=await response.json();}catch{throw new GeocodeError('INVALID_KAKAO_RESPONSE','카카오 응답 형식이 올바르지 않습니다.');}
 const result=responseSchema.safeParse(body);
 if(!result.success)throw new GeocodeError('INVALID_KAKAO_RESPONSE','카카오 응답의 주소·좌표 형식을 확인할 수 없습니다.');
 const {documents,meta}=result.data;
 if((meta.total_count===0)!==(documents.length===0))throw new GeocodeError('INVALID_KAKAO_RESPONSE','카카오 응답의 결과 수가 일치하지 않습니다.');
 const candidates=documents.map(d=>({address:d.address?.address_name??d.address_name,road_address:d.road_address?.address_name??null,latitude:d.y,longitude:d.x,source:'kakao_local' as const,approval_status:'unreviewed' as const}));
 return {status:candidates.length===0?'no_results':meta.total_count===1&&candidates.length===1?'ok':'needs_review',candidates,total_count:meta.total_count,checked_at:new Date().toISOString(),source:'kakao_local'};
}
