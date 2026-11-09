#!/usr/bin/env python3
"""Explicit, staging-only intake for user-owned/commissioned/contracted real photos.

Default is LOCAL CHECK ONLY; --stage is a separate explicit action. Neither
mode verifies actual ownership, privacy, likeness, or CLIP/BLIP scene matches.
Both modes forbid automatic SNS publishing and any production DB access.
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import re
import sys
import tempfile
import urllib.parse
import urllib.request
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent
AUDIT_PATH = ROOT / "verify-private-licensed-photo-buffer.py"
spec = importlib.util.spec_from_file_location("unboda_private_bank_readonly", AUDIT_PATH)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

REQUIRED = {
    "photoFile", "proofFile", "sceneId", "rightsBasis", "rightsHolder",
    "creditLine", "rightsValidFrom"
}
NO_MORE_THAN = 255
LIMIT_PHOTO = 4_900_000
LIMIT_PROOF = 2_000_000

def fail(reason):
    raise RuntimeError("PRIVATE_PHOTO_INGEST_BLOCKED:" + reason)

def safe_file(path_str, max_bytes):
    if not isinstance(path_str, str) or not path_str or len(path_str) > 1024:
        fail("INVALID_LOCAL_FILE_REFERENCE")
    path = pathlib.Path(path_str)
    if path.is_symlink() or not path.is_file():
        fail("MISSING_OR_SYMLINK_LOCAL_FILE")
    if not 0 < path.stat().st_size < max_bytes:
        fail("LOCAL_FILE_OUTSIDE_SIZE_LIMIT")
    return path.read_bytes()

def clean_label(s, max_length):
    if not isinstance(s, str) or not 2 <= len(s.strip()) <= max_length:
        fail("MISSING_RIGHTS_HOLDER_OR_CREDIT")
    if any(ord(ch) < 32 for ch in s):
        fail("UNSAFE_CONTROL_IN_PROVENANCE")
    return s.strip()

def prepare_manifest(manifest):
    if not isinstance(manifest, dict) or not REQUIRED.issubset(manifest):
        fail("INCOMPLETE_PRIVATE_SOURCE_MANIFEST")
    allowed_fields = REQUIRED | {"rightsValidUntil"}
    if set(manifest) - allowed_fields:
        fail("UNRECOGNIZED_INPUT_FIELDS")
    photo = safe_file(manifest["photoFile"], LIMIT_PHOTO)
    proof = safe_file(manifest["proofFile"], LIMIT_PROOF)
    if not manifest["proofFile"].lower().endswith((".pdf", ".json")):
        fail("ONLY_CONTRACT_PDF_OR_JSON")
    if not isinstance(manifest["sceneId"], str) or manifest["sceneId"] not in {
        scene["id"] for slot in audit.SCENES.values() for scene in slot["scenes"]
    }:
        fail("UNKNOWN_REAL_LIFE_SCENE")
    if manifest["rightsBasis"] not in audit.BASIS:
        fail("UNAPPROVED_RIGHTS_BASIS")
    start = manifest["rightsValidFrom"]
    until = manifest.get("rightsValidUntil")
    if not audit.isdate(start) or (until is not None and
                                  (not audit.isdate(until) or until < start)):
        fail("INVALID_LICENSE_DATES")
    if pathlib.Path(manifest["photoFile"]).suffix.lower() not in (".jpg", ".jpeg"):
        fail("ONLY_REAL_JPEG_SOURCE")
    if not photo.startswith(b"\xff\xd8"):
        fail("NOT_A_JPEG")
    Image.MAX_IMAGE_PIXELS = 35_000_000
    try:
        with Image.open(io.BytesIO(photo)) as im:
            im.load()
            if im.format != "JPEG" or im.size != (1080, 1350):
                fail("ORIGINAL_FINAL_JPEG_1080x1350_REQUIRED")
            phash = audit.phash_for(im)
    except (OSError, ValueError):
        fail("UNREADABLE_JPEG")
    extension = ".pdf" if manifest["proofFile"].lower().endswith(".pdf") else ".json"
    if extension == ".pdf" and not proof.startswith(b"%PDF-"):
        fail("INVALID_PDF_EVIDENCE")
    if extension == ".json":
        try:
            data = json.loads(proof)
            if not isinstance(data, dict) or not data:
                fail("EMPTY_RIGHTS_EVIDENCE_JSON")
        except (ValueError, UnicodeDecodeError):
            fail("INVALID_RIGHTS_EVIDENCE_JSON")
    sha = hashlib.sha256(photo).hexdigest()
    proof_sha = hashlib.sha256(proof).hexdigest()
    row = {
        "storage_path": "photo-bank/images/" + sha + ".jpg",
        "photo_sha256": sha, "photo_phash": phash,
        "scene_id": manifest["sceneId"], "rights_basis": manifest["rightsBasis"],
        "license_evidence_path": "photo-bank/rights/" + sha + extension,
        "license_evidence_sha256": proof_sha,
        "rights_holder": clean_label(manifest["rightsHolder"], 160),
        "credit_line": clean_label(manifest["creditLine"], 250),
        "rights_valid_from": start, "rights_valid_until": until,
        "photo_width": 1080, "photo_height": 1350, "photo_bytes": len(photo),
        # NEVER assert license, AI-analysis, human approval or dual pixel QA on intake.
        "commercial_social_rights": False,
        "ai_quality_inspection_rights": False,
        "qa_status": "PENDING",
    }
    audit.check_bytes(photo, proof, row)
    assert audit.asset_is_eligible(row, start) is False
    return row, photo, proof

def fixed_origin_request(url, key, method, data=None, content_type=None):
    parsed = urllib.parse.urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname != audit.HOST or
        parsed.username is not None or parsed.password is not None or parsed.port is not None):
        fail("ONLY_FIXED_STAGING_ORIGIN")
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    if content_type:
        headers["Content-Type"] = content_type
    if method == "POST":
        headers["x-upsert"] = "false"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with audit.NO_REDIRECT_OPENER.open(req, timeout=30) as response:
            result = response.read(4_900_001)
            if response.status not in (200, 201, 204) or len(result) > 4_900_000:
                fail("UNVERIFIABLE_STAGING_WRITE_OR_READBACK")
            if urllib.parse.urlparse(response.geturl()).hostname != audit.HOST:
                fail("STAGING_REDIRECT_REJECTED")
            return result
    except Exception:
        # No implicit retry following ambiguous upload or storage response.
        fail("STAGING_TRANSFER_UNCONFIRMED_NO_AUTO_RETRY")

def upload_one(key, path, content, kind):
    if not (audit.PHOTO_PATH.fullmatch(path) or audit.EVIDENCE_PATH.fullmatch(path)):
        fail("ONLY_PRIVATE_PHOTO_BANK_PREFIX")
    encoded = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    url = "https://" + audit.HOST + "/storage/v1/object/" + audit.BUCKET + "/" + encoded
    fixed_origin_request(url, key, "POST", content, kind)
    actual = audit.private_blob(path, key, len(content) + 16)
    if hashlib.sha256(actual).hexdigest() != hashlib.sha256(content).hexdigest():
        fail("PRIVATE_STORAGE_READBACK_HASH_MISMATCH")

def stage(row, photo, proof, key):
    if not key or len(key) < 20:
        fail("NO_STAGING_SECRET")
    prior = audit.api_json("unboda_social_licensed_photo_assets", key, {
        "select": "id", "photo_sha256": "eq." + row["photo_sha256"], "limit": "1"
    })
    if not isinstance(prior, list) or prior:
        fail("DUPLICATE_OR_UNVERIFIABLE_ASSET_NO_OVERWRITE")
    # Deliberately no automatic DELETE, retry or UPSERT on uncertain results.
    upload_one(key, row["storage_path"], photo, "image/jpeg")
    proof_type = ("application/pdf" if row["license_evidence_path"].endswith(".pdf")
                  else "application/json")
    upload_one(key, row["license_evidence_path"], proof, proof_type)
    body = json.dumps(row, ensure_ascii=False, separators=(",", ":")).encode()
    url = ("https://" + audit.HOST +
           "/rest/v1/unboda_social_licensed_photo_assets")
    fixed_origin_request(url, key, "POST", body, "application/json")
    # Re-read only the exact immutable SHA to confirm a single pending row.
    rows = audit.api_json("unboda_social_licensed_photo_assets", key, {
        "select": "photo_sha256,qa_status,commercial_social_rights,ai_quality_inspection_rights",
        "photo_sha256": "eq." + row["photo_sha256"], "limit": "2"
    })
    if (not isinstance(rows, list) or len(rows) != 1 or
        rows[0].get("qa_status") != "PENDING" or
        rows[0].get("commercial_social_rights") is not False or
        rows[0].get("ai_quality_inspection_rights") is not False):
        fail("UNVERIFIED_RECORDED_PENDING_ASSET")
    return True

def selftest():
    with tempfile.TemporaryDirectory() as root:
        folder = pathlib.Path(root)
        image = Image.new("RGB", (1080, 1350), (180, 120, 40))
        draw = ImageDraw.Draw(image)
        for k in range(900):
            draw.line(((k * 13) % 1080, (k * 29) % 1350,
                       (k * 71) % 1080, (k * 79) % 1350),
                      fill=(k * 17 % 255, k * 29 % 255, k * 37 % 255), width=2)
        f = folder / "fixture.jpg"
        image.save(f, format="JPEG", quality=92)
        p = folder / "fixture.json"
        p.write_text('{"sample":"not actual rights evidence"}', encoding="utf-8")
        manifest = {"photoFile": str(f), "proofFile": str(p),
                    "sceneId": "notebook", "rightsBasis": "BRAND_OWNED",
                    "rightsHolder": "Example only", "creditLine": "Test fixture",
                    "rightsValidFrom": "2026-11-01"}
        row, photo, proof = prepare_manifest(manifest)
        assert row["qa_status"] == "PENDING"
        assert row["commercial_social_rights"] is False
        assert audit.asset_is_eligible(row, "2026-11-10") is False
        assert len(photo) == row["photo_bytes"] and proof
        def must_fail(m):
            try:
                prepare_manifest(m)
            except RuntimeError:
                return
            raise AssertionError("Unsafe photo manifest unexpectedly accepted")
        must_fail({**manifest, "rightsBasis": "STOCK_LICENSE_UNKNOWN"})
        must_fail({**manifest, "sceneId": "invented_scene"})
        must_fail({**manifest, "rightsValidUntil": "2026-01-01"})
        must_fail({**manifest, "photoFile": str(p)})
        must_fail({**manifest, "proofFile": str(f)})
        assert "UNBODA_STAGING_SERVICE_ROLE_KEY" not in row
    print("PRIVATE_BANK_STAGING_INTAKE_OFFLINE_TESTS_PASS_NO_SNS_POST_NO_APPROVAL")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", help="Private local manifest JSON, never commit")
    parser.add_argument("--stage", action="store_true",
                        help="Explicitly upload to staging-only private bucket; no SNS")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        selftest()
        return
    if not args.manifest:
        fail("PRIVATE_MANIFEST_REQUIRED")
    # Permission must be granted separately after legal/human review.
    manifest = json.loads(safe_file(args.manifest, 40_000).decode("utf-8"))
    row, photo, proof = prepare_manifest(manifest)
    if not args.stage:
        print("PRIVATE_REAL_PHOTO_LOCAL_CHECK_PASSED_NOT_UPLOADED_NOT_APPROVED")
        return
    key = os.environ.get("UNBODA_STAGING_SERVICE_ROLE_KEY", "")
    stage(row, photo, proof, key)
    print("PRIVATE_REAL_PHOTO_STAGING_STORED_PENDING_RIGHTS_AND_DUAL_QA_NO_SNS_POST")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Do not print user-supplied local paths, credentials, proof or server bodies.
        print("PRIVATE_REAL_PHOTO_INGEST_FAILED_CLOSED", type(exc).__name__, file=sys.stderr)
        sys.exit(1)
