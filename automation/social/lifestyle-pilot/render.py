#!/usr/bin/env python3
"""Reusable original lifestyle 30s graphics renderer, private-review only.

4 storyboard scenes -> original moving 9:16 video + exact cover + audio bed.
No network, no paid generation, no customer data, no publication.
The drawings are stylized graphics, NOT licensed real-life motion footage.
"""
import argparse,json,math,pathlib,subprocess,wave,struct
from PIL import Image,ImageDraw,ImageFont

W,H=720,1280
FPS=12
LENGTH=30
SCENE_SECONDS=7.5
FONT_ROOT=pathlib.Path("/usr/share/fonts/opentype/noto")
LIGHT=(244,238,224)
GOLD=(240,190,109)
MUTED=(161,177,186)

def font(px,bold=False):
    p=FONT_ROOT/("NotoSansCJK-Bold.ttc" if bold else "NotoSansCJK-Regular.ttc")
    if not p.is_file():raise ValueError("Noto CJK KOREAN_FONT_REQUIRED")
    return ImageFont.truetype(str(p),px)

def verify(brief):
    if brief.get("schemaVersion")!=1 or brief.get("automatedPublicationAllowed") is not False:
        raise ValueError("UNRELEASED_BRIEF_REQUIRED")
    lines=brief.get("narrationDraft")
    if not isinstance(lines,list) or len(lines)!=4 or any(not isinstance(x,str) or len(x)<15 or len(x)>100 for x in lines):
        raise ValueError("FOUR_VALID_KOREAN_VOICES_REQUIRED")
    if not lines[0].startswith(brief.get("situation","")):raise ValueError("REAL_LIFE_OPENING_REQUIRED")
    scenes=brief.get("scenes")
    if not isinstance(scenes,list) or len(scenes)!=4:raise ValueError("FOUR_SCENES_REQUIRED")
    d=ImageDraw.Draw(Image.new("RGB",(W,H)))
    for scene in scenes:
        titles=scene.get("headline")
        if not isinstance(titles,list) or len(titles)!=2 or any(not isinstance(x,str) for x in titles):
            raise ValueError("TWO_HEADLINE_LINES_REQUIRED")
        if scene.get("illustration") not in ("clock","message","notes","rest"):
            raise ValueError("ORIGINAL_ILLUSTRATION_TYPE_REQUIRED")
        caption=scene.get("subline")
        if not isinstance(caption,str):raise ValueError("CAPTION_MISSING")
        for text,f in [(titles[0],font(55,True)),(titles[1],font(55,True)),(caption,font(25))]:
            b=d.textbbox((0,0),text,font=f)
            if b[2]-b[0]>W-120:raise ValueError("HEADLINE_SAFE_WIDTH_OVERFLOW")
    return brief

def base_image():
    im=Image.new("RGB",(W,H));d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H
        d.line((0,y,W,y),fill=(int(8+7*t),int(16+12*t),int(32+15*t)))
    for x in range(85,W,110):
        for y in range(455,1030,90):d.ellipse((x,y,x+2,y+2),fill=(41,61,79))
    return im
BACKGROUND=base_image()

