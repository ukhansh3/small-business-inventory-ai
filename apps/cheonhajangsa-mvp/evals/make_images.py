"""이미지 evals용 합성 영수증·결제내역 만들기(v2 V2-7). 실제 가게·개인정보 없음(가상 상호, 가짜 카드번호 표시).
사용: python3 evals/make_images.py(Pillow 필요)  → evals/images/*.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
os.makedirs(OUT, exist_ok=True)

def font(size, bold=False):
    return ImageFont.truetype(FONT, size, index=6 if bold else 0)

def paper_receipt(name, shop, rows, total_note=None, date="2026-11-03"):
    img = Image.new("RGB", (560, 160 + 46 * len(rows) + 220), "white")
    d = ImageDraw.Draw(img)
    y = 30
    d.text((280, y), shop, font=font(30, True), fill="black", anchor="ma"); y += 50
    d.text((40, y), f"거래일시 {date} 14:22", font=font(20), fill="black"); y += 32
    d.text((40, y), "사업자번호 000-00-00000  대표 홍길동", font=font(18), fill="gray"); y += 36
    d.line((30, y, 530, y), fill="black", width=2); y += 14
    d.text((40, y), "상품명", font=font(20, True), fill="black"); d.text((360, y), "수량", font=font(20, True), fill="black"); d.text((520, y), "금액", font=font(20, True), fill="black", anchor="ra"); y += 36
    total = 0
    for item, qty, amt in rows:
        d.text((40, y), item, font=font(22), fill="black"); d.text((370, y), str(qty), font=font(22), fill="black"); d.text((520, y), f"{amt:,}", font=font(22), fill="black", anchor="ra"); y += 46
        total += amt
    d.line((30, y, 530, y), fill="black", width=2); y += 14
    d.text((40, y), "합계", font=font(24, True), fill="black"); d.text((520, y), f"{total:,}", font=font(24, True), fill="black", anchor="ra"); y += 44
    d.text((40, y), "카드 0000-****-****-0000 승인 00000000", font=font(18), fill="gray"); y += 30
    if total_note: d.text((40, y), total_note, font=font(18), fill="gray")
    img.save(os.path.join(OUT, name))

def platform_order(name, rows, delivery):
    img = Image.new("RGB", (480, 200 + 120 * len(rows) + 200), (245, 246, 248))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 480, 70), fill="white"); d.text((24, 22), "주문 상세", font=font(26, True), fill="black")
    y = 90
    d.text((24, y), "2026. 11. 2 주문  ·  배송완료", font=font(20), fill=(60, 60, 60)); y += 44
    for item, amt in rows:
        d.rectangle((16, y, 464, y + 104), fill="white")
        d.text((32, y + 14), item, font=font(21), fill="black")
        d.text((32, y + 56), f"{amt:,}원  1개", font=font(22, True), fill="black")
        y += 116
    d.text((24, y + 10), f"상품금액 {sum(a for _, a in rows):,}원", font=font(20), fill="black")
    d.text((24, y + 44), f"배송비 {delivery:,}원", font=font(20), fill="black")
    d.text((24, y + 78), f"총 결제금액 {sum(a for _, a in rows) + delivery:,}원", font=font(22, True), fill="black")
    d.text((24, y + 118), "주문번호 0000000000000", font=font(18), fill="gray")
    img.save(os.path.join(OUT, name))

def not_receipt(name):
    img = Image.new("RGB", (480, 360), (230, 240, 225))
    d = ImageDraw.Draw(img)
    for i in range(6):
        d.ellipse((40 + i * 60, 120 + (i % 2) * 40, 120 + i * 60, 200 + (i % 2) * 40), fill=(60 + i * 20, 150, 60))
    d.text((240, 40), "오늘의 점심 메뉴", font=font(28, True), fill="black", anchor="ma")
    d.text((240, 300), "제육쌈밥 9,000", font=font(24), fill="black", anchor="ma")
    img.save(os.path.join(OUT, name))

def mobile_receipt(name, shop, rows, date="2026.11.04"):
    img = Image.new("RGB", (390, 300 + 70 * len(rows)), "white")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 390, 90), fill=(32, 92, 220))
    d.text((20, 18), "모바일 영수증", font=font(18), fill="white"); d.text((20, 46), shop, font=font(24, True), fill="white")
    y = 110
    d.text((20, y), f"결제일 {date} 09:41", font=font(17), fill=(90, 90, 90)); y += 40
    for item, amt in rows:
        d.text((20, y), item, font=font(20), fill="black"); d.text((370, y), f"{amt:,}원", font=font(20), fill="black", anchor="ra"); y += 52
    d.line((20, y, 370, y), fill=(200, 200, 200), width=2); y += 16
    d.text((20, y), "결제금액", font=font(22, True), fill="black"); d.text((370, y), f"{sum(a for _, a in rows):,}원", font=font(22, True), fill=(32, 92, 220), anchor="ra"); y += 44
    d.text((20, y), "승인번호 00000000 · 일시불", font=font(16), fill="gray")
    img.save(os.path.join(OUT, name))

def invoice(name, rows):
    img = Image.new("RGB", (760, 260 + 48 * len(rows)), "white")
    d = ImageDraw.Draw(img)
    d.text((380, 24), "거 래 명 세 서", font=font(32, True), fill="black", anchor="ma")
    d.text((30, 80), "공급자: 마바사 농산(가상)   공급받는자: 귀하", font=font(18), fill="black")
    d.text((30, 110), "작성일 2026-11-01", font=font(18), fill="black")
    cols = [30, 300, 400, 470, 590, 730]
    y = 150
    for i, h in enumerate(["품명", "규격", "수량", "단가", "금액"]):
        d.text((cols[i] + 6, y + 8), h, font=font(18, True), fill="black")
    d.rectangle((30, y, 730, y + 40), outline="black")
    y += 40
    for item, spec, qty, unit, amt in rows:
        d.rectangle((30, y, 730, y + 48), outline="black")
        for i, v in enumerate([item, spec, str(qty), f"{unit:,}", f"{amt:,}"]):
            d.text((cols[i] + 6, y + 12), v, font=font(19), fill="black")
        y += 48
    d.text((730, y + 20), f"합계 {sum(r[4] for r in rows):,}원", font=font(22, True), fill="black", anchor="ra")
    img.save(os.path.join(OUT, name))

def product_page(name, title, price, note):
    img = Image.new("RGB", (420, 640), "white")
    d = ImageDraw.Draw(img)
    d.rectangle((20, 20, 400, 300), fill=(120, 170, 90))
    d.text((210, 150), "상품 사진", font=font(24), fill="white", anchor="ma")
    d.text((20, 320), title, font=font(22, True), fill="black")
    d.text((20, 370), f"{price:,}원", font=font(30, True), fill=(220, 40, 40))
    d.text((20, 420), note, font=font(18), fill=(60, 60, 60))
    d.rectangle((20, 560, 400, 610), fill=(30, 90, 220)); d.text((210, 572), "장바구니 담기", font=font(20, True), fill="white", anchor="ma")
    img.save(os.path.join(OUT, name))

def signboard(name):
    img = Image.new("RGB", (520, 340), (90, 80, 70))
    d = ImageDraw.Draw(img)
    d.rectangle((30, 40, 490, 150), fill=(250, 220, 60))
    d.text((260, 70), "싱싱 야채 할인", font=font(40, True), fill=(30, 30, 30), anchor="ma")
    d.rectangle((60, 190, 460, 320), fill=(140, 120, 100))
    d.text((260, 240), "영업중", font=font(30, True), fill="white", anchor="ma")
    img.save(os.path.join(OUT, name))

paper_receipt("r01_paper_lettuce.png", "가나다 채소(가상)", [("적상추 2kg", 1, 10000), ("대파 1단", 1, 2500), ("깻잎 100g", 2, 2000)])
paper_receipt("r02_paper_bag.png", "라마 야채상회(가상)", [("청상추 1봉", 2, 6000), ("양파 1망", 1, 5000)])
platform_order("r03_platform.png", [("국내산 적상추 4kg 박스 (업소용)", 14900), ("청양고추 1kg", 8900)], 3000)
not_receipt("r04_not_receipt.png")
mobile_receipt("r05_mobile.png", "아자 식자재마트(가상)", [("꽃상추 1kg", 4500), ("양파 3kg", 6900), ("두부", 1500)])
invoice("r06_invoice.png", [("적상추", "4kg/박스", 2, 15000, 30000), ("대파", "1kg", 3, 3000, 9000), ("깻잎", "100g", 10, 800, 8000)])
product_page("r07_product.png", "[로켓프레시] 국내산 청상추 2kg", 9900, "업소용 · 내일(목) 새벽 도착 보장")
paper_receipt("r08_paper_grams.png", "차카 청과(가상)", [("상추 500g", 2, 5000), ("고추 200g", 1, 2000)])
paper_receipt("r09_paper_mixed.png", "타파 마트(가상)", [("적상추 1kg", 1, 4200), ("청상추 3kg", 1, 11400), ("마늘 1kg", 1, 9000)])
mobile_receipt("r10_mobile_many.png", "하나 할인마트(가상)", [("라면 5입", 4300), ("계란 30구", 8900), ("상추 4kg", 13200), ("식용유 1.8L", 7500), ("고추장 1kg", 6200), ("휴지 30롤", 12900)])
signboard("r11_signboard.png")
print("ok", sorted(os.listdir(OUT)))
