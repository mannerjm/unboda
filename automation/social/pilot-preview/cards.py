#!/usr/bin/env python3
"""Generate original PIL vector-style scene cards for a PRIVATE no-voice preview.

All graphics are drawn in-house; no stock images/music, no screenshots and no
scientific predictions. Runway original is fetched independently by the job.
These cards are previews, NOT licensed final narrated release artifacts.
"""
import argparse
import math
import os
import random
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W,H = 720,1280
GOLD=(230,190,120)
CREAM=(251,246,231)
MUTED=(184,200,209)
BACK=(11,20,36)
rng=random.Random(20261025)

def font_path():
    v=subprocess.check_output(
      ["fc-match","-f","%{file}","Noto Sans CJK KR"], text=True).strip()
    if not v or not os.path.isfile(v):
        raise RuntimeError("KOREAN_FONT_REQUIRED")
    return v
FONT=font_path()
def f(size):
    return ImageFont.truetype(FONT,size)

def center_text(draw,txt,y,size,color=CREAM):
    font=f(size)
    bbox=draw.textbbox((0,0),txt,font=font)
    text_w=bbox[2]-bbox[0]
    if text_w>W-112:
        raise ValueError("OVERFLOW: "+txt)
    draw.text(((W-text_w)//2,y),txt,font=font,fill=color,stroke_width=0)

def base():
    im=Image.new("RGB",(W,H))
    px=im.load()
    for y in range(H):
        for x in range(W):
            # Soft indigo-to-black gradient with a subtle warm center glow.
            dx=(x-W/2)/(W/2); dy=(y-H*0.53)/(H*0.64)
            radial=max(0,1-(dx*dx+dy*dy)*0.65)
            px[x,y]=(int(8+12*radial),int(16+13*radial),
                     int(31+32*radial))
    draw=ImageDraw.Draw(im,"RGBA")
    for _ in range(145):
        x=rng.randrange(24,W-24);y=rng.randrange(20,H-60)
        r=rng.choice([1,1,1,2])
        draw.ellipse((x-r,y-r,x+r,y+r),fill=(255,228,176,rng.randint(40,140)))
    return im,draw

def frame(draw,page):
    draw.line((78,128,642,128),fill=(230,190,120,140),width=2)
    draw.line((78,1138,642,1138),fill=(230,190,120,110),width=2)
    draw.text((79,76),"UNBODA  /  SAJU JOURNAL",font=f(22),fill=GOLD)
    draw.text((79,1162),"운보다  ·  unboda.kr",font=f(24),fill=MUTED)
    draw.text((580,1162),page,font=f(23),fill=GOLD)

def scene_zodiac(out):
    im,draw=base()
    frame(draw,"02/04")
    center_text(draw,"띠는 태어난 해의 상징",184,47)
    center_text(draw,"열두 동물이 전하는 전통문화 이야기",254,24,MUTED)
    cx,cy=360,665
    draw.ellipse((cx-262,cy-262,cx+262,cy+262),outline=(220,171,91,145),width=3)
    draw.ellipse((cx-211,cy-211,cx+211,cy+211),outline=(220,171,91,95),width=2)
    animals=["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"]
    for i,a in enumerate(animals):
        ang=i*2*math.pi/12-math.pi/2
        x=cx+247*math.cos(ang);y=cy+247*math.sin(ang)
        draw.ellipse((x-36,y-36,x+36,y+36),fill=(29,43,67,255),
          outline=(229,187,110,215),width=2)
        bbox=draw.textbbox((0,0),a,font=f(22))
        draw.text((x-(bbox[2]-bbox[0])/2,y-(bbox[3]-bbox[1])/2-5),a,
          font=f(22),fill=CREAM)
    draw.ellipse((cx-130,cy-130,cx+130,cy+130),
      fill=(27,38,57,255),outline=(229,187,110,255),width=5)
    center_text(draw,"12띠",615,67,GOLD)
    center_text(draw,"태어난 해의 상징",706,28,CREAM)
    center_text(draw,"띠만으로 사주 전체를 알 수는 없어요",1010,29,MUTED)
    im.save(out,optimize=True)

def scene_pillars(out):
    im,draw=base()
    frame(draw,"03/04")
    center_text(draw,"사주는 네 기둥을 봐요",184,51)
    center_text(draw,"해  ·  달  ·  날  ·  시간",261,27,MUTED)
    entries=[("해","태어난 해"),("달","태어난 달"),
      ("날","태어난 날"),("시","태어난 시간")]
    for idx,(head,body) in enumerate(entries):
        row=idx//2;col=idx%2
        x=78+col*296;y=440+row*278
        box=(x,y,x+265,y+235)
        draw.rounded_rectangle(box,radius=23,fill=(30,44,62,255),
          outline=(231,190,115,230),width=2)
        draw.rectangle((x+26,y+35,x+84,y+39),fill=GOLD)
        draw.text((x+27,y+59),head,font=f(72),fill=CREAM)
        draw.text((x+27,y+166),body,font=f(24),fill=MUTED)
    center_text(draw,"네 기둥을 함께 살펴보는 전통 해석",1040,28,MUTED)
    im.save(out,optimize=True)

def scene_cta(out):
    im,draw=base()
    frame(draw,"04/04")
    center_text(draw,"전통 해석으로 가볍게",190,48)
    center_text(draw,"결과를 단정하지 않는 사주 이야기",266,25,MUTED)
    draw.ellipse((120,390,600,870),outline=(225,180,107,165),width=2)
    draw.ellipse((143,413,577,847),outline=(225,180,107,105),width=2)
    draw.ellipse((169,439,551,821),fill=(30,43,62,240),
      outline=(224,179,109,200),width=3)
    center_text(draw,"운보다",551,92,GOLD)
    center_text(draw,"무료 사주 살펴보기",683,36,CREAM)
    center_text(draw,"unboda.kr",912,46,GOLD)
    center_text(draw,"전통문화 참고 정보 · 미래를 보장하지 않습니다",1051,22,MUTED)
    im.save(out,optimize=True)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",required=True)
    a=p.parse_args()
    os.makedirs(a.out,exist_ok=True)
    scene_zodiac(os.path.join(a.out,"zodiac.png"))
    scene_pillars(os.path.join(a.out,"pillars.png"))
    scene_cta(os.path.join(a.out,"cta.png"))
    print("ORIGINAL_SCENE_CARDS_OK",a.out)

if __name__=="__main__":
    main()
