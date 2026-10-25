#!/usr/bin/env python3
"""Premium 30-second UNBODA visual renderer (no Korean TTS; NEVER publish).

Source is the original 10-second paid Runway MP4, supplied by a separate
SHA-256 verifier. No new paid generation and no network I/O in this script.
Typography is drawn with locally installed open-source Noto CJK fonts.
"""
import argparse
import json
import math
import random
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
NAVY=(8,18,35)
GOLD=(226,185,113)
CREAM=(252,244,222)
MUTED=(174,185,196)
SERIF="/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
SANS="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

def font(n,serif=False):
    path=SERIF if serif else SANS
    if not Path(path).is_file():
        raise RuntimeError("PREMIUM_KOREAN_FONT_MISSING")
    return ImageFont.truetype(path,n)

def center(draw,text,y,px,serif=True,color=CREAM,maxw=900):
    ft=font(px,serif)
    b=draw.textbbox((0,0),text,font=ft)
    w=b[2]-b[0]
    if w>maxw:
        raise RuntimeError("PREMIUM_TEXT_OVERFLOW:"+text)
    draw.text(((W-w)//2,y-b[1]),text,font=ft,fill=color)

def gradient():
    im=Image.new("RGB",(W,H))
    d=ImageDraw.Draw(im)
    for y in range(H):
        k=.20*math.sin(math.pi*y/H)**2
        d.line((0,y,W,y),fill=(int(7+12*k),int(18+24*k),int(36+42*k)))
    d=ImageDraw.Draw(im,"RGBA")
    rng=random.Random(1107)
    for i in range(110):
        x=rng.randrange(50,W-50)
        y=rng.randrange(70,H-140)
        r=1 if i%5 else 2
        d.ellipse((x-r,y-r,x+r,y+r),fill=(244,204,138,rng.randrange(40,120)))
    return im

def brand(d):
    center(d,"U N B O D A",115,27,False,GOLD)
    d.line((430,175,650,175),fill=(*GOLD,165),width=2)

def footer(d,message="삶의 흐름을 읽는 새로운 방식"):
    d.line((135,1623,945,1623),fill=(*GOLD,90),width=2)
    center(d,message,1668,23,False,MUTED)
    center(d,"unboda.kr",1730,23,False,GOLD)

def zodiac():
    im=gradient();d=ImageDraw.Draw(im,"RGBA");brand(d)
    center(d,"태어난 해가 들려주는",284,59)
    center(d,"열두 가지 이야기",374,75,True,GOLD)
    center(d,"띠는 사주를 이루는 여러 요소 중 하나입니다",510,30,False,MUTED)
    cx,cy=540,1000
    for rad,alpha in ((314,105),(266,65)):
        d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline=(*GOLD,alpha),width=2)
    for i in range(12):
        th=-math.pi/2+math.tau*i/12
        x=cx+315*math.cos(th);y=cy+315*math.sin(th)
        d.ellipse((x-11,y-11,x+11,y+11),fill=(*GOLD,215))
    d.ellipse((cx-194,cy-194,cx+194,cy+194),fill=(16,31,52,250),outline=(*GOLD,225),width=3)
    center(d,"十二支",923,81,True,GOLD)
    center(d,"열두 띠",1046,30,False,CREAM)
    center(d,"사주는 해·달·날·시를 함께 살펴봅니다",1420,30,False,CREAM)
    footer(d)
    return im

def pillars():
    im=gradient();d=ImageDraw.Draw(im,"RGBA");brand(d)
    center(d,"사주를 이루는",280,66)
    center(d,"네 개의 시간",384,83,True,GOLD)
    center(d,"한 사람의 삶을 네 기둥으로 읽는 전통",530,28,False,MUTED)
    for n,(han,head,desc) in enumerate([
        ("年","년주","태어난 해"),("月","월주","태어난 달"),
        ("日","일주","태어난 날"),("時","시주","태어난 시각")]):
        x=128+(n%2)*429;y=702+(n//2)*375
        d.rounded_rectangle((x,y,x+395,y+324),radius=12,fill=(21,37,56,255),outline=(*GOLD,124),width=2)
        d.line((x+42,y+52,x+101,y+52),fill=(*GOLD,220),width=3)
        d.text((x+42,y+68),han,font=font(79,True),fill=GOLD)
        d.text((x+168,y+93),head,font=font(51,True),fill=CREAM)
        d.text((x+45,y+234),desc,font=font(27),fill=MUTED)
    center(d,"네 기둥이 모여 하나의 이야기가 됩니다",1471,28,False,CREAM)
    footer(d)
    return im

def cta():
    im=gradient();d=ImageDraw.Draw(im,"RGBA");brand(d)
    center(d,"전통의 지혜를",304,73)
    center(d,"오늘의 언어로",409,86,True,GOLD)
    center(d,"복잡한 명리를 더 쉽고 차분하게",546,28,False,MUTED)
    cx,cy=540,1024
    for rad,alpha in ((305,70),(284,170),(255,105)):
        d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline=(*GOLD,alpha),width=3)
    d.ellipse((cx-222,cy-222,cx+222,cy+222),fill=(17,31,50,225))
    center(d,"운보다",931,115,True,GOLD)
    center(d,"당신의 사주 이야기를 만나보세요",1120,28,False,CREAM)
    d.rounded_rectangle((239,1382,841,1482),radius=50,outline=(*GOLD,220),width=2,fill=(26,42,62,255))
    center(d,"무료 사주 살펴보기",1408,40,False,CREAM)
    footer(d,"전통문화에 바탕을 둔 참고 정보입니다")
    return im

def intro_template():
    # A clean, single-source typography layer. The Runway clip NEVER owns
    # audience-facing text: its moving ring will be masked into this artwork.
    im=gradient()
    d=ImageDraw.Draw(im,"RGBA")
    brand(d)
    center(d,"지금, 당신의 운은",277,66)
    center(d,"어디로 흐를까요?",382,75,True,GOLD)
    center(d,"사주가 들려주는 당신만의 이야기",523,30,False,MUTED)
    footer(d,"전통 명리에서 찾는 나의 이야기")
    return im

def motion_only_mask():
    # Literal alpha-zero zones for pre-existing Runway subtitles and footer.
    # This is a geometric invariant, not an unreliable text/OCR heuristic.
    mask=Image.new("L",(W,H),0)
    d=ImageDraw.Draw(mask)
    d.ellipse((92,575,988,1390),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(35))
    d=ImageDraw.Draw(mask)
    d.rectangle((0,0,W,609),fill=0)
    d.rectangle((0,1350,W,H),fill=0)
    if mask.crop((0,0,W,610)).getextrema()!=(0,0):
        raise RuntimeError("RUNWAY_BAKED_TITLE_MASK_FAILED")
    if mask.crop((0,1350,W,H)).getextrema()!=(0,0):
        raise RuntimeError("RUNWAY_BAKED_FOOTER_MASK_FAILED")
    return mask

def run(args,timeout=180):
    subprocess.run(args,check=True,timeout=timeout)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",required=True)
    parser.add_argument("--out",required=True)
    args=parser.parse_args()
    source=Path(args.source).resolve()
    out=Path(args.out).resolve()
    if not source.is_file():
        raise RuntimeError("VERIFIED_RUNWAY_SOURCE_REQUIRED")
    out.mkdir(parents=True,exist_ok=True)
    for name,img in (("intro-template.png",intro_template()),
                     ("motion-only-mask.png",motion_only_mask()),
                     ("zodiac.png",zodiac()),("pillars.png",pillars()),("cta.png",cta())):
        img.save(out/name,optimize=True)
    intro=out/"premium-intro.mp4"
    # One typography surface only: original Runway baked words never enter
    # the composited movie. Keep its actual animated celestial core.
    filtergraph=(
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
      "crop=1080:1920,fps=30,crop=1080:1775:0:0,"
      "pad=1080:1920:0:145:color=black,format=rgba[src];"
      "[2:v]format=gray[mask];"
      "[src][mask]alphamerge[fg];"
      "[1:v][fg]overlay=0:0:format=auto,format=yuv420p,"
      "tpad=stop_mode=clone:stop_duration=0.5,settb=AVTB,"
      "setpts=PTS-STARTPTS[o]"
    )
    run(["ffmpeg","-hide_banner","-loglevel","error","-y",
      "-i",str(source),"-loop","1","-framerate","30","-i",str(out/"intro-template.png"),
      "-loop","1","-framerate","30","-i",str(out/"motion-only-mask.png"),
      "-filter_complex",filtergraph,"-map","[o]","-t","10.5",
      "-r","30","-c:v","libx264","-preset","ultrafast","-crf","19",
      "-threads","2","-an",str(intro)],240)
    clips=[intro]
    for i,(name,sec) in enumerate((("zodiac",7.5),("pillars",7.5),("cta",6.0)),1):
        target=out/("premium-scene-"+str(i)+".mp4")
        run(["ffmpeg","-hide_banner","-loglevel","error","-y","-loop","1","-framerate","30","-i",str(out/(name+".png")),
             "-vf","zoompan=z='min(zoom+0.00013,1.028)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,format=yuv420p",
             "-t",str(sec),"-r","30","-c:v","libx264","-preset","ultrafast","-crf","20","-threads","2",str(target)],180)
        clips.append(target)
    filters=[]
    for i,sec in enumerate((10,7,7,6)):
        f_in="" if i==0 else "fade=t=in:st=0:d=0.20,"
        f_out="" if i==3 else f"fade=t=out:st={sec-.25}:d=0.25,"
        filters.append(f"[{i}:v]trim=duration={sec},setpts=PTS-STARTPTS,{f_in}{f_out}format=yuv420p[v{i}]")
    filters.append("[v0][v1][v2][v3]concat=n=4:v=1:a=0[video]")
    target=out/"UNBODA_30s_PREMIUM_TYPOGRAPHY_NO_VOICE.mp4"
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y"]
    for c in clips:
        cmd+=["-i",str(c)]
    cmd+=["-f","lavfi","-i","anullsrc=r=48000:cl=stereo","-filter_complex",";".join(filters),
          "-map","[video]","-map","4:a:0","-t","30","-r","30","-c:v","libx264","-preset","ultrafast",
          "-crf","20","-threads","2","-pix_fmt","yuv420p","-c:a","aac","-b:a","96k","-movflags","+faststart",str(target)]
    run(cmd,240)
    p=subprocess.check_output(["ffprobe","-v","error","-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height","-of","json",str(target)],text=True)
    info=json.loads(p)
    duration=float(info["format"]["duration"])
    streams=info["streams"]
    if not (29.7<=duration<=30.3 and
            any(s.get("codec_name")=="h264" and s.get("width")==W and s.get("height")==H for s in streams) and
            any(s.get("codec_name")=="aac" for s in streams)):
        raise RuntimeError("PREMIUM_RENDER_INVALID")
    run(["ffmpeg","-v","error","-i",str(target),"-f","null","-"],120)
    (out/"VERIFY.txt").write_text(
        "Premium typography real Runway-source 30s visual review only.\n"
        "Original first 10 seconds are genuine Runway generation, verified before this script.\n"
        "NO Korean spoken narration; NOT LICENSE/CONTENT APPROVED. NEVER PUBLISH.\n"
        f"Length {duration:.3f} seconds; 1080x1920 H264/AAC-silence.\n",encoding="utf-8")
    print("PREMIUM_30S_RUNWAY_VISUAL_DRAFT_PASS",target)

if __name__=="__main__":
    main()
