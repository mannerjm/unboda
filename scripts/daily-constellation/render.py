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
import tempfile
from PIL import Image, ImageDraw, ImageFont

KST=dt.timezone(dt.timedelta(hours=9))
SIZE=(1080,1350)
PURPLE="#2B146A"
DEEP="#1B1049"
CYAN="#4DE7E7"
WHITE="#F8F6FF"
SOFT="#D2C4EC"
GOLD="#F6CA76"
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
    w,h=SIZE
    im=Image.new("RGB",SIZE)
    draw=ImageDraw.Draw(im)
    for y in range(h):
        t=y/(h-1)
        draw.line((0,y,w,y),fill=(int(46-16*t),int(21-9*t),int(113-28*t)),width=1)
    seed=int(hashlib.sha256(f"{day}:{page}:stars".encode()).hexdigest()[:16],16)
    rng=random.Random(seed)
    for _ in range(53):
        x=rng.randint(30,1050);y=rng.randint(24,1300)
        if 70<x<1010 and 210<y<1230:continue
        r=rng.choice([1,2,2,3,4])
        draw.ellipse((x-r,y-r,x+r,y+r),fill=GOLD if rng.random()<.25 else "#B39AE9")
    for k in range(5):
        x=65+k*15
        draw.arc((x,1160,320+k*20,1465),180,265,fill="#382276",width=5)
        draw.arc((750-k*7,1160,1110-k*9,1490),275,360,fill="#382276",width=5)
    return im
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
def draw_logo(draw,x,y,size=43,light=True):
    draw.text((x,y),"운보다",font=bfont(size,True),fill=WHITE if light else PURPLE)
    draw.text((x+size*3.0,y-13),"✦",font=bfont(27,False,True),fill=GOLD)
def cover(data):
    day=dt.date.fromisoformat(data["dateKst"])
    im=make_background(day,0);d=ImageDraw.Draw(im)
    d.rounded_rectangle((65,90,1015,1240),radius=67,fill="#FEFCFA",
        outline="#150A38",width=8)
    d.line((65,204,1015,204),fill=PURPLE,width=5)
    d.text((115,117),"UNBODA.CO.KR",font=bfont(33,True),fill=PURPLE)
    d.text((830,117),"—  □  ×",font=bfont(34),fill=PURPLE)
    draw_logo(d,118,242,67,False)
    center_text(d,(540,420),f"{day.month}월 {day.day}일",bfont(115,True),"#111115")
    center_text(d,(540,590),"별자리 운세",bfont(106,True),PURPLE)
    d.rounded_rectangle((200,755,880,846),radius=44,fill=CYAN)
    center_text(d,(540,769),"매일 오후 1시 업로드",bfont(43,True),"#0D1837")
    center_text(d,(540,925),"양자리부터 물고기자리까지",bfont(43,True),"#211449")
    center_text(d,(540,988),"오늘의 흐름을 만나보세요",bfont(35),"#463764")
    d.arc((175,1044,905,1510),181,356,fill="#BEB0EF",width=6)
    for j,s in enumerate(data["signs"][:8]):
        angle=j*3.14159/7
        import math
        xx=int(540+310*math.cos(angle+3.14159))
        yy=int(1272-190*math.sin(angle))
        if 170<xx<945 and 1030<yy<1230:
            center_text(d,(xx,yy),s["glyph"],bfont(38,symbol=True),PURPLE)
    center_text(d,(540,1278),"●  ○  ○  ○  ○",bfont(26,symbol=True),SOFT)
    return im
def inner(data,page):
    if page not in range(1,5):raise ValueError("FOUR_SIGN_PAGES_REQUIRED")
    day=dt.date.fromisoformat(data["dateKst"])
    im=make_background(day,page);d=ImageDraw.Draw(im)
    d.rounded_rectangle((47,75,1033,1262),radius=44,outline="#AA8CDE",width=3)
    d.rounded_rectangle((47,75,1033,183),radius=42,fill="#FFFDFB")
    d.rectangle((47,130,1033,185),fill="#FFFDFB")
    d.text((80,97),"UNBODA.CO.KR",font=bfont(29,True),fill=PURPLE)
    draw_logo(d,450,91,48,False)
    d.text((855,98),"—  □  ×",font=bfont(31),fill=PURPLE)
    signs=data["signs"][(page-1)*3:page*3]
    for i,s in enumerate(signs):
        y=210+i*336
        d.ellipse((80,y+41,291,y+252),fill="#5A449A",outline="#7E67BC",width=3)
        center_text(d,(185,y+79),s["glyph"],bfont(102,symbol=True),WHITE)
        center_text(d,(184,y+255),"오늘의 행운 소품",bfont(23),SOFT)
        center_text(d,(184,y+291),s["luckyItem"],bfont(27,True),WHITE)
        d.text((334,y+39),s["name"],font=bfont(52,True),fill=CYAN)
        d.text((340,y+110),s["dateRange"],font=bfont(31),fill="#A7F7F6")
        lines=wrapped(d,s["text"],bfont(34),657,4)
        if len(lines)>4:raise RuntimeError("TEXT_OVERLAP")
        for j,line in enumerate(lines):
            d.text((340,y+166+j*47),line,font=bfont(34),fill=WHITE)
        if i<2:d.line((80,y+332,1000,y+332),fill="#A992D7",width=2)
    # Pagination deliberately outside reading rows.
    d.rounded_rectangle((400,1236,680,1295),radius=30,fill="#251050")
    for i in range(5):
        x=461+i*39;r=8
        d.ellipse((x-r,1265-r,x+r,1265+r),
                  fill=WHITE if i==page else "#7766B2")
    return im
def render(day,out):
    output=pathlib.Path(out)
    output.mkdir(parents=True,exist_ok=True)
    data=make_data(day)
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
