# 블로그 검증 기록

검증일: 2026-10-11. Node 24, Quartz 5, Windows 로컬 환경.

- 기존 study-log 소스는 읽기와 복사만 수행했다.
- 책 원고 30장과 부록을 frontmatter가 있는 content로 가져왔다.
- Quartz가 68개 Markdown 입력을 처리해 정적 사이트를 생성했다.
- 30장 HTML, 검색 인덱스, 학습 manifest, 원고 ZIP·실습 ZIP의 생성과 링크를 검사했다.
- 생성한 HTML의 로컬 링크 누락은 0건이다.
- 전체 TypeScript 검사 및 읽기 기능 smoke 검증을 통과했다.
- 브라우저에서 첫 장 이동, 완료 토글, 홈 진도 반영, 다음 미완료 장 링크를 확인했다.
- `CancelledError` 본문 검색으로 관련 장들을 찾는 것을 확인했다.
- 코드 복사 결과와 Mermaid SVG 렌더링을 확인했다.
- 모바일 홈과 데스크톱 본문을 확인했고 데스크톱의 문서 전체 가로 넘침은 없었다.
- 확인한 로컬 브라우저 화면에서 JavaScript console error는 없었다.
- 새 잠금 파일은 npm ci dry-run을 통과했다. 기존 템플릿에서 누락된 peer 의존성은 새 프로젝트 안에서만 보완했다.

`AI-Generation-Library/FastAPI`에 맞춘 새 체크아웃에서 `npm ci`, 플러그인 준비, Quartz 빌드를 통과했다. `/FastAPI/` 경로 기준으로 72개 HTML의 로컬 링크를 검사했으며 누락은 0건이다. Pages는 GitHub Actions를 소스로 활성화했다. 원격 워크플로의 실행 결과는 저장소 Actions에서 확인할 수 있다.

이 저장소의 배포 대상은 GitHub Pages `https://ai-generation-library.github.io/FastAPI/`다. Sites 설정과 외부 토큰은 복사하지 않았다. GitHub Actions의 실제 실행 결과는 원격 업로드 뒤 별도로 확인한다.

책의 API·DB·AI 실습 검증 범위는 content/appendices/verification.md와 별개다.
