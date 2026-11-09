#!/usr/bin/env python3
"""Download candidate Wikimedia Commons photographs, not social-publishable assets.

Source must be verified before ANY social publishing: real photographic pixels,
rights, visible scene objects and 90-day originality. This tool deliberately
stamps all resulting imagery 'PUBLICATION_BLOCKED' pending a visual inspection
which cannot be inferred from filenames, Commons titles, or metadata.
No user data / paid APIs / SNS writes.
"""
import argparse
import hashlib
import html
import io
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from PIL import Image, ImageOps, ImageDraw

HOST="commons.wikimedia.org"
MEDIA_HOST="upload.wikimedia.org"
USER_AGENT="UNBODAOriginalPhotoRightsAudit/1.0 (+https://unboda.kr)"
MAX_DOWNLOAD=16_000_000
MAX_OUTPUT=4_900_000
SLOTS=("01","04","10","13","16","19","22")
ALLOWED={
 "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
 "Public domain": "https://creativecommons.org/publicdomain/mark/1.0/",
 "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/"
}
BAD_NAME=re.compile(r"(?:illustration|painting|drawing|render|diagram|cartoon|vector|logo|poster|screenshot|watermark|svg)",re.I)
def plain(value):
 return re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]*>"," ",str(value or "")))).strip()
def metadata(raw):
 return {k: plain(v.get("value","")) for k,v in (raw or {}).items()}
def license_result(item):
 meta=metadata(item.get("extmetadata"))
 name=meta.get("LicenseShortName")
 if name not in ALLOWED:
  return None
 if name=="CC BY 4.0" and not(meta.get("Artist") and meta.get("LicenseUrl")):
  return None
 if name=="CC BY 4.0" and not meta["LicenseUrl"].startswith(ALLOWED[name]):
  return None
 return {"license":name,"licenseUrl":ALLOWED[name],
  "artist":meta.get("Artist","")[:150],
  "credit":meta.get("Credit","")[:150],
  "description":meta.get("ImageDescription","")[:300]}
def get(url,limit=MAX_DOWNLOAD):
 parts=urllib.parse.urlparse(url)
 if parts.scheme!="https" or parts.hostname not in (HOST,MEDIA_HOST):
  raise RuntimeError("REMOTE_ORIGIN_NOT_ALLOWLISTED")
 request=urllib.request.Request(url,headers={
  "User-Agent":USER_AGENT,"Accept":"image/jpeg,application/json"})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(request,timeout=25) as res:
    # urllib may follow redirects; verify the final destination too.
    final=urllib.parse.urlparse(res.geturl())
    if final.scheme!="https" or final.hostname not in (HOST,MEDIA_HOST):
     raise RuntimeError("REMOTE_REDIRECT_NOT_ALLOWLISTED")
    mime=res.headers.get("content-type","").split(";",1)[0].strip().lower()
    if mime not in ("application/json","image/jpeg","image/pjpeg"):
     raise RuntimeError("INVALID_REMOTE_MEDIA_TYPE:"+mime)
    blob=res.read(limit+1)
    if not blob or len(blob)>limit:raise RuntimeError("REMOTE_FILE_TOO_LARGE")
    return mime,blob
  except (TimeoutError,urllib.error.URLError) as e:
   if attempt==2:raise
   time.sleep(3*(attempt+1))
 raise RuntimeError("HTTP_FETCH_EXHAUSTED")
def search_commons(q,offset):
 params={
   "action":"query","format":"json","generator":"search",
   "gsrsearch":q+" filetype:bitmap", "gsrnamespace":"6",
   "gsrlimit":"40","gsroffset":str(offset),
   "prop":"imageinfo","iiprop":"url|size|mime|extmetadata",
   "iiextmetadatafilter":"LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription",
   "iiurlwidth":"1080"
 }
 url="https://"+HOST+"/w/api.php?"+urllib.parse.urlencode(params)
 _,raw=get(url,2_000_000)
 data=json.loads(raw)
 if not isinstance(data.get("query",{}).get("pages"),dict):
  raise RuntimeError("COMMONS_QUERY_MISSING_PAGES")
 return sorted(data["query"]["pages"].values(),key=lambda p:p.get("index",999))
