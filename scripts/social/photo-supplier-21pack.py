#!/usr/bin/env python3
"""Generate a three-day real-photo procurement brief; validate private 21-photo pack.

NO downloading from stock providers, no fake pictures, no public uploads, no
Supabase/Metricool write. Rights remain pending independent human and pixel QA.
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SCENES = json.loads((ROOT / "lifestyle-photo-scenes.json").read_text(encoding="utf-8"))["slots"]
HOURS = ("01", "04", "10", "13", "16", "19", "22")
PRIVACY_FIRST = {
    "01": ("notebook", "books", "study-desk"),
    "04": ("bedroom", "bedside-lamp", "morning-curtains"),
    "10": ("office-desk", "meeting", "work-calendar"),
    # Avoid receipt photographs without an additional privacy/OCR gate.
    "13": ("grocery-shelf", "shopping-basket", "grocery-shelf"),
    # Pictures depicting people need separate likeness release if identifiable.
    "16": ("phone-on-table", "coffee-meetup", "friends-cafe"),
    "19": ("set-table", "home-kitchen", "family-meal"),
    "22": ("laundry-machine", "tidy-desk", "planner"),
}
RIGHTS_REQUIREMENTS = [
    "Commercial SNS marketing/advertising, including paid promotion and reuse across Instagram, Facebook, Threads, YouTube and TikTok",
    "Permission to store private originals, create 1080x1350 derivatives, host approved copies publicly and submit to Metricool/SNS processing",
    "Explicit permission for machine-based image-quality/scene QA (CLIP/BLIP inference), with no AI training or dataset reuse implied",
    "Territory, term, expiration, attribution and any exclusivity or usage limits recorded in signed proof",
    "Identifiable people/model, minors, trademarks, receipts, screens and private-property release reviewed separately when relevant",
    "Photographs must be genuinely camera-captured; no illustration, AI-generated photo or duplicated previous images",
]
def fail(msg):
    raise RuntimeError("PHOTO_SUPPLIER_21_PACK_BLOCKED:"+msg)

def datesafe(value):
    try:
        return dt.date.fromisoformat(value).isoformat() == value
    except (TypeError, ValueError):
        return False

def build(date):
    if not datesafe(date):
        fail("INVALID_KST_DATE")
    start=dt.date.fromisoformat(date)
    slots=[]
    for day_offset in range(3):
        target=(start+dt.timedelta(days=day_offset)).isoformat()
        for hour in HOURS:
            scene_id=PRIVACY_FIRST[hour][day_offset]
            scene=next((x for x in SCENES[hour]["scenes"] if x["id"]==scene_id),None)
            if not scene:
                fail("UNKNOWN_CATALOG_SCENE:"+hour)
            slots.append({
                "dateKst":target,"hourKst":hour,"sceneId":scene_id,
                "subjectKo":scene["subjectKo"],
                "deliverable":"ONE DISTINCT GENUINE 1080x1350 COLOR JPEG, less than 4.9MB",
                "photoAcquired":False,"rightsProofReceived":False,
                "clipPassed":False,"blipPassed":False,
                "publicationAllowed":False
            })
    if len(slots)!=21 or len({(x["dateKst"],x["hourKst"]) for x in slots})!=21:
        fail("MISSING_OR_DUPLICATE_TIME_SLOT")
    return {
        "schemaVersion":1,"brand":"UNBODA","firstDateKst":date,
        "status":"SUPPLIER_REQUEST_ONLY_NO_ASSETS",
        "targetSlots":21,"sourceRights":"BRAND_OWNED_OR_SIGNED_CONTRACT_ONLY",
        "rightsRequirements":RIGHTS_REQUIREMENTS,
        "stagingOnly":True,"photoReadyForSnsPosting":False,
        "publicationAllowed":False,"snsRequestsAttempted":0,
        "shots":slots
    }

def validate_pack(path, date):
    spec=importlib.util.spec_from_file_location(
        "unboda_staging_photo_intake",ROOT / "intake-private-licensed-photo.py")
    intake=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(intake)
    template=build(date)
    package=json.loads(pathlib.Path(path).read_text(encoding="utf8"))
    if (not isinstance(package,dict) or package.get("firstDateKst")!=date or
        not isinstance(package.get("photos"),list) or len(package["photos"])!=21):
        fail("COMPLETE_21_MANIFESTS_REQUIRED")
    required={(a["dateKst"],a["hourKst"]):a["sceneId"] for a in template["shots"]}
    found=set()
    used_hashes=set()
    used_phashes=[]
    for item in package["photos"]:
        if not isinstance(item,dict):
            fail("INVALID_PRIVATE_PACKAGE_ITEM")
        day,hour=item.get("dateKst"),item.get("hourKst")
        key=(day,hour)
        if key not in required or key in found:
            fail("DUPLICATE_OR_UNKNOWN_PRIVATE_PACKAGE_SLOT")
        metadata=item.get("manifest")
        if not isinstance(metadata,dict):
            fail("MISSING_PRIVATE_MANIFEST")
        row,_,_=intake.prepare_manifest(metadata)
        if (row["scene_id"]!=required[key] or row["rights_valid_from"]>day or
            (row["rights_valid_until"] is not None and row["rights_valid_until"]<day)):
            fail("PHOTO_SCENE_OR_RIGHTS_DATE_MISMATCH")
        if row["photo_sha256"] in used_hashes or any(
            intake.audit.near(row["photo_phash"],p) for p in used_phashes):
            fail("PRIVATE_PACKAGE_DUPLICATE_OR_SIMILAR_PHOTO")
        used_hashes.add(row["photo_sha256"])
        used_phashes.append(row["photo_phash"])
        found.add(key)
    if found!=set(required):
        fail("INCOMPLETE_PRIVATE_PACKAGE")
    # This does not attest to legal title, model releases, CLIP, BLIP or public URL.
    return {"slotsValidated":21,"rightsLegalReview":False,
            "independentPixelQA":False,"publicationAllowed":False,
            "snsRequestsAttempted":0}

def self_test():
    a=build("2026-11-10")
    assert len(a["shots"])==21 and a["publicationAllowed"] is False
    assert len({(s["dateKst"],s["hourKst"]) for s in a["shots"]})==21
    assert all(s["sceneId"]!="receipt" for s in a["shots"])
    assert build("2026-12-31")["shots"][-1]["dateKst"]=="2027-01-02"
    try:
        build("2026-11-31")
    except RuntimeError:
        pass
    else:
        raise AssertionError("invalid date passed")
    print("PASS_21_REAL_PHOTO_SUPPLIER_BRIEF_NO_GENERATED_PHOTOS_NO_SOCIAL_POST")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--output",default="photo-supplier-21pack.json")
    parser.add_argument("--validate-private-pack",
                        help="Private local manifest index; never commit")
    parser.add_argument("--self-test",action="store_true")
    a=parser.parse_args()
    if a.self_test:
        self_test()
        return
    if not datesafe(a.date):
        fail("EXACT_START_DATE_REQUIRED")
    if a.validate_private_pack:
        result=validate_pack(a.validate_private_pack,a.date)
        print("PRIVATE_REAL_PHOTO_PACK_LOCAL_INTEGRITY_ONLY",result["slotsValidated"],
              "LEGAL_AND_DUAL_QA_STILL_PENDING")
        return
    result=build(a.date)
    pathlib.Path(a.output).write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("PHOTO_SUPPLIER_SHOT_LIST",result["targetSlots"],"NOT_ACQUIRED_NOT_POSTED")

if __name__=="__main__":
    try:
        main()
    except Exception as e:
        print("PHOTO_SUPPLIER_REQUIREMENT_FAILED_CLOSED",type(e).__name__,file=sys.stderr)
        sys.exit(1)
