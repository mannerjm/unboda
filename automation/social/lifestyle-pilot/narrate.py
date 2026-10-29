#!/usr/bin/env python3
"""MeloTTS Korean voice for a storyboard-defined original lifestyle preview.

No paid TTS API, secrets, metrics posting or production publishing.
All FOUR clips must fit the corresponding scene naturally, or the job fails.
"""
import argparse,json,pathlib,subprocess
SCENE_SECONDS=7.5
SCENE_STARTS=[0,7.5,15,22.5]
# 7.5s scenes: leave 0.25s after each cut, 0.35s before next.
# The 6.9s upper limit keeps Korean speech natural (atempo <=1.12)
# while protecting visual boundaries and preventing silent 4s gaps.
START_OFFSET=.25
LIMIT=6.9

def run(*args,timeout=180):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=timeout)
def duration(p):
    return float(run("ffprobe","-v","error","-show_entries","format=duration",
                     "-of","default=noprint_wrappers=1:nokey=1",str(p)).stdout.strip())
def validate_audio(file,limit):
    sec=duration(file)
    if sec<1.2:raise RuntimeError("KOREAN_NARRATION_SEGMENT_TOO_SHORT")
    if sec>limit:
        tempo=sec/limit*1.035
        if tempo>1.12:raise RuntimeError(f"NARRATION_TOO_LONG_FOR_SCENE:{sec:.2f}/{limit:.2f}")
        shorter=file.with_suffix(".short.wav")
        run("ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(file),
            "-af",f"atempo={tempo:.5f}","-ar","48000",str(shorter))
        shorter.replace(file);sec=duration(file)
    if not 1.2<=sec<=limit:raise RuntimeError("KOREAN_VOICE_ALIGNMENT_FAILED")
    return sec

def make_narrated_video(brief_dir,output_dir):
    folder=pathlib.Path(output_dir)
    folder.mkdir(parents=True,exist_ok=True)
    visual=folder/"LIFESTYLE_ORIGINAL_MOTION_NO_VOICE.mp4"
    score=folder/"LIFESTYLE_ORIGINAL_SCORE.wav"
    if not visual.is_file() or not score.is_file() or not 29.7<=duration(visual)<=30.3:
        raise RuntimeError("ORIGINAL_VIDEO_AND_SCORE_REQUIRED")
    brief=json.loads(pathlib.Path(brief_dir).read_text())
    texts=brief.get("narrationDraft")
    if not isinstance(texts,list) or len(texts)!=4:raise RuntimeError("FOUR_KOREAN_SCRIPTS_REQUIRED")
    from melo.api import TTS
    # MeloTTS defaults to Hugging Face Xet token endpoint, which returned HTTP
    # 429 for all four 2026-10-30 videos. Use the author's documented public S3
    # model/config URLs instead. This is the SAME KR voice, not a replacement.
    # No private tokens, newly paid APIs or low-quality voice fallback.
    model=TTS(language="KR",device="cpu",use_hf=False)
    speaker=model.hps.data.spk2id["KR"]
    voices=[];timing=[]
    for i,text in enumerate(texts):
        p=folder/f"lifestyle-voice-{i}.wav"
        model.tts_to_file(text,speaker,str(p),speed=1.04)
        dur=validate_audio(p,LIMIT)
        print(f"KOREAN_SCENE_VOICE_TIMING scene={i+1} sec={dur:.2f} allowed={LIMIT:.2f}",flush=True)
        start=SCENE_STARTS[i]+START_OFFSET
        if start+dur>SCENE_STARTS[i]+SCENE_SECONDS-.3:
            raise RuntimeError("VOICE_OVER_RUNS_NEXT_VISUAL_SCENE")
        voices.append(p)
        timing.append({"scene":i+1,"startSeconds":start,"durationSeconds":round(dur,2)})
    stem=folder/"LIFESTYLE_KOREAN_NARRATION.wav"
    inputs=[]
    filters=[]
    for i,p in enumerate(voices):
        inputs.extend(["-i",str(p)])
        ms=round((SCENE_STARTS[i]+START_OFFSET)*1000)
        filters.append(f"[{i}:a]aresample=48000,adelay={ms}:all=1,apad=whole_dur=30[s{i}]")
    filters.append("[s0][s1][s2][s3]amix=inputs=4:duration=longest:normalize=0,"
                   "atrim=duration=30,aformat=sample_rates=48000:channel_layouts=stereo[a]")
    run("ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,
        "-filter_complex",";".join(filters),"-map","[a]","-t","30",
        "-c:a","pcm_s16le",str(stem),timeout=180)
    output=folder/"LIFESTYLE_30S_KOREAN_PRIVATE_REVIEW.mp4"
    run("ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(visual),"-i",str(score),"-i",str(stem),
        "-filter_complex",
        "[1:a]volume=0.16[bed];"
        "[2:a]highpass=f=90,loudnorm=I=-16:TP=-1.5:LRA=11[voice];"
        "[bed][voice]amix=inputs=2:duration=first:dropout_transition=0,"
        "alimiter=limit=0.95[mixed]",
        "-map","0:v:0","-map","[mixed]","-t","30",
        "-c:v","copy","-c:a","aac","-b:a","160k",
        "-movflags","+faststart",str(output),timeout=180)
    receipt={"state":"NARRATED_LIFESTYLE_REVIEW_ONLY",
       "voiceProvider":"MeloTTS CPU (license/model commercial conditions to review)",
       "scenes":timing,"voiceExists":True,
       "formatSeconds":duration(output),"humanKoreanPronunciationApproved":False,
       "allFootageCommerciallyLicensed":False,
       "originalMotionIsProceduralGraphics":True,"published":False,
       "publicationAllowed":False}
    (folder/"LIFESTYLE_VOICE_PROOF.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n")
    if not 29.7<=receipt["formatSeconds"]<=30.3:raise RuntimeError("FINAL_AUDIO_VIDEO_LENGTH_INVALID")
    print("LIFESTYLE_KOREAN_PRIVATE_REVIEW_GENERATED_NOT_PUBLISHED")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--brief",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    make_narrated_video(a.brief,a.out)
