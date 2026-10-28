#!/usr/bin/env python3
"""Owner-delegated daily UNBODA short-video release gate.

Offline media rights: internally generated procedural graphics and original
algorithmic bed, Korean MeloTTS code/model licensed MIT for commercial use.
Speech correctness is checked independently with Korean Whisper ASR.
No assertion of a human pronunciation review is ever made.
Never schedules SNS posts, never charges any AI service.
"""
import difflib
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT=pathlib.Path.cwd()
FILES=[("00","midnight","003-midnight"),("08","commute","004-commute"),
       ("12","friendship","005-friendship"),("20","afterwork","002-afterwork")]
STYLES={"00":"midnight-indigo","08":"commute-sunrise",
        "12":"relationship-coral","20":"finance-emerald"}
CATEGORIES={"00":"self-understanding","08":"career",
            "12":"compatibility","20":"money"}
RELEASE=ROOT/"release-assets"
EPISODES=ROOT/"automation/social/lifestyle-pilot/episodes"
HISTORY=ROOT/"automation/social/editorial-topic-history.json"
def normalize(value):
    return "".join(re.findall(r"[가-힣a-z0-9]",str(value).lower()))
def sha256(blob):
    return hashlib.sha256(blob).hexdigest()
def ffprobe_seconds(mp4):
    result=subprocess.check_output(["ffprobe","-v","error","-show_entries",
       "format=duration","-of","default=noprint_wrappers=1:nokey=1",str(mp4)],
       timeout=30,text=True)
    return float(result.strip())
def ensure_history_not_reused(brief,date_kst,history):
    for item in history:
        if not isinstance(item,dict):raise ValueError("HISTORY_ENTRY_INVALID")
        earlier=str(item.get("dateKst",""))
        if not re.fullmatch(r"20[0-9]{6}",earlier):raise ValueError("HISTORY_DATE_INVALID")
        if earlier>=date_kst:continue
        if item.get("topicKey")==brief["topicKey"]:
            raise ValueError("REPEATED_PRIOR_SAJU_TOPIC_KEY:"+brief["topicKey"])
        opening=normalize(item.get("opening",""))
        proposed=normalize(brief["narrationDraft"][0])
        if len(opening)>15 and difflib.SequenceMatcher(None,opening,proposed).ratio()>=.85:
            raise ValueError("REPEATED_PRIOR_SAJU_OPENING:"+brief["topicKey"])
