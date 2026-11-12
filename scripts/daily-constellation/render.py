#!/usr/bin/env python3
"""운보다 12별자리 일간 운세: 결정적 한국어 원고 + 자체 제작 5장 캐러셀.

First-party vector/Pillow drawing. No scraper, photo licenses, AI artwork,
personal birth charts, live SNS POST or external model invocation.
"""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import random
from functools import lru_cache
import tempfile
from PIL import Image, ImageDraw, ImageFont

KST=dt.timezone(dt.timedelta(hours=9))
SIZE=(1080,1350)
PURPLE="#3B236F"
DEEP="#281651"
CYAN="#805CB9"
WHITE="#FFFFFF"
SOFT="#77628F"
GOLD="#D5A35A"
CHARACTER_ASSET_SHA256="cba26017a66c100c5cf7d257f2e5ff5b9134109b4f49f289fa6d539e34f0014a"
CHARACTER_ART_VERSION="unboda-lavender-12-original-characters-v1"
STARS=[
 ("양자리","3월 21일 ~ 4월 19일","♈","불",("메모장","붉은 펜","작은 노트")),
 ("황소자리","4월 20일 ~ 5월 20일","♉","흙",("따뜻한 차","작은 화분","머그컵")),
 ("쌍둥이자리","5월 21일 ~ 6월 21일","♊","바람",("휴대폰","이어폰","메시지 메모")),
 ("게자리","6월 22일 ~ 7월 22일","♋","물",("수첩","포근한 담요","집 열쇠")),
 ("사자자리","7월 23일 ~ 8월 22일","♌","불",("향수","손거울","노란 소품")),
 ("처녀자리","8월 23일 ~ 9월 23일","♍","흙",("정리함","체크리스트","볼펜")),
 ("천칭자리","9월 24일 ~ 10월 22일","♎","바람",("거울","달력","균형 잡힌 일정표")),
 ("전갈자리","10월 23일 ~ 11월 22일","♏","물",("검은 펜","노트","물 한 잔")),
 ("사수자리","11월 23일 ~ 12월 24일","♐","불",("운동화","지도","가벼운 가방")),
 ("염소자리","12월 25일 ~ 1월 19일","♑","흙",("시계","계획표","책상 달력")),
 ("물병자리","1월 20일 ~ 2월 18일","♒","바람",("이어폰","아이디어 노트","파란 소품")),
 ("물고기자리","2월 19일 ~ 3월 20일","♓","물",("푸른 머그컵","음악 목록","작은 쿠션")),
]
# Short, useful, safe daily reflection themes; the sign-specific schedule rotates
# deterministically across 19 distinct themes, so no sign repeats yesterday.
THEMES=[
 ("먼저 할 일을 한 가지 정해보세요.","작은 시작이 하루의 흐름을 편하게 만듭니다."),
 ("연락을 미뤘던 사람이 떠오를 수 있어요.","부담 없는 안부 한마디로 대화를 시작해 보세요."),
 ("지출 내역을 한 번 살펴보는 날이에요.","작은 소비부터 확인하면 마음이 한결 가벼워집니다."),
 ("서둘러 결정할 필요는 없어요.","정보를 하나 더 확인한 뒤 선택해 보세요."),
 ("익숙한 일도 순서를 바꾸면 새롭게 보여요.","오늘은 작은 시도로 기분을 환기해 보세요."),
 ("주변의 조언이 유용하게 들릴 수 있어요.","핵심만 메모해 두고 나에게 맞게 골라보세요."),
 ("기운이 분산될 때는 잠깐 쉬어도 좋아요.","숨을 고른 뒤 필요한 일부터 다시 해보세요."),
 ("말보다 듣는 시간이 필요한 날이에요.","상대의 생각을 먼저 확인하면 오해를 줄일 수 있어요."),
 ("미뤄둔 정리가 생각보다 쉽게 풀릴 수 있어요.","작은 서랍이나 바탕화면부터 정돈해 보세요."),
 ("오늘은 일정에 여백을 조금 남겨보세요.","무리한 약속보다 내 리듬을 지키는 편이 좋아요."),
 ("새 아이디어가 떠오르기 쉬운 흐름이에요.","바로 실행하기보다 간단히 기록해 두세요."),
 ("마음이 급해지면 속도를 줄여보세요.","중요한 일은 한 번 더 확인하면 든든해져요."),
 ("가까운 사람의 이야기에 귀 기울여보세요.","짧은 대화가 관계를 부드럽게 만듭니다."),
 ("일과 휴식의 균형을 챙겨보세요.","집중할 시간을 정하고 남는 시간은 편히 쉬세요."),
 ("꼭 필요한 소비와 원하는 소비를 구분해 보세요.","장바구니를 잠시 살펴보는 것만으로도 좋아요."),
 ("작은 변화가 새로운 기분을 줄 수 있어요.","익숙한 길 대신 다른 길을 걸어보세요."),
 ("오늘의 성취를 너무 작게 보지 마세요.","끝낸 일 하나를 기록하면 자신감에 도움이 돼요."),
 ("주변과 속도를 맞추는 것이 좋겠어요.","혼자 부담을 떠안기보다 역할을 나눠보세요."),
 ("한꺼번에 많은 일을 하려 하지 마세요.","우선순위를 세우면 하루가 더 단순해집니다."),
]
assert len(STARS)==12 and len(THEMES)==19
def fonts():
    regular=next((p for p in (
       "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
       "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc") if pathlib.Path(p).exists()),None)
    bold=next((p for p in (
       "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
       "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc") if pathlib.Path(p).exists()),None)
    symbol=next((p for p in (
       "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
       "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf") if pathlib.Path(p).exists()),None)
    if not regular or not bold or not symbol:raise RuntimeError("KOREAN_OR_SYMBOL_FONT_MISSING")
    return regular,bold,symbol
