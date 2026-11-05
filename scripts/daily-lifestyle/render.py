#!/usr/bin/env python3
"""Original first-party illustrated daily Korean lifestyle posts. Not photographs."""
import argparse, datetime as dt, hashlib, json, pathlib, random
from PIL import Image, ImageDraw, ImageFont, ImageStat, ImageOps

SLOTS=("01","04","10","13","16","19","22")
# The seven visible subjects are genuinely different; scenes cannot be substituted by text.
# No static topics or reused advice: GitHub daily editorial source is mandatory.
# For each day, seven unique situations and linked visible anchors must be supplied.
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

def contextual_visual_detail(d,story):
 """Add concrete visible objects tied to the editorial situation, not only a new palette."""
 scene=story["title"]+" "+story["lifeSituation"]
 motif=story["visualMotif"]
 ink=(54,78,95);paper=(251,245,226);accent=(204,153,104)
 if motif=="receipt":
  # The receipt explicitly labels its total instead of showing anonymous lines.
  d.rounded_rectangle((326,823,651,887),radius=8,fill=paper)
  d.text((337,837),"영수증 합계",font=font(29,True),fill=ink)
  if "세탁" in scene:
   # A shirt makes the laundry bill distinguishable from other purchases.
   d.polygon([(732,578),(761,558),(783,581),(806,558),(846,585),
              (827,624),(805,614),(805,701),(756,701),(756,614),(736,624)],
             fill=(230,192,149),outline=ink)
  elif "구독" in scene or "정기결제" in scene:
   roundrect(d,(725,567,860,711),15,(232,236,225))
   roundrect(d,(744,582,840,680),10,(100,153,171))
   d.text((752,609),"정기",font=font(25,True),fill=paper)
  elif "선물" in scene:
   roundrect(d,(718,571,852,691),10,(235,180,134))
   d.line((784,573,784,688),fill=ink,width=10)
   d.line((722,623,848,623),fill=ink,width=9)
 elif motif=="journal" and ("전화" in scene or "통화" in scene):
  roundrect(d,(676,605,828,822),22,(221,230,226))
  roundrect(d,(697,627,808,782),10,(90,139,155))
  d.ellipse((742,794,764,816),fill=ink)
 elif motif=="bedroom" and ("소음" in scene or "창밖" in scene):
  roundrect(d,(618,541,842,701),13,(184,217,231))
  d.line((728,546,728,694),fill=ink,width=8)
  d.line((623,623,837,623),fill=ink,width=8)
  for x,y in ((638,604),(661,579),(796,596)):
   d.arc((x-16,y-14,x+16,y+14),15,160,fill=ink,width=4)
 elif motif=="presentation" and ("출처" in scene or "인용" in scene):
  roundrect(d,(664,562,849,674),12,paper)
  d.text((694,594),"출처",font=font(32,True),fill=ink)
 elif motif=="dialogue" and ("책" in scene or "반납" in scene):
  d.polygon([(490,802),(541,817),(541,914),(490,899)],fill=(235,218,177),outline=ink)
  d.polygon([(545,817),(602,802),(602,899),(545,914)],fill=(240,228,197),outline=ink)
  d.line((543,817,543,912),fill=ink,width=5)
 elif motif=="family" and ("사진" in scene or "추억" in scene):
  roundrect(d,(442,578,642,719),8,(248,241,223))
  d.rectangle((459,597,625,687),fill=(172,205,204))
  d.polygon([(463,682),(516,629),(557,658),(594,614),(623,678)],fill=(98,159,130))
 elif motif=="checklist" and ("주소" in scene or "이사" in scene):
  roundrect(d,(610,531,846,663),14,paper)
  d.text((655,560),"주소",font=font(37,True),fill=ink)
  d.line((648,619,809,619),fill=ink,width=6)
 elif motif=="checklist" and ("택배" in scene or "반품" in scene):
  d.polygon([(666,827),(742,787),(841,827),(762,870)],fill=(212,171,121),outline=ink)
  d.polygon([(666,827),(762,870),(762,925),(666,880)],fill=(179,139,93),outline=ink)
  d.polygon([(762,870),(841,827),(841,881),(762,925)],fill=(230,193,146),outline=ink)

def composition_parameters(date,hour,story):
 """Deterministic actual geometry, with far more than simple color variations."""
 key=f"{date.isoformat()}:{hour}:{story['topicKey']}:{story['sceneVariant']}"
 h=hashlib.sha256(key.encode('utf-8')).digest()
 return {
  "mirrored":bool(h[0]&1),
  "rotation":(-13,-9,-5,4,8,12)[h[1]%6],
  "scale":0.74+(h[2]%25)/100,
  "offsetX":int(h[3]%131)-65,
  "offsetY":int(h[4]%61)-30,
  "accentCorner":int(h[5]%4)
 }

