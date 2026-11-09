#!/usr/bin/env python3
"""Independent BLIP pixel caption check for staged, openly licensed real photos.

The first CLIP similarity score is NOT sufficient for unattended public posts.
This independent model describes selected photo pixels; a restricted scene
taxonomy then checks whether the caption actually mentions expected objects.
Never grants publication approval, uploads media or calls Metricool.
"""
import argparse
import hashlib
import json
import pathlib
import re
from PIL import Image

MODEL="Salesforce/blip-image-captioning-base"
# Immutable Hugging Face revision containing model.safetensors.
REVISION="6113b5d47c9c19df3a8ea1f8cb2befc835a60a52"
ROOT=pathlib.Path(__file__).resolve().parent
SCENES=json.loads((ROOT/"lifestyle-photo-scenes.json").read_text(encoding="utf-8"))["slots"]
EXPECTED=("01","04","10","13","16","19","22")
def caption_matches(scene,caption):
 if not isinstance(caption,str) or not caption.strip():
  return False
 if not isinstance(scene,dict):return False
 # Search both independent positive-subject and supporting-object sets.
 tokens=scene.get("titleTokens")
 if not isinstance(tokens,list) or len(tokens)!=2:return False
 return all(re.search(pattern,caption,re.I) for pattern in tokens)
def get_scene(hour,scene_id):
 return next((s for s in SCENES.get(hour,{}).get("scenes",[])
   if s["id"]==scene_id),None)
def select_dual_model_photo(hour,first,photos,caption_for_photo):
 """Use the first CLIP-approved photo that BLIP ALSO confirms on real pixels.

 No fallback to an unapproved image or to metadata/title-only matches.
 This fixes discarding all lower-ranked valid candidates on a BLIP failure.
 """
 if not isinstance(first,dict) or not isinstance(photos,list):
  return {"hourKst":hour,"independentSceneChecks":[],
   "blipCaption":"","blipSceneMatch":False,
   "state":"FIRST_MODEL_OR_LICENSED_SCENE_NOT_VERIFIED"}
 ranked=first.get("candidateScores",[])
 if not isinstance(ranked,list) or len(ranked)>8:
  raise RuntimeError("UNVERIFIABLE_OR_TOO_MANY_FIRST_MODEL_CANDIDATES")
 tried=0
 for item in ranked:
  if not isinstance(item,dict) or item.get("automatedSceneMatch") is not True:
   continue
  photo=next((p for p in photos if isinstance(p,dict) and
      p.get("hourKst")==hour and p.get("file")==item.get("candidateFile") and
      p.get("sha256")==item.get("candidateSha256")),None)
  if not photo or not isinstance(photo.get("sceneCandidates"),list):
   raise RuntimeError("CLIP_PASSED_PHOTO_MISSING_OR_CHANGED")
  variants=item.get("sceneModelCandidates")
  if not isinstance(variants,list):
   raise RuntimeError("CLIP_SCENE_PROOF_MISSING")
  scenes=[]
  for variant in variants:
   if not isinstance(variant,dict) or variant.get("passed") is not True:
    continue
   scene=get_scene(hour,variant.get("sceneId"))
   if scene and scene["id"] in photo["sceneCandidates"]:
    scenes.append(scene)
  if not scenes:
   raise RuntimeError("CLIP_CANDIDATE_HAS_NO_VERIFIED_SCENE")
  caption=caption_for_photo(photo)
  tried+=1
  for scene in scenes:
   if caption_matches(scene,caption):
    return {"hourKst":hour,"sceneId":scene["id"],
     "candidateSha256":photo["sha256"],"bestCandidateFile":photo["file"],
     "blipCaption":caption[:180],"blipSceneMatch":True,
     "candidatesIndependentlyChecked":tried,
     "independentSceneChecks":[
       {"model":"openai/clip-vit-base-patch32","pass":True},
       {"model":MODEL,"pass":True}],
     "humanVisualReviewed":False,"state":"TWO_MODELS_MATCH"}
 return {"hourKst":hour,"independentSceneChecks":[],
  "blipCaption":"","blipSceneMatch":False,
  "candidatesIndependentlyChecked":tried,
  "state":"NO_COMMON_SCENE_CONFIRMED_BY_BOTH_MODELS"}