def convert_to_photo_jpeg(raw):
 Image.MAX_IMAGE_PIXELS=35_000_000
 with Image.open(io.BytesIO(raw)) as im:
  if im.format!="JPEG" or im.width<640 or im.height<640:
   raise RuntimeError("NOT_A_SUITABLE_ORIGINAL_JPEG_PHOTO")
  if im.width/im.height>3 or im.height/im.width>3:
   raise RuntimeError("EXTREME_ASPECT_RATIO")
  exif=im.getexif()
  camera=str(exif.get(271,"")).strip()+" "+str(exif.get(272,"")).strip()
  im=ImageOps.exif_transpose(im).convert("RGB")
  # Pad rather than center-crop: cropping can hide the actual depicted object.
  im.thumbnail((1080,1350),Image.Resampling.LANCZOS)
  out=Image.new("RGB",(1080,1350),(245,245,245))
  out.paste(im,((1080-im.width)//2,(1350-im.height)//2))
  buffer=io.BytesIO()
  out.save(buffer,format="JPEG",quality=84,optimize=True,progressive=True)
  blob=buffer.getvalue()
  if not 20000<len(blob)<MAX_OUTPUT:raise RuntimeError("OUTPUT_JPEG_SIZE_INVALID")
  tiny=out.resize((8,8)).convert("L")
  average=sum(tiny.getdata())/64
  perceptual=sum((1<<i) for i,v in enumerate(tiny.getdata()) if v>average)
  return blob,hashlib.sha256(blob).hexdigest(),f"{perceptual:016x}",camera.strip()
def near_duplicate(a,b):
 return (int(a,16)^int(b,16)).bit_count()<=6
def choose_photo(query,history,slot,offset):
 rejected={}
 for page in search_commons(query,offset):
  name=page.get("title","")
  if BAD_NAME.search(name) or not re.search(r"\.jpe?g$",name,re.I):
   rejected["filename"]=rejected.get("filename",0)+1
   continue
  infos=page.get("imageinfo") or []
  if not infos:continue
  info=infos[0]
  if info.get("mime")!="image/jpeg":
   continue
  rights=license_result(info)
  if not rights:
   rejected["license"]=rejected.get("license",0)+1
   continue
  media=info.get("thumburl") or info.get("url","")
  parsed=urllib.parse.urlparse(media)
  if parsed.scheme!="https" or parsed.hostname!=MEDIA_HOST:
   continue
  try:
   mime,raw=get(media)
   if mime not in ("image/jpeg","image/pjpeg"):continue
   photo,sha,phash,camera=convert_to_photo_jpeg(raw)
  except Exception:
   rejected["media"]=rejected.get("media",0)+1
   continue
  if any(row.get("sha256")==sha or (
      isinstance(row.get("phash"),str) and len(row["phash"])==16 and
      near_duplicate(phash,row["phash"])) for row in history):
   rejected["duplicate"]=rejected.get("duplicate",0)+1
   continue
  # Metadata and filename do not prove that the image actually depicts
  # the source story. Never claim visual inspection here.
  return photo,{
   "hourKst":slot,"sourceName":name,"sourcePage":info.get("descriptionurl",""),
   "originalUrl":info.get("url",""),"downloadedThumbnailUrl":media,
   "sha256":sha,"phash":phash,"bytes":len(photo),"width":1080,"height":1350,
   "rights":rights,"cameraExif":camera[:90],
   "photoCandidateOnly":True,"imageVisuallyInspected":False,
   "sceneMatchVerified":False,"publicationAllowed":False
  }
 raise RuntimeError("NO_LICENSED_UNDUPLICATED_REAL_PHOTO_CANDIDATE:"+slot+
                    ":"+json.dumps(rejected,ensure_ascii=False))
def load_history(d):
 rows=[]
 if not d:return rows
 for file in pathlib.Path(d).glob("*.json"):
  j=json.loads(file.read_text())
  if not isinstance(j.get("photos"),list):continue
  rows.extend(j["photos"])
 return rows
def run(brief,target,history_dir,output):
 source=json.loads(pathlib.Path(brief).read_text(encoding="utf-8"))
 if source.get("dateKst")!=target or len(source.get("stories",[]))!=7:
  raise RuntimeError("PREPARED_SEVEN_DATED_EDITORIAL_SOURCE_REQUIRED")
 if source.get("photoPostingApproved") is not False:
  raise RuntimeError("CANNOT_TREAT_EDITORIAL_AS_PHOTO_PUBLICATION_APPROVAL")
 output=pathlib.Path(output);output.mkdir(parents=True,exist_ok=True)
 history=load_history(history_dir)
 # Rotate the Commons search offset across successive days to avoid selecting
 # the same first 40 files again when the 90-day library grows.
 days=(__import__('datetime').date.fromisoformat(target)-
       __import__('datetime').date(2026,11,10)).days
 items=[]
 for story in source["stories"]:
  if story["hourKst"] not in SLOTS:raise RuntimeError("BAD_LIFESTYLE_SLOT")
  query=story.get("photoSearchQuery","")
  if not re.fullmatch(r"[a-zA-Z ]{15,120}",query):
   raise RuntimeError("UNREVIEWED_REMOTE_PHOTO_QUERY")
  photo,record=choose_photo(query,history+items,story["hourKst"],(days%5)*40)
  filename="candidate-"+record["hourKst"]+".jpg"
  (output/filename).write_bytes(photo)
  record["file"]=filename
  record["photoMustDepict"]=story.get("photoMustDepict",[])
  record["dateKst"]=target
  items.append(record)
 manifest={
  "schemaVersion":1,"brand":"UNBODA","dateKst":target,"photos":items,
  "rightsMachineChecked":True,"sizeAndMimeChecked":True,
  "actualVisualSceneInspected":False,"photoReadyForSnsPosting":False,
  "publicationAllowed":False,"state":"SEVEN_CANDIDATES_REQUIRE_PIXEL_SCENE_QA",
  "source":"Wikimedia Commons original licensed image pages"
 }
 (output/"candidate-manifest.json").write_text(
  json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print("COMMONS_SEVEN_PHOTO_CANDIDATES_RIGHTS_AND_FORMAT_VERIFIED_NOT_FOR_PUBLICATION",target)
def selftest():
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"All rights reserved"}}}) is None
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC BY 4.0"}}}) is None
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC0"}}})["license"]=="CC0"
 x=Image.new("RGB",(1400,1600),(200,130,95))
 d=ImageDraw.Draw(x)
 for i in range(1800):
  d.line(((i*37)%1400,(i*71)%1600,
          (i*113+59)%1400,(i*29+227)%1600),
         fill=((i*47)%256,(i*73)%256,(i*31)%256),width=3)
 o=io.BytesIO();x.save(o,format="JPEG",quality=90)
 raw,sha,phash,camera=convert_to_photo_jpeg(o.getvalue())
 assert raw[:2]==b"\xff\xd8" and len(sha)==64 and len(phash)==16
 assert near_duplicate(phash,phash)
 assert not near_duplicate("0000000000000000","ffffffffffffffff")
 assert not metadata({"Artist":{"value":"<a href='x'>Jane</a> Doe"}})["Artist"].startswith("<")
 print("PHOTO_SOURCE_OFFLINE_RIGHTS_MEDIA_AND_DEDUP_GATES_PASSED")
if __name__=="__main__":
 ap=argparse.ArgumentParser()
 ap.add_argument("--self-test",action="store_true")
 ap.add_argument("--brief");ap.add_argument("--date");ap.add_argument("--history-dir")
 ap.add_argument("--output")
 args=ap.parse_args()
 if args.self_test:selftest()
 else:
  if not (args.brief and args.date and args.output):
   ap.error("date, brief and output are required")
  run(args.brief,args.date,args.history_dir,args.output)
