#!/usr/bin/env python3
"""Original first-party illustrated daily Korean lifestyle posts. Not photographs."""
import argparse, datetime as dt, hashlib, json, pathlib, random
from PIL import Image, ImageDraw, ImageFont, ImageStat

SLOTS=("01","04","10","13","16","19","22")
# The seven visible subjects are genuinely different; scenes cannot be substituted by text.
STORIES=[
 ("일기장과 펜","부탁을 거절한 뒤에도 마음이 무거운 이유","거절한 이유를 적고 내가 가능한 범위를 먼저 생각해 보세요.","journal","self-understanding"),
 ("침실의 달과 조명","잠들기 전에 생각이 많아지는 밤","내일 확인할 일을 한 줄만 적고, 지금은 쉬어도 되는 시간을 정해 보세요.","bedroom","self-understanding"),
 ("회의 발표 자료","회의 자료의 숫자가 다를 때","원본 숫자를 확인하고 바꿀 부분을 구체적으로 적어 보세요.","presentation","career"),
 ("가계부와 영수증","점심을 먹고 나면 통장이 가벼운 이유","작은 결제부터 한 주 동안 기록하고 습관적인 지출 한 가지를 살펴보세요.","receipt","money"),
 ("두 사람과 대화","연인과 이야기할수록 서운해질 때","서로의 결론보다 서운했던 순간을 한 가지씩 말하고 확인해 보세요.","dialogue","compatibility"),
 ("가족 달력과 식탁","가족과 약속 시간을 정하기 어렵다면","출발 시각과 준비할 시각을 분리해 약속을 다시 정해 보세요.","family","family"),
 ("우선순위 체크리스트","퇴근 뒤 하고 싶은 일이 너무 많다면","오늘 할 한 가지와 내일로 미룰 한 가지를 골라 보세요.","checklist","career")
]
VARIATIONS=[
 "상대방보다 나의 기준을 먼저 살펴보세요.",
 "무엇이 부담이 되었는지 짧게 기록해 보세요.",
 "하루의 흐름을 기록하며 작은 변화를 확인하세요.",
 "서두르지 않고 사실과 감정을 나눠 보세요.",
 "실제로 바꿀 수 있는 행동 하나부터 선택해 보세요.",
 "한 번에 모두 해결하려 하기보다 순서를 정해 보세요.",
 "상황이 다르면 적절한 방법도 달라질 수 있어요.",
 "익숙한 방식을 다른 방향에서 점검해 보세요.",
 "한 가지 약속을 지키며 변화를 관찰해 보세요.",
 "작은 실천을 반복할 수 있게 기준을 정해 보세요.",
 "당장 결론을 내리지 않고 생각을 정리해 보세요.",
 "더 나은 대화를 위해 필요한 질문을 남겨 보세요.",
 "스스로 납득할 수 있는 현실적인 이유를 찾아보세요.",
 "무조건 참기보다 가능한 범위를 설명해 보세요.",
 "빠른 답보다 확인된 사실을 우선해 보세요.",
 "미뤄 놓은 항목 중 하나를 실천해 보세요.",
 "서로 다른 속도를 인정하고 대화를 시작해 보세요.",
 "기록을 바탕으로 필요와 습관을 구별해 보세요.",
 "오늘의 선택을 내일 다시 살펴볼 여유를 남겨 보세요."
]
C1=[(13,46,65),(38,34,65),(19,59,65),(53,46,46),(67,38,55),(23,57,42),(35,45,75)]
C2=[(216,176,109),(240,169,159),(172,203,184),(244,202,138),(216,169,192),(194,215,146),(179,194,238)]
def font(sz,bold=False):
 names=["NotoSansCJK-Bold.ttc"] if bold else ["NotoSansCJK-Regular.ttc","NotoSansCJK-Bold.ttc"]
 for n in names:
  for directory in ("/usr/share/fonts/opentype/noto/","/usr/share/fonts/truetype/noto/"):
   p=pathlib.Path(directory+n)
   if p.exists(): return ImageFont.truetype(str(p),sz)
 raise RuntimeError("KOREAN_FONTS_REQUIRED")
