#!/usr/bin/env python3
"""UNBODA original daily 12-animal general fortune carousel.

This is a culturally framed day-branch zodiac reflection, NOT an individual
eight-character saju chart or a prediction. All graphics are first-party.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys
from PIL import Image, ImageDraw, ImageFont
from korean_lunar_calendar import KoreanLunarCalendar

HERE = pathlib.Path(__file__).resolve().parent
KST = dt.timezone(dt.timedelta(hours=9))
BRANCHES = list("子丑寅卯辰巳午未申酉戌亥")
ANIMALS = [
 ("쥐", "🐭", "子", 1996, "관찰"),
 ("소", "🐮", "丑", 1997, "안정"),
 ("호랑이", "🐯", "寅", 1998, "도전"),
 ("토끼", "🐰", "卯", 1999, "소통"),
 ("용", "🐲", "辰", 2000, "계획"),
 ("뱀", "🐍", "巳", 2001, "판단"),
 ("말", "🐴", "午", 2002, "활동"),
 ("양", "🐑", "未", 2003, "배려"),
 ("원숭이", "🐵", "申", 2004, "아이디어"),
 ("닭", "🐔", "酉", 2005, "점검"),
 ("개", "🐶", "戌", 2006, "신뢰"),
 ("돼지", "🐷", "亥", 2007, "여유"),
]
STEMS = list("甲乙丙丁戊己庚辛壬癸")
ELEMENTS = ["나무", "나무", "불", "불", "흙", "흙", "쇠", "쇠", "물", "물"]
RELATIONS = {
 "합": ("서로의 뜻을 맞춰 볼 여지가 있는 날", "함께할 일은 의견을 먼저 확인해 보세요."),
 "삼합": ("주변 사람과 속도를 맞춰 보기 좋은 날", "도움을 청하거나 작은 역할을 나눠 보세요."),
 "충": ("서로 다른 생각이 눈에 띌 수 있는 날", "서두르기보다 확인 후 답하는 편이 좋아요."),
 "같은지지": ("익숙한 방식이 먼저 떠오르기 쉬운 날", "평소 습관 중 하나를 가볍게 점검해 보세요."),
 "보통": ("나의 일상 리듬을 살펴보기 좋은 날", "지금 중요한 일 하나부터 정리해 보세요."),
}
TOPICS = [
 ("계획", "오늘 할 일을 세 가지로 나눠 적어 보세요."),
 ("소통", "짧은 안부 한마디가 대화를 부드럽게 해줄 수 있어요."),
 ("돈관리", "작은 지출 하나부터 영수증이나 앱으로 확인해 보세요."),
 ("휴식", "잠깐 멈춰 숨을 고르고 무리한 약속을 줄여 보세요."),
 ("업무", "우선순위를 다시 적고 꼭 필요한 일에 집중해 보세요."),
 ("관계", "상대의 말을 끝까지 듣고 내 생각을 천천히 전해 보세요."),
 ("선택", "지금 결정할 일과 미뤄도 되는 일을 구분해 보세요."),
 ("생활", "오늘의 작은 습관 하나를 스스로 칭찬해 보세요."),
]
INK = "#172B35"
TEAL = "#0D5D5C"
LIGHT = "#F7F9F7"
MUTED = "#647981"
GOLD = "#D7A960"
CARD = "#FFFFFF"
CANVAS = (1080, 1350)
def find_font(bold=False):
    paths = (
        ["/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
         "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc"]
        if bold else
        ["/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
         "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"]
    )
    for path in paths:
        if pathlib.Path(path).exists():
            return path
    raise RuntimeError("KOREAN_FONT_MISSING")
def f(size, bold=False):
    return ImageFont.truetype(find_font(bold), size)
def emoji_font():
    for path in ["/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"]:
        if pathlib.Path(path).exists():
            return ImageFont.truetype(path, 109)
    raise RuntimeError("COLORED_ZODIAC_EMOJI_FONT_MISSING")
def calendar_day(date):
    cal = KoreanLunarCalendar()
    if not cal.setSolarDate(date.year, date.month, date.day):
        raise ValueError("DATE_OUTSIDE_VALIDATED_KOREAN_CALENDAR_RANGE")
    gap = cal.getGapJaString()
    matches = re.search(r"([가-힣]{2})일$", gap)
    if not matches: raise ValueError("KOREAN_DAY_GANJI_NOT_FOUND")
    han = gap.rsplit(" ", 1)[-1]
    day_index = (dt.date(2026,10,29) - date).days
    # Strong fixed anchor against widely published KST manse calendar: 2026-10-29 병자.
    if date == dt.date(2026,10,29) and matches.group(1)!="병자":
        raise ValueError("KNOWN_20261029_DAY_GANJI_MISMATCH")
    if date == dt.date(2026,10,30) and matches.group(1)!="정축":
        raise ValueError("KNOWN_20261030_DAY_GANJI_MISMATCH")
    stem_hangul, branch_hangul = matches.group(1)
    to_stem={"갑":"甲","을":"乙","병":"丙","정":"丁","무":"戊","기":"己","경":"庚","신":"辛","임":"壬","계":"癸"}
    to_branch={"자":"子","축":"丑","인":"寅","묘":"卯","진":"辰","사":"巳","오":"午","미":"未","신":"申","유":"酉","술":"戌","해":"亥"}
    return dict(gapja=matches.group(1), gan=to_stem[stem_hangul],
                ji=to_branch[branch_hangul], calendarText=gap, lunarDate=cal.LunarIsoFormat())
def relation(birth, day):
    a=BRANCHES.index(birth); b=BRANCHES.index(day)
    if a==b:return "같은지지"
    pairs=[("子","丑"),("寅","亥"),("卯","戌"),("辰","酉"),("巳","申"),("午","未")]
    if any(set([birth,day])==set(pair) for pair in pairs):return "합"
    if (a-b)%12==6:return "충"
    groups=["申子辰","亥卯未","寅午戌","巳酉丑"]
    if any(birth in grp and day in grp for grp in groups):return "삼합"
    return "보통"
# Sexagenary 1984 = 甲子. The cohort covers 1960 through 2019 exactly.
# Births near 입춘 require the actual birth timestamp to compute the year pillar.
STEM_KO=list("갑을병정무기경신임계")
BRANCH_KO=list("자축인묘진사오미신유술해")
GANJI_ELEMENTS=["목","목","화","화","토","토","금","금","수","수"]
STEM_FOCUS=["새 계획","작은 변화","첫걸음","표현","우선순위","지속","검토","정리","관찰","여유"]
YEAR_ADVICE=[
 "지출을 한 번 더 확인해요",
 "말하기 전 핵심을 적어봐요",
 "일정 하나부터 정리해요",
 "작은 약속을 지켜봐요",
 "오늘 쓸 시간을 나눠봐요",
 "중요한 일부터 살펴봐요",
 "먼저 상대의 말을 들어봐요",
 "필요한 지출만 골라봐요",
 "서두른 답장을 잠시 미뤄요",
 "하루의 좋은 점을 기록해요",
 "휴식 시간을 미리 확보해요",
 "미뤄 둔 할 일을 살펴봐요",
 "계획에 빈틈이 없는지 봐요",
 "고마운 마음을 전해봐요",
 "내 생활 리듬을 지켜봐요",
]
def birth_ganji(year):
    if not 1960 <= year <= 2019:
        raise ValueError("BIRTH_YEAR_OUTSIDE_SIXTY_YEAR_COHORT")
    pos=(year-1984)%60
    stem=pos%10
    branch=pos%12
    return {"year":year,"ganji":STEM_KO[stem]+BRANCH_KO[branch],
            "stem":STEMS[stem],"branch":BRANCHES[branch],
            "element":GANJI_ELEMENTS[stem],"sexagenaryIndex":pos}
def stem_relation(birth_stem,day_stem):
    b=STEMS.index(birth_stem)//2
    d=STEMS.index(day_stem)//2
    if b==d:return "같은오행"
    if (b+1)%5==d:return "생하는관계"
    if (d+1)%5==b:return "도움받는관계"
    if (b+2)%5==d:return "극하는관계"
    return "극받는관계"
def make_data(date):
    day=calendar_day(date)
    idx=STEMS.index(day["gan"])
    posts=[]
    seen_years=set()
    seen_ganji=set()
    for i,(animal,em,branch,baseyear,signature) in enumerate(ANIMALS):
        rel=relation(branch,day["ji"])
        title,action=RELATIONS[rel]
        entries=[]
        for year in range(1960+i,2020,12):
            birth=birth_ganji(year)
            if birth["branch"]!=branch:
                raise ValueError("ANIMAL_BIRTH_BRANCH_INCONSISTENT")
            stem_rel=stem_relation(birth["stem"],day["gan"])
            advice_index=(birth["sexagenaryIndex"]*7+date.toordinal()*11+idx*3+i*3)%len(YEAR_ADVICE)
            topic,extra=TOPICS[(birth["sexagenaryIndex"]+idx+date.toordinal())%len(TOPICS)]
            year_advice=STEM_FOCUS[STEMS.index(birth["stem"])]+" · "+YEAR_ADVICE[advice_index]
            entries.append({**birth,"dayBranchRelation":rel,
               "dayStemRelation":stem_rel,"theme":topic,
               "advice":year_advice})
            seen_years.add(year)
            seen_ganji.add(birth["ganji"])
        if len(entries)!=5:raise ValueError("EXACT_FIVE_BIRTH_YEARS_PER_ANIMAL")
        posts.append({"animal":animal,"emoji":em,"branch":branch,
              "birthYears":entries,"representativeYears":[v["year"] for v in entries],
              "relationship":rel,"line1":title,"line2":action,
              "signature":signature})
    all_advice=[v["advice"] for post in posts for v in post["birthYears"]]
    if len(set(all_advice))!=60:raise ValueError("SIXTY_DIFFERENT_FORTUNE_TEXTS_REQUIRED")
    if seen_years!=set(range(1960,2020)) or len(seen_ganji)!=60:
        raise ValueError("ALL_SIXTY_DISTINCT_SEXAGENARY_BIRTH_YEARS_REQUIRED")
    return {"dateKst":date.isoformat(),"weekdayKo":"월화수목금토일"[date.weekday()],
       "dayGanji":day["gapja"],"dayGan":day["gan"],"dayJi":day["ji"],
       "lunarDate":day["lunarDate"],"timeZone":"Asia/Seoul",
       "logicVersion":"birth-year-sexagenary-60-v2",
       "logic":"KoreanLunarCalendar KST day ganji + 60 distinct birth-year stem/branch ganji + earthly-branch and five-elements day stem relation; general life reflections only",
       "birthYearRange":[1960,2019],"birthYearCount":60,"imagesExpected":7,
       "yearPillarBoundaryNote":"출생연도 표기는 양력 연도 예시입니다. 입춘 전후 실제 사주 연주가 다를 수 있습니다.",
       "notPersonalSaju":True,"entertainmentAndReflectionOnly":True,
       "animals":posts}

def rounded(draw,xy,r,fill,outline=None,width=1):
    draw.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=width)
def label(draw,xy,text,size,color=INK,bold=False):
    draw.text(xy,text,font=f(size,bold),fill=color)
def gradient_background():
    im=Image.new("RGB",CANVAS)
    p=im.load()
    for y in range(CANVAS[1]):
        v=y/CANVAS[1]
        r=int(247-10*v);g=int(250-5*v);b=int(247-2*v)
        for x in range(CANVAS[0]):p[x,y]=(r,g,b)
    return im
def cover(data):
    im=gradient_background();d=ImageDraw.Draw(im)
    d.rounded_rectangle((48,52,1032,1298),radius=66,fill="#125A5A")
    d.ellipse((694,160,1110,576),outline="#458782",width=4)
    d.ellipse((782,229,1082,529),outline="#77A59A",width=3)
    d.ellipse((810,265,1062,517),outline=GOLD,width=3)
    label(d,(108,116),"UNBODA  |  운보다",40,"#F5F4E8",True)
    d.rectangle((111,186,969,190),fill="#547D76")
    label(d,(108,270),f"{data['dateKst'].replace('-','.')}  {data['weekdayKo']}요일",45,"#E4D0AB",True)
    label(d,(105,390),"오늘의",102,"#FFFFFF",True)
    label(d,(105,520),"12띠 운세",110,"#FFDD9C",True)
    label(d,(110,715),"60갑자 · 출생연도별",48,"#E9F1EA",True)
    d.rounded_rectangle((109,845,972,1033),radius=30,fill="#F8F5EC")
    label(d,(149,874),"같은 띠도, 태어난 해마다",42,TEAL,True)
    label(d,(149,946),"다른 하루의 참고 이야기",39,INK)
    label(d,(108,1098),f"일진 {data['dayGanji']}일  |  1960~2019년생",34,"#F0E6D6",True)
    label(d,(108,1221),"무료 사주 조회  unboda.kr",34,"#FFFFFF",True)
    return im
def fit_label(draw,xy,text,max_width,start_size=35,min_size=24,color=INK,bold=False):
    font_size=start_size
    while font_size>min_size and draw.textbbox((0,0),text,font=f(font_size,bold))[2]>max_width:
        font_size-=1
    if draw.textbbox((0,0),text,font=f(font_size,bold))[2]>max_width:
        raise ValueError("ZODIAC_TEXT_OVERFLOW:"+text)
    draw.text(xy,text,font=f(font_size,bold),fill=color)
def page(data,page_index):
    if page_index<0 or page_index>=6:
        raise ValueError("EXPECTED_SIX_YEAR_DETAIL_PAGES")
    im=gradient_background();d=ImageDraw.Draw(im)
    d.rounded_rectangle((42,44,1038,166),radius=30,fill=TEAL)
    label(d,(83,59),"UNBODA  |  60갑자 연도별 띠운세",42,"#FFFFFF",True)
    label(d,(83,118),f"{data['dateKst'].replace('-','.')} · {data['dayGanji']}일",27,"#D8E7DC")
    sub=data["animals"][page_index*2:(page_index+1)*2]
    if len(sub)!=2:raise ValueError("TWO_ANIMALS_PER_PAGE_REQUIRED")
    ef=emoji_font()
    for i,post in enumerate(sub):
        top=190+i*520
        rounded(d,(48,top,1032,top+502),32,CARD,outline="#DDEAE4",width=2)
        rounded(d,(77,top+16,188,top+127),26,"#E1F1E8")
        d.text((91,top+24),post["emoji"],font=ef,embedded_color=True)
        label(d,(214,top+29),post["animal"]+"띠",47,TEAL,True)
        d.line((86,top+143,992,top+143),fill="#E2EAE4",width=2)
        for j,entry in enumerate(post["birthYears"]):
            y=top+163+j*66
            rounded(d,(84,y,992,y+59),12,"#F4F8F5" if j%2==0 else "#FCFBF8")
            label(d,(99,y+5),str(entry["year"])+"년",31,INK,True)
            label(d,(273,y+7),entry["ganji"]+"년",26,TEAL,True)
            fit_label(d,(427,y+7),entry["advice"],535,31,25,INK)
    label(d,(68,1261),"출생연도는 양력 예시 · 입춘 전후 실제 연주는 다를 수 있어요.",24,MUTED)
    label(d,(858,1298),f"{page_index+2:02d} / 07",24,TEAL,True)
    return im

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--out",required=True)
    opts=parser.parse_args()
    date=dt.date.fromisoformat(opts.date) if opts.date else dt.datetime.now(KST).date()
    result=make_data(date)
    out=pathlib.Path(opts.out);out.mkdir(parents=True,exist_ok=True)
    ims=[cover(result)]+[page(result,i) for i in range(6)]
    images=[]
    for i,im in enumerate(ims):
        path=out/f"unboda-{date.isoformat()}-{i+1:02d}.png"
        im.save(path,format="PNG",optimize=True)
        b=path.read_bytes()
        if not (b.startswith(b"\x89PNG") and len(b)>15000):
            raise RuntimeError("INVALID_OR_EMPTY_ORIGINAL_ZODIAC_IMAGE")
        images.append({"name":path.name,"sha256":hashlib.sha256(b).hexdigest(),
                       "bytes":len(b),"dimensions":[1080,1350]})
    result["images"]=images
    (out/"zodiac-manifest.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    captions=[f"{date.month}월 {date.day}일, 운보다 12띠 · 60갑자 출생연도별 오늘의 흐름입니다. 오늘의 일진은 {result['dayGanji']}일입니다.",
      "1960년부터 2019년까지 60개 출생연도를 나눠 같은 띠라도 연도의 천간·지지에 따라 서로 다른 생활 조언을 담았어요. 7장 카드를 넘겨 나의 띠와 연도를 찾아보세요.",
      "※ 전통 명리의 일진과 연주를 참고한 일반 콘텐츠입니다. 실제 연주는 입춘 전후 출생에 따라 달라질 수 있으며, 개인 사주 전체를 풀이하거나 미래를 보장하지 않습니다.",
      "운보다 무료 사주 조회: https://unboda.kr",
      "#운보다 #60갑자 #띠별운세 #출생연도별운세 #무료사주"]
    (out/"caption.txt").write_text("\n\n".join(captions)+"\n",encoding="utf-8")
    print(json.dumps({"state":"SEVEN_ORIGINAL_60_GANJI_IMAGES_VERIFIED","date":date.isoformat(),
       "dayGanji":result["dayGanji"],"images":images,"animalCount":len(result["animals"]),"birthYearCount":result["birthYearCount"]},ensure_ascii=False))
if __name__=="__main__":main()