def make_data(day):
    if not isinstance(day,dt.date):raise ValueError("VALID_KST_DATE_REQUIRED")
    entries=[]
    for i,(name,range_text,glyph,element,lucky_choices) in enumerate(STARS):
        topic=(day.toordinal()*5+i*7)%len(THEMES)
        first,second=THEMES[topic]
        lucky=lucky_choices[(day.toordinal()+i)%len(lucky_choices)]
        entries.append({"id":i+1,"name":name,"dateRange":range_text,
                        "glyph":glyph,"element":element,"text":first+" "+second,
                        "luckyItem":lucky,"themeIndex":topic})
    assert len({e["text"] for e in entries})==12
    return {"schemaVersion":1,"dateKst":day.isoformat(),"timezone":"Asia/Seoul",
            "logicVersion":"twelve-sign-daily-theme-rotation-v1",
            "signCount":12,"imageCount":5,"publicationHourKst":"13:00",
            "astrologyType":"western-sun-sign-general-reflection",
            "notPersonalSaju":True,"generalEntertainmentOnly":True,
            "themeRotation":19,"signs":entries}
def bfont(size,bold=False,symbol=False):
    reg,strong,sym=fonts()
    return ImageFont.truetype(sym if symbol else strong if bold else reg,size)
def make_background(day,page):
    """Original Unboda light lavender palette with subtle stars and cloudy corners."""
    w,h=SIZE
    im=Image.new("RGB",SIZE)
    d=ImageDraw.Draw(im)
    start=(247,242,255);end=(227,211,249)
    for y in range(h):
        t=y/(h-1)
        d.line((0,y,w,y),fill=tuple(round(start[i]*(1-t)+end[i]*t) for i in range(3)))
    d.ellipse((-160,1015,530,1490),fill="#E5D4F8")
    d.ellipse((525,1130,1210,1510),fill="#DFCCF6")
    d.ellipse((-220,-210,310,250),fill="#F4EAFF")
    d.ellipse((790,-220,1310,250),fill="#F0E2FC")
    seed=int(hashlib.sha256(f"{day}:{page}:lavender".encode()).hexdigest()[:16],16)
    rng=random.Random(seed)
    for _ in range(35):
        x=rng.randint(24,1055);y=rng.randint(30,1320)
        if 75<x<1005 and 195<y<1160:continue
        rr=rng.choice([2,2,3,4])
        d.ellipse((x-rr,y-rr,x+rr,y+rr),fill="#D2B5ED" if rng.random()<.7 else GOLD)
    for x,y,rad in [(62,186,9),(989,168,10),(1007,1211,9),(102,1266,11),(868,74,9)]:
        d.line((x-rad,y,x+rad,y),fill=GOLD,width=2)
        d.line((x,y-rad,x,y+rad),fill=GOLD,width=2)
    return im

