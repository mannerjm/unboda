#!/usr/bin/env python3
"""STAGING ONLY: choose unique genuine licensed candidates for 3 future KST days.

Read-only planning is the default. --apply-staging can insert reservations
ONLY after a COMPLETE 21-slot plan. It never uploads images, grants QA,
creates SNS posts, mutates past assignments, or retries ambiguous writes.
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("unboda_photo_bank_helpers", ROOT / "verify-private-licensed-photo-buffer.py")
bank = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bank)

def fail(reason):
    raise RuntimeError("PRIVATE_PHOTO_ALLOCATION_BLOCKED:" + reason)

def plan(start_date, candidates, existing, recent, published):
    if not bank.isdate(start_date):
        fail("INVALID_START_DATE")
    if not all(isinstance(xs, list) for xs in (candidates, existing, recent, published)):
        fail("INCOMPLETE_PROVIDER_LISTS")
    if (len(candidates) >= 300 or len(existing) > 21 or
        len(recent) >= 1000 or len(published) >= 1000):
        fail("TRUNCATED_CANDIDATE_OR_HISTORY_PAGE")
    by_slot = {}
    for a in existing:
        key = (a.get("date_kst"), a.get("hour_kst"))
        if key in by_slot:
            fail("DUPLICATE_PREASSIGNED_SLOT")
        by_slot[key] = a
    historical_hashes = set()
    historical_phashes = []
    for item in recent + published:
        sha = item.get("photo_sha256", item.get("media_sha256"))
        phash = item.get("photo_phash", item.get("image_phash"))
        if not (bank.SHA.fullmatch(str(sha)) and bank.PHASH.fullmatch(str(phash))):
            fail("UNKNOWN_PAST_HASH_BLOCKS_ASSIGNMENT")
        historical_hashes.add(sha)
        historical_phashes.append(phash)
    existing_ids = {a.get("asset_id") for a in existing}
    candidate_ids = set()
    for candidate in candidates:
        asset_id = candidate.get("id")
        if not isinstance(asset_id, str) or not re.fullmatch(r"[a-z0-9-]{36}", asset_id):
            fail("INVALID_CANDIDATE_ID")
        if asset_id in candidate_ids:
            fail("DUPLICATE_CANDIDATE_ID")
        candidate_ids.add(asset_id)
    ordered = sorted(candidates, key=lambda a: (a.get("created_at") or "", a["id"]))
    chosen_hashes, chosen_phashes = set(), []
    newly_planned, warnings = [], []
    first = dt.date.fromisoformat(start_date)
    for offset in range(3):
        day = (first + dt.timedelta(days=offset)).isoformat()
        for hour in bank.HOURS:
            slot = by_slot.get((day, hour))
            if slot is not None:
                if slot.get("review_state") == "REJECTED":
                    warnings.append((day, hour, "PREEXISTING_REJECTED_NO_REPLACEMENT"))
                # Never alter/delete/reclaim a slot that was previously attempted.
                continue
            matches = []
            valid_scenes = {scene["id"] for scene in bank.SCENES[hour]["scenes"]}
            for a in ordered:
                if a.get("qa_status") != "DUAL_QA_PASS" or a["id"] in existing_ids:
                    continue
                if not bank.asset_is_eligible(a, day) or a.get("scene_id") not in valid_scenes:
                    continue
                sha, phash = a["photo_sha256"], a["photo_phash"]
                if sha in chosen_hashes or sha in historical_hashes:
                    continue
                if (any(bank.near(phash, p) for p in chosen_phashes) or
                    any(bank.near(phash, p) for p in historical_phashes)):
                    continue
                matches.append(a)
            if not matches:
                warnings.append((day, hour, "NO_UNUSED_APPROVED_GENUINE_PHOTO"))
                continue
            asset = matches[0]
            newly_planned.append({
                "asset_id": asset["id"], "date_kst": day, "hour_kst": hour,
                "review_state": "RESERVED"
            })
            chosen_hashes.add(asset["photo_sha256"])
            chosen_phashes.append(asset["photo_phash"])
    return {
        "schemaVersion": 1,
        "dateKst": start_date,
        "expectedSlots": 21,
        "existingSlotsNeverTouched": len(existing),
        "newAssignments": newly_planned,
        "missingSlots": [{"dateKst": d, "hourKst": h, "reason": m} for d, h, m in warnings],
        "state": ("THREE_DAY_ASSIGNMENT_PLAN_COMPLETE_NOT_PUBLISHED"
                  if not warnings and len(existing) + len(newly_planned) == 21
                  else "BLOCKED_NO_PARTIAL_ASSIGNMENT"),
        "publicationAllowed": False, "whole90DayProviderHistoryVerified": False,
        "photoReadyForSnsPosting": False, "snsRequestsAttempted": 0
    }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--date")
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--apply-staging", action="store_true")
    args = p.parse_args()
    if args.self_test:
        selftest()
        return
    if not bank.isdate(args.date):
        fail("EXACT_FIRST_FUTURE_DATE_REQUIRED")
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    if dt.date.fromisoformat(args.date) <= today:
        fail("ONLY_FUTURE_KST_DATES")
    key = os.getenv("UNBODA_STAGING_SERVICE_ROLE_KEY", "")
    if not key or len(key) < 20:
        fail("STAGING_ONLY_SERVER_KEY_NOT_CONFIGURED")
    until = (dt.date.fromisoformat(args.date) + dt.timedelta(days=2)).isoformat()
    candidates = bank.api_json("unboda_social_photo_bank_unassigned", key,
        {"select": "*", "order": "created_at.asc,id.asc", "limit": "300"})
    existing = bank.api_json("unboda_social_photo_bank_assignments", key,
        {"select": "asset_id,date_kst,hour_kst,review_state",
         "and": "(date_kst.gte." + args.date + ",date_kst.lte." + until + ")",
         "limit": "50"})
    recent = bank.api_json("unboda_social_photo_bank_recent_history", key,
        {"select": "photo_sha256,photo_phash", "limit": "1000"})
    published = bank.api_json("unboda_social_lifestyle_media_usage", key,
        {"select": "media_sha256,image_phash,slot_date",
         "slot_date": "gte." +
             (dt.date.fromisoformat(args.date) - dt.timedelta(days=90)).isoformat(),
         "limit": "1000"})
    result = plan(args.date, candidates, existing, recent, published)
    print("STAGING_PRIVATE_3DAY_ALLOCATION", result["state"],
          "existing", result["existingSlotsNeverTouched"],
          "new", len(result["newAssignments"]),
          "missing", len(result["missingSlots"]), "NO_SOCIAL_POST")
    for issue in result["missingSlots"]:
        print("SHORTAGE", issue["dateKst"], issue["hourKst"], issue["reason"])
    if result["state"] != "THREE_DAY_ASSIGNMENT_PLAN_COMPLETE_NOT_PUBLISHED":
        raise SystemExit(1)
    if not args.apply_staging or not result["newAssignments"]:
        print("STAGING_RESERVATION_NOT_ATTEMPTED")
        return
    # One atomic PostgREST bulk insert. Any failure/timeout is terminal; do not
    # automatically retry because prior success may be unknown.
    url = "https://" + bank.HOST + "/rest/v1/unboda_social_photo_bank_assignments"
    payload = json.dumps(result["newAssignments"], separators=(",", ":")).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "apikey": key, "Authorization": "Bearer " + key,
        "Content-Type": "application/json", "Prefer": "return=minimal"
    })
    try:
        with bank.NO_REDIRECT_OPENER.open(req, timeout=25) as resp:
            if resp.status not in (200, 201, 204):
                fail("UNCONFIRMED_STAGING_BULK_RESERVATION")
    except Exception:
        fail("STAGING_RESERVATION_RESPONSE_UNKNOWN_NEVER_RETRY")
    readback = bank.api_json("unboda_social_photo_bank_assignments", key,
        {"select": "asset_id,date_kst,hour_kst,review_state",
         "and": "(date_kst.gte." + args.date + ",date_kst.lte." + until + ")",
         "limit": "50"})
    expected = {(x["date_kst"], x["hour_kst"], x["asset_id"]) for x in result["newAssignments"]}
    observed = {(x["date_kst"], x["hour_kst"], x["asset_id"]) for x in readback}
    if not expected.issubset(observed):
        fail("STAGING_RESERVATION_READBACK_INCOMPLETE_NEVER_RETRY")
    print("STAGING_PRIVATE_PHOTO_SLOTS_RESERVED_NO_SNS_POST")

def selftest():
    valid = []
    date = "2026-11-10"
    for day in range(3):
        for ix, h in enumerate(bank.HOURS):
            idx = day * 7 + ix
            scene = bank.SCENES[h]["scenes"][0]["id"]
            valid.append({
                "id": f"00000000-0000-4000-8000-{idx:012x}",
                "photo_sha256": hashlib.sha256(f"media-{idx}".encode()).hexdigest(),
                "photo_phash": hashlib.sha256(f"phash-{idx}".encode()).hexdigest()[:16],
                "scene_id": scene,
                "qa_status": "DUAL_QA_PASS",
                "rights_basis": "BRAND_OWNED",
                "commercial_social_rights": True,
                "ai_quality_inspection_rights": True,
                "rights_valid_from": "2026-11-01", "rights_valid_until": None,
                "license_evidence_sha256": "a"*64,
                "storage_path": "photo-bank/images/" + f"{idx:064x}" + ".jpg",
                "license_evidence_path": "photo-bank/rights/" + f"{idx:064x}" + ".json",
                "rights_holder": "Mock rights owner",
                "credit_line": "Mock photographer",
                "photo_width": 1080, "photo_height": 1350, "photo_bytes": 120000,
            })
    x = plan(date, valid, [], [], [])
    assert x["state"] == "THREE_DAY_ASSIGNMENT_PLAN_COMPLETE_NOT_PUBLISHED"
    assert len(x["newAssignments"]) == 21 and not x["publicationAllowed"]
    assert len({v["asset_id"] for v in x["newAssignments"]}) == 21
    x2 = plan(date, valid, [x["newAssignments"][0]], [], [])
    assert x2["state"] == "THREE_DAY_ASSIGNMENT_PLAN_COMPLETE_NOT_PUBLISHED"
    assert len(x2["newAssignments"]) == 20
    valid[1]["qa_status"] = "PENDING"
    x3 = plan(date, valid, [], [], [])
    assert x3["state"] == "BLOCKED_NO_PARTIAL_ASSIGNMENT"
    assert len(x3["newAssignments"]) == 20
    print("PASS_PRIVATE_BANK_21_SLOT_ALLOCATION_MOCK_ONLY_NO_SNS_POST")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("PRIVATE_PHOTO_ALLOCATION_FAILED_CLOSED", type(exc).__name__, file=sys.stderr)
        sys.exit(1)
