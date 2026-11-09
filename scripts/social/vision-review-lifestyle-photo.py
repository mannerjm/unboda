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
    not isinstance(photos,list) or not 7<=len(photos)<=56 or \
    {p.get("hourKst") for p in photos}!=set(SLOTS) or \
    any(sum(x["hourKst"]==h for x in photos)>8 for h in SLOTS):
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
   with Image.open(file) as im:
    if im.format!="JPEG" or im.size!=(1080,1350):
     raise RuntimeError("MEDIA_PIXEL_FORMAT_CHANGED:"+hour)
    inputs=processor(text=list(SLOTS[hour]),images=im.convert("RGB"),
                     return_tensors="pt",padding=True)
   with torch.no_grad():scores=model(**inputs).logits_per_image[0].tolist()
   passed,reason,margin=classify(scores)
   ranked.append({"hourKst":hour,"candidateFile":p["file"],
    "source":p["sourcePage"],"candidateSha256":p["sha256"],
    "modelMargin":margin,"rawLogits":[round(float(v),3) for v in scores],
    "automatedSceneMatch":passed,"state":reason})
  if not ranked:raise RuntimeError("PHOTO_CANDIDATE_SLOT_EMPTY:"+hour)
  # Only actual pixel similarity may determine which photo is the best match.
  ranked.sort(key=lambda r:r["modelMargin"],reverse=True)
  best=ranked[0]
  records.append({
   "hourKst":hour,"bestCandidateFile":best["candidateFile"],
   "source":best["source"],"candidateSha256":best["candidateSha256"],
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
  "wholeSocial90DayCoverageVerified":False,
  "rightsMetadataAutomaticallyChecked":data.get("rightsMachineChecked") is True,
  "publicationAllowed":False,"photoReadyForSnsPosting":False,
  "state":"QA_ONLY_NOT_READY_TO_AUTO_PUBLISH","photos":records}
 pathlib.Path(out_path).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("UNBODA_PHOTO_PIXEL_QA_ONLY_NO_SOCIAL_POST",result["dateKst"],
       result["automatedSceneMatchCount"],"/7",len(photos),"candidates tested")

def selftest():
 assert classify([15.0,10.5,11.0])[0]
 assert not classify([12.0,10.0,11.0])[0]
 assert not classify([9.0,11.0,2.0])[0]
 assert not classify([1.0,2.0])[0]
 assert len(SLOTS)==7
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
