#!/usr/bin/env python3
"""Offline CPU Korean MeloTTS voice + archived visual pilot mux. NEVER PUBLISH.
The visual edit is a proof sample: 10s archived old licensed Runway source + 20s
first-party graphics. New production content must have its own original media.
"""
import argparse, json, pathlib, subprocess, sys, wave
def run(*args,timeout=240):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=timeout)
def duration(file):
    return float(run("ffprobe","-v","error","-show_entries","format=duration",
       "-of","default=nokey=1:noprint_wrappers=1",str(file)).stdout.strip())
def validate(audio,limit):
    d=duration(audio)
    if d<1.2: raise RuntimeError(f"VOICE_TOO_SHORT:{d:.2f}s")
    if d>limit:
        # Maximum 12% change: beyond this, reject rather than distort pronunciation.
        tempo=(d/limit)*1.035
        if tempo>1.12:
            raise RuntimeError(f"VOICE_TOO_LONG_FOR_NATURAL_SPEED:{d:.2f}s limit:{limit}s")
        faster=audio.with_name(audio.stem+"-aligned.wav")
        run("ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(audio),
            "-af",f"atempo={tempo:.5f}","-ar","48000",str(faster))
        faster.replace(audio)
        d=duration(audio)
    if d>limit or d<1.2:
        raise RuntimeError(f"VOICE_ALIGNMENT_FAILED:{d:.2f}s limit:{limit}s")
    return d
TEXTS=[
 "띠만 알면 사주도 다 알 수 있을까요? 사실 둘은 조금 다릅니다.",
 "띠는 태어난 해를 열두 동물로 표현한 전통 상징이에요.",
 "사주는 태어난 해와 달, 날, 시간을 함께 보는 전통 해석이에요.",
 "미래를 단정하지 말고, 가볍게 참고해 보세요."
]
DELAYS=[1000,10200,17700,24800]
LIMITS=[8.7,7.2,6.8,5.0]
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--visual",required=True)
    p.add_argument("--out",required=True)
    p.add_argument("--speed",type=float,default=1.03)
    args=p.parse_args()
    if args.speed<0.9 or args.speed>1.14: raise ValueError("VOICE_SPEED_OUTSIDE_QA_RANGE")
    base=pathlib.Path(args.out);base.mkdir(parents=True,exist_ok=True)
    from melo.api import TTS
    model=TTS(language="KR",device="cpu")
    speaker=model.hps.data.spk2id["KR"]
    segments=[]
    for i,text in enumerate(TEXTS):
        f=base/f"voice-{i+1}.wav"
        model.tts_to_file(text,speaker,str(f),speed=args.speed)
        actual=validate(f,LIMITS[i])
        segments.append({"scene":i+1,"duration":round(actual,2),
                         "startMs":DELAYS[i],"text":text})
    inputs=[]
    filter_parts=[]
    for i in range(4):
        inputs.extend(["-i",str(base/f"voice-{i+1}.wav")])
        filter_parts.append(f"[{i}:a]aresample=48000,adelay={DELAYS[i]}:all=1[v{i}]")
    filter_parts.append("[v0][v1][v2][v3]amix=inputs=4:duration=longest:normalize=0,"
                        "aformat=sample_rates=48000:channel_layouts=stereo[speech]")
    master=base/"UNBODA_30s_KOREAN_NARRATION.wav"
    run("ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,
        "-filter_complex",";".join(filter_parts),"-map","[speech]","-t","30",
        "-c:a","pcm_s16le",str(master),timeout=120)
    full=base/"UNBODA_30s_KOREAN_NARRATED_REVIEW_NOT_PUBLISHED.mp4"
    visual=pathlib.Path(args.visual)
    if not visual.exists() or not 29.7<=duration(visual)<=30.3:
        raise RuntimeError("VISUAL_30S_SOURCE_UNVERIFIED")
    run("ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(visual),"-i",str(master),
        "-filter_complex",
        "[0:a]volume=0.14[background];[1:a]volume=1.10,"
        "highpass=f=90,loudnorm=I=-16:TP=-1.5:LRA=11[narrator];"
        "[background][narrator]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.95[mix]",
        "-map","0:v:0","-map","[mix]","-c:v","copy",
        "-c:a","aac","-b:a","160k","-movflags","+faststart",
        "-t","30",str(full),timeout=120)
    info=json.loads(run("ffprobe","-v","error","-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height","-of","json",str(full)).stdout)
    vs=info.get("streams",[])
    valid=bool(29.7<=float(info["format"]["duration"])<=30.3
        and any(s.get("codec_name")=="h264" and s.get("width")==1080
            and s.get("height")==1920 for s in vs)
        and any(s.get("codec_name")=="aac" for s in vs))
    if not valid: raise RuntimeError("OUTPUT_FORMAT_INVALID")
    proof={"file":str(full),"formatVerified":valid,"commercialReleaseApproved":False,
      "published":False,"voiceModel":"myshell-ai/MeloTTS-Korean",
      "ttsCodeLicense":"MIT; review third-party and trained-model terms",
      "narrationExists":True,"pronunciationHumanReviewed":False,
      "sourceContainsArchivedRunwayFootage":True,
      "originalityReleaseApproved":False,"scenes":segments}
    (base/"VOICE_VIDEO_PROOF.json").write_text(json.dumps(proof,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("KOREAN_TTS_REVIEW_READY_OUTPUT_FORMAT_VERIFIED")
    print("PUBLICATION=DISABLED VOICE_PRONUNCIATION_REVIEW=PENDING")
if __name__=="__main__": main()
