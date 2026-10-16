#!/usr/bin/env python3
"""Independent GitHub Actions uptime watcher for unboda.kr.

No customer data, payment APIs, database credentials, or Resend tokens are used.
GitHub issue assignment provides a fallback incident notification; direct
Naver email requires a separate external uptime provider or GitHub notification
email configured by the repository owner.
"""
import datetime as dt
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode

HOME = "https://unboda.kr/"
HEALTH = "https://unboda.kr/api/health/operations"
ISSUE_TITLE = "[운보다 외부 감시] 운영 이상 감지"
ISSUE_ASSIGNEE = "mannerjm"


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def fetch(url: str, *, structured: bool) -> str | None:
    unique_url = url + ("&" if "?" in url else "?") + urlencode({"monitor_ts": str(time.time_ns())})
    request = urllib.request.Request(
        unique_url,
        headers={"User-Agent": "unboda-github-external-uptime/1.0", "Cache-Control": "no-cache"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            status = response.status
            if status != 200:
                return f"HTTP {status}"
            data = response.read(1024 * 32)
    except urllib.error.HTTPError as error:
        return f"HTTP {error.code}"
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return f"network error: {error.__class__.__name__}"

    if not structured:
        if b"<html" not in data.lower():
            return "homepage did not return HTML"
        return None

    try:
        health = json.loads(data.decode("utf-8"))
    except (UnicodeError, ValueError):
        return "health API did not return JSON"
    if not isinstance(health, dict):
        return "health API returned an unexpected payload"
    problems = [
        f"{key}={health.get(key)!r}"
        for key in ("status", "scheduler", "reportRecovery")
        if health.get(key) != "healthy"
    ]
    return ", ".join(problems) if problems else None


def probe() -> list[str]:
    failures: list[str] = []
    for label, url, structured in (("homepage", HOME, False), ("operations health", HEALTH, True)):
        issue = fetch(url, structured=structured)
        if issue:
            failures.append(f"{label}: {issue}")
    return failures


def gh(*args: str) -> str:
    result = subprocess.run(["gh", *args], capture_output=True, text=True, check=True, timeout=35)
    return result.stdout.strip()


def existing_incident(repo: str) -> int | None:
    issues = json.loads(gh("issue", "list", "--repo", repo, "--state", "open",
                          "--limit", "100", "--json", "number,title"))
    for issue in issues:
        if issue["title"] == ISSUE_TITLE:
            return int(issue["number"])
    return None


def main() -> int:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if repo != "mannerjm/unboda":
        print("Only the authorized unboda repository can run this watcher.", file=sys.stderr)
        return 2

    first = probe()
    failure = first
    if first:
        print(f"First probe failed: {first}. Rechecking after 20 seconds.")
        time.sleep(20)
        failure = probe()

    incident = existing_incident(repo)
    if failure:
        details = "\n".join(f"- {entry}" for entry in failure)
        body = (
            "@mannerjm\n\n"
            "## 운보다 외부 감시 경고\n\n"
            "**GitHub의 외부 점검 위치에서 연속 2회 이상이 감지되었습니다.**\n"
            "이 결과만으로 전체 사용자에게 장애가 발생했다고 확정할 수는 없습니다.\n\n"
            f"- 확인 시각(UTC): {now_utc()}\n"
            f"- 홈페이지: {HOME}\n"
            f"- 운영 상태: {HEALTH}\n\n"
            "### 지속된 문제\n"
            f"{details}\n\n"
            "### 대표 확인 사항\n"
            "1. [운보다 운영 상태](https://unboda.kr/api/health/operations)를 확인하세요.\n"
            "2. [Vercel 운영 화면](https://vercel.com/)과 Supabase 상태를 확인하세요.\n"
            "3. 결제·환불·고객 데이터를 수동으로 수정하기 전에 문제 원인을 확인하세요.\n\n"
            "이 알림은 GitHub Actions 자동 감시로 생성되었습니다."
        )
        if incident is None:
            gh("issue", "create", "--repo", repo, "--title", ISSUE_TITLE,
               "--body", body, "--assignee", ISSUE_ASSIGNEE)
            print("A new external-monitor incident issue was opened.")
        else:
            print(f"Existing incident #{incident} remains open; not repeating alerts.")
        return 1

    if incident is not None:
        gh("issue", "comment", str(incident), "--repo", repo, "--body",
           f"자동 복구 확인: {now_utc()} UTC. 홈페이지 HTTP 200 및 operations health 모든 필드 healthy. "
           "실제 장애 여부와 대응 내역은 운영자가 별도로 확인하세요.")
        gh("issue", "close", str(incident), "--repo", repo, "--reason", "completed")
        print(f"Recovered; closed incident #{incident}.")
    else:
        print("Healthy: homepage and operations API. No alert issued.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
