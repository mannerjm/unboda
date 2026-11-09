#!/usr/bin/env python3
"""Host ONLY a fully inspected, topic-matched seven-photo source pack.

This makes stable public media *files*, NOT SNS posts. Every source must pass
Wikimedia rights check, local CLIP, independent BLIP and photo-first copy check.
Publication remains prohibited until 90-day SNS history, provider idempotency
and publicUrl verification independently pass.
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import tempfile
from PIL import Image, ImageDraw
HOURS=("01","04","10","13","16","19","22")
LICENSES={"CC0","Public domain","CC BY 4.0","CC BY-SA 4.0",
          "CC BY 3.0","CC BY-SA 3.0","CC BY 2.5","CC BY-SA 2.5",
          "CC BY 2.0","CC BY-SA 2.0"}
def read(path):return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
def fail(message):raise RuntimeError("PHOTO_IMMUTABLE_HOST_GATE_BLOCKED:"+message)
def checked_date(date):
 import datetime
 try:
  d=datetime.date.fromisoformat(date)
 except (ValueError,TypeError):fail("INVALID_SOURCE_DATE")
 return d
def inspect(brief,raw,vision,second,first_party_catalog,image_dir,output_dir,date):
 checked_date(date)
 if any(x.get("dateKst")!=date for x in (brief,raw,vision,second)) or \
    raw.get("publicationAllowed") is not False or \
    vision.get("publicationAllowed") is not False or \
    second.get("publicationAllowed") is not False or \
    brief.get("publicationAllowed") is not False:
  fail("INCONSISTENT_OR_UNSAFE_DATED_SOURCE")
 if not (raw.get("collectionComplete") is True and
   raw.get("rightsMachineChecked") is True and
   vision.get("allAutomatedSceneMatches") is True and
   second.get("verifiedIndependentSceneCount")==7 and
   len(brief.get("stories",[]))==7):
  fail("SEVEN_SEPARATELY_VERIFIED_SCENES_REQUIRED")
 prods={p["id"]:p for p in first_party_catalog.get("products",[])}
 by_hour=lambda rows,h:next((x for x in rows if x.get("hourKst")==h),None)
 root=pathlib.Path(image_dir)
 out=pathlib.Path(output_dir)
 out.mkdir(parents=True,exist_ok=True)
 used_photos=set()
 assets=[]
 for hour in HOURS:
  article=by_hour(brief["stories"],hour)
  a=by_hour(vision.get("photos",[]),hour)
  b=by_hour(second.get("photos",[]),hour)
  if not article or not a or not b or \
     a.get("automatedSceneMatch") is not True or \
     b.get("blipSceneMatch") is not True:
   fail("UNREVIEWED_SLOT:"+hour)
  if b.get("sceneId")!=article.get("sceneId"):
   fail("PHOTO_FIRST_TEXT_AND_IMAGE_MISMATCH:"+hour)
  selected=next((x for x in raw.get("photos",[]) if
      x.get("hourKst")==hour and x.get("file")==b.get("bestCandidateFile",
         a.get("bestCandidateFile")) and
      x.get("sha256")==b.get("candidateSha256")),None)
  # BLIP can approve a lower-ranked candidate after the CLIP winner fails
  # its independent caption. The final media must still be explicitly present
  # in the original CLIP-ranked, scene-approved pixel inspection.
  ranked=a.get("candidateScores")
  if isinstance(ranked,list):
   same_clipped=any(
    item.get("candidateFile")==b.get("bestCandidateFile") and
    item.get("candidateSha256")==b.get("candidateSha256") and
    item.get("automatedSceneMatch") is True and
    any(v.get("sceneId")==b.get("sceneId") and v.get("passed") is True
        for v in item.get("sceneModelCandidates",[]))
    for item in ranked if isinstance(item,dict))
  else:
   # Older offline regression fixtures do not include the CLIP ranked pool.
   # They can ONLY use the exact first CLIP winner, never an alternate.
   same_clipped=(a.get("bestSceneId")==b.get("sceneId") and
                 a.get("candidateSha256")==b.get("candidateSha256") and
                 a.get("bestCandidateFile")==b.get("bestCandidateFile",
                                                a.get("bestCandidateFile")))
  if not same_clipped:
   fail("ALTERNATE_PHOTO_NOT_APPROVED_BY_CLIP_SCENE:"+hour)
  if not selected or article.get("photoSha256")!=selected.get("sha256") or \
      article.get("photoFile")!=selected.get("file") or \
      article.get("photoSceneModelVerified") is not True:
   fail("HASH_OR_EDITORIAL_REFERENCE_NOT_APPROVED:"+hour)
  if not selected.get("sceneCandidates") or \
     article.get("sceneId") not in selected["sceneCandidates"]:
   fail("NO_SOURCE_METADATA_SCENE_MATCH:"+hour)
  checks=b.get("independentSceneChecks",[])
  if not (len(checks)>=2 and len({x.get("model") for x in checks})>=2 and
          all(x.get("pass") is True for x in checks)):
   fail("INDEPENDENT_VISUAL_MODELS_NOT_BOTH_APPROVED:"+hour)
  rights=selected.get("rights") or {}
  if rights.get("license") not in LICENSES or \
     not rights.get("licenseUrl","").startswith("https://creativecommons.org/"):
   fail("COMMERCIAL_LICENSE_OR_URL_NOT_APPROVED:"+hour)
  if rights["license"].startswith("CC BY") and not rights.get("artist","").strip():
   fail("ATTRIBUTION_AUTHOR_MISSING:"+hour)
  if not selected.get("sourcePage","").startswith("https://commons.wikimedia.org/"):
   fail("NON_COMMONS_SOURCE_NOT_ALLOWED:"+hour)
  product=prods.get(article.get("productId"))
  if not product or article.get("productTitle")!=product.get("title") or \
      article.get("landingPath")!=product.get("landingPath") or \
      not article.get("caption","").count(product["title"]):
   fail("PAID_PRODUCT_CATALOG_OR_COPY_NOT_VERIFIED:"+hour)
  if rights["license"].startswith("CC BY") and \
     (rights.get("artist","") not in article.get("caption","") or
      rights.get("licenseUrl","") not in article.get("caption","")):
   fail("PUBLICATION_COPY_OMITS_LICENSE_ATTRIBUTION:"+hour)
  # A receipt may contain full names, card numbers or private information.
  # Without an additional OCR/privacy gate no receipt photo may be promoted.
  if article.get("sceneId")=="receipt":
   fail("RECEIPT_PRIVATE_INFORMATION_GATE_NOT_VERIFIED:"+hour)
  digest=selected.get("sha256")
  if not isinstance(digest,str) or len(digest)!=64 or \
     any(c not in "0123456789abcdef" for c in digest) or digest in used_photos:
   fail("INVALID_OR_REUSED_PHOTO_HASH:"+hour)
  file=root/selected["file"]
  if not file.is_file() or file.is_symlink() or root.resolve() not in file.resolve().parents:
   fail("MISSING_OR_UNTRUSTED_PHOTO_FILE:"+hour)
  payload=file.read_bytes()
  if hashlib.sha256(payload).hexdigest()!=digest or not 20_000<len(payload)<4_900_000:
   fail("PHOTO_CONTENT_HASH_OR_BYTES_INVALID:"+hour)
  with Image.open(file) as im:
   if im.format!="JPEG" or im.size!=(1080,1350):
    fail("PHOTO_PIXELS_NOT_1080_BY_1350_JPEG:"+hour)
  shutil.copyfile(file,out/("photo-"+hour+".jpg"))
  used_photos.add(digest)
  assets.append({
   "hourKst":hour,"file":"photo-"+hour+".jpg",
   "sha256":digest,"phash":selected.get("phash"),
   "sceneId":article["sceneId"],"topicKey":article["topicKey"],
   "title":article["title"],"productId":product["id"],
   "sourcePage":selected["sourcePage"],"rights":rights,
   "providerPostId":None,"snsPublicationVerified":False
  })
 report={"schemaVersion":1,"brand":"UNBODA","dateKst":date,
    "tag":"unboda-lifestyle-photo-"+date.replace("-",""),
    "source":"Wikimedia Commons licensed original JPEG",
    "assets":assets,"assetCount":len(assets),
    "twoIndependentModelChecksPassed":True,
    "mediaFilesHostedButSnsNotPublished":True,
    "publicationAllowed":False,"photoReadyForSnsPosting":False,
    "wholeSocial90DayCoverageVerified":False,
    "snsRequestsAttempted":0}
 (out/"photo-rights-manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("IMMUTABLE_SEVEN_APPROVED_PHOTO_MEDIA_PACK_PREPARED_NOT_SNS_POSTED",date)
 return report
def selftest():
 with tempfile.TemporaryDirectory() as tmp:
  root=pathlib.Path(tmp)
  src=root/"candidates";src.mkdir()
  out=root/"release"
  day="2026-11-10";catalog={"products":[]}
  brief={"dateKst":day,"publicationAllowed":False,"stories":[]}
  raw={"dateKst":day,"publicationAllowed":False,"collectionComplete":True,
       "rightsMachineChecked":True,"photos":[]}
  vision={"dateKst":day,"publicationAllowed":False,
          "allAutomatedSceneMatches":True,"photos":[]}
  second={"dateKst":day,"publicationAllowed":False,
          "verifiedIndependentSceneCount":7,"photos":[]}
  for i,h in enumerate(HOURS):
   sha=None
   im=Image.new("RGB",(1080,1350),(170+i*5,90+i*12,70+i*7))
   draw=ImageDraw.Draw(im)
   for k in range(200):
    draw.line((k*17%1080,k*29%1350,k*79%1080,k*13%1350),
      fill=((i*20+k)%255,k%255,(k*5)%255),width=3)
   f=src/("candidate-"+h+".jpg");im.save(f,format="JPEG",quality=88)
   sha=hashlib.sha256(f.read_bytes()).hexdigest()
   name="TEST product "+h
   cat={"id":"product-"+h,"title":name,"landingPath":"/paid-analysis/product-"+h}
   catalog["products"].append(cat)
   rights={"license":"CC0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/"}
   scene="test-scene-"+h
   brief["stories"].append({"hourKst":h,"sceneId":scene,"photoSha256":sha,
      "photoFile":f.name,"photoSceneModelVerified":True,
      "productId":cat["id"],"productTitle":name,
      "landingPath":cat["landingPath"],"caption":"운보다 "+name,
      "title":"Everyday life "+h,"topicKey":"test-"+h})
   raw["photos"].append({"hourKst":h,"file":f.name,"sha256":sha,"phash":str(i+1)*16,
      "sceneCandidates":[scene],"sourcePage":"https://commons.wikimedia.org/wiki/File:Example.jpg",
      "rights":rights})
   vision["photos"].append({"hourKst":h,"bestCandidateFile":f.name,"candidateSha256":sha,
     "bestSceneId":scene,"automatedSceneMatch":True})
   second["photos"].append({"hourKst":h,"sceneId":scene,"candidateSha256":sha,
     "blipSceneMatch":True,"independentSceneChecks":[
      {"model":"CLIP","pass":True},{"model":"BLIP","pass":True}]})
  valid=inspect(brief,raw,vision,second,catalog,src,out,day)
  assert valid["assetCount"]==7 and valid["publicationAllowed"] is False
  assert len(list(out.glob("photo-*.jpg")))==7
  second["photos"][3]["blipSceneMatch"]=False
  try:
   inspect(brief,raw,vision,second,catalog,src,root/"bad",day)
   raise AssertionError("Expected independent model rejection")
  except RuntimeError as e:assert "UNREVIEWED_SLOT" in str(e)
  second["photos"][3]["blipSceneMatch"]=True
  raw["photos"][3]["rights"]["license"]="CC BY-NC 4.0"
  try:
   inspect(brief,raw,vision,second,catalog,src,root/"bad2",day)
   raise AssertionError("Expected noncommercial rights rejection")
  except RuntimeError as e:assert "LICENSE" in str(e)
 print("PASS_SEVEN_REAL_JPEG_MEDIA_HOSTING_GATE_WITH_NO_SNS_POSTS")
if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--self-test",action="store_true")
 p.add_argument("--brief");p.add_argument("--manifest");p.add_argument("--vision")
 p.add_argument("--independent");p.add_argument("--catalog")
 p.add_argument("--photos-dir");p.add_argument("--out");p.add_argument("--date")
 a=p.parse_args()
 if a.self_test:selftest()
 else:
  if not all((a.brief,a.manifest,a.vision,a.independent,a.catalog,
              a.photos_dir,a.out,a.date)):
   p.error("All six source paths and target date are required")
  inspect(read(a.brief),read(a.manifest),read(a.vision),
          read(a.independent),read(a.catalog),a.photos_dir,a.out,a.date)