def roundrect(d,r,rad,color):d.rounded_rectangle(r,radius=rad,fill=color)
def artwork(d,kind,accent,variant=0):
 ink=(65,90,110);paper=(239,232,210)
 if kind=="journal":
  roundrect(d,(245,547,812,892),24,paper)
  for i in range(5):d.line((334,604+i*49,728-i%3*15,604+i*49),fill=ink,width=6)
  d.polygon([(730,552),(757,580),(570,828),(543,837)],fill=accent)
 elif kind=="bedroom":
  roundrect(d,(207,723,854,908),34,(224,237,239))
  roundrect(d,(254,690,502,771),20,(250,239,218))
  roundrect(d,(204,531,420,690),16,(37,71,104))
  d.ellipse((287,558,364,635),fill=accent)
  d.ellipse((310,541,390,613),fill=(37,71,104))
  d.line((733,713,733,551),fill=paper,width=15)
  d.polygon([(661,573),(807,573),(779,525),(696,525)],fill=accent)
 elif kind=="presentation":
  roundrect(d,(245,548,846,851),22,paper)
  for i,h in enumerate((75,151,114)):roundrect(d,(339+i*149,782-h,421+i*149,782),10,[(46,134,149),(229,177,105),(103,149,125)][i])
  d.line((315,798,788,798),fill=ink,width=6)
  roundrect(d,(324,856,789,908),12,(76,97,112))
 elif kind=="receipt":
  roundrect(d,(290,529,714,921),20,paper)
  for i in range(5):d.line((336,599+i*53,609+i%3*16,599+i*53),fill=ink,width=6)
  roundrect(d,(592,708,839,844),18,(68,123,115))
  d.ellipse((688,738,788,830),fill=accent)
  d.ellipse((174,789,289,903),fill=accent)
 elif kind=="dialogue":
  for x,col in ((353,(247,185,151)),(708,(234,179,151))):
   d.ellipse((x-71,596,x+71,738),fill=col)
   roundrect(d,(x-113,720,x+113,932),36,(112,132,155) if x<500 else (159,93,123))
  roundrect(d,(283,516,470,591),20,paper)
  roundrect(d,(609,516,832,591),20,accent)
  d.line((301,548,445,548),fill=ink,width=7)
 elif kind=="family":
  roundrect(d,(269,733,818,813),24,(213,174,125))
  d.line((300,812,300,926),fill=accent,width=15);d.line((781,812,781,926),fill=accent,width=15)
  roundrect(d,(405,526,685,726),13,paper)
  for i in range(3):
   for j in range(4):d.ellipse((430+j*57,583+i*44,450+j*57,603+i*44),fill=accent if i==1 and j==2 else ink)
  for x in (322,753):d.ellipse((x-56,606,x+56,718),fill=(241,179,135))
 elif kind=="checklist":
  roundrect(d,(260,519,827,925),26,paper)
  for i in range(4):
   y=596+i*66
   d.rectangle((313,y,356,y+40),outline=ink,width=5)
   if i<2:d.line((321,y+17,342,y+31,375,y-4),fill=(67,162,113),width=7)
   d.line((405,y+16,754,y+16),fill=ink,width=6)
 else:raise RuntimeError("MOTIF_NOT_RENDERABLE")
 # Topic-specific foreground details, not a reused generic cosmic backdrop.
 if variant:
  if kind=="journal":
   roundrect(d,(635,793,824,887),14,(245,222,175))
   for n in range(3):d.line((663+n*39,803,669+n*39,865),fill=[(77,125,164),(218,134,122),(119,171,126)][n],width=13)
  elif kind=="bedroom":
   d.ellipse((690,561,846,717),fill=(247,226,169),outline=(74,89,114),width=8)
   d.line((768,638,768,589),fill=(73,92,109),width=8)
   d.line((768,638,813,655),fill=(73,92,109),width=7)
  elif kind=="presentation":
   d.line((349,725,477,661,598,706,744,611),fill=(223,102,86),width=11,joint="curve")
   d.ellipse((726,596,756,626),fill=(223,102,86))
  elif kind=="receipt":
   roundrect(d,(710,571,876,700),16,(233,189,134))
   d.line((789,578,789,686),fill=(165,89,101),width=14)
   d.line((719,632,869,632),fill=(165,89,101),width=13)
  elif kind=="dialogue":
   roundrect(d,(454,784,607,860),20,(238,232,200))
   d.ellipse((485,818,501,834),fill=ink)
   d.ellipse((526,818,542,834),fill=ink)
   d.ellipse((567,818,583,834),fill=ink)
  elif kind=="family":
   for n in range(3):
    x=436+n*112
    d.ellipse((x,755,x+80,804),fill=(252,247,235),outline=(124,149,143),width=5)
  elif kind=="checklist":
   roundrect(d,(648,806,846,909),17,(209,150,117))
   d.line((701,807,701,787,791,787,791,807),fill=(246,222,175),width=8)