@lru_cache(maxsize=1)
def _character_atlas():
    p=pathlib.Path(__file__).resolve().parent/"assets"/"zodiac-character-atlas.webp"
    if not p.is_file():raise RuntimeError("TWELVE_ZODIAC_CHARACTER_ASSET_MISSING")
    raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=CHARACTER_ASSET_SHA256:
        raise RuntimeError("TWELVE_ZODIAC_CHARACTER_HASH_MISMATCH")
    sheet=Image.open(p).convert("RGB")
    if sheet.size!=(560,420):raise RuntimeError("ZODIAC_CHARACTER_ATLAS_DIMENSIONS_INVALID")
    # Duplicate character tiles or a wrong order must not silently pass visual QA.
    hashes=[hashlib.sha256(sheet.crop(((i%4)*140,(i//4)*140,
                   (i%4+1)*140,(i//4+1)*140)).tobytes()).hexdigest()
            for i in range(12)]
    if len(set(hashes))!=12:raise RuntimeError("TWELVE_DISTINCT_CHARACTER_ARTWORK_REQUIRED")
    return sheet

def draw_character(im,sign_index,x,y,size=168):
    if not (0<=sign_index<12):raise ValueError("INVALID_SIGN_ARTWORK_INDEX")
    sheet=_character_atlas()
    box=((sign_index%4)*140,(sign_index//4)*140,
         (sign_index%4+1)*140,(sign_index//4+1)*140)
    character=sheet.crop(box).resize((size,size),Image.Resampling.LANCZOS)
    im.paste(character,(x,y))
    ImageDraw.Draw(im).ellipse((x+3,y+3,x+size-4,y+size-4),
        outline="#B998DC",width=3)

def center_text(draw, xy, text, font, fill):
    box=draw.textbbox((0,0),text,font=font)
    x,y=xy
    draw.text((x-(box[2]-box[0])/2,y),text,font=font,fill=fill)

def wrapped(draw,text,font,width,max_lines):
    words=text.split(" ")
    out=[];cur=""
    for word in words:
        candidate=(cur+" "+word).strip()
        if draw.textbbox((0,0),candidate,font=font)[2]<=width:
            cur=candidate;continue
        if cur:out.append(cur);cur=word
        else:raise RuntimeError("ONE_WORD_OVERFLOWS_SLIDE:"+word)
    if cur:out.append(cur)
    if len(out)>max_lines:raise RuntimeError("HOROSCOPE_TEXT_OVERFLOW:"+str(len(out)))
    return out

def draw_logo(draw,x,y,size=43,light=False):
    draw.text((x,y),"운보다",font=bfont(size,True),fill=WHITE if light else PURPLE)
    draw.text((x+size*3.0,y-13),"✦",font=bfont(27,False,True),fill=GOLD)

def cover(data):
    day=dt.date.fromisoformat(data["dateKst"])
    im=make_background(day,0);d=ImageDraw.Draw(im)
    draw_logo(d,73,62,59)
    d.text((814,86),"unboda.kr",font=bfont(29,True),fill=PURPLE)
    d.line((71,157,1009,157),fill="#CAB4E5",width=3)
    d.rounded_rectangle((66,230,1014,1161),radius=53,fill="#D6BFEF")
    d.rounded_rectangle((64,220,1014,1151),radius=53,fill="#FFFCFF",
                         outline="#D4BFED",width=3)
    d.rounded_rectangle((132,301,548,380),radius=40,fill="#EBDDFA")
    d.text((168,314),f"{day.month}월 {day.day}일 · 오후 1시",
           font=bfont(36,True),fill=PURPLE)
    d.text((130,442),"오늘의 12별자리",font=bfont(82,True),fill=PURPLE)
    d.text((134,572),"일상에 필요한 작은 힌트",font=bfont(43,True),fill="#53317E")
    d.text((134,649),"나에게 맞는 이야기를 찾아보세요",
           font=bfont(30),fill="#715C8B")
    for index in range(4):
        x=126+index*213
        draw_character(im,index,x,765,169)
        center_text(d,(x+84,949),data["signs"][index]["name"],
                    bfont(29,True),PURPLE)
    d.rounded_rectangle((250,1024,830,1104),radius=39,fill="#E7D9F7")
    center_text(d,(540,1033),"5장 넘기며 확인하기  ›",bfont(36,True),PURPLE)
    center_text(d,(540,1221),"운보다 무료 사주 · unboda.kr",bfont(29,True),PURPLE)
    return im

def inner(data,page):
    if page not in range(1,5):raise ValueError("FOUR_SIGN_PAGES_REQUIRED")
    day=dt.date.fromisoformat(data["dateKst"])
    im=make_background(day,page);d=ImageDraw.Draw(im)
    draw_logo(d,63,53,52)
    d.text((790,73),"unboda.kr",font=bfont(29,True),fill=PURPLE)
    d.line((64,147,1017,147),fill="#C6AEDF",width=3)
    d.text((64,161),f"{day.month}월 {day.day}일 · 오늘의 별자리",
           font=bfont(34,True),fill="#7851AD")
    d.rounded_rectangle((911,159,1023,211),radius=25,fill="#DCC7F2")
    center_text(d,(969,164),f"{page}/4",bfont(29,True),PURPLE)
    signs=data["signs"][(page-1)*3:page*3]
    assert len(signs)==3
    for i,s in enumerate(signs):
        y=233+i*312
        d.rounded_rectangle((62,y+8,1017,y+292),radius=39,fill="#D7BFED")
        d.rounded_rectangle((62,y,1017,y+284),radius=39,fill="#FFFFFF",
                             outline="#D4BCEB",width=3)
        draw_character(im,s["id"]-1,100,y+31,168)
        d.text((103,y+209),"행운 소품",font=bfont(24,True),fill="#8B64B3")
        lucky=s["luckyItem"]
        lucky_font=bfont(27 if len(lucky)<=5 else 22,True)
        center_text(d,(188,y+244),lucky,lucky_font,PURPLE)
        d.line((282,y+38,282,y+248),fill="#E5D5F5",width=3)
        d.text((313,y+31),s["name"],font=bfont(54,True),fill=PURPLE)
        d.text((317,y+100),s["dateRange"],font=bfont(30),fill="#81699E")
        lines=wrapped(d,s["text"],bfont(34),660,3)
        for j,line in enumerate(lines):
            d.text((316,y+154+j*41),line,font=bfont(34),fill="#3C2A58")
        d.text((961,y+27),"✦",font=bfont(28,False,True),fill=GOLD)
    center_text(d,(540,1205),f"{page} / 4 · 별자리별 생활 조언",
                bfont(33,True),PURPLE)
    center_text(d,(540,1260),"자기성찰을 위한 참고 콘텐츠 · unboda.kr",
                bfont(26),fill="#786392")
    return im

def render(day,out):
    output=pathlib.Path(out)
    output.mkdir(parents=True,exist_ok=True)
    data=make_data(day)
    data["artworkVersion"]=CHARACTER_ART_VERSION
    data["characterAssetSha256"]=CHARACTER_ASSET_SHA256
    ims=[cover(data)]+[inner(data,i) for i in range(1,5)]
    meta=[]
    for i,im in enumerate(ims,1):
        name=f"unboda-{day.isoformat()}-{i:02}.png"
        path=output/name
        im.save(path,format="PNG",optimize=True)
        raw=path.read_bytes()
        if not raw.startswith(b"\x89PNG") or len(raw)<20000 or len(raw)>6_500_000 or im.size!=SIZE:
            raise RuntimeError("INVALID_1080x1350_SOCIAL_CAROUSEL:"+name)
        meta.append({"name":name,"sha256":hashlib.sha256(raw).hexdigest(),
                     "bytes":len(raw),"dimensions":list(SIZE)})
    data["images"]=meta
    (output/"constellation-manifest.json").write_text(
        json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    caption=(f"{day.month}월 {day.day}일 오후 1시, 운보다 오늘의 12별자리 운세 ✨\n\n"
       "양자리부터 물고기자리까지 5장 카드를 넘겨 오늘의 생활 조언과 행운 소품을 확인해 보세요.\n"
       "별자리 운세는 일반적인 재미와 자기성찰을 위한 콘텐츠이며 개인 사주 분석이나 미래 예언이 아닙니다.\n\n"
       "나를 더 깊이 알고 싶다면 운보다 무료 사주 조회: https://unboda.kr\n"
       "#운보다 #별자리운세 #오늘의운세 #12별자리 #무료사주")
    if len(caption)>450:raise RuntimeError("THREADS_450_CHARACTER_LIMIT")
    (output/"caption.txt").write_text(caption+"\n",encoding="utf-8")
    return data
def self_test():
    day=dt.date(2026,11,11)
    a,b,c=(make_data(day+dt.timedelta(days=i)) for i in range(3))
    assert all(len(x["signs"])==12 for x in (a,b,c))
    assert all(len({x["text"] for x in v["signs"]})==12 for v in (a,b,c))
    assert all(a["signs"][i]["text"]!=b["signs"][i]["text"] and
               b["signs"][i]["text"]!=c["signs"][i]["text"] for i in range(12))
    assert all(x["luckyItem"] and x["name"].endswith("자리") for x in a["signs"])
    assert [x["name"] for x in a["signs"]]==[x[0] for x in STARS]
    with tempfile.TemporaryDirectory() as t:
        x=render(day,t)
        assert len(x["images"])==5
        for item in x["images"]:
            path=pathlib.Path(t,item["name"])
            assert Image.open(path).size==SIZE
            assert hashlib.sha256(path.read_bytes()).hexdigest()==item["sha256"]
        assert len(pathlib.Path(t,"caption.txt").read_text())<451
        # Enforce twelve distinct self-hosted illustrated characters and new lavender canvas.
        sheet=_character_atlas()
        assert sheet.size==(560,420)
        assert x["artworkVersion"]==CHARACTER_ART_VERSION
        for page in range(2,6):
            with Image.open(pathlib.Path(t,f"unboda-{day.isoformat()}-{page:02}.png")) as pic:
                assert pic.getpixel((978,253)) == (255,255,255), "LAVENDER_MOBILE_CARD_MISSING"
                assert all(channel>=180 for channel in pic.getpixel((10,450))), "DARK_BRAND_BACKGROUND_REGRESSED"
                avatar=pic.crop((110,270,250,410))
                assert len(avatar.getcolors(20000) or [])>500,"CHARACTER_ARTWORK_NOT_RENDERED"
        import inspect
        visual_source=inspect.getsource(cover)+inspect.getsource(inner)
        assert "UNBODA.CO.KR" not in visual_source and "□" not in visual_source
        assert "1278" not in visual_source, "DUPLICATED_CAROUSEL_PAGINATION"
        assert "✦" in visual_source and "draw_character(im" in visual_source

    print("PASS_12_DISTINCT_DAILY_SIGNS_5_ORIGINAL_BRANDED_PNGS_NO_SNS_POST")
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--date")
    p.add_argument("--out")
    p.add_argument("--self-test",action="store_true")
    args=p.parse_args()
    if args.self_test:return self_test()
    if not args.out:raise RuntimeError("OUT_REQUIRED")
    date=dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(KST).date()
    d=render(date,args.out)
    print("READY_5_IMAGE_ASTROLOGY_SOURCE_NO_SNS_POST",d["dateKst"],len(d["signs"]),len(d["images"]))
if __name__=="__main__":main()