def draw_composed_artwork(img,date,hour,story,accent):
 """Make the subject genuinely shift/rotate/resize instead of recoloring old art."""
 p=composition_parameters(date,hour,story)
 layer=Image.new("RGBA",(1080,1350),(0,0,0,0))
 d=ImageDraw.Draw(layer)
 artwork(d,story["visualMotif"],accent,story["sceneVariant"])
 contextual_visual_detail(d,story)
 art=layer.crop((155,500,920,945))
 if p["mirrored"]:art=ImageOps.mirror(art)
 art=art.rotate(p["rotation"],resample=Image.Resampling.BICUBIC,expand=False)
 width=round(art.width*p["scale"]);height=round(art.height*p["scale"])
 art=art.resize((width,height),Image.Resampling.LANCZOS)
 x=155+max(0,min(765-width,(765-width)//2+p["offsetX"]))
 y=500+max(0,min(445-height,(445-height)//2+p["offsetY"]))
 # Every illustration stays within the subject card, never overlaid on Korean text.
 if not (155<=x and 500<=y and x+width<=920 and y+height<=945):
  raise RuntimeError("COMPOSITION_OUTSIDE_SUBJECT_CARD")
 img.paste(art,(x,y),art)
 return p

def editorial_similarity(a,b):
 def grams(value):
  value="".join(c.lower() for c in str(value) if c.isalnum())
  return {value[i:i+3] for i in range(max(0,len(value)-2))}
 x,y=grams(a),grams(b)
 return 2*len(x&y)/max(1,len(x)+len(y))


def load_editorial(date, brief_path, history_dir=None):
 if not brief_path: raise RuntimeError("DAILY_NEW_EDITORIAL_BRIEF_REQUIRED")
 brief=json.loads(pathlib.Path(brief_path).read_text(encoding="utf-8"))
 if (brief.get("schemaVersion")!=2 or brief.get("dateKst")!=date.isoformat()
     or brief.get("brand")!="UNBODA" or brief.get("notPhotographs") is not True
     or brief.get("firstPartyOriginal") is not True):
  raise RuntimeError("DAILY_EDITORIAL_DATE_OR_SOURCE_MISMATCH")
 stories=brief.get("stories")
 if not isinstance(stories,list) or len(stories)!=7:raise RuntimeError("SEVEN_ORIGINAL_BRIEFS_REQUIRED")
 motif_objects={
  "journal":("수첩","일기장","펜","색연필","메모","공책","종이","연필"),
  "bedroom":("침대","달","알람","시계","조명","이불","베개"),
  "presentation":("업무","표","차트","막대그래프","자료","화면","그래프","발표"),
  "receipt":("영수증","가계부","금액","메모","지갑","동전","선물","카드"),
  "dialogue":("두 사람","말풍선","메시지","친구","대화","채팅"),
  "family":("식탁","접시","달력","가족","밥","의자","음식"),
  "checklist":("체크리스트","체크","짐 가방","가방","표시","준비","목록")
 }
 motifs=set(motif_objects)
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
  if not all(any(term in x for term in motif_objects[st["visualMotif"]]) for x in st["visualAnchors"]):
   raise RuntimeError("VISUAL_ANCHOR_NOT_DRAWN_BY_MOTIF")
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
    if (key in keys or title in titles or
        any(editorial_similarity(str(prev.get("title","")),st["title"])>=0.73 or
            editorial_similarity(str(prev.get("lifeSituation","")),st["lifeSituation"])>=0.76
            for st in stories)):
     raise RuntimeError("RECENT_90_DAY_EDITORIAL_REUSE_"+other_date)
 return stories


def make(date,hour,i,out,story):
 label,headline,advice,kind,category=(story[k] for k in (
  'label','title','advice','visualMotif','topicCategory'))
 rng=random.Random(date.toordinal()*79+i*173)
 palette=hashlib.sha256((date.isoformat()+story["topicKey"]).encode("utf-8")).digest()[0]%7
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
 composition=draw_composed_artwork(img,date,hour,story,accent)
 # Accent geometry is also date-specific, not a fixed background reused daily.
 corners=((134,482,295,637),(786,482,947,637),
          (134,792,295,947),(786,792,947,947))
 cx1,cy1,cx2,cy2=corners[composition["accentCorner"]]
 d.arc((cx1,cy1,cx2,cy2),start=15,end=175,fill=accent,width=7)
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
  "compositionParameters":composition,
  "topicCategory":category,"firstPartyOriginal":True,"humanVisualReviewed":False,
  "imageRightsReviewed":True,"imageRole":"procedural-illustration-qa",
   "socialPhotoApproved":False,"notARealPhotograph":True,"width":1080,"height":1350}
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
   "photoReadyForSnsPosting":False,"imageRole":"procedural-illustration-qa",
  "slotHoursKst":list(SLOTS),"cards":cards}
 (out/"manifest.json").write_text(json.dumps(m,ensure_ascii=False,indent=2)+"\n")
 print("SEVEN_UNBODA_ORIGINAL_SUBJECT_IMAGES_APPROVED_TECHNICAL_ONLY",date)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--date",required=True);p.add_argument("--out",required=True)
 p.add_argument("--brief",required=True)
 p.add_argument("--history-dir")
 a=p.parse_args();build(dt.date.fromisoformat(a.date),pathlib.Path(a.out),a.brief,a.history_dir)
