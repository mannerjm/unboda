#!/usr/bin/env python3
"""STAGING ONLY: private owned/contract-licensed JPEG bank, 2-3 day intake audit.

This never authorizes SNS posts. It does not claim independent CLIP/BLIP QA,
full 90-day provider history, or consent/likeness verification. No outside
stock API is queried. Only approved private assets and evidence are fetched.
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from PIL import Image

HOST = "xdiitqyysmhicjcytckm.supabase.co"  # staging ONLY
BUCKET = "unboda-social-private-review"
HOURS = ("01", "04", "10", "13", "16", "19", "22")
SCENES = json.loads(
    (__import__("pathlib").Path(__file__).parent / "lifestyle-photo-scenes.json")
    .read_text(encoding="utf8")
)["slots"]
SHA = re.compile(r"^[0-9a-f]{64}$")
PHASH = re.compile(r"^[0-9a-f]{16}$")
PHOTO_PATH = re.compile(r"^photo-bank/images/[a-z0-9][a-z0-9/_-]{3,180}\.jpe?g$")
EVIDENCE_PATH = re.compile(r"^photo-bank/rights/[a-z0-9][a-z0-9/_-]{3,180}\.(json|pdf)$")
BASIS = {"BRAND_OWNED", "COMMISSIONED", "CONTRACT_LICENSED"}

def fail(msg):
    raise RuntimeError("PHOTO_BANK_PRIVATE_READ_BLOCKED:" + msg)

def isdate(x):
    try:
        return isinstance(x, str) and dt.date.fromisoformat(x).isoformat() == x
    except ValueError:
        return False

def near(a, b):
    return (int(a, 16) ^ int(b, 16)).bit_count() <= 6

def phash_for(im):
    tiny = im.resize((8, 8)).convert("L")
    gray = list(tiny.getdata())
    average = sum(gray) / 64
    return f"{sum((1 << i) for i, val in enumerate(gray) if val > average):016x}"

def check_bytes(photo, evidence, asset):
    if not 20000 < len(photo) < 4_900_000:
        fail("UNVERIFIED_JPEG_SIZE")
    if hashlib.sha256(photo).hexdigest() != asset["photo_sha256"]:
        fail("PHOTO_SHA_MISMATCH")
    if len(photo) != asset["photo_bytes"]:
        fail("PHOTO_DECLARED_LENGTH_MISMATCH")
    if not 0 < len(evidence) <= 2_000_000:
        fail("LICENSE_EVIDENCE_MISSING_OR_TOO_LARGE")
    if hashlib.sha256(evidence).hexdigest() != asset["license_evidence_sha256"]:
        fail("LICENSE_EVIDENCE_SHA_MISMATCH")
    if asset["license_evidence_path"].endswith(".pdf"):
        if not evidence.startswith(b"%PDF-"):
            fail("INVALID_LICENSE_PROOF_PDF")
    else:
        try:
            if not isinstance(json.loads(evidence), dict):
                fail("INVALID_LICENSE_PROOF_JSON")
        except (ValueError, UnicodeDecodeError):
            fail("INVALID_LICENSE_PROOF_JSON")
    try:
        with Image.open(io.BytesIO(photo)) as im:
            if im.format != "JPEG" or im.size != (1080, 1350):
                fail("UNEXPECTED_IMAGE_FORMAT_OR_DIMENSIONS")
            if phash_for(im) != asset["photo_phash"]:
                fail("PHOTO_PERCEPTUAL_HASH_CHANGED")
    except (OSError, ValueError):
        fail("UNREADABLE_REAL_JPEG_REQUIRED")

def asset_is_eligible(asset, target):
    if (asset.get("qa_status") == "REJECTED" or
            asset.get("rights_basis") not in BASIS or
            asset.get("commercial_social_rights") is not True or
            asset.get("ai_quality_inspection_rights") is not True or
            asset.get("scene_id") not in {
                s["id"] for slot in SCENES.values() for s in slot["scenes"]
            } or
            not SHA.fullmatch(str(asset.get("photo_sha256", ""))) or
            not PHASH.fullmatch(str(asset.get("photo_phash", ""))) or
            not SHA.fullmatch(str(asset.get("license_evidence_sha256", ""))) or
            not PHOTO_PATH.fullmatch(str(asset.get("storage_path", ""))) or
            not EVIDENCE_PATH.fullmatch(str(asset.get("license_evidence_path", ""))) or
            not str(asset.get("credit_line", "")).strip() or
            not str(asset.get("rights_holder", "")).strip() or
            asset.get("photo_width") != 1080 or
            asset.get("photo_height") != 1350 or
            not isinstance(asset.get("photo_bytes"), int) or
            not 20_000 < asset["photo_bytes"] < 4_900_000 or
            not isdate(asset.get("rights_valid_from")) or
            asset["rights_valid_from"] > target or
            (asset.get("rights_valid_until") is not None and
             (not isdate(asset["rights_valid_until"]) or asset["rights_valid_until"] < target))):
        return False
    return True

def audit(start_date, days, assets, assignments, history, fetch_binary):
    if not isdate(start_date) or days not in (2, 3):
        fail("INVALID_START_OR_BUFFER_WINDOW")
    first = dt.date.fromisoformat(start_date)
    by_id = {x["id"]: x for x in assets if isinstance(x, dict) and x.get("id")}
    if len(by_id) != len(assets) or len(assets) >= 300 or len(assignments) > 21:
        fail("DUPLICATE_BANK_RECORDS_OR_POSSIBLY_TRUNCATED_INPUT")
    seen_shas, seen_phashes = set(), []
    # This is only staging's own use history; it is NOT complete Metricool history.
    historic = [h for h in history if
                isdate(h.get("slot_date")) and
                first - dt.timedelta(days=90) <= dt.date.fromisoformat(h["slot_date"]) < first]
    if len(history) >= 1000:
        fail("INCOMPLETE_90_DAY_STAGING_PAGE")
    issues, coverage = [], []
    for delta in range(days):
        day = (first + dt.timedelta(days=delta)).isoformat()
        ready = []
        for hour in HOURS:
            slot = [a for a in assignments if a.get("date_kst") == day and a.get("hour_kst") == hour]
            if len(slot) != 1:
                issues.append({"dateKst": day, "hourKst": hour, "reason": "MISSING_OR_DUPLICATE_SLOT"})
                continue
            assignment = slot[0]
            asset = by_id.get(assignment.get("asset_id"))
            if not asset or assignment.get("review_state") == "REJECTED" or not asset_is_eligible(asset, day):
                issues.append({"dateKst": day, "hourKst": hour, "reason": "RIGHTS_OR_ASSET_NOT_APPROVED"})
                continue
            if asset["scene_id"] not in {s["id"] for s in SCENES[hour]["scenes"]}:
                issues.append({"dateKst": day, "hourKst": hour, "reason": "SCENE_FOR_SLOT_MISMATCH"})
                continue
            sha, phash = asset["photo_sha256"], asset["photo_phash"]
            conflict = sha in seen_shas or any(near(phash, old) for old in seen_phashes)
            conflict |= any(sha == h.get("media_sha256") or
                            (PHASH.fullmatch(str(h.get("image_phash", ""))) and
                             near(phash, h["image_phash"])) for h in historic)
            if conflict:
                issues.append({"dateKst": day, "hourKst": hour, "reason": "PHOTO_REUSED_OR_NEAR_DUPLICATE"})
                continue
            try:
                photo = fetch_binary(asset["storage_path"], 4_900_000)
                evidence = fetch_binary(asset["license_evidence_path"], 2_000_000)
                check_bytes(photo, evidence, asset)
            except Exception:
                # Do not log private paths, evidence contents, credentials or personal data.
                issues.append({"dateKst": day, "hourKst": hour, "reason": "PRIVATE_MEDIA_OR_PROOF_FAILED"})
                continue
            ready.append(hour)
            seen_shas.add(sha)
            seen_phashes.append(phash)
        coverage.append({"dateKst": day, "photoIntakeVerified": len(ready),
                         "missingOrBlockedSlots": [h for h in HOURS if h not in ready]})
    return {
        "schemaVersion": 1, "state": "CANDIDATE_INTAKE_READY_NO_SNS_POST" if not issues else "CANDIDATE_INTAKE_INCOMPLETE",
        "startDateKst": start_date, "bufferDays": days, "expectedSlots": days * 7,
        "verifiedPrivateMediaAndProof": sum(x["photoIntakeVerified"] for x in coverage),
        "coverage": coverage, "issues": issues,
        "rightsProofCryptographicallyPresent": not issues,
        "legalRightsAndLikenessHumanReviewStillRequired": True,
        "independentClipBlipVerified": False,
        "whole90DayProviderHistoryVerified": False,
        "photoReadyForSnsPosting": False, "publicationAllowed": False,
        "snsRequestsAttempted": 0,
    }

class RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        fail("STAGING_SIGNED_REQUEST_MUST_NOT_REDIRECT")

NO_REDIRECT_OPENER = urllib.request.build_opener(RejectRedirects())

def api_json(path, key, params):
    query = urllib.parse.urlencode(params, safe=",.*()")
    u = "https://" + HOST + "/rest/v1/" + path + "?" + query
    req = urllib.request.Request(u, headers={"apikey": key, "Authorization": "Bearer " + key,
        "Accept": "application/json"}, method="GET")
    with NO_REDIRECT_OPENER.open(req, timeout=20) as resp:
        parsed = urllib.parse.urlparse(resp.geturl())
        if parsed.scheme != "https" or parsed.hostname != HOST or resp.status != 200:
            fail("STAGING_API_REDIRECT_OR_STATUS")
        return json.loads(resp.read(1_500_000))

def private_blob(path, key, limit):
    if not (PHOTO_PATH.fullmatch(path) or EVIDENCE_PATH.fullmatch(path)):
        fail("UNAPPROVED_STORAGE_KEY")
    uri = ("https://" + HOST + "/storage/v1/object/authenticated/" + BUCKET + "/" +
           "/".join(urllib.parse.quote(x, safe="") for x in path.split("/")))
    req = urllib.request.Request(uri, headers={"apikey": key, "Authorization": "Bearer " + key},
                                  method="GET")
    with NO_REDIRECT_OPENER.open(req, timeout=25) as resp:
        parsed = urllib.parse.urlparse(resp.geturl())
        if parsed.scheme != "https" or parsed.hostname != HOST or resp.status != 200:
            fail("UNAPPROVED_PRIVATE_STORAGE_RESPONSE")
        raw = resp.read(limit + 1)
        if len(raw) > limit:
            fail("PRIVATE_STORAGE_RESPONSE_TOO_LARGE")
        return raw

def selftest():
    from PIL import ImageDraw
    # Small synthetic fixtures verify integrity checks only; not photography/scene QA.
    im = Image.new("RGB", (1080, 1350), (220, 155, 99))
    draw = ImageDraw.Draw(im)
    for k in range(400):
        draw.line((k * 11 % 1080, k * 19 % 1350, k * 37 % 1080, k * 47 % 1350),
                  fill=(k * 19 % 256, k * 31 % 256, k * 43 % 256), width=3)
    b = io.BytesIO()
    im.save(b, format="JPEG", quality=90)
    blob = b.getvalue()
    im_check = Image.open(io.BytesIO(blob))
    proof = b'{"holder":"UNBODA mock"}'
    asset = dict(
        id="test-photo", storage_path="photo-bank/images/test1.jpg",
        license_evidence_path="photo-bank/rights/test1.json",
        photo_sha256=hashlib.sha256(blob).hexdigest(),
        license_evidence_sha256=hashlib.sha256(proof).hexdigest(),
        photo_phash=phash_for(im_check),
        photo_bytes=len(blob), photo_width=1080, photo_height=1350,
        rights_basis="BRAND_OWNED", commercial_social_rights=True,
        ai_quality_inspection_rights=True, rights_valid_from="2026-11-01",
        rights_valid_until=None, rights_holder="Mock rights holder",
        credit_line="Mock photographer", scene_id="notebook", qa_status="PENDING"
    )
    check_bytes(blob, proof, asset)
    def fake_get(path, limit):
        return blob if path.endswith(".jpg") else proof
    assignments = [{"date_kst": "2026-11-10", "hour_kst": "01",
                    "asset_id": "test-photo", "review_state": "RESERVED"}]
    r = audit("2026-11-10", 3, [asset], assignments, [], fake_get)
    assert r["expectedSlots"] == 21 and r["verifiedPrivateMediaAndProof"] == 1
    assert len(r["issues"]) == 20 and r["photoReadyForSnsPosting"] is False
    assert r["independentClipBlipVerified"] is False
    old = asset["photo_sha256"]
    asset["photo_sha256"] = "a" * 64
    r = audit("2026-11-10", 2, [asset], assignments, [], fake_get)
    assert r["verifiedPrivateMediaAndProof"] == 0
    asset["photo_sha256"] = old
    asset["commercial_social_rights"] = False
    r = audit("2026-11-10", 2, [asset], assignments, [], fake_get)
    assert r["verifiedPrivateMediaAndProof"] == 0
    asset["commercial_social_rights"] = True
    r = audit("2026-11-10", 2, [asset], assignments,
              [{"slot_date": "2026-11-01", "media_sha256": old}], fake_get)
    assert r["verifiedPrivateMediaAndProof"] == 0
    # A stale source outside this time window is never counted as a future slot.
    empty = audit("2026-11-11", 3, [asset], assignments, [], fake_get)
    assert empty["verifiedPrivateMediaAndProof"] == 0
    print("PASS_PRIVATE_PHOTO_BANK_TWO_TO_THREE_DAY_INTEGRITY_AND_FAIL_CLOSED_NO_POST")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--start-date")
    p.add_argument("--days", type=int, default=3)
    p.add_argument("--out", default="photo-bank-readiness.json")
    a = p.parse_args()
    if a.self_test:
        selftest()
        return
    if not isdate(a.start_date):
        fail("START_DATE_REQUIRED")
    if a.days not in (2, 3):
        fail("ONLY_TWO_OR_THREE_DAYS")
    key = os.getenv("UNBODA_STAGING_SERVICE_ROLE_KEY", "")
    if not key or len(key) < 20:
        fail("STAGING_ONLY_SERVER_KEY_NOT_CONFIGURED")
    until = (dt.date.fromisoformat(a.start_date) + dt.timedelta(days=a.days - 1)).isoformat()
    assignments = api_json("unboda_social_photo_bank_assignments", key,
                      {"select": "*",
                       "and": "(date_kst.gte." + a.start_date + ",date_kst.lte." + until + ")",
                       "limit": "100"})
    if not isinstance(assignments, list) or len(assignments) > 21:
        fail("INVALID_THREE_DAY_ASSIGNMENT_PAGE")
    # Read the 0..21 assets needed for these dates, not every asset since launch.
    # Reading an unbounded asset catalogue would fail after ~42 days at 7/day.
    ids = {x.get("asset_id") for x in assignments if isinstance(x, dict)}
    if len(ids) > 21 or any(not isinstance(x, str) or
        not re.fullmatch(r"[0-9a-f-]{36}", x) for x in ids):
        fail("INVALID_ASSIGNMENT_UUID")
    assets = (api_json("unboda_social_licensed_photo_assets", key,
                        {"select": "*", "id": "in.(" + ",".join(sorted(ids)) + ")",
                         "limit": "25"}) if ids else [])
    if not isinstance(assets, list) or len(assets) != len(ids):
        fail("SCOPED_PRIVATE_ASSET_LOOKUP_INCOMPLETE")
    history_from = (dt.date.fromisoformat(a.start_date) - dt.timedelta(days=90)).isoformat()
    history = api_json("unboda_social_lifestyle_media_usage", key,
                      {"select": "media_sha256,image_phash,slot_date",
                       "slot_date": "gte." + history_from, "limit": "1000"})
    result = audit(a.start_date, a.days, assets, assignments, history,
                   lambda path, limit: private_blob(path, key, limit))
    __import__("pathlib").Path(a.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("PRIVATE_PHOTO_BANK_BUFFER", result["verifiedPrivateMediaAndProof"],
          "/", result["expectedSlots"], "candidate intake only; no social post")
    for slot in result["issues"]:
        print("MISSING_OR_BLOCKED", slot["dateKst"], slot["hourKst"], slot["reason"])
    if result["issues"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