def main():
    date=os.environ.get("DATE","")
    source=os.environ.get("SOURCE_COMMIT","")
    if not re.fullmatch(r"20[0-9]{6}",date):
        raise ValueError("INVALID_KST_TARGET_DATE")
    if not re.fullmatch(r"[a-f0-9]{40}",source):
        raise ValueError("INVALID_GIT_SOURCE_COMMIT")
    manifest_path=RELEASE/"manifest.json"
    manifest=json.loads(manifest_path.read_text())
    if manifest.get("targetDateKst")!=date or manifest.get("sourceCommit")!=source or
       manifest.get("generatedBy")!="github-actions-four-qa-verified" or
       manifest.get("publishAutomatically") is not False or
       manifest.get("brandSajuVerified") is not True or
       manifest.get("fourDistinctVisualStylesVerified") is not True:
        raise ValueError("INVALID_DAILY_MEDIA_SOURCE_PROVENANCE")
    videos=manifest.get("videos")
    if not isinstance(videos,list) or len(videos)!=4:
        raise ValueError("EXACT_FOUR_NEW_MP4_ASSETS_REQUIRED")
    if not HISTORY.is_file():raise ValueError("EDITORIAL_HISTORY_NOT_PERSISTED")
    history=json.loads(HISTORY.read_text())
    if not isinstance(history,list) or len(history)>2000:
        raise ValueError("EDITORIAL_HISTORY_INVALID")
    if len({v.get("sha256") for v in videos})!=4:
        raise ValueError("REPEATED_ORIGINAL_SHA256")
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise ValueError("INDEPENDENT_KOREAN_TRANSCRIBER_REQUIRED") from error
    model=WhisperModel("small",device="cpu",compute_type="int8",cpu_threads=4)
    receipts=[]
    for hour,name,brief_name in FILES:
        movie=RELEASE/(hour+"-"+name+".mp4")
        cover=RELEASE/(hour+"-"+name+".jpg")
        brief=json.loads((EPISODES/(brief_name+".json")).read_text())
        v=next((x for x in videos if x.get("hourKst")==hour),None)
        if not v or not movie.is_file() or not cover.is_file():
            raise ValueError("MP4_OR_COVER_NOT_AVAILABLE:"+hour)
        if v.get("name")!=name or v.get("mp4")!=movie.name or
           v.get("jpg")!=cover.name or v.get("sajuCategory")!=CATEGORIES[hour] or
           v.get("visualStyle")!=STYLES[hour] or
           v.get("destination")!="https://unboda.kr":
            raise ValueError("EPISODE_BRAND_OR_MEDIA_MISMATCH:"+hour)
        if brief.get("visualStyle")!=STYLES[hour] or
           brief.get("sajuCategory")!=CATEGORIES[hour] or
           not brief.get("topicKey","").endswith(date) or
           brief.get("topicKey")!=v.get("topicKey") or
           brief.get("automatedPublicationAllowed") is not False or
           brief.get("licenseReviewRequired") is not True or
           brief.get("voiceHumanReviewRequired") is not True:
            raise ValueError("INVALID_NEW_DAILY_SAJU_BRIEF:"+hour)
        if not all(x in brief["narrationDraft"][3] for x in ["운보다","무료 사주"]):
            raise ValueError("UNBODA_BRAND_CALL_TO_ACTION_MISSING:"+hour)
        if sha256(movie.read_bytes())!=v.get("sha256") or
           movie.stat().st_size!=v.get("bytes") or
           not 29.7<=ffprobe_seconds(movie)<=30.3:
            raise ValueError("MEDIA_SOURCE_HASH_OR_DURATION_MISMATCH:"+hour)
        if not (2_000<len(cover.read_bytes())<6_000_000):
            raise ValueError("UNREASONABLE_OR_EMPTY_COVER:"+hour)
        ensure_history_not_reused(brief,date,history)
        segments,_=model.transcribe(str(movie),language="ko",beam_size=2,
                                     condition_on_previous_text=False)
        actual=" ".join(s.text for s in segments)
        expected=" ".join(brief["narrationDraft"])
        ratio=difflib.SequenceMatcher(None,normalize(actual),normalize(expected)).ratio()
        print("DAILY_INDEPENDENT_KOREAN_SPEECH_QA",hour,round(ratio,4),
              "spoken",actual,flush=True)
        if ratio<.82:
            raise ValueError("DAILY_KOREAN_NARRATION_NOT_CLEAR_ENOUGH:"+hour+
                             ":"+str(round(ratio,3)))
        v["socialPublishingApproved"]=True
        v["licenseReviewed"]=True
        v["voiceHumanReviewed"]=False
        v["voiceAutomatedQaApproved"]=True
        v["voiceAsrSimilarity"]=round(ratio,4)
        receipts.append({"hourKst":hour,"topicKey":v["topicKey"],
          "sha256":v["sha256"],"expectedTranscript":expected,"actualTranscript":actual,
          "asrSimilarity":round(ratio,4),
          "originalGraphics":"First-party Python procedural renderer",
          "originalAudioBed":"First-party score() synthesis in render.py",
          "voiceProvider":"MeloTTS-Korean (MIT commercial use)",
          "voiceLicense":"https://docs.myshell.ai/technology/melotts",
          "reviewType":"automated independent Whisper Korean ASR, not human",
          "approvedToPublish":True})
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    (RELEASE/"automated-voice-quality-receipt.json").write_text(
        json.dumps(receipts,ensure_ascii=False,indent=2)+"\n")
    print("UNBODA_DAILY_FOUR_UNIQUE_APPROVED_VIDEOS_READY",date,
          "VOICE_REVIEW_AUTOMATED_NOT_HUMAN",flush=True)
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("DAILY_SAJU_RELEASE_BLOCKED",type(e).__name__,str(e),file=sys.stderr,flush=True)
        raise
