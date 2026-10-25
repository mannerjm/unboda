#!/usr/bin/env python3
"""Pilot-specific Runway-asset 9:16 cover. NEVER publishes. NOT general-purpose.
The archived first Runway film has baked text above and below the central orbit.
The approved ROI must not be reused for any different source without re-review.
"""
import argparse,random,subprocess,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageChops
W,H=1080,1920
SERIF="/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SANS="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
def ft(path,size):
    if not Path(path).is_file():raise RuntimeError("KOREAN_FONT_REQUIRED")
    return ImageFont.truetype(path,size)
def make(source,destination):
    proc=subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-ss","4",
        "-i",str(source),"-vf","scale=1080:1920","-frames:v","1",
        "-f","image2pipe","-vcodec","png","pipe:1"],check=True,capture_output=True)
    src=Image.open(io.BytesIO(proc.stdout)).convert("RGB")
    # Text-free central region only. Never composite the existing headline/footer.
    roi=src.crop((25,660,1055,1340)).resize((1010,710),Image.Resampling.LANCZOS).convert("RGBA")
    mask=Image.new("L",(1010,710),0)
    d=ImageDraw.Draw(mask)
    d.ellipse((18,0,992,710),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(65))
    band=Image.new("L",(1010,710),0)
    b=ImageDraw.Draw(band)
    for y in range(710):
        alpha=round(255*min(1,max(0,y/155),max(0,(709-y)/175)))
        b.line((0,y,1010,y),fill=alpha,width=1)
    mask=ImageChops.multiply(mask,band)
    roi.putalpha(mask)
    bg=Image.new("RGB",(W,H),(4,12,27));d=ImageDraw.Draw(bg)
    for y in range(H):
        val=max(0,1-((y-940)/1230)**2)
        d.line((0,y,W,y),fill=(int(4+13*val),int(12+17*val),int(28+22*val)))
    im=bg.convert("RGBA")
    stars=Image.new("RGBA",(W,H),(0,0,0,0));d=ImageDraw.Draw(stars,"RGBA")
    r=random.Random(20261025)
    for i in range(230):
        x,y=r.randrange(24,W-24),r.randrange(35,H-60)
        s=1 if i%5 else 2
        d.ellipse((x-s,y-s,x+s,y+s),fill=(249,209,146,r.randrange(35,150)))
    im=Image.alpha_composite(im,stars)
    im.alpha_composite(roi,(35,748))
    d=ImageDraw.Draw(im,"RGBA")
    gold=(239,194,122,255);white=(255,243,217,255);muted=(201,206,212,255)
    def t(s,y,font,color):
        if d.textbbox((0,0),s,font=font)[2]>920:raise RuntimeError("THUMB_TEXT_OVERFLOW")
        d.text((540,y),s,font=font,anchor="mt",fill=color)
    t("U N B O D A",119,ft(SANS,26),gold)
    d.line((112,158,387,158),fill=(*gold[:3],150),width=2)
    d.line((693,158,968,158),fill=(*gold[:3],150),width=2)
    t("띠만 알면",305,ft(SERIF,105),white)
    t("사주도 알까?",443,ft(SERIF,108),gold)
    t("열두 띠와 사주 네 기둥의 차이",609,ft(SANS,32),muted)
    d.line((180,1549,900,1549),fill=(*gold[:3],165),width=2)
    t("운보다",1610,ft(SERIF,87),white)
    t("나를 이해하는 사주의 시작",1735,ft(SANS,31),muted)
    Path(destination).parent.mkdir(parents=True,exist_ok=True)
    im.convert("RGB").save(destination,quality=95,subsampling=0,optimize=True)
    # 3:4 feed crop must retain the two headline lines.
    thumb=Image.open(destination)
    if thumb.size!=(W,H):raise RuntimeError("THUMB_SIZE_INVALID")
    return destination
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    print("PREMIUM_COVER_PILOT_ONLY",make(a.source,a.out))