def check(manifest_path,first_review_path,out_path):
 manifest=json.loads(pathlib.Path(manifest_path).read_text())
 review=json.loads(pathlib.Path(first_review_path).read_text())
 if manifest.get("dateKst")!=review.get("dateKst") or \
    manifest.get("publicationAllowed") is not False or \
    review.get("publicationAllowed") is not False:
  raise RuntimeError("PHOTO_SECOND_CHECK_INCONSISTENT_OR_UNSAFE_SOURCE")
 from transformers import BlipProcessor,BlipForConditionalGeneration
 import torch
 # Safe-tensors only, no remote custom code execution; CPU for controlled budget.
 processor=BlipProcessor.from_pretrained(MODEL,revision=REVISION,
                                      trust_remote_code=False)
 model=BlipForConditionalGeneration.from_pretrained(
  MODEL,revision=REVISION,use_safetensors=True,trust_remote_code=False)
 model.eval()
 folder=pathlib.Path(manifest_path).parent
 results=[]
 def caption_image(photo):
  p=folder/photo["file"]
  raw=p.read_bytes()
  if hashlib.sha256(raw).hexdigest()!=photo.get("sha256"):
   raise RuntimeError("PHOTO_BYTES_CHANGED_BETWEEN_FIRST_AND_SECOND_QA")
  with Image.open(p) as im:
   if im.format!="JPEG" or im.size!=(1080,1350):
    raise RuntimeError("UNEXPECTED_SECOND_REVIEW_PHOTO_FORMAT")
   pixels=im.convert("RGB")
  inputs=processor(images=pixels,return_tensors="pt")
  with torch.no_grad():
   ids=model.generate(**inputs,max_new_tokens=35,num_beams=3)
  return processor.decode(ids[0],skip_special_tokens=True).strip().lower()
 for hour in EXPECTED:
  original=next((x for x in review.get("photos",[]) if x.get("hourKst")==hour),None)
  results.append(select_dual_model_photo(hour,original,manifest.get("photos",[]),
                                        caption_image))
 result={"dateKst":manifest["dateKst"],"schemaVersion":1,
  "secondModel":MODEL,"revision":REVISION,
  "verifiedIndependentSceneCount":sum(x.get("blipSceneMatch") is True for x in results),
  "requiredSlotCount":7,
  "photos":results,"photoReadyForSnsPosting":False,
  "publicationAllowed":False,"actualSNSPostAttempted":False,
  "wholeSocial90DayCoverageVerified":False,
  "status":"SECOND_INDEPENDENT_PIXEL_REVIEW_QA_ONLY"}
 pathlib.Path(out_path).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
 print("UNBODA_INDEPENDENT_PIXEL_REVIEW",
       result["verifiedIndependentSceneCount"],"/7 NO_POSTS")
def selftest():
 assert caption_matches(get_scene("13","grocery-shelf"),
       "a grocery store aisle with vegetables and shopping food shelves")
 assert not caption_matches(get_scene("13","grocery-shelf"),
       "a beach with three people standing in the water")
 assert caption_matches(get_scene("19","home-kitchen"),
       "a modern home kitchen with a cooking area and sink")
 assert not caption_matches(get_scene("19","family-meal"),
       "a family sitting together for a portrait outside")
 assert caption_matches(get_scene("10","office-desk"),
       "a computer and laptop on an office desk")
 assert not caption_matches(get_scene("10","office-desk"),
       "an office interior with chairs and a large window")
 assert len(SCENES)==7
 # Real top-ranked CLIP photo can fail the independent caption, while
 # the next lower-ranked CLIP candidate can pass. Only the latter is chosen.
 rank=lambda filename,sha,score: {
  "candidateFile":filename,"candidateSha256":sha,
  "automatedSceneMatch":True,
  "sceneModelCandidates":[{"sceneId":"phone-on-table","passed":True,
                            "margin":score}]}
 top=rank("a.jpg","a"*64,7.1)
 second=rank("b.jpg","b"*64,5.0)
 imgs=[{"hourKst":"16","file":"a.jpg","sha256":"a"*64,
        "sceneCandidates":["phone-on-table"]},
       {"hourKst":"16","file":"b.jpg","sha256":"b"*64,
        "sceneCandidates":["phone-on-table"]}]
 first={"candidateScores":[top,second]}
 def captions(photo):
  return ("a forest by a river" if photo["file"]=="a.jpg"
          else "a mobile phone face down on the table")
 chosen=select_dual_model_photo("16",first,imgs,captions)
 assert chosen["blipSceneMatch"] and chosen["bestCandidateFile"]=="b.jpg"
 assert chosen["candidatesIndependentlyChecked"]==2
 no_match=select_dual_model_photo("16",first,imgs,lambda _: "a forest by a river")
 assert no_match["blipSceneMatch"] is False
 assert select_dual_model_photo("13",None,[],lambda _: "photo")["blipSceneMatch"] is False
 print("PASS_INDEPENDENT_BLIP_ALTERNATIVE_SELECTION_NO_FALSE_PUBLICATION")

if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--self-test",action="store_true")
 parser.add_argument("--manifest")
 parser.add_argument("--first-review")
 parser.add_argument("--out")
 args=parser.parse_args()
 if args.self_test:selftest()
 else:
  if not args.manifest or not args.first_review or not args.out:
   parser.error("manifest, first-review and out required")
  check(args.manifest,args.first_review,args.out)
