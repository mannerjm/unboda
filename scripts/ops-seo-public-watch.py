#!/usr/bin/env python3
"""Read-only public SEO crawlability watcher. Actual search-engine indexing is NOT measured."""
import datetime as dt
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlsplit

BASE = "https://unboda.kr"
SITEMAP = BASE + "/sitemap.xml"
ROBOTS = BASE + "/robots.txt"
ISSUE_TITLE = "[운보다 SEO 감시] 공개 페이지 수집 설정 이상"
PRIVATE = ("/admin", "/api", "/auth", "/account", "/mypage",
           "/purchased-analyses", "/checkout", "/ai-consulting")


def fetch(url):
    request = urllib.request.Request(
        url, headers={"User-Agent": "UnbodaSeoWatch/1.0",
                      "Cache-Control": "no-cache"}, method="GET"
    )
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            if response.status != 200:
                raise ValueError(f"HTTP {response.status}")
            return response.read(512 * 1024).decode("utf-8"), response.headers
    except urllib.error.HTTPError as error:
        raise ValueError(f"HTTP {error.code}") from error
    except (urllib.error.URLError, OSError, TimeoutError) as error:
        raise ValueError("network " + type(error).__name__) from error


class PageInfo(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_text = []
        self.metas = {}
        self.canonical = ""
        self.h1 = 0

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1 += 1
        elif tag == "meta":
            key = (values.get("name") or "").lower()
            if key:
                self.metas[key] = values.get("content") or ""
        elif tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.canonical = values.get("href") or ""

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, value):
        if self.in_title:
            self.title_text.append(value)

    @property
    def title(self):
        return "".join(self.title_text).strip()


def check_page(url):
    try:
        body, headers = fetch(url)
        doc = PageInfo()
        doc.feed(body)
        errors = []
        if not doc.title:
            errors.append("missing title")
        if not doc.metas.get("description"):
            errors.append("missing description")
        if "noindex" in doc.metas.get("robots", "").lower() or "noindex" in headers.get("X-Robots-Tag", "").lower():
            errors.append("public page contains noindex")
        if "index" not in doc.metas.get("robots", "").lower():
            errors.append("missing index directive")
        if doc.canonical.rstrip("/") != url.rstrip("/"):
            errors.append("canonical mismatch")
        if doc.h1 != 1:
            errors.append(f"expected 1 H1, got {doc.h1}")
        if url.rstrip("/") == BASE and not doc.metas.get("naver-site-verification"):
            errors.append("missing Naver verification tag")
        return url, doc.title, errors
    except (ValueError, UnicodeError) as error:
        return url, "", [str(error)]


def audit():
    issues = []
    try:
        robots, _ = fetch(ROBOTS)
        lines = [line.strip().lower() for line in robots.splitlines()]
        if "sitemap: " + SITEMAP.lower() not in lines:
            issues.append("robots.txt missing sitemap entry")
        if "disallow: /" in lines:
            issues.append("robots.txt blocks all public pages")
    except (ValueError, UnicodeError) as error:
        issues.append("robots.txt: " + str(error))
    try:
        xml, _ = fetch(SITEMAP)
        root = ET.fromstring(xml)
        urls = [item.text.strip() for item in root.findall(".//{*}url/{*}loc")
                if item.text and item.text.strip()]
    except (ValueError, UnicodeError, ET.ParseError) as error:
        return issues + ["sitemap.xml: " + str(error)]
    if len(urls) < 74:
        issues.append(f"sitemap count fell below baseline: {len(urls)} < 74")
    if len(urls) != len(set(urls)):
        issues.append("duplicate sitemap URLs")
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "unboda.kr":
            issues.append("unexpected sitemap origin: " + url)
        if parsed.query or parsed.fragment or any(parsed.path.startswith(p) for p in PRIVATE):
            issues.append("private/parameterized URL in sitemap: " + url)
    known_titles = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, title, errors in pool.map(check_page, urls):
            issues.extend(f"{url}: {error}" for error in errors)
            if title in known_titles:
                issues.append("duplicate title: " + known_titles[title] + " and " + url)
            elif title:
                known_titles[title] = url
    return issues


def gh(*args):
    return subprocess.run(["gh", *args], check=True, text=True,
                          capture_output=True, timeout=35).stdout.strip()


def existing_issue(repo):
    issues = json.loads(gh("issue", "list", "--repo", repo, "--state", "open",
                           "--limit", "100", "--json", "number,title"))
    return next((int(item["number"]) for item in issues
                 if item["title"] == ISSUE_TITLE), None)


def main():
    if os.getenv("GITHUB_REPOSITORY") != "mannerjm/unboda":
        print("Wrong GitHub repository", file=sys.stderr)
        return 2
    problems = audit()
    if problems:
        print("SEO check failed; repeating after 20s", flush=True)
        time.sleep(20)
        problems = audit()
    repo = "mannerjm/unboda"
    issue = existing_issue(repo)
    if problems:
        if issue is None:
            details = "\n".join("- " + item for item in problems[:25])
            if len(problems) > 25:
                details += f"\n- ...{len(problems)-25} additional issues"
            body = ("@mannerjm\n\n운보다 공개 SEO **기술적 수집 조건** 점검에서 "
                    "재검사 후에도 문제가 발견됐습니다. Google/네이버의 실제 색인 개수는 별도입니다.\n\n"
                    f"- 시각(UTC): {dt.datetime.now(dt.timezone.utc).isoformat()}\n"
                    f"- 사이트맵: {SITEMAP}\n- robots: {ROBOTS}\n\n" + details +
                    "\n\n결제·환불·고객 정보는 변경되지 않았습니다.")
            gh("issue", "create", "--repo", repo, "--title", ISSUE_TITLE,
               "--body", body, "--assignee", "mannerjm")
            print("SEO incident issue created")
        else:
            print(f"SEO incident #{issue} already open")
        return 0
    if issue is not None:
        gh("issue", "comment", str(issue), "--repo", repo, "--body",
           "공개 SEO 기술 점검 복구 확인. 실제 검색엔진 색인 상태는 별도 확인 필요.")
        gh("issue", "close", str(issue), "--repo", repo, "--reason", "completed")
        print(f"SEO issue #{issue} resolved")
    else:
        print("OK: sitemap, robots and all published public SEO pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
