# FastAPI 완전 정복 · Markdown 블로그

[블로그 주소](https://ai-generation-library.github.io/FastAPI/) · [저장소](https://github.com/AI-Generation-Library/FastAPI)

`Desktop/jihun/study-log/blog`에서 사용하던 **Quartz 5 + Markdown + GitHub Pages** 구성을 재사용한 독립 블로그다. 기존 study-log의 소스·글·Git 저장소는 수정하지 않았다.

7부·30장 원고, 장별 목차와 검색, 코드 강조·복사, Mermaid, 다크 모드, 읽기 모드, 이전·다음 장 링크, 브라우저에 저장하는 학습 진도를 제공한다. 페이지는 빌드 시 정적 HTML로 생성되므로 운영 서버나 DB가 필요 없다.

## 로컬 실행

Node.js 22 이상과 npm 10.9.2 이상을 사용한다. 검증 환경은 Node 24다.

```powershell
npm ci
npm run dev
```

`http://localhost:8080`에서 볼 수 있다. 프로덕션 정적 파일은 다음으로 만든다.

```powershell
npm run build
```

출력은 전용 `dist/` 폴더다. Quartz가 이 폴더를 다시 생성하므로 개인 파일을 넣지 않는다.

## 글 수정과 원고 가져오기

블로그 글 원본은 `content/`다. 예를 들어 `content/06-asyncio-event-loop/chapter.md`를 수정하면 다음 빌드에 반영된다. 각 chapter에는 파일명이 아닌 실제 장 제목을 표시하는 frontmatter가 있다. 폴더의 `index.md`는 사이드바에 한글 장 제목을 표시한다.

```text
content/
├── index.md                   # 전체 목차와 홈
├── 00-preface.md
├── 01-fastapi-introduction/
│   ├── index.md               # 폴더의 제목과 안내
│   └── chapter.md             # 글 원본
├── …
├── 30-architecture-interview/
├── appendices/
├── downloads/                 # 원고와 실습 프로젝트 ZIP
└── static/book-manifest.json  # 학습 진도용 장 목록
```

기존 책 원고를 수정한 뒤 블로그에 다시 가져오려면 다음을 실행한다. 이 작업은 블로그 `content/`의 기존 가져온 글을 원고로 덮어쓴다. 블로그에서 직접 한 편집이 있다면 먼저 보관한다.

```powershell
python scripts/sync-book.py --source "../FastAPI-완전-정복"
npm run build
```

책의 원본 폴더는 이 가져오기 작업에서 변경하지 않는다. 가져오기 스크립트는 제목·설명·장 번호를 붙이고 홈, 폴더 안내, 다운로드 ZIP을 다시 만든다.

## GitHub Pages 배포

기존 study-log와 동일하게 `.github/workflows/deploy.yml`을 제공한다. [Pages 설정](https://github.com/AI-Generation-Library/FastAPI/settings/pages)에서 **Build and deployment → Source → GitHub Actions**를 선택한다. main 브랜치 push 또는 수동 실행으로 빌드와 배포가 진행된다.

워크플로가 GitHub Pages의 실제 `base_url`을 Quartz 설정에 반영하므로 `/저장소이름/` 하위 경로에서도 링크가 맞도록 구성했다. 이 저장소에는 GitHub Pages에 필요한 소스와 워크플로만 포함한다.

## 설정과 기능

- `quartz.config.yaml`: 사이트 이름, 주소, 플러그인, 색상·글꼴, 레이아웃.
- `quartz/styles/custom.scss`: 홈·본문·목차·모바일·다크 모드 스타일.
- `book-features.ts`, `book-features.inline.ts`: 읽기 진도, 수동 완료 표시, 이어서 읽기.
- `folder-links.ts`: study-log에서 가져온 폴더 중심 그래프 연결.
- `quartz.ts`: YAML 설정 및 커스텀 기능 연결.

학습 진도는 브라우저 localStorage에 저장한다. 계정 간·기기 간 동기화 기능은 없으며 저장이 차단되면 읽기는 계속 가능하다. 검색 인덱스는 빌드된 전체 본문이다. Mermaid와 웹 글꼴의 CDN 리소스는 네트워크 환경의 영향을 받을 수 있다.

## 라이선스와 원고 범위

Quartz와 재사용한 코드는 원래의 [MIT 라이선스](LICENSE.txt)를 유지한다. 이 프로젝트의 FastAPI 원고는 제공받은 목차를 바탕으로 작성했다. API 실습 검증 범위는 [원고의 검증 안내](content/appendices/verification.md)에 있다. 블로그를 발행했다고 외부 DB·LLM·Docker 실습까지 새로 검증한 것은 아니다.


기존 저장소의 CC0 1.0 Universal [LICENSE](LICENSE)는 원본 그대로 유지했다. Quartz의 MIT [LICENSE.txt](LICENSE.txt)도 별도로 포함했다.
