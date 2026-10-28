import {describe,it,expect} from 'vitest';import {center,searchFixture,freshness,amountLabel,onePackageTotal,fixtures,distance,SearchInput} from '../features/search/model';
const request:SearchInput={item_id:'onion',center,radius_m:3000,fulfillment:'any',sort_option:'distance'};const today='2026-10-28';
describe('로컬 fixture 검색 · 미승인 계약 변경 제외',()=>{
it('품목과 반경에 맞는 업체만 결정적으로 반환한다',()=>{const r=searchFixture(request,today);expect(r.vendors.map(v=>v.vendor_id)).toEqual(['demo-v01','demo-v02','demo-v03']);expect(r.vendors.every(v=>v.offer.item_id==='onion')).toBe(true);});
it('좌표 미확인과 숨김 업체는 반경 검색에서 제외한다',()=>{const hidden={...fixtures[0],status:'hidden' as const};expect(searchFixture(request,today,[hidden,fixtures[5]]).vendors).toEqual([]);});
it('배송 지원은 delivery 또는 both이고 unknown은 포함하지 않는다',()=>{expect(searchFixture({...request,fulfillment:'delivery'},today).vendors.map(v=>v.vendor_id)).toEqual(['demo-v01','demo-v02']);});
it('100~20000m 경계를 검증하고 잘못된 입력은 거절한다',()=>{expect(()=>searchFixture({...request,radius_m:99},today)).toThrow();expect(()=>searchFixture({...request,radius_m:20001},today)).toThrow();expect(searchFixture({...request,radius_m:100},today).status).toBe('no_results');expect(searchFixture({...request,radius_m:20000},today).status).toBe('ok');});
it('반경 경계의 업체를 포함한다',()=>{const v={...fixtures[0],latitude:center.latitude,longitude:center.longitude};expect(searchFixture({...request,radius_m:100},today,[v]).vendors).toHaveLength(1);expect(distance(center,center)).toBe(0);});
it('30일과 31일, 미확인 날짜를 구분한다',()=>{expect(freshness('2026-09-28',today)).toBe('current');expect(freshness('2026-09-27',today)).toBe('reconfirm_required');expect(freshness(null,today)).toBe('reconfirm_required');});
it('null 가격을 무료로 표시하지 않으며 불완전한 합계를 만들지 않는다',()=>{expect(amountLabel(null)).toBe('가격 정보 없음');expect(amountLabel(0)).not.toBe('가격 정보 없음');expect(onePackageTotal(fixtures[0].offers[0])).toBe(21000);expect(onePackageTotal(fixtures[2].offers[0])).toBeNull();expect(onePackageTotal({...fixtures[0].offers[0],tax_status:'unknown'})).toBeNull();});
it('결과 없음은 오류와 다른 정상 응답이다',()=>{const r=searchFixture({...request,center:{latitude:35,longitude:129}},today);expect(r.status).toBe('no_results');expect(r.vendors).toEqual([]);});
});
