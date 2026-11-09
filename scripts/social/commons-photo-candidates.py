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
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from PIL import Image, ImageOps, ImageDraw

SCENE_CATALOG=json.loads((pathlib.Path(__file__).parent/"lifestyle-photo-scenes.json").read_text(encoding="utf-8"))["slots"]

HOST="commons.wikimedia.org"
OPENVERSE_HOST="api.openverse.org"
MEDIA_HOST="upload.wikimedia.org"
USER_AGENT="UNBODAOriginalPhotoRightsAudit/1.0 (+https://unboda.kr)"
# One upstream 401/403/429 stops Openverse for this execution; never evade limits.
OPENVERSE_PAUSED_STATUS=None
MAX_DOWNLOAD=16_000_000
MAX_OUTPUT=4_900_000
SLOTS=("01","04","10","13","16","19","22")
ALLOWED={
 "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
 "Public domain": "https://creativecommons.org/publicdomain/mark/1.0/",
 "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
 "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
 "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
 "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
 "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
 "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
 "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
 "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/"
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
 if name.startswith("CC BY") and not(meta.get("Artist") and meta.get("LicenseUrl")):
  return None
 if name.startswith("CC BY"):
  # Commons may report the same CC license over HTTP or without its
  # optional trailing slash. Normalize only exact Creative Commons
  # license URLs; never broaden to NC/ND or lookalike domains.
  supplied=urllib.parse.urlparse(meta["LicenseUrl"])
  approved=urllib.parse.urlparse(ALLOWED[name])
  if supplied.scheme not in ("http","https") or \
     supplied.hostname!="creativecommons.org" or \
     supplied.username or supplied.password or supplied.port or \
     supplied.query or supplied.fragment or \
     supplied.path.rstrip("/")!=approved.path.rstrip("/"):
   return None
 return {"license":name,"licenseUrl":ALLOWED[name],
  "artist":meta.get("Artist","")[:150],
  "credit":meta.get("Credit","")[:150],
  "shareAlikeAdaptationRequired":name.startswith("CC BY-SA"),
  "description":meta.get("ImageDescription","")[:300]}

# Photographic subject is NOT proven by a high embedding score alone.
# These deliberately conservative title/description pairs avoid obvious
# unrelated historical scans, buildings and generic family portraits.
SCENE_WORD_PAIRS={
 "01":(r"notebook|notepad|journal|study notes|planner|writing pad",
       r"handwrit|written|pen|pencil|desk|notes|writing"),
 "04":(r"bedroom|bedroom interior|bed with|bedside|sleeping room",
       r"lamp|bedside|pillow|blanket|duvet|bed linen"),
 "10":(r"presentation|conference|meeting|chart|graph|whiteboard|business slides",
       r"document|chart|graph|screen|whiteboard|meeting|presentation"),
 "13":(r"receipt|cash register|till slip|shop bill|price tag|price label|checkout|shopping cart",
       r"wallet|calculator|payment|card|shopping|cash register|supermarket|grocery|shop|price"),
 "16":(r"friends talking|friends chatting|people talking|group discussion|conversation|chatting|friends",
       r"talk|chat|discussion|conversation|meeting|cafe|coffee|social"),
 "19":(r"family dining|family dinner|family meal|family eating|dinner table|family",
       r"dining|dinner|meal|table|eating|lunch|kitchen"),
 "22":(r"checklist|to.do list|task list|planner notebook|planning notes",
       r"paper|pen|pencil|notebook|desk|writing|marked|task|list"),
}

# Curated equivalent REAL-LIFE photographic contexts. Search variations remain
# inside the same everyday topic; none of them removes license/pixel approval.
TOPIC_SEARCH_VARIANTS={
 "01":["handwritten notes notebook", "person writing a notebook",
       "notepad pen desk", "study notes handwriting"],
 "04":["bedroom bedside lamp", "bedroom pillows blanket",
       "bedroom interior night lamp", "bed with pillow lamp"],
 "10":["meeting presentation screen", "business meeting charts",
       "presentation whiteboard room", "office chart presentation"],
 "13":["shopping receipt", "price tags supermarket", "shop checkout register",
       "grocery shopping prices", "money coins calculator desk",
       "wallet cash coins on table", "calculator and coins",
       "coins for savings", "piggy bank money", "sale price label"],
 "16":["friends talking at cafe", "friends chatting over coffee",
       "two people conversation coffee", "people talking cafe",
       "friends conversation", "friends at a table talking",
       "cup of coffee on table", "coffee mug table", "mobile phone desk"],
 "19":["family dining at home", "family dinner table",
       "family eating dinner", "parents children dinner",
       "family meal kitchen", "family at dining table"],
 "22":["washing machine in home", "laundry room washing machine",
       "washing machines appliances", "washing machine clothes",
       "laundry basket washing", "home washing machine",
       "neatly organized desk stationery", "desk stationery pens notebook",
       "open planner on desk", "clean work desk notebook"]
}

OBVIOUSLY_WRONG=re.compile(
 r"(?:college|university|map of|atlas|manuscript|old photograph|antique|"
 r"nineteenth century|historical book|book cover|studio portrait|family portrait|"
 r"newspaper clipping|botanical notebook|museum collection|184[0-9]|18[0-9][0-9])",re.I)
def matching_photo_scenes(slot,name,description):
 if slot not in SCENE_CATALOG:return []
 label=plain(name+" "+description).lower()
 if OBVIOUSLY_WRONG.search(label):return []
 out=[]
 for scene in SCENE_CATALOG[slot]["scenes"]:
  one,two=scene["titleTokens"]
  if re.search(one,label,re.I) and re.search(two,label,re.I):
   out.append(scene["id"])
 return out
def subject_evidence(slot,name,description):
 return bool(matching_photo_scenes(slot,name,description))

def get(url,limit=MAX_DOWNLOAD):
 parts=urllib.parse.urlparse(url)
 if parts.scheme!="https" or parts.hostname not in (HOST,MEDIA_HOST,OPENVERSE_HOST):
  raise RuntimeError("REMOTE_ORIGIN_NOT_ALLOWLISTED")
 request=urllib.request.Request(url,headers={
  "User-Agent":USER_AGENT,"Accept":"image/jpeg,application/json"})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(request,timeout=25) as res:
    # urllib may follow redirects; verify the final destination too.
    final=urllib.parse.urlparse(res.geturl())
    if final.scheme!="https" or final.hostname not in (HOST,MEDIA_HOST,OPENVERSE_HOST):
     raise RuntimeError("REMOTE_REDIRECT_NOT_ALLOWLISTED")
    mime=res.headers.get("content-type","").split(";",1)[0].strip().lower()
    if mime not in ("application/json","image/jpeg","image/pjpeg"):
     raise RuntimeError("INVALID_REMOTE_MEDIA_TYPE:"+mime)
    blob=res.read(limit+1)
    if not blob or len(blob)>limit:raise RuntimeError("REMOTE_FILE_TOO_LARGE")
    return mime,blob
  except urllib.error.HTTPError as e:
   # Auth and throttling are terminal for this request, not transient retries.
   if e.code in (401,403,429) or attempt==2:raise
   time.sleep(3*(attempt+1))
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
 if "error" in data:
  raise RuntimeError("COMMONS_API_ERROR:"+str(data["error"].get("code","UNKNOWN")))
 pages=data.get("query",{}).get("pages")
 if pages is None:return []
 if not isinstance(pages,dict):raise RuntimeError("COMMONS_QUERY_PAGES_INVALID")
 return sorted(pages.values(),key=lambda p:p.get("index",999))

def commons_title_from_landing_page(url):
 """Only names of original Wikimedia Commons JPGs may cross provider boundary."""
 try:
  u=urllib.parse.urlparse(str(url))
  if u.scheme!="https" or u.hostname!=HOST or not u.path.startswith("/wiki/File:"):
   return None
  raw=urllib.parse.unquote(u.path[len("/wiki/"):])
  if not raw.startswith("File:") or "/" in raw or ".." in raw:
   return None
  if not re.search(r"\.jpe?g$",raw,re.I) or len(raw)>250:
   return None
  return raw.replace("_"," ")
 except (TypeError,ValueError):return None

def openverse_verified_commons_pages(query):
 """Discovery only; Wikimedia file API re-verifies license and exact bytes."""
 params={
  "q":query,"source":"wikimedia","license":"by,by-sa,cc0,pdm",
  "page_size":"30","page":"1","mature":"false","filter_dead":"true"
 }
 url="https://"+OPENVERSE_HOST+"/v1/images/?"+urllib.parse.urlencode(params)
 _,payload=get(url,3_000_000)
 data=json.loads(payload)
 if not isinstance(data.get("results"),list):
  raise RuntimeError("OPENVERSE_NON_LIST_RESPONSE")
 names=[]
 for row in data["results"]:
  if row.get("source")!="wikimedia":continue
  name=commons_title_from_landing_page(row.get("foreign_landing_url"))
  if name and name not in names:names.append(name)
 if not names:return []
 q={
  "action":"query","format":"json","titles":"|".join(names[:25]),
  "prop":"imageinfo","iiprop":"url|size|mime|extmetadata",
  "iiextmetadatafilter":"LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription",
  "iiurlwidth":"1080"
 }
 _,blob=get("https://"+HOST+"/w/api.php?"+urllib.parse.urlencode(q),3_000_000)
 d=json.loads(blob)
 if "error" in d:raise RuntimeError("COMMONS_FILE_METADATA_REVALIDATION_FAILED")
 pages=d.get("query",{}).get("pages",{})
 if not isinstance(pages,dict):return []
 out=[]
 for page in pages.values():
  if page.get("missing") is not None or not page.get("imageinfo"):continue
  if page.get("title") not in names:continue
  out.append(page)
 return sorted(out,key=lambda p:names.index(p["title"]))


# Topic categories are from Wikimedia itself, never a substitute for pixel QA.
COMMONS_SCENE_CATEGORIES={
 "01":[("books","Category:Books"),("notebook","Category:Notebooks")],
 "04":[("bedroom","Category:Bedrooms"),("bedside-lamp","Category:Bedside lamps")],
 "10":[("office-desk","Category:Office desks"),("meeting","Category:Meeting rooms")],
 "13":[("shopping-basket","Category:Shopping baskets"),
       ("shopping-basket","Category:Shopping carts"),
       ("grocery-shelf","Category:Supermarket shelves"),
       ("grocery-shelf","Category:Supermarket aisles"),
       ("budget-calculator","Category:Coins"),
       ("budget-calculator","Category:Wallets"),
       ("budget-calculator","Category:Calculators"),
       ("budget-calculator","Category:Piggy banks")],
 "16":[("friends-cafe","Category:People in conversation"),
       ("coffee-meetup","Category:Cups of coffee"),
       ("coffee-meetup","Category:Coffee cups"),
       ("phone-on-table","Category:Mobile phones"),
       ("phone-on-table","Category:Smartphones")],
 "19":[("set-table","Category:Dining tables"),
       ("home-kitchen","Category:Kitchens")],
 "22":[("laundry-machine","Category:Washing machines"),
       ("laundry-machine","Category:Laundry"),
       ("laundry-machine","Category:Household appliances"),
       ("planner","Category:Calendars"),
       ("planner","Category:Notebooks"),
       ("tidy-desk","Category:Desks"),
       ("tidy-desk","Category:Office desks"),
       ("tidy-desk","Category:Stationery")]
}
def commons_category_files(category):
 if not re.fullmatch(r"Category:[A-Za-z0-9 _-]{4,100}",category):
  raise RuntimeError("UNAPPROVED_COMMONS_CATEGORY")
 pages_by_title={}
 cursor=None
 # Categorymembers is paginated. Scan at most 2 pages (100 entries) through
 # Wikimedia's official API; all items still need rights and pixel QA.
 for _ in range(2):
  query={
   "action":"query","format":"json","generator":"categorymembers",
   "gcmtitle":category,"gcmtype":"file","gcmlimit":"50",
   "prop":"imageinfo","iiprop":"url|size|mime|extmetadata",
   "iiextmetadatafilter":"LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription",
   "iiurlwidth":"1080"
  }
  if cursor:query["gcmcontinue"]=cursor
  _,raw=get("https://"+HOST+"/w/api.php?"+urllib.parse.urlencode(query),4_000_000)
  data=json.loads(raw)
  if "error" in data:raise RuntimeError("COMMONS_CATEGORY_QUERY_FAILED")
  pages=data.get("query",{}).get("pages") or {}
  if not isinstance(pages,dict):raise RuntimeError("COMMONS_CATEGORY_BAD_PAGES")
  for page in pages.values():
   if page.get("ns")==6 and page.get("title","").startswith("File:") and page.get("imageinfo"):
    pages_by_title[page["title"]]=page
  cursor=(data.get("continue") or {}).get("gcmcontinue")
  if not cursor:break
 return sorted(pages_by_title.values(),key=lambda page:page["title"])

def convert_to_photo_jpeg(raw):
 Image.MAX_IMAGE_PIXELS=35_000_000
 with Image.open(io.BytesIO(raw)) as im:
  if im.format!="JPEG" or im.width<640 or im.height<640:
   raise RuntimeError("NOT_A_SUITABLE_ORIGINAL_JPEG_PHOTO")
  if im.width/im.height>3 or im.height/im.width>3:
   raise RuntimeError("EXTREME_ASPECT_RATIO")
  # Lifestyle photos must be actual color scenes, not monochrome historic
  # document scans falsely labeled as a relevant photograph.
  sample=im.copy()
  sample.thumbnail((96,96),Image.Resampling.BILINEAR)
  hsv=sample.convert("RGB").convert("HSV")
  saturation=[p[1] for p in hsv.getdata()]
  if sum(v>=35 for v in saturation)/len(saturation)<0.22:
   raise RuntimeError("NOT_A_COLOR_LIFESTYLE_SCENE")
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
def choose_photos(query,history,slot,offset,max_candidates=8):
 global OPENVERSE_PAUSED_STATUS
 rejected={}
 found=[]
 seen_pages=set()
 def accept(page,category_scene=None,category=None):
  name=page.get("title","")
  evidence_key=(name,category_scene or "text")
  if evidence_key in seen_pages:return
  seen_pages.add(evidence_key)
  if BAD_NAME.search(name) or not re.search(r"\.jpe?g$",name,re.I):
   rejected["filename"]=rejected.get("filename",0)+1
   return
  info=(page.get("imageinfo") or [None])[0]
  if not info or info.get("mime")!="image/jpeg":return
  rights=license_result(info)
  if not rights:
   rejected["license"]=rejected.get("license",0)+1
   return
  scene_matches=matching_photo_scenes(slot,name,rights["description"])
  if category_scene and category in (cat for sid,cat in COMMONS_SCENE_CATEGORIES[slot]
       if sid==category_scene) and category_scene not in scene_matches:
   scene_matches.append(category_scene)
  if not scene_matches:
   rejected["subject_metadata"]=rejected.get("subject_metadata",0)+1
   return
  media=info.get("thumburl") or info.get("url","")
  parsed=urllib.parse.urlparse(media)
  if parsed.scheme!="https" or parsed.hostname!=MEDIA_HOST:return
  try:
   mime,raw=get(media)
   if mime not in ("image/jpeg","image/pjpeg"):return
   photo,sha,phash,camera=convert_to_photo_jpeg(raw)
  except Exception:
   rejected["media"]=rejected.get("media",0)+1
   return
  if any(row.get("sha256")==sha or (
      isinstance(row.get("phash"),str) and len(row["phash"])==16 and
      near_duplicate(phash,row["phash"])) for row in history+[x[1] for x in found]):
   rejected["duplicate"]=rejected.get("duplicate",0)+1
   return
  record={
   "hourKst":slot,"sourceName":name,"sourcePage":info.get("descriptionurl",""),
   "originalUrl":info.get("url",""),"downloadedThumbnailUrl":media,
   "sha256":sha,"phash":phash,"bytes":len(photo),"width":1080,"height":1350,
   "rights":rights,"cameraExif":camera[:90],"sceneCandidates":scene_matches,
   "commonsTopicCategoryEvidence":category,
   "photoCandidateOnly":True,"imageVisuallyInspected":False,
   "sceneMatchVerified":False,"publicationAllowed":False
  }
  found.append((photo,record))
 words=query.split()
 # The slot-specific backup search phrases existed but were never used.
 # Search these on Wikimedia Commons itself rather than relying on the
 # Openverse API, which may return 401/429 without an approved key.
 phrases=list(dict.fromkeys([
  *[q for sc in SCENE_CATALOG[slot]["scenes"] for q in sc["queries"]],
  *TOPIC_SEARCH_VARIANTS[slot],
  query," ".join(words[:2])
 ]))
 offsets=list(dict.fromkeys([offset,0,40]))
 for phrase in phrases:
  for page_offset in offsets:
   pages=search_commons(phrase,page_offset)
   for page in pages:
    accept(page)
    if len(found)>=max_candidates:return found
 # Wikimedia-verified category membership provides candidate discovery only.
 # Final scene approval still requires both CLIP and BLIP on actual photo pixels.
 # Most slots need a pool, not merely one photo. The first CLIP winner
 # may fail independent BLIP, so search subject categories until we have
 # up to eight separate licensed original photos per slot.
 if len(found)<max_candidates:
  for scene_id,category in COMMONS_SCENE_CATEGORIES[slot]:
   try:pages=commons_category_files(category)
   except Exception as exc:
    print("COMMONS_CATEGORY_DISCOVERY_UNAVAILABLE",slot,category,
          type(exc).__name__,getattr(exc,"code","NO_STATUS"),file=sys.stderr)
    continue
   for page in pages:
    accept(page,category_scene=scene_id,category=category)
    if len(found)>=max_candidates:return found
 # Openverse is used ONLY to discover matching Wikimedia Commons JPG pages.
 # All license and pixel checks still happen through Wikimedia's own API.
 # Do not scrape Openverse, bypass rate-limits or fetch arbitrary hosts.
 if len(found)<3 and OPENVERSE_PAUSED_STATUS is None:
  for scene in SCENE_CATALOG[slot]["scenes"]:
   try:
    pages=openverse_verified_commons_pages(scene["queries"][0])
   except Exception as exc:
    print("OPENVERSE_DISCOVERY_NOT_AVAILABLE",slot,type(exc).__name__,
          getattr(exc,"code","NO_STATUS"),file=sys.stderr)
    # Never hammer a rejected or rate-limited API; all later slots use Commons only.
    if isinstance(exc,urllib.error.HTTPError) and exc.code in (401,403,429):
     OPENVERSE_PAUSED_STATUS=exc.code
     print("OPENVERSE_SUSPENDED_FOR_THIS_RUN",exc.code,file=sys.stderr)
     break
    continue
   for page in pages:
    accept(page)
    if len(found)>=max_candidates:return found
 if found:return found
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
 missing=[]
 for story in source["stories"]:
  hour=story.get("hourKst")
  if hour not in SLOTS:raise RuntimeError("BAD_LIFESTYLE_SLOT")
  query=story.get("photoSearchQuery","")
  if not re.fullmatch(r"[a-zA-Z ]{15,120}",query):
   raise RuntimeError("UNREVIEWED_REMOTE_PHOTO_QUERY")
  try:
   pool=choose_photos(query,history+items,hour,(days%5)*40)
  except RuntimeError as err:
   if not str(err).startswith("NO_LICENSED_UNDUPLICATED_REAL_PHOTO_CANDIDATE"):
    raise
   # Only aggregate rejection counts (license, candidate title, bytes,
   # pixel format, old hash). Never log actual private photo bytes.
   print("CANDIDATE_POOL_MISSING_SAFE_FAIL",hour,str(err)[:1600],
         file=sys.stderr)
   missing.append({"hourKst":hour,"reason":"NO_APPROVED_LICENSED_TOPIC_PHOTO"})
   continue
  for i,(photo,record) in enumerate(pool):
   filename="candidate-"+record["hourKst"]+"-"+str(i+1)+".jpg"
   (output/filename).write_bytes(photo)
   record["file"]=filename
   record["poolIndex"]=i+1
   record["photoMustDepict"]=story.get("photoMustDepict",[])
   record["dateKst"]=target
   items.append(record)
 manifest={
  "schemaVersion":1,"brand":"UNBODA","dateKst":target,"photos":items,
  "candidatePoolSize":len(items),"distinctHourSlots":len(set(x["hourKst"] for x in items)),
  "missingSlots":missing,"collectionComplete":not missing,
  "rightsMachineChecked":True,"sizeAndMimeChecked":True,
  "actualVisualSceneInspected":False,"photoReadyForSnsPosting":False,
  "publicationAllowed":False,"state":"SEVEN_CANDIDATES_REQUIRE_PIXEL_SCENE_QA",
  "source":"Wikimedia Commons original licensed image pages"
 }
 (output/"candidate-manifest.json").write_text(
  json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print("COMMONS_SEVEN_PHOTO_POOLS_RIGHTS_AND_FORMAT_VERIFIED_NOT_FOR_PUBLICATION",target,
       len(items),"candidates in 7 slots")
def selftest():
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"All rights reserved"}}}) is None
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC BY 4.0"}}}) is None
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC0"}}})["license"]=="CC0"
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC BY-SA 2.0"},
   "LicenseUrl":{"value":"https://creativecommons.org/licenses/by-sa/2.0/"},
   "Artist":{"value":"Example photographer"}}})["shareAlikeAdaptationRequired"] is True
 assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC BY-NC 4.0"},
   "Artist":{"value":"Photographer"}}}) is None
 # Legitimate Commons metadata is not always https or slash-terminated.
 for url in ("http://creativecommons.org/licenses/by/4.0",
             "https://creativecommons.org/licenses/by/4.0/"):
  row={"extmetadata":{"LicenseShortName":{"value":"CC BY 4.0"},
    "Artist":{"value":"Example photographer"},"LicenseUrl":{"value":url}}}
  assert license_result(row)["license"]=="CC BY 4.0"
 # Reject spoofed hosts, unrelated legal documents and noncommercial terms.
 for url in ("https://creativecommons.org.evil.test/licenses/by/4.0",
             "https://creativecommons.org/licenses/by-nc/4.0",
             "https://creativecommons.org/licenses/by/4.0-extra",
             "https://creativecommons.org/licenses/by/4.0/?override=yes"):
  assert license_result({"extmetadata":{"LicenseShortName":{"value":"CC BY 4.0"},
    "Artist":{"value":"Example"},"LicenseUrl":{"value":url}}}) is None
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
 assert not subject_evidence("10","Photo of an office interior with wooden chairs","")
 assert not subject_evidence("19","Sheridan family portrait at a photo studio","")
 assert not subject_evidence("16","Friends College Kaimosi","")
 assert not subject_evidence("22","old history book cover about war","")
 assert matching_photo_scenes("22","A home washing machine in the laundry room","")
 assert not subject_evidence("01","Botanical notebook,1882 page","")
 assert subject_evidence("04","Cozy bedroom with a bed, pillow, and bedside lamp","")
 assert subject_evidence("13","Supermarket shopping receipt and debit card","")
 assert subject_evidence("19","Family dining at a dinner table","")
 assert subject_evidence("13","Shopping price tags at grocery checkout","")
 assert subject_evidence("16","Friends talking in coffee cafe","")
 assert not subject_evidence("13","A grocery store with no labels mentioned","")
 assert not subject_evidence("19","Family outside at a beach","")
 assert len(TOPIC_SEARCH_VARIANTS)==7
 assert all(len(TOPIC_SEARCH_VARIANTS[h])>=3 for h in SLOTS)
 assert "price tags supermarket" in TOPIC_SEARCH_VARIANTS["13"]
 assert "two people conversation coffee" in TOPIC_SEARCH_VARIANTS["16"]
 assert commons_title_from_landing_page("https://commons.wikimedia.org/wiki/File:Sample_photo.jpg")=="File:Sample photo.jpg"
 assert commons_title_from_landing_page("https://evil.example/wiki/File:Sample_photo.jpg") is None
 assert commons_title_from_landing_page("https://commons.wikimedia.org/wiki/File:vector.svg") is None
 assert commons_title_from_landing_page("http://commons.wikimedia.org/wiki/File:Sample_photo.jpg") is None
 assert len(COMMONS_SCENE_CATEGORIES)==7
 assert ("grocery-shelf","Category:Supermarket shelves") in COMMONS_SCENE_CATEGORIES["13"]
 assert ("budget-calculator","Category:Coins") in COMMONS_SCENE_CATEGORIES["13"]
 assert ("tidy-desk","Category:Stationery") in COMMONS_SCENE_CATEGORIES["22"]
 assert ("friends-cafe","Category:People in conversation") in COMMONS_SCENE_CATEGORIES["16"]
 assert ("laundry-machine","Category:Washing machines") in COMMONS_SCENE_CATEGORIES["22"]
 assert all(sid in [s["id"] for s in SCENE_CATALOG[h]["scenes"]] for h,entries in COMMONS_SCENE_CATEGORIES.items() for sid,cat in entries)
 assert len(SCENE_CATALOG)==7
 assert all(len(x["scenes"])==3 for x in SCENE_CATALOG.values())
 assert matching_photo_scenes("13","A grocery supermarket shopping aisle with food shelves","")
 assert matching_photo_scenes("10","Office laptop on work desk","")
 assert matching_photo_scenes("19","Home kitchen with sink and cooking tools","")
 assert not matching_photo_scenes("19","A family group studio portrait","")
 assert not matching_photo_scenes("13","A beach sunset landscape","")
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
