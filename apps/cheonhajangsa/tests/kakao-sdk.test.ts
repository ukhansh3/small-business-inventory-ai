import {describe,it,expect} from 'vitest';import {isCoordinatePair,loadKakaoMaps} from '../lib/kakao/sdk';
describe('카카오 지도 연결 경계',()=>{
 it('좌표 미확인 또는 비정상 좌표를 지도 마커에서 제외한다',()=>{expect(isCoordinatePair(null,null)).toBe(false);expect(isCoordinatePair(37,null)).toBe(false);expect(isCoordinatePair(91,127)).toBe(false);expect(isCoordinatePair(37,181)).toBe(false);expect(isCoordinatePair(NaN,127)).toBe(false);expect(isCoordinatePair(37.2834,127.0465)).toBe(true);});
 it('서버에서 지도 SDK를 실행하지 않는다',async()=>{await expect(loadKakaoMaps('')).rejects.toThrow('브라우저');});
});