def load_editorial(date, brief_path, history_dir=None):
 if not brief_path: raise RuntimeError("DAILY_NEW_EDITORIAL_BRIEF_REQUIRED")
 brief=json.loads(pathlib.Path(brief_path).read_text(encoding="utf-8"))
 if (brief.get("schemaVersion")!=2 or brief.get("dateKst")!=date.isoformat()
     or brief.get("brand")!="UNBODA" or brief.get("notPhotographs") is not True
     or brief.get("firstPartyOriginal") is not True):
  raise RuntimeError("DAILY_EDITORIAL_DATE_OR_SOURCE_MISMATCH")
 stories=brief.get("stories")
 if not isinstance(stories,list) or len(stories)!=7:raise RuntimeError("SEVEN_ORIGINAL_BRIEFS_REQUIRED")
 motifs={"journal","bedroom","presentation","receipt","dialogue","family","checklist"}
 keys=set();titles=set();scenes=set()
 for i,st in enumerate(stories):
  if not isinstance(st,dict) or st.get("hourKst")!=SLOTS[i]:
   raise RuntimeError("LIFESTYLE_BRIEF_HOUR_MISMATCH")
  required=("topicKey","title","label","advice","lifeSituation","visualAnchors","visualMotif","topicCategory","sceneVariant")
  if any(k not in st for k in required):raise RuntimeError("LIFESTYLE_BRIEF_REQUIRED_FIELDS_MISSING")
  if st["visualMotif"] not in motifs or not isinstance(st["sceneVariant"],int) or not 0<=st["sceneVariant"]<=4:
   raise RuntimeError("LIFESTYLE_VISUAL_NOT_SUPPORTED")
  if not isinstance(st["visualAnchors"],list) or len(st["visualAnchors"])<2 or len(st["visualAnchors"])>4:
   raise RuntimeError("LIFESTYLE_VISIBLE_ANCHORS_MISSING")
  for k,minc,maxc in (("title",12,38),("label",3,22),("advice",20,115),("lifeSituation",12,100),("topicKey",12,90)):
   if not isinstance(st[k],str) or not minc<=len(st[k].strip())<=maxc:
    raise RuntimeError("LIFESTYLE_TEXT_LENGTH_INVALID_"+k)
  if not all(isinstance(x,str) and 2<=len(x)<=30 for x in st["visualAnchors"]):
   raise RuntimeError("LIFESTYLE_ANCHOR_TEXT_INVALID")
  for k in ("topicKey","title","lifeSituation"):
   if any(v in st[k] for v in ("오늘은 운이 좋", "반드시 성공", "무조건 대박", "확정된 미래")):
    raise RuntimeError("SAJU_FORTUNE_GUARANTEE_BLOCKED")
  key=st["topicKey"].rsplit("-",1)[0].strip().lower()
  title="".join(st["title"].split())
  if key in keys or title in titles or st["visualMotif"] in scenes:
   raise RuntimeError("DUPLICATED_DAILY_TOPIC_OR_MOTIF")
  keys.add(key);titles.add(title);scenes.add(st["visualMotif"])
 if history_dir:
  directory=pathlib.Path(history_dir)
  for f in directory.glob("????????.json"):
   other_date=f.stem
   try:day=dt.date.fromisoformat(f"{other_date[:4]}-{other_date[4:6]}-{other_date[6:]}")
   except ValueError:continue
   if not 0 < (date-day).days <= 90:continue
   other=json.loads(f.read_text(encoding="utf-8"))
   for prev in other.get("stories",[]):
    key=str(prev.get("topicKey","")).rsplit("-",1)[0].lower()
    title="".join(str(prev.get("title","")).split())
    if key in keys or title in titles:
     raise RuntimeError("RECENT_90_DAY_EDITORIAL_REUSE_"+other_date)
 return stories


