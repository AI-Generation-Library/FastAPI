"""Import the existing book into Quartz content without changing the manuscript."""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    (1, 1, 4, "FastAPI 시작하기", "환경부터 API 계약까지, 첫 서비스를 만든다."),
    (2, 5, 8, "FastAPI 내부 동작 원리", "ASGI·이벤트 루프·동시성·의존성을 이해한다."),
    (3, 9, 12, "데이터베이스와 아키텍처", "구조와 트랜잭션, 캐시의 경계를 설계한다."),
    (4, 13, 15, "인증, 보안, 예외 처리", "사용자와 데이터의 접근 경계를 지킨다."),
    (5, 16, 19, "실무 API와 테스트", "외부 API·스트리밍·작업 큐를 검증한다."),
    (6, 20, 24, "성능 최적화와 서비스 운영", "측정으로 병목을 찾고 장애에 대비한다."),
    (7, 25, 30, "AI 서비스 개발", "LLM·RAG·Agent를 운영 가능한 API로 연결한다."),
]
CORE = {5, 6, 7, 8, 11, 17, 20, 24}

def frontmatter(title: str, description: str, *, chapter: int | None = None, part: int | None = None, toc: bool = True) -> str:
    values = {"title": title, "description": description, "tags": ["FastAPI"],
              "created": "2026-10-10", "modified": "2026-10-11", "enableToc": toc}
    if chapter is not None:
        values["chapter"] = chapter
    if part is not None:
        values["part"] = part
    return "---\n" + "\n".join(f"{key}: {json.dumps(value, ensure_ascii=False)}" for key, value in values.items()) + "\n---\n\n"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT.parent / "FastAPI-완전-정복")
    args = parser.parse_args()
    source = args.source.resolve()
    content = ROOT / "content"
    if not (source / "README.md").is_file():
        raise SystemExit(f"Book README not found: {source}")
    content.mkdir(exist_ok=True)
    # Owned content directory only; exclude generated/runtime files.
    shutil.copytree(source, content, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns(".git", "__pycache__", ".pytest_cache", ".venv", "*.pyc", "*.db", "*.sqlite3"))
    toc = (source / "README.md").read_text(encoding="utf-8-sig")
    entries = re.findall(r"^\d+\. \[(.*?)\]\((.*?/chapter\.md)\)$", toc, re.M)
    if len(entries) != 30:
        raise SystemExit("Expected exactly 30 book chapters")
    manifest = []
    for number, (title, relative) in enumerate(entries, 1):
        part = next(p for p in PARTS if p[1] <= number <= p[2])
        path = content / relative
        body = (source / relative).read_text(encoding="utf-8-sig")
        body = re.sub(r"^# Chapter[^\n]*\n+", "", body, count=1)
        body = body.replace("../README.md", "../index.md")
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip() and not p.lstrip().startswith(("#", ">", "```", "-", "|"))]
        description = re.sub(r"[*`\[\]]", "", paragraphs[0])[:170] if paragraphs else part[4]
        path.write_text(frontmatter(f"{number:02d}장. {title}", description, chapter=number, part=part[0]) + body, encoding="utf-8")
        landing = frontmatter(f"{number:02d}장. {title}", description, part=part[0], toc=False)
        landing += f"> PART {part[0]} · {part[3]}\n\n{description}\n\n[이 장 본문 읽기 →](./chapter.md)\n\n[전체 학습 목차](../index.md)\n"
        (path.parent / "index.md").write_text(landing, encoding="utf-8")
        manifest.append({"number": number, "title": title, "href": relative.removesuffix(".md"), "part": part[0]})
    for path in content.rglob("*.md"):
        if path.name == "chapter.md" or path.name == "index.md":
            continue
        body = path.read_text(encoding="utf-8-sig")
        if body.startswith("---\n"):
            continue
        match = re.search(r"^# (.+)$", body, re.M)
        title = match.group(1) if match else path.stem
        body = re.sub(r"^# [^\n]*\n+", "", body, count=1)
        body = body.replace("../README.md", "../index.md")
        path.write_text(frontmatter(title, "FastAPI 완전 정복의 보충 학습 자료와 실습 안내.") + body, encoding="utf-8")
    (content / "static").mkdir(exist_ok=True)
    (content / "static/book-manifest.json").write_text(json.dumps({"title": "FastAPI 완전 정복", "chapters": manifest}, ensure_ascii=False, indent=2), encoding="utf-8")
    (content / "appendices/index.md").write_text(frontmatter("부록 · 학습 도구", "로드맵과 용어, 실습 검증 안내를 모았다.", toc=False) + "- [학습 로드맵](./learning-roadmap.md)\n- [용어 사전](./glossary.md)\n- [코드 검증 범위](./verification.md)\n- [전체 목차](../index.md)\n", encoding="utf-8")

    hero = '''<section class="book-hero">
<p class="book-eyebrow">PYTHON BACKEND · A PRACTICAL GUIDE</p>
<h1>FastAPI<br><span>완전 정복</span></h1>
<p class="book-lead">코드를 넘어, 서버가 동작하는 원리까지.<br>비동기 프로그래밍부터 운영 가능한 AI 서비스까지 함께 만든다.</p>
<div class="book-actions"><a class="book-button book-button-primary" href="01-fastapi-introduction/chapter">01장부터 시작하기 <span aria-hidden="true">↗</span></a><a class="book-button book-button-secondary" href="00-preface">실습 기준 읽기</a></div>
<div class="book-metrics"><div><strong>07</strong><span>개의 파트</span></div><div><strong>30</strong><span>개의 챕터</span></div><div><strong>266</strong><span>개의 세부 주제</span></div><div><strong>01</strong><span>개의 통합 프로젝트</span></div></div>
</section>
<section class="book-progress-panel" aria-label="학습 진도">
<div><p class="book-eyebrow">YOUR READING JOURNEY</p><strong data-book-progress-count>0 / 30장 완료</strong><p>마지막으로 읽던 곳부터 이어가세요.</p></div>
<progress data-book-progress max="30" value="0" aria-label="완료한 챕터 수">0 / 30</progress>
<a class="book-button book-button-secondary" data-book-resume href="01-fastapi-introduction/chapter">이어서 읽기 →</a>
</section>
<div class="book-note"><strong>이렇게 읽어요.</strong> 각 장은 개념 → 내부 원리 → 실습 → 실무 적용 → 확인 문제로 이어집니다. 실습은 장별로 독립 실행하며, 마지막에 Knowledge Hub로 통합합니다. 진도는 이 브라우저에 저장됩니다.</div>
'''
    home = frontmatter("FastAPI 완전 정복", "Python 비동기부터 API 설계, DB, 인증, 운영, RAG와 Agent까지. 7부·30장의 실습형 기술 블로그.", toc=False) + hero
    home += '\n<section class="book-parts" aria-label="전체 학습 목차">\n'
    for part, first, last, title, description in PARTS:
        home += f'<section class="book-part"><header><span class="book-eyebrow">PART {part:02d}</span><h2>{html.escape(title)}</h2><p>{html.escape(description)}</p></header><div class="book-chapters">\n'
        for chapter in manifest[first - 1:last]:
            number = chapter["number"]
            badge = '<span class="chapter-core">핵심</span>' if number in CORE else ''
            home += f'<a class="book-chapter" data-book-chapter="{number}" href="{html.escape(chapter["href"])}"><span class="chapter-number">{number:02d}</span><span class="chapter-name">{html.escape(chapter["title"])}</span>{badge}<span class="chapter-status" data-book-completed="{number}">읽기 전</span><span class="chapter-arrow" aria-hidden="true">↗</span></a>\n'
        home += '</div></section>\n'
    home += '</section>\n\n<section class="book-resources"><h2>함께 보는 학습 도구</h2><div class="book-actions"><a class="book-button book-button-secondary" href="appendices/learning-roadmap">학습 로드맵</a><a class="book-button book-button-secondary" href="appendices/glossary">용어 사전</a><a class="book-button book-button-secondary" href="29-capstone/project/README">통합 실습 프로젝트</a><a class="book-button book-button-secondary" href="downloads/fastapi-book.zip" download>원고 ZIP 받기</a><a class="book-button book-button-secondary" href="downloads/knowledge-hub-project.zip" download>실습 코드 받기</a></div></section>\n'
    (content / "index.md").write_text(home, encoding="utf-8")
    # The copied README stays as a compatible URL for manuscript links.
    downloads = content / "downloads"
    downloads.mkdir(exist_ok=True)
    with zipfile.ZipFile(downloads / "fastapi-book.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file() and not {"__pycache__", ".venv", ".pytest_cache", ".git"}.intersection(path.relative_to(source).parts):
                archive.write(path, Path(source.name) / path.relative_to(source))
    with zipfile.ZipFile(downloads / "knowledge-hub-project.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        project = source / "29-capstone/project"
        for path in sorted(project.rglob("*")):
            if path.is_file() and not {"__pycache__", ".venv", ".pytest_cache", ".git"}.intersection(path.relative_to(project).parts):
                archive.write(path, Path("knowledge-hub") / path.relative_to(project))
    print(f"Imported {len(manifest)} chapters; source manuscripts unchanged")

if __name__ == "__main__":
    main()
