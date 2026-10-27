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

def center(draw,text,y,f,color):
    b=draw.textbbox((0,0),text,font=f)
    width=b[2]-b[0]
    if width>W-120:raise ValueError("INVALID_KOREAN_TEXT_WIDTH")
    draw.text(((W-width)/2,y),text,font=f,fill=color)

def draw_frame(brief,scene_index,seconds):
    scene=brief["scenes"][scene_index]
    im=BACKGROUND.copy();d=ImageDraw.Draw(im)
    d.line((70,126,650,126),fill=(82,102,120),width=2)
    d.ellipse((70,72,86,88),fill=GOLD)
    d.text((103,67),"UNBODA  /  DAILY INSIGHT",font=font(20),fill=GOLD)
    center(d,scene["headline"][0],210,font(55,True),LIGHT)
    center(d,scene["headline"][1],292,font(55,True),GOLD)
    center(d,scene["subline"],385,font(25),MUTED)
    d.rounded_rectangle((88,486,632,957),radius=42,fill=(20,38,55),outline=(61,85,103),width=2)
    cx,cy=360,713
    phase=2*math.pi*seconds/SCENE_SECONDS
    sw=math.sin(phase)
    kind=scene["illustration"]
    if kind=="clock":
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
    d.text((98,1061),"작은 선택으로 오늘을 돌아보기",font=font(23),fill=MUTED)
    d.text((98,1112),f"{scene_index+1:02d} / 04",font=font(19),fill=GOLD)
    if scene_index==3:d.text((527,1111),"운보다",font=font(25,True),fill=LIGHT)
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
