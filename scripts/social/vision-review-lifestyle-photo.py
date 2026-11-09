#!/usr/bin/env python3
"""Offline machine-vision inspection of licensed photo candidates.

Uses CLIP with safetensors at a fixed model revision, no paid model API.
CLIP is fallible. Passing does NOT grant social publication approval:
90-day full SNS history, final post text+media QA and Metricool readback remain
independent requirements. This tool never posts or reserves SNS content.
"""
import argparse
import hashlib
import json
import pathlib
import sys
from PIL import Image
SCENE_CATALOG=json.loads((pathlib.Path(__file__).parent/"lifestyle-photo-scenes.json").read_text(encoding="utf-8"))["slots"]
SCENE_BY_ID={h:{v["id"]:v for v in cfg["scenes"]} for h,cfg in SCENE_CATALOG.items()}
REAL_SCENE_NEGATIVE="a real photograph of a car driving on a highway"
ILLUSTRATION_NEGATIVE="a colorful flat digital vector illustration of an object"
MODEL_ID="openai/clip-vit-base-patch32"
REVISION="aba0d2990c5c81a51290b5e895dda8237b39e0be"
SLOTS={
 "01":("a real photograph of an open handwritten notebook on a desk",
        "a photograph of a car on a highway",
        "a flat digital illustration of a notebook"),
 "04":("a real photograph of a bedroom with pillows a blanket and a bedside lamp",
        "a photograph of an office meeting with people",
        "a vector illustration of a bedroom"),
 "10":("a real photograph of office presentation materials and charts in a meeting room",
        "a photograph of a forest and river",
        "a cartoon drawing of a business presentation"),
 "13":("a real photograph of a shopping receipt wallet and calculator on a table",
        "a photograph of a garden with trees",
        "a 3d rendering of a receipt and calculator"),
 "16":("a real photograph of friends talking to one another",
        "a photograph of a machine in a factory",
        "a hand drawn illustration of people talking"),
 "19":("a real photograph of a family sitting around a dinner table",
        "a photograph of a car parked in a garage",
        "a vector cartoon of a family at a dining table"),
 "22":("a real photograph of a paper checklist and pen on a desk",
        "a photograph of a bed in a hotel",
        "a digital graphic of a checklist")
}
def classify(logits):
 if len(logits)!=3 or any(not isinstance(v,(int,float)) for v in logits):
  return False,"INVALID_MODEL_OUTPUT",None
 # CLIP logits are 100-scaled cosine similarities; require the actual
 # motif to beat BOTH an unrelated real photo and an illustration.
 margin=float(logits[0]-max(logits[1:]))
 return margin>=3.5,("MATCH" if margin>=3.5 else "IMAGE_SCENE_OR_REALISM_NOT_CONFIRMED"),round(margin,3)
