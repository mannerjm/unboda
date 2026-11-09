#!/usr/bin/env python3
"""UNBODA production-adjacent 18-delivery readiness ledger, READ ONLY.

Only GETs two pinned public GitHub release metadata endpoints and the existing
Metricool scheduler GET (when a protected credential is configured). Never
publishes, retries ambiguous POSTs, deletes, updates, or replays missed slots.

The output separates: asset files exist, future bookings exist, and actual
PUBLISHED+publicUrl proof. A release alone never counts as SNS success.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

REPO="mannerjm/unboda"
GITHUB="api.github.com"
METRICOOL="app.metricool.com"
BRAND="7377653"
USER="5729495"
KST=dt.timezone(dt.timedelta(hours=9))
VIDEO_HOURS=("00","08","12","20")
LIFESTYLE_HOURS=("01","04","10","13","16","19","22")
LIFESTYLE_CHANNELS={"01":"facebook","04":"instagram","10":"threads","13":"facebook","16":"instagram","19":"threads","22":"facebook"}
ZODIAC_CHANNELS=("facebook","instagram","threads")
KNOWN_VIDEO_CHANNELS=frozenset(("facebook","instagram","threads","tiktok","youtube"))
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise RuntimeError("HTTP_REDIRECT_BLOCKED")
HTTP=urllib.request.build_opener(NoRedirect())
DATE=re.compile(r"^\d{4}-\d{2}-\d{2}$")
def bad(reason):
    raise RuntimeError("UNBODA_READONLY_PREFLIGHT_BLOCKED_"+reason)
def valid_date(value):
    try:
        return bool(DATE.fullmatch(value)) and dt.date.fromisoformat(value).isoformat()==value
    except (ValueError,TypeError):
        return False
def get_json(url,headers=None):
    u=urllib.parse.urlparse(url)
    if (u.scheme!="https" or u.hostname not in {GITHUB,METRICOOL} or
        u.username or u.password or u.port or u.fragment):
        bad("UNTRUSTED_HTTP_ORIGIN")
    if u.hostname==METRICOOL and u.path!="/api/v2/scheduler/posts":
        bad("UNTRUSTED_METRICOOL_API_ROUTE")
    if u.hostname==GITHUB and not re.fullmatch(
        r"/repos/mannerjm/unboda/releases/tags/unboda-(?:zodiac|saju-shorts|lifestyle-photo)-\d{8}",u.path):
        bad("UNTRUSTED_GITHUB_API_ROUTE")
    req=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"UnbodaReadonly18Preflight/1.0",**(headers or {})},method="GET")
    try:
        with HTTP.open(req,timeout=17) as response:
            if urllib.parse.urlparse(response.geturl()).hostname!=u.hostname:
                bad("HTTP_REDIRECT_NOT_ALLOWED")
            data=response.read(1_200_001)
            if len(data)>1_200_000:
                bad("OVERSIZED_UNTRUSTED_PROVIDER_RESPONSE")
            return json.loads(data)
    except urllib.error.HTTPError as ex:
        if u.hostname==GITHUB and ex.code==404:
            return None
        bad("UPSTREAM_HTTP_"+str(ex.code))
    except (urllib.error.URLError,TimeoutError):
        bad("UPSTREAM_UNAVAILABLE")
def release_assets(date,topic,fetch_json=get_json):
    stamp=date.replace("-","")
    tag={"zodiac":"unboda-zodiac-","video":"unboda-saju-shorts-",
         "photo":"unboda-lifestyle-photo-"}[topic]+stamp
    doc=fetch_json(f"https://{GITHUB}/repos/{REPO}/releases/tags/{tag}")
    if doc is None:
        return {"state":"MISSING_RELEASE","assets":0,"tag":tag,"filesVerified":False}
    if not isinstance(doc,dict) or doc.get("tag_name")!=tag or doc.get("draft") is not False:
        return {"state":"INVALID_RELEASE","assets":0,"tag":tag,"filesVerified":False}
    rows=doc.get("assets")
    if not isinstance(rows,list):
        return {"state":"INVALID_ASSET_LIST","assets":0,"tag":tag,"filesVerified":False}
    names=[x.get("name") for x in rows if isinstance(x,dict)]
    wanted=({"zodiac":{f"unboda-{date}-{i:02}.png" for i in range(1,8)}|{"caption.txt","zodiac-manifest.json"},
             "video":{n+e for n in ("00-midnight","08-commute","12-friendship","20-afterwork") for e in (".mp4",".jpg")}|{"manifest.json","automated-voice-quality-receipt.json"},
             "photo":{f"photo-{h}.jpg" for h in LIFESTYLE_HOURS}|{"manifest.json"}})[topic]
    valid=(set(names)==wanted and len(names)==len(wanted) and
        all(isinstance(a,dict) and isinstance(a.get("size"),int) and a["size"]>800
            for a in rows))
    return {"state":"SOURCE_METADATA_PRESENT" if valid else "INCOMPLETE_OR_INVALID_SOURCE",
            "assets":len(rows),"tag":tag,"filesVerified":False,
            "requiredCount":len(wanted),
            "note":"Metadata check only. Pixel, source license and bytes still require independent QA."}
def metricool_window(date,fetch_json=get_json,api_token=None):
    if not api_token or len(api_token)<20:
        return {"complete":False,"reason":"NO_PROTECTED_METRICOOL_SERVER_KEY","posts":[]}
    args={"userId":USER,"blogId":BRAND,"start":date+"T00:00:00",
          "end":date+"T23:59:59","timezone":"Asia/Seoul"}
    url=f"https://{METRICOOL}/api/v2/scheduler/posts?"+urllib.parse.urlencode(args)
    doc=fetch_json(url,headers={"X-Mc-Auth":api_token})
    posts=doc.get("data") if isinstance(doc,dict) else None
    if isinstance(posts,dict):posts=posts.get("items")
    if not isinstance(posts,list):return {"complete":False,"reason":"INVALID_PROVIDER_DAY_READ","posts":[]}
    page=doc.get("metadata",{}).get("page",{}) if isinstance(doc.get("metadata"),dict) else doc.get("page",{})
    if isinstance(page,dict) and (page.get("hasNext") or page.get("hasNextPage") or
                                   page.get("next") is not None or page.get("nextPage") is not None or
                                   (isinstance(page.get("page"),int) and
                                    isinstance(page.get("totalPages"),int) and
                                    page["page"]<page["totalPages"])):
        return {"complete":False,"reason":"PROVIDER_RESPONSE_PAGINATED","posts":[]}
    if len(posts)>=200:
        return {"complete":False,"reason":"PROVIDER_DAY_MAY_BE_TRUNCATED","posts":[]}
    return {"complete":True,"reason":"OK","posts":posts}
def counted_items(date, posts):
    out=[]
    for post in posts:
        if not isinstance(post,dict):continue
        pdate=post.get("publicationDate",{})
        clock=pdate.get("dateTime") if isinstance(pdate,dict) else ""
        if not isinstance(clock,str) or not clock.startswith(date+"T"):continue
        for provider in post.get("providers",[]) if isinstance(post.get("providers"),list) else []:
            if not isinstance(provider,dict):continue
            channel=provider.get("network")
            if channel not in KNOWN_VIDEO_CHANNELS:continue
            status=provider.get("status")
            url=provider.get("publicUrl")
            url_ok=False
            if isinstance(url,str):
                try:
                    u=urllib.parse.urlparse(url)
                    host=u.hostname or ""
                    base={"facebook":"facebook.com","instagram":"instagram.com","threads":"threads.com",
                          "youtube":"youtube.com","tiktok":"tiktok.com"}.get(channel)
                    if channel=="threads" and (host=="threads.net" or host.endswith(".threads.net")):
                        base="threads.net"
                    if channel=="youtube" and (host=="youtu.be" or host.endswith(".youtu.be")):
                        base="youtu.be"
                    url_ok=(u.scheme=="https" and not u.username and not u.password
                        and u.path not in ("","/") and base is not None
                        and (host==base or host.endswith("."+base)))
                except ValueError:pass
            out.append({"id":str(post.get("id") or ""),"hour":clock[11:13],
                        "minute":clock[14:16],"network":channel,
                        "status":status,"publishedUrlVerified":status=="PUBLISHED" and url_ok,
                        "mediaCount":len(post.get("media",[])) if isinstance(post.get("media"),list) else 0,
                        "draft":post.get("draft"),"autoPublish":post.get("autoPublish")})
    return out
def summarize(date, releases, readback, now=None):
    if not valid_date(date):bad("INVALID_TARGET_DATE")
    if now is None:now=dt.datetime.now(KST)
    today=now.astimezone(KST).date()
    future=dt.date.fromisoformat(date)>today
    eligible=counted_items(date,readback.get("posts",[])) if readback.get("complete") is True else []
    def classify(rows,label,expected,asset):
        if not readback.get("complete"):return {"status":"UNVERIFIED_PROVIDER","count":0,"required":expected,
                                                 "detail":readback.get("reason")}
        if len(rows)==0:return {"status":"NOT_RESERVED" if future else "NOT_VERIFIED_PUBLISHED","count":0,"required":expected}
        if len(rows)!=1:return {"status":"DUPLICATE_OR_CONFLICT","count":0,"required":expected}
        x=rows[0]
        media_required={"zodiac":7,"lifestyle":1,"video":1}[label]
        media_ok=x["mediaCount"]==media_required
        if future:
            okay=(x["status"]=="PENDING" and x["draft"] is False
                  and x["autoPublish"] is True and media_ok)
        else:
            okay=x["publishedUrlVerified"] and media_ok
        return {"status":("PENDING_NOT_PUBLISHED" if future else "PUBLISHED_WITH_URL") if okay else
                "UNVERIFIED_PROVIDER_STATE","count":int(okay),"required":expected,
                "postId":x["id"],"providerStatus":x["status"]}
    slot_results=[]
    for channel in ZODIAC_CHANNELS:
        slot_results.append({"type":"zodiac","timeKst":"07:00","network":channel,
           **classify([x for x in eligible if x["hour"]=="07" and x["minute"]=="00"
                and x["network"]==channel],"zodiac",1,releases["zodiac"])})
    for hour in LIFESTYLE_HOURS:
        ch=LIFESTYLE_CHANNELS[hour]
        slot_results.append({"type":"lifestyle","timeKst":hour+":00","network":ch,
           **classify([x for x in eligible if x["hour"]==hour and x["minute"]=="00"
                and x["network"]==ch],"lifestyle",1,releases["photo"])})
    for hour in VIDEO_HOURS:
        rows=[x for x in eligible if x["hour"]==hour and x["minute"]=="00"
              and x["network"] in KNOWN_VIDEO_CHANNELS]
        seen={x["network"] for x in rows}
        for ch in sorted(seen):
            x=[a for a in rows if a["network"]==ch]
            slot_results.append({"type":"video","timeKst":hour+":00","network":ch,
               **classify(x,"video",1,releases["video"])})
        for missing in range(max(0,2-len(seen))):
            slot_results.append({"type":"video","timeKst":hour+":00","network":f"MISSING_{missing+1}",
                "status":"NOT_RESERVED" if readback.get("complete") else "UNVERIFIED_PROVIDER",
                "count":0,"required":1})
    valid_count=sum(x["count"] for x in slot_results)
    collisions=[x for x in slot_results if x["status"]=="DUPLICATE_OR_CONFLICT"]
    expected=18
    completeness=readback.get("complete") is True
    asset_gaps={name:meta["state"] for name,meta in releases.items()
                if meta["state"]!="SOURCE_METADATA_PRESENT"}
    # Do not count PENDING as publication. Also no real-photo source if missing.
    return {"schemaVersion":1,"dateKst":date,"checkedAtKst":now.isoformat(),
            "expectedDeliveries":expected,"providerVerified":completeness,
            "futureReservationCount" if future else "publishedUrlVerifiedCount":valid_count,
            "sourceMetadata":releases,"sourceGaps":asset_gaps,"slots":slot_results,
            "schedulingAllowed":False,"snsRequestsAttempted":0,
            "fullyReservedNotPublished":bool(future and valid_count==expected and not asset_gaps and not collisions),
            "fullyActuallyPublished":bool(not future and valid_count==expected and not collisions),
            "status":("FUTURE_18_RESERVED_NOT_PUBLISHED" if future and valid_count==expected and not asset_gaps and not collisions
                      else "ALL_18_PUBLISHED_URLS_VERIFIED" if not future and valid_count==expected and not collisions
                      else "BLOCKED_GAPS_REQUIRE_ACTION"),
            "note":"Observer only; cannot recreate, approve, schedule, or infer video/social rights."}
def self_test():
    date="2026-11-10"
    assert valid_date(date) and not valid_date("2026-11-31")
    assert release_assets(date,"video",lambda u:{
        "tag_name":"unboda-saju-shorts-20261110","draft":False,
        "assets":[{"name":n+e,"size":100000} for n in ("00-midnight","08-commute","12-friendship","20-afterwork")
          for e in (".mp4",".jpg")]+[{"name":"manifest.json","size":1000},{"name":"automated-voice-quality-receipt.json","size":1000}]})["state"]=="SOURCE_METADATA_PRESENT"
    baseline={x:{"state":"SOURCE_METADATA_PRESENT"} for x in ("video","zodiac","photo")}
    instant=dt.datetime(2026,11,9,21,30,tzinfo=KST)
    assert summarize(date,baseline,{"complete":False,"reason":"NO_KEY"},instant)["status"]=="BLOCKED_GAPS_REQUIRE_ACTION"
    assert summarize(date,baseline,{"complete":True,"posts":[]},instant)["futureReservationCount"]==0
    posts=[{"id":1,"publicationDate":{"dateTime":date+"T07:00:00"},
            "draft":False,"autoPublish":True,"media":["a"]*7,
            "providers":[{"network":net,"status":"PENDING"} for net in ZODIAC_CHANNELS]}]
    ready=summarize(date,baseline,{"complete":True,"posts":posts},instant)
    assert ready["futureReservationCount"]==3 and ready["expectedDeliveries"]==18
    posts.append({**posts[0],"id":2})
    danger=summarize(date,baseline,{"complete":True,"posts":posts},instant)
    assert danger["futureReservationCount"]==0
    assert any(x["status"]=="DUPLICATE_OR_CONFLICT" for x in danger["slots"])
    print("UNBODA_18_SLOT_READONLY_PREFLIGHT_TESTS_PASS_NO_SNS_POST")
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--date",help="KST target date; defaults to tomorrow")
    ap.add_argument("--out",default="unboda-18-readiness.json")
    ap.add_argument("--self-test",action="store_true")
    args=ap.parse_args()
    if args.self_test:return self_test()
    date=args.date or (dt.datetime.now(KST).date()+dt.timedelta(days=1)).isoformat()
    if not valid_date(date):bad("INVALID_DATE")
    releases={}
    try:
        for kind in ("zodiac","video","photo"):
            releases[kind]=release_assets(date,kind)
    except Exception as e:
        print("GITHUB_RELEASE_READ_FAILED_"+type(e).__name__,file=sys.stderr)
        releases={kind:{"state":"SOURCE_LOOKUP_UNVERIFIED","filesVerified":False} for kind in ("zodiac","video","photo")}
    try:
        readback=metricool_window(date,api_token=os.environ.get("METRICOOL_API_TOKEN"))
    except Exception as e:
        print("METRICOOL_PROVIDER_READ_FAILED_"+type(e).__name__,file=sys.stderr)
        readback={"complete":False,"reason":"PROVIDER_REQUEST_FAILED","posts":[]}
    output=summarize(date,releases,readback)
    with open(args.out,"w",encoding="utf-8") as file:
        json.dump(output,file,ensure_ascii=False,indent=2)
        file.write("\n")
    print("READONLY_18_PREFLIGHT",output["dateKst"],output["status"],
          "providerVerified",output["providerVerified"],
          "bookedOrPublished",output.get("futureReservationCount",output.get("publishedUrlVerifiedCount")),
          "sourceGaps",",".join(output["sourceGaps"].keys()) or "none",
          "NO_SNS_POST")
    if output["status"]=="BLOCKED_GAPS_REQUIRE_ACTION":
        raise SystemExit(1)
if __name__=="__main__":
    try: main()
    except Exception as e:
        print("READONLY_18_PREFLIGHT_FAIL_CLOSED",type(e).__name__,file=sys.stderr)
        sys.exit(1)
