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
 for hour in EXPECTED:
  original=next((x for x in review.get("photos",[]) if x.get("hourKst")==hour),None)
  photo=next((p for p in manifest.get("photos",[]) if
       p.get("hourKst")==hour and p.get("file")==original.get("bestCandidateFile")
       and p.get("sha256")==original.get("candidateSha256")),
       None) if original else None
  scene=get_scene(hour,original.get("bestSceneId")) if original else None
  if not original or not scene or not photo or original.get("automatedSceneMatch") is not True:
   results.append({"hourKst":hour,"independentSceneChecks":[],
      "blipCaption":"","blipSceneMatch":False,
      "state":"FIRST_MODEL_OR_LICENSED_SCENE_NOT_VERIFIED"})
   continue
  p=folder/photo["file"]
  raw=p.read_bytes()
  if hashlib.sha256(raw).hexdigest()!=photo.get("sha256"):
   raise RuntimeError("PHOTO_BYTES_CHANGED_BETWEEN_FIRST_AND_SECOND_QA")
  with Image.open(p) as im:
   if im.format!="JPEG" or im.size!=(1080,1350):
    raise RuntimeError("UNEXPECTED_SECOND_REVIEW_PHOTO_FORMAT")
   im=im.convert("RGB")
   inputs=processor(images=im,return_tensors="pt")
  with torch.no_grad():
   ids=model.generate(**inputs,max_new_tokens=35,num_beams=3)
  caption=processor.decode(ids[0],skip_special_tokens=True).strip().lower()
  passed=caption_matches(scene,caption)
  results.append({"hourKst":hour,"sceneId":scene["id"],
   "candidateSha256":photo["sha256"],
   "bestCandidateFile":photo["file"],
   "blipCaption":caption[:180],
   "blipSceneMatch":passed,
   "independentSceneChecks":[
    {"model":"openai/clip-vit-base-patch32","pass":True},
    {"model":MODEL,"pass":passed}
   ],
   "humanVisualReviewed":False,"state":"TWO_MODELS_MATCH" if passed
     else "SECOND_MODEL_CAPTION_DOES_NOT_CONFIRM_SCENE"})
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
 print("PASS_INDEPENDENT_BLIP_SCENE_CAPTION_CONTRACT_NEVER_POST")
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