def inspect(manifest_path,out_path):
 folder=pathlib.Path(manifest_path).parent
 data=json.loads(pathlib.Path(manifest_path).read_text(encoding="utf-8"))
 photos=data.get("photos")
 if data.get("photoReadyForSnsPosting") is not False or \
    data.get("publicationAllowed") is not False or \
    not isinstance(photos,list) or not 0<=len(photos)<=56 or \
    not {p.get("hourKst") for p in photos}.issubset(set(SLOTS)) or \
    any(sum(x["hourKst"]==h for x in photos)>8 for h in SLOTS) or \
    (len({p.get("hourKst") for p in photos})<7 and data.get("collectionComplete") is not False):
  raise RuntimeError("CANDIDATE_POOLS_NOT_HARD_BLOCKED_OR_INVALID_SEVEN_SLOTS")
 from transformers import CLIPModel,CLIPProcessor
 import torch
 model=CLIPModel.from_pretrained(MODEL_ID,revision=REVISION,
                              use_safetensors=True,trust_remote_code=False)
 processor=CLIPProcessor.from_pretrained(MODEL_ID,revision=REVISION,
                                         trust_remote_code=False)
 model.eval()
 records=[]
 for hour in SLOTS:
  ranked=[]
  for p in (x for x in photos if x["hourKst"]==hour):
   file=folder/p["file"]
   raw=file.read_bytes()
   if hashlib.sha256(raw).hexdigest()!=p.get("sha256"):
    raise RuntimeError("MEDIA_CHANGED_AFTER_RIGHTS_QA:"+hour)
   allowed_scenes=p.get("sceneCandidates",[])
   if not allowed_scenes or not set(allowed_scenes).issubset(set(SCENE_BY_ID[hour])):
    raise RuntimeError("PHOTO_MUST_HAVE_VERIFIABLE_SCENE_EVIDENCE:"+hour)
   with Image.open(file) as im:
    if im.format!="JPEG" or im.size!=(1080,1350):
     raise RuntimeError("MEDIA_PIXEL_FORMAT_CHANGED:"+hour)
    pixels=im.convert("RGB")
   variants=[]
   # Each potential caption scene is checked against actual pixels separately,
   # not by pretending an unrelated scene is visible in the photograph.
   for scene_id in allowed_scenes:
    scene=SCENE_BY_ID[hour][scene_id]
    prompts=[scene["positive"],REAL_SCENE_NEGATIVE,ILLUSTRATION_NEGATIVE]
    inputs=processor(text=prompts,images=pixels,
                     return_tensors="pt",padding=True)
    with torch.no_grad():scores=model(**inputs).logits_per_image[0].tolist()
    passed,reason,margin=classify(scores)
    variants.append({"sceneId":scene_id,"passed":passed,
       "reason":reason,"margin":margin,
       "logits":[round(float(v),3) for v in scores]})
   variants.sort(key=lambda x:x["margin"],reverse=True)
   winner=variants[0]
   ranked.append({"hourKst":hour,"candidateFile":p["file"],
    "source":p["sourcePage"],"candidateSha256":p["sha256"],
    "modelMargin":winner["margin"],"rawLogits":winner["logits"],
    "bestSceneId":winner["sceneId"],
    "photoSubjectKo":SCENE_BY_ID[hour][winner["sceneId"]]["subjectKo"],
    "automatedSceneMatch":winner["passed"],"state":winner["reason"],
    "sceneModelCandidates":variants})
  if not ranked:
   records.append({
    "hourKst":hour,"bestCandidateFile":None,"candidateSha256":None,
    "positivePhotoVsNegativesMargin":None,"automatedSceneMatch":False,
    "state":"NO_LICENSED_PHOTO_CANDIDATE","bestSceneId":None,
    "consideredPhotoCandidates":0,
    "humanVisualReviewed":False,"socialPublicationApproved":False,
    "candidateScores":[]})
   continue
  # Only actual pixel similarity may determine which photo is the best match.
  ranked.sort(key=lambda r:r["modelMargin"],reverse=True)
  best=ranked[0]
  records.append({
   "hourKst":hour,"bestCandidateFile":best["candidateFile"],
   "source":best["source"],"candidateSha256":best["candidateSha256"],
   "bestSceneId":best["bestSceneId"],
   "photoSubjectKo":best["photoSubjectKo"],
   "pixelModel":MODEL_ID,"modelRevision":REVISION,
   "positivePhotoVsNegativesMargin":best["modelMargin"],
   "automatedSceneMatch":best["automatedSceneMatch"],"state":best["state"],
   "consideredPhotoCandidates":len(ranked),
   "humanVisualReviewed":False,"socialPublicationApproved":False,
   "candidateScores":ranked
  })
 result={"schemaVersion":1,"dateKst":data["dateKst"],
  "pixelReviewModel":MODEL_ID,"modelRevision":REVISION,
  "photoReviewCount":len(records),"photoCandidatesScored":len(photos),
  "automatedSceneMatchCount":sum(int(r["automatedSceneMatch"]) for r in records),
  "allAutomatedSceneMatches":all(r["automatedSceneMatch"] for r in records),
  "missingLicensedPhotoSlots":[r["hourKst"] for r in records if r["consideredPhotoCandidates"]==0],
  "collectionComplete":data.get("collectionComplete") is True,
  "wholeSocial90DayCoverageVerified":False,
  "rightsMetadataAutomaticallyChecked":data.get("rightsMachineChecked") is True,
  "publicationAllowed":False,"photoReadyForSnsPosting":False,
  "state":"QA_ONLY_NOT_READY_TO_AUTO_PUBLISH",
  "sceneModelMayFalsePositive":True,
  "humanVisualReviewRequiredForPublishing":True,
  "sensitiveReceiptPrivacyReviewRequired":True,
  "photos":records}
 pathlib.Path(out_path).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("UNBODA_PHOTO_PIXEL_QA_ONLY_NO_SOCIAL_POST",result["dateKst"],
       result["automatedSceneMatchCount"],"/7",len(photos),"candidates tested")

def selftest():
 assert classify([15.0,10.5,11.0])[0]
 assert not classify([12.0,10.0,11.0])[0]
 assert not classify([9.0,11.0,2.0])[0]
 assert not classify([1.0,2.0])[0]
 assert len(SLOTS)==7
 assert len(SCENE_CATALOG)==7 and all(len(x)==3 for x in SCENE_BY_ID.values())
 assert SCENE_BY_ID["13"]["grocery-shelf"]["subjectKo"]
 assert SCENE_BY_ID["19"]["set-table"]["positive"].startswith("a real")
 # CLIP alone MUST NOT be considered human scene review or legal clearance.
 assert classify([25.0,5.0,2.0])[0] is True
 assert all(len(v)==3 for v in SLOTS.values())
 print("PASS_PIXEL_GATE_CONTRACT_NO_FALSE_PUBLISH_SUCCESS")
if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--self-test",action="store_true")
 parser.add_argument("--manifest")
 parser.add_argument("--output")
 args=parser.parse_args()
 if args.self_test:selftest()
 else:
  if not args.manifest or not args.output:parser.error("manifest and output required")
  inspect(args.manifest,args.output)