def make(date,hour,i,out,story):
 label,headline,advice,kind,category=(story[k] for k in (
  'label','title','advice','visualMotif','topicCategory'))
 rng=random.Random(date.toordinal()*79+i*173)
 palette=(i+date.toordinal())%7
 top,accent=C1[palette],C2[palette]
 img=Image.new("RGB",(1080,1350),top);d=ImageDraw.Draw(img)
 for y in range(0,1350,10):
  alpha=y/1350*.34
  d.rectangle((0,y,1080,y+10),fill=tuple(int(top[k]*(1-alpha)+accent[k]*alpha) for k in range(3)))
 for k in range(24):
  x=rng.randrange(65,1035);y=rng.randrange(440,1010)
  d.ellipse((x,y,x+4,y+4),fill=tuple(min(v+20,255) for v in top))
 roundrect(d,(119,468,962,962),45,(33,52,69))
 d.rounded_rectangle((119,468,962,962),radius=45,outline=accent,width=5)
 artwork(d,kind,accent,story['sceneVariant'])
 d.text((106,78),"UNBODA  /  SAJU & LIFE",font=font(33,True),fill=accent)
 d.line((107,140,970,140),fill=accent,width=3)
 d.text((107,204),label,font=font(45,True),fill=accent)
 titlefont=font(57,True);remaining=headline;rows=[]
 for word in remaining.split():
  if rows and False:pass
  if not rows:rows=[word]
  elif d.textbbox((0,0),rows[-1]+" "+word,font=titlefont)[2]<875: rows[-1]+=" "+word
  else: rows.append(word)
 if len(rows)>2:raise RuntimeError("HEADLINE_OVERLAP")
 for idx,row in enumerate(rows):d.text((107,292+77*idx),row,font=titlefont,fill=(249,248,238))
 d.line((106,1025,976,1025),fill=accent,width=3)
 d.text((110,1084),"현실적인 선택을 돕는 사주 생활 이야기",font=font(32),fill=(248,247,236))
 d.text((110,1150),"확정된 미래 예측이 아닌 참고 관점",font=font(31),fill=(229,231,226))
 d.text((110,1260),"운보다  ·  unboda.kr",font=font(33,True),fill=accent)
 filename=f"unboda-lifestyle-{date:%Y-%m-%d}-{hour}.png"
 path=out/filename;img.save(path,optimize=True)
 raw=path.read_bytes()
 if not (20000<len(raw)<7000000):raise RuntimeError("IMAGE_SIZE_NOT_VALID")
 if ImageStat.Stat(img.crop((230,500,850,950))).stddev[0]<15:raise RuntimeError("VISIBLE_SUBJECT_MISSING")
 text=f"{headline} {advice} 사주 성향은 상황을 돌아보는 참고 관점이며 관계·금전·미래를 보장하지 않습니다. 오늘 한 가지 실천으로 시작해 보세요."
 return {"hourKst":hour,"name":filename,"sha256":hashlib.sha256(raw).hexdigest(),
  "bytes":len(raw),"title":headline,"textDraft":text,
  "visualMotif":kind,"imageVisibleObjects":label,
  "lifeSituation":story["lifeSituation"],"visualAnchors":story["visualAnchors"],
  "topicKey":story["topicKey"],"sceneVariant":story["sceneVariant"],
  "topicCategory":category,"firstPartyOriginal":True,"humanVisualReviewed":False,
  "imageRightsReviewed":True,"width":1080,"height":1350}
def build(date,out,brief_path=None,history_dir=None):
 stories=load_editorial(date,brief_path,history_dir)
 out.mkdir(parents=True,exist_ok=True)
 cards=[make(date,h,i,out,stories[i]) for i,h in enumerate(SLOTS)]
 if len(set(x["sha256"] for x in cards))!=7:raise RuntimeError("REPEATED_IMAGE_SHA")
 if len(set(x["visualMotif"] for x in cards))!=7:raise RuntimeError("REPEATED_VISUAL_SUBJECT")
 m={"schemaVersion":2,"dateKst":date.isoformat(),"brand":"UNBODA",
  "source":"first-party-procedural-illustration","notPhotographs":True,
  "humanVisualReviewed":False,"automatedImageLayoutQa":True,
  "rightsVerifiedWithoutPaidProvider":True,"imagesExpected":7,
  "slotHoursKst":list(SLOTS),"cards":cards}
 (out/"manifest.json").write_text(json.dumps(m,ensure_ascii=False,indent=2)+"\n")
 print("SEVEN_UNBODA_ORIGINAL_SUBJECT_IMAGES_APPROVED_TECHNICAL_ONLY",date)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--date",required=True);p.add_argument("--out",required=True)
 p.add_argument("--brief",required=True)
 p.add_argument("--history-dir")
 a=p.parse_args();build(dt.date.fromisoformat(a.date),pathlib.Path(a.out),a.brief,a.history_dir)
