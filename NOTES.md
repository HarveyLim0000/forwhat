# 작업 노트

## 현재 상태 (2026-09-05)

앱 사이즈(폭 560px) 단일 페이지 앱으로 완성. 빌드 도구 없음, 서버 없음, 데이터는 localStorage.
전체 61개 화면이 오류 없이 렌더링되는 것을 브라우저에서 확인했다.

- 셸: `index.html` + `assets/js/app.js` (화면 스택, 하단 탭 5개, 단계 표시, 다음 단계 제안)
- 화면: `assets/js/screens-{today,review,memory,growth,me}.js`
- 데이터: `assets/js/store.js` (localStorage `liferecorder.v1`), `assets/js/data.js` (질문·원칙 정의)
- 조각: `assets/js/ui.js` (모달·폼·토스트·pick/slider/opts/bar/nums/face 빌더)
- 스타일: `assets/css/app.css` (상단에 5색 토큰)

## 설계 결정 (바꾸기 전에 읽을 것)

1. **한 화면에 하나만 묻는다.** 요소 최대 3개. 기능을 더할 때는 기존 화면에 붙이지 말고 화면을 새로 만들어 `next`로 잇는다.
2. **다음 단계는 제안.** `next`가 있으면 셸이 자동으로 "이어서" 버튼 + "나중에 할게요"를 그린다. 강제 이동 금지.
3. **색 5개만.** `app.css` 최상단 토큰 밖의 색을 새로 만들지 않는다. 경고색(빨강)도 쓰지 않고 2단계 확인으로 처리한다.
4. 날짜 이동은 본문이 아니라 헤더 아이콘(`action: UI.dateAction`)으로 처리한다.
5. 사진은 긴 변 1000px / JPEG 72%로 축소, 음성은 900KB 초과 시 거부. localStorage 5MB 한도 때문.

## 로컬에서 열기

`index.html`을 브라우저로 열면 된다. 마이크(음성 메모)와 카메라 롤 접근은 `file://`에서도 동작하지만,
브라우저 정책 때문에 문제가 생기면 정적 서버로 띄운다.

```powershell
python -m http.server 8777      # 그다음 http://127.0.0.1:8777
```

단일 파일 배포본은 `.\build-single.ps1` → `dist\lifetime-recorder.html`.
**js 파일을 추가하면 `build-single.ps1`의 `$scripts` 목록에도 추가해야 한다.**

## Next.js / Vercel (2026-09-05 추가)

`app/layout.js` + `app/page.js` 로 Next.js 셸을 만들고, 화면 로직은 `assets/js/*` 를 동적 import 한다.
React 로 다시 쓴 것이 아니라 **감싼 것**이다. 소스가 한 벌로 유지되고 `index.html` 오프라인 실행도 그대로 살아 있다.

검증 완료 (Node v24.20.0 / npm 11.19.0 / next 15.5.25 / react 19.2.8):
`npm install` → `npm run build`(정적 프리렌더 성공) → `npm run dev`, `npm start` 모두 확인.
세 경로(Next.js dev·prod / index.html / dist 단일 파일) 전부 61개 화면 렌더, 콘솔 오류 0건.

- git 은 아직 이 PC에 없다. GitHub 연동 배포를 하려면 설치해야 한다.
- 설치 중 버전 충돌이 나면 `package.json` 의 next/react 범위를 올린다.

## 고친 버그 — 리스너 누적 (2026-09-05)

`render()` 가 `#screen` 의 innerHTML 만 갈아끼웠기 때문에, 화면별 `bind()` 가 `root.addEventListener` 로
붙인 리스너가 방문할 때마다 쌓였다. 같은 화면을 짝수 번 방문한 뒤 토글(기분·체크리스트·습관)을 누르면
두 번 처리되어 아무 일도 안 한 것처럼 보였다. `UI.resetNode(id, cls)` 로 노드 자체를 교체해서 해결했다.
`UI.modal` 의 `#modalBody` 도 같은 문제가 있어 함께 교체한다.

**주의: 지속되는 DOM 노드에 `addEventListener` 를 붙일 때는 이 함정을 다시 확인할 것.**
- 나중에 React 로 진짜 이식하려면 `SCREENS` 레지스트리 단위로 하나씩 컴포넌트로 옮기면 된다
  (셸이 `render()/bind()` 규약만 알고 있어서 화면별 교체가 가능하다).

## 다음에 손댈 만한 것

- 자서전 책 인쇄(`story.book`)는 코드 경로만 확인했고 실제 인쇄 대화상자는 열어보지 않았다. 한 번 눌러 여백을 확인할 것.
- 통계에 월간 요약 화면(`me.month`) 추가 여지.
- 가족 구성원별 필터를 `family.events`에 다시 넣을지 검토(이전 버전에 있었으나 밀도 때문에 뺐다).