# Brand scenes are not four copies of the same central clock illustration.
# Each video has its own background palette and animated real-life metaphor.
BRAND_PALETTES={
    "midnight-indigo": {"top":(9,13,35),"bottom":(29,35,72),
        "accent":(193,175,251),"panel":(34,37,85),"gold":(234,197,126)},
    "commute-sunrise": {"top":(35,54,76),"bottom":(127,93,86),
        "accent":(255,190,135),"panel":(44,69,94),"gold":(255,213,144)},
    "relationship-coral": {"top":(68,31,61),"bottom":(121,64,88),
        "accent":(255,171,172),"panel":(99,49,82),"gold":(255,203,161)},
    "finance-emerald": {"top":(6,43,43),"bottom":(20,86,75),
        "accent":(145,223,176),"panel":(22,77,67),"gold":(211,227,149)}
}
def background_for_style(style):
    colors=BRAND_PALETTES.get(style)
    if not colors:return BACKGROUND.copy()
    im=Image.new("RGB",(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H
        r=tuple(round(colors["top"][i]*(1-t)+colors["bottom"][i]*t) for i in range(3))
        d.line((0,y,W,y),fill=r)
    # Four different large background silhouettes; subtle enough for text.
    if style=="midnight-indigo":
        for i in range(25):
            x=(i*113+62)%W;y=(i*137+483)%H
            d.ellipse((x,y,x+3,y+3),fill=(104,102,157))
    elif style=="commute-sunrise":
        d.ellipse((477,465,722,710),fill=(166,115,100))
        for i in range(7):
            x=42+i*103
            d.rectangle((x,865-(i%3)*53,x+80,1200),fill=(38,60,76))
    elif style=="relationship-coral":
        for i in range(5):
            x=83+i*152
            d.arc((x-94,560,x+95,750),start=220,end=355,fill=(155,82,115),width=5)
    elif style=="finance-emerald":
        for i in range(7):
            x=47+i*100
            d.line((x,570,x+70,900),fill=(38,106,84),width=3)
    return im

def draw_brand_hero(d,style,kind,scene_index,seconds):
    t=seconds/SCENE_SECONDS
    wave=math.sin(seconds*2*math.pi/SCENE_SECONDS)
    c=BRAND_PALETTES[style]
    accent=c["accent"]
    if style=="midnight-indigo":
        # Bedroom window, moving moon and silhouette; not a clock.
        d.rounded_rectangle((126,545,594,906),radius=35,fill=(27,32,70),outline=(98,99,153),width=5)
        d.line((359,550,359,902),fill=(87,94,149),width=8)
        d.line((138,730,582,730),fill=(87,94,149),width=7)
        x=265+26*wave;y=620+20*math.sin(seconds*.5)
        d.ellipse((x-55,y-55,x+55,y+55),fill=(242,219,166))
        d.ellipse((x-25,y-67,x+70,y+30),fill=(27,32,70))
        for k in range(8):
            sx=150+(k*61)%420;sy=575+(k*79)%250
            d.ellipse((sx,sy,sx+5,sy+5),fill=(201,181,251))
        d.ellipse((445,749,505,809),fill=(169,165,199))
        d.rounded_rectangle((409,802,541,892),radius=25,fill=(109,102,155))
        if kind=="notes":
            d.rounded_rectangle((155,788,306,863),radius=12,fill=(208,207,221))
            d.line((174,817,275,817),fill=(72,63,132),width=5)
        if kind=="message":
            d.rounded_rectangle((167,793,322,847),radius=13,fill=(93,101,174))
            d.ellipse((181+int(t*85),806,198+int(t*85),822),fill=accent)
    elif style=="commute-sunrise":
        # Street/city/commuter, moving transit vehicle instead of clock icon.
        d.ellipse((435,541,552,658),fill=(255,211,133))
        for k in range(7):
            x=140+k*64
            d.rectangle((x,650-(k%3)*54,x+50,861),fill=(66,97,118))
            d.rectangle((x+14,681-(k%3)*54,x+26,710-(k%3)*54),fill=(188,180,141))
        busX=132+int(44*wave)
        d.rounded_rectangle((busX,764,busX+410,864),radius=25,fill=(238,179,111),outline=(253,224,171),width=4)
        d.rounded_rectangle((busX+28,780,busX+154,814),radius=9,fill=(54,94,124))
        d.rounded_rectangle((busX+172,780,busX+302,814),radius=9,fill=(54,94,124))
        d.ellipse((busX+75,849,busX+128,899),fill=(32,52,68))
        d.ellipse((busX+319,849,busX+372,899),fill=(32,52,68))
        if kind=="notes":
            d.rounded_rectangle((450,563,574,694),radius=14,fill=(247,232,210))
            d.line((470,608,551,608),fill=(70,100,123),width=5)
        if kind=="message":
            d.rounded_rectangle((152,570,354,626),radius=13,fill=(99,137,154))
            d.ellipse((175+int(t*130),583,190+int(t*130),599),fill=accent)
    elif style=="relationship-coral":
        # Two PEOPLE facing each other + moving speech bubbles.
        for x,col in ((244,(239,172,160)),(468,(255,207,159))):
            d.ellipse((x-70,675,x+70,815),fill=col)
            d.rounded_rectangle((x-97,794,x+97,917),radius=39,fill=(125,68,103) if x==244 else (152,91,106))
            d.ellipse((x-16,713,x+12,737),fill=(108,62,87))
        dy=int(16*wave)
        d.rounded_rectangle((141,556+dy,340,652+dy),radius=29,fill=(242,166,174))
        d.rounded_rectangle((382,579-dy,569,675-dy),radius=29,fill=(255,207,172))
        d.line((175,605+dy,299,605+dy),fill=(96,49,71),width=7)
        d.line((418,628-dy,531,628-dy),fill=(96,49,71),width=7)
        if kind=="rest":
            d.arc((309,696,415,795),start=190,end=345,fill=(255,213,164),width=10)
        if kind=="notes":
            d.line((325,840,405,840),fill=(240,187,171),width=11)
    elif style=="finance-emerald":
        # Visible budget ledger, animated bars and coins.
        d.rounded_rectangle((132,546,583,910),radius=24,fill=(230,239,222),outline=(128,186,149),width=4)
        d.rounded_rectangle((159,571,549,630),radius=11,fill=(42,108,86))
        d.text((182,581),"MONTHLY",font=font(25,True),fill=(234,240,223))
        for k in range(4):
            col=(64,118,104) if k%2 else (86,154,123)
            bar=63+k*32+int(16*math.sin(seconds*1.1+k))
            x=172+k*88
            d.rounded_rectangle((x,840-bar,x+57,840),radius=9,fill=col)
        d.line((167,849,547,849),fill=(96,136,112),width=5)
        coinsX=460+int(14*wave)
        for k in range(3):
            yy=668+k*20
            d.ellipse((coinsX-39,yy-18,coinsX+39,yy+45),fill=(229,196,109),outline=(151,147,84),width=4)
        if kind=="message":
            d.rounded_rectangle((163,666,342,713),radius=12,fill=(100,180,137))
            d.line((186,690,300,690),fill=(234,246,218),width=5)


def center(draw,text,y,f,color):
    b=draw.textbbox((0,0),text,font=f)
    width=b[2]-b[0]
    if width>W-120:raise ValueError("INVALID_KOREAN_TEXT_WIDTH")
    draw.text(((W-width)/2,y),text,font=f,fill=color)

def draw_frame(brief,scene_index,seconds):
    scene=brief["scenes"][scene_index]
    style=brief.get("visualStyle")
    colors=BRAND_PALETTES.get(style)
    im=background_for_style(style);d=ImageDraw.Draw(im)
    d.line((70,126,650,126),fill=(82,102,120),width=2)
    d.ellipse((70,72,86,88),fill=GOLD)
    d.text((103,67),"UNBODA  /  SAJU & LIFE",font=font(20),fill=(colors["gold"] if colors else GOLD))
    center(d,scene["headline"][0],210,font(55,True),LIGHT)
    center(d,scene["headline"][1],292,font(55,True),colors["gold"] if colors else GOLD)
    center(d,scene["subline"],385,font(25),MUTED)
    d.rounded_rectangle((88,486,632,957),radius=42,fill=(colors["panel"] if colors else (20,38,55)),outline=(colors["accent"] if colors else (61,85,103)),width=3)
    cx,cy=360,713
    phase=2*math.pi*seconds/SCENE_SECONDS
    sw=math.sin(phase)
    kind=scene["illustration"]
    if colors:
        draw_brand_hero(d,style,kind,scene_index,seconds)
    elif kind=="clock":
        r=156
        d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=GOLD,width=7)
        # One wide moving orbital highlight: avoid barely moving clock hands
        # being mistaken for a 7+ second frozen frame at social resolution.
        orbit_x=cx+210*math.cos(phase*1.4)
        orbit_y=cy+185*math.sin(phase*1.4)
        d.ellipse((orbit_x-30,orbit_y-30,orbit_x+30,orbit_y+30),fill=(236,179,83))

        for n in range(12):
            angle=n*math.pi/6; dx,dy=math.sin(angle),-math.cos(angle)
            d.line((cx+dx*130,cy+dy*130,cx+dx*143,cy+dy*143),fill=(200,180,145),width=4)
        d.line((cx,cy,cx+76*math.cos(phase),cy-76*math.sin(phase)),fill=LIGHT,width=8)
        d.line((cx,cy,cx-83*math.sin(.2*phase),cy-83*math.cos(.2*phase)),fill=GOLD,width=10)
        d.ellipse((cx-11,cy-11,cx+11,cy+11),fill=GOLD)
    elif kind=="message":
        drift=int(sw*12)
        d.rounded_rectangle((157,586+drift,555,688+drift),radius=25,fill=(48,77,96))
        d.line((202,626+drift,448,626+drift),fill=LIGHT,width=6)
        d.rounded_rectangle((178,738-drift,538,833-drift),radius=25,fill=(144,118,81))
        d.line((225,781-drift,483,781-drift),fill=(245,228,203),width=6)
        d.ellipse((502,529,532,559),fill=GOLD)
    elif kind=="notes":
        # Large, slowly varying ambient panel is visually moving even after
        # downsampling to 180x320, so the freeze detector stays meaningful.
        ambient=int(10+10*math.sin(phase*1.6))
        d.rounded_rectangle((110,512,610,933),radius=30,
            fill=(21+ambient,41+ambient,58+ambient))
        d.rounded_rectangle((188,559,534,856),radius=16,fill=(234,226,211))
        d.text((225,588),"TODAY",font=font(27,True),fill=(44,58,69))
        for n in range(3):
            y=657+n*60
            d.rectangle((225,y,246,y+21),outline=(57,89,99),width=3)
            d.line((266,y+12,490,y+12),fill=(110,125,131),width=4)
        progress=max(0,min(1,seconds/SCENE_SECONDS))
        d.line((223,731,245,749,274+progress*16,703-progress*10),fill=(46,138,119),width=7)
        # Wide animated progress stripe below the paper, away from all text.
        bar=30+int(390*(.5+.5*math.sin(phase*1.4)))
        d.rounded_rectangle((146,899,146+bar,925),radius=10,fill=GOLD)

    elif kind=="rest":
        for n in range(4):
            r=68+n*38+int(9*sw)
            d.arc((cx-r,cy-r,cx+r,cy+r),start=30+n*11,end=330-n*11,
                  fill=GOLD if n%2==0 else (106,133,143),width=6)
        d.ellipse((cx-48,cy-48,cx+48,cy+48),fill=GOLD)
        d.ellipse((cx-28,cy-28,cx+28,cy+28),fill=(43,65,76))
    d.line((92,1040,628,1040),fill=(72,91,108),width=2)
    if scene_index==3 and colors:
        d.text((98,1054),"운보다에서 내 사주 살펴보기",font=font(25,True),fill=colors["gold"])
        d.text((98,1117),"unboda.kr  |  무료 사주 조회",font=font(19),fill=LIGHT)
    else:
        d.text((98,1061),"사주로 이해하는 나의 일상",font=font(23),fill=MUTED)
    if scene_index!=3 or not colors:d.text((98,1112),f"{scene_index+1:02d} / 04",font=font(19),fill=GOLD)
    if scene_index==3 and not colors:d.text((527,1111),"운보다",font=font(25,True),fill=LIGHT)
    return im

def score(path):
    with wave.open(str(path),"wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000)
        for i in range(48000*30):
            t=i/48000
            fade=min(1,t/1.8,(30-t)/1.8)
            pulse=.63*math.sin(2*math.pi*110*t)+.24*math.sin(2*math.pi*164.81*t)+.13*math.sin(2*math.pi*220*t)
            v=int(2400*max(0,fade)*pulse)
            w.writeframesraw(struct.pack("<hh",v,v))

def render(brief,directory):
    dest=pathlib.Path(directory);dest.mkdir(parents=True,exist_ok=True)
    video=dest/"LIFESTYLE_ORIGINAL_MOTION_NO_VOICE.mp4"
    cover=dest/"LIFESTYLE_COVER.jpg"
    draw_frame(brief,0,0).resize((1080,1920),Image.Resampling.LANCZOS).save(cover,quality=96,subsampling=0)
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo",
         "-pixel_format","rgb24","-video_size",f"{W}x{H}","-framerate",str(FPS),"-i","-",
         "-vf","scale=1080:1920:flags=lanczos,fps=30,format=yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","21",
         "-movflags","+faststart",str(video)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for n in range(LENGTH*FPS):
            secs=n/FPS
            scene=min(3,int(secs/SCENE_SECONDS))
            p.stdin.write(draw_frame(brief,scene,secs-scene*SCENE_SECONDS).tobytes())
    finally:
        p.stdin.close()
        if p.wait(timeout=360)!=0:raise RuntimeError("FFMPEG_ORIGINAL_MOTION_FAILED")
    score(dest/"LIFESTYLE_ORIGINAL_SCORE.wav")
    proof={"state":"ORIGINAL_MOTION_REVIEW_ONLY","topicKey":brief["topicKey"],
           "originalMovingGraphics":True,"licensedRealFootage":False,
           "narrationExists":False,"commercialQualityApproved":False,
           "publicationAllowed":False}
    (dest/"VISUAL_PROOF.json").write_text(json.dumps(proof,ensure_ascii=False,indent=2)+"\n")
    print("ORIGINAL_LIFESTYLE_MOTION_REVIEW_READY")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--brief",required=True);parser.add_argument("--out",required=True)
    args=parser.parse_args()
    render(verify(json.loads(pathlib.Path(args.brief).read_text())),args.out)
