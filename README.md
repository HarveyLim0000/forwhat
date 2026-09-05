# Lifetime Recorder — 평생 기록

자서전 · 개인 기록 · 가족 기록을 한곳에 모으는 생활밀착형 기록 앱.
빌드 도구 없이 `index.html`을 열면 바로 동작하고, 모든 데이터는 브라우저 `localStorage`에만 저장된다(서버 전송 없음).

## 실행 방법 세 가지

같은 소스(`assets/`)를 세 방식으로 쓴다. 사본이 없으므로 어느 쪽을 고쳐도 나머지가 따라온다.

**1) 그냥 열기 — 설치 필요 없음**

```
index.html 을 브라우저로 열기
```

**2) Next.js 개발 서버 / Vercel 배포** — Node.js 20 이상 필요

```powershell
npm install
npm run dev        # http://localhost:3000
```

**3) 단일 파일 배포본** — 오프라인·USB용

```powershell
.\build-single.ps1     # dist\lifetime-recorder.html (CSS/JS 인라인)
```

## Vercel 배포

Next.js 앱(`app/`)이 셸 마크업만 담당하고, 화면 로직은 `assets/js/*` 를 그대로 불러온다.
전부 클라이언트에서 돌기 때문에 서버 코드도, 환경 변수도 없다.

### 방법 A — CLI로 바로 올리기 (git·GitHub 없이, 설치도 없이) ★ 권장

`npx` 는 내려받아 한 번 실행만 하므로 전역 설치가 남지 않는다.

```powershell
npx vercel login    # 브라우저가 열린다. GitHub/구글/이메일 중 아무거나로 로그인
npx vercel          # 첫 실행에서 프로젝트 이름 등을 물어본다 (엔터로 기본값)
npx vercel --prod   # 운영 URL로 배포
```

`.gitignore` 를 그대로 존중하므로 `node_modules` `.next` `dist` 는 올라가지 않고,
Vercel 이 서버에서 `npm install` + `npm run build` 를 새로 돌린다. 환경 변수는 필요 없다.

코드를 고친 뒤에는 `npx vercel --prod` 를 다시 실행하면 갱신된다(자동 배포는 아님).

### 방법 B — GitHub 연동 (git 설치 없이 웹 업로드)

push마다 자동 배포되게 하려면 GitHub가 필요하지만, git을 깔지 않고 웹에서 올릴 수 있다.

1. [github.com/new](https://github.com/new) 에서 빈 저장소를 만든다(README 체크 해제).
2. **Add file → Upload files** 에서 아래만 드래그한다.
   `app` `assets` `public` `index.html` `package.json` `package-lock.json`
   `next.config.mjs` `.gitignore` `README.md` `NOTES.md` `build-single.ps1`
   **`node_modules` `.next` `dist` 는 절대 올리지 않는다.**
3. [vercel.com/new](https://vercel.com/new) 에서 그 저장소를 import 한다.
   프레임워크는 Next.js 로 자동 감지되고 Build Command·Output Directory 는 건드릴 필요 없다.

### 방법 C — git을 설치하는 쪽 (자동 배포)

```powershell
git init; git add .; git commit -m "Lifetime Recorder"; git branch -M main
git remote add origin https://github.com/<계정>/liferecoder.git
git push -u origin main
```

### 배포 전에 알아야 할 것

- **기록은 브라우저에만 남는다.** 배포해도 서버 저장소가 생기는 것이 아니라서
  PC와 휴대폰의 기록은 **서로 동기화되지 않는다.** 기기를 옮길 때는 `나 → 데이터 관리`의
  JSON 백업/복원을 쓴다.
- URL을 아는 사람은 앱을 열 수 있지만, 남의 기록이 보이는 것은 아니다(각자 자기 브라우저 저장소를 본다).
- **PIN 잠금은 화면 가림 장치일 뿐 암호화가 아니다.** 개발자 도구로 localStorage를 열면 내용이 보인다.
  민감한 내용을 담는다면 공개 URL 대신 로컬(`index.html`)이나 단일 파일 배포본을 쓰는 편이 낫다.
- 휴대폰 브라우저에서 "홈 화면에 추가"를 하면 `public/manifest.webmanifest` 덕분에
  주소창 없는 앱처럼 실행된다.

## 설계 원칙

1. **한 화면에 하나만 묻는다.** 요소는 최대 3개, 갈래 선택도 3개까지.
2. **이동은 하단 아이콘 탭바** 5개(오늘 · 되돌아보기 · 기억 · 성장 · 나). 좌측 사이드바 없음.
3. **다음 단계는 제안만 한다.** 모든 화면 아래에 "이어서" 제안과 "나중에 할게요"가 함께 있다. 강제하지 않는다.
4. **색은 화이트–라이트그린 축의 5색만.**
   `#FFFFFF` 표면 / `#F4F7F3` 캔버스 / `#DCE7DB` 경계 / `#A7CFAE` 강조·그래프 / `#2F4034` 텍스트.
   그 밖의 톤은 이 5색의 투명도로만 만든다. 네온·글로우·그라디언트 금지.
5. **박스를 만들지 않는다.** 선택지·목록·체크리스트는 카드로 감싸지 않고,
   흰 바탕 위에 1px 구분선으로만 행을 나눈다(`.prow` `.opt` `.check`). 누를 때만 행이
   화면 폭까지 번지는 눌림 배경을 보여준다. 입력·버튼·수치는 테두리 대신 `--mist` 바탕으로 구분한다.
   날짜를 보여주는 곳은 **마크를 그리지 않는다.** 숫자는 그냥 텍스트로 두고, 기록이 있는 날만
   숫자 아래 4px 점을 찍는다(주간 띠 `.band__dot`, 월간 달력 `.cal__dot`). 채운 동그라미,
   초록 배경, 초록 테두리는 쓰지 않는다. 오늘·선택한 날은 숫자 색과 굵기만 진해진다.
   기분의 농도 표현은 통계의 한 해 그림(`.px`)에만 남긴다.
6. **초록은 장식이 아니다.** 라이트그린은 ⟨선택됨·진행중·강조 동작⟩에만 쓴다 —
   기본 버튼, 단계 표시, 체크박스 채움, 활성 탭, 그래프. 전경/배경을 나누기 위한 초록,
   번호 배지, 초록 테두리는 쓰지 않는다. 선택 표시는 배경색이 아니라 오른쪽 체크 아이콘으로 한다.
5. **앱 사이즈 레이아웃.** 본문 폭 560px 고정, 데스크톱에서는 가운데 정렬.

## 레퍼런스

| 서비스 | 참고한 구조 |
|---|---|
| Daylio | 최소 탭으로 끝나는 기록, 활동–기분 상관, Year in Pixels, 스트릭 |
| Day One | 일기 에디터, 사진, 달력·목록, 그날의 기억(On This Day) |
| StoryWorth / Remento | 주간 인생 질문, 챕터별 자서전, 음성 답변, 책 인쇄 |
| FamilySearch Memories | 가족 구성원, 사건 타임라인, 사진에 붙는 이야기 |
| Reflection · Stoic 계열 | 하루 되돌아보기 체크리스트, 잘한 일 / 아쉬운 일 |

## 탭과 흐름

**오늘** — 아홉 걸음으로 하루를 남긴다
`기분 → 공부 만족도 → 근무 만족도 → 컨디션 → 활동 → 자리 → 한 줄 → 감사 → 완료`
그 밖에: 오늘 요약, 일기, 사진과 목소리

**되돌아보기** — 50개 점검 항목을 8개 분류로 한 화면씩
`공부 → 근무 → 관계 → 건강 → 마음 → 시간 → 생활 → 성장 → 잘한 일 → 반성 → 내일의 나에게 → 완료`
시간이 없는 날에는 "오늘의 질문 하나만"

**기억** — 달력 · 기록 목록 · 그날의 기억 / 자서전(이번 주 질문, 8챕터 64질문, 인생 연표, 책 인쇄) / 가족(구성원·생일 D-day, 가족 사건, 앨범, 나중에 열어볼 편지)

**성장** — 오늘의 가르침 → 원칙 점검 → 학습 사이클 → 나만의 무기 → 자극과 행동 → 인적 네트워크 → 습관 → 생활 로그 → 하고 싶은 일 → 문장 수집 → 메모

**나** — 통계(한 해 그림, 만족도 추이, 활동과 기분, 요일 패턴, 항목 실천율) / 데이터(백업·복원·예시 데이터·초기화) / 설정(이름, 글자 크기, 시작 화면, 알림, PIN 잠금)

## 가르침 12원칙

교양과목에서 얻은 원칙을 매일 점검 항목으로 만들어 두었다.
사람을 이해하라 · 자극받고 행동하라 · 나를 알려라 · 나만의 무기를 만들어라 · 전문성을 가져라 · 행동하라 · 생명력 있는 삶을 살아라 · 관심을 가져라 · 구하라 찾으라 두드려라 · 이치를 빨리 이해하라 · 훑고 묻고 읽고 외우고 반복하라 · 일의 성격을 알아라.

학습 사이클(훑어보기 → 질문 → 정독 → 암기 → 반복)은 별도 화면에서 단계별로 체크한다.

## 파일 구조

```
assets/css/app.css          디자인 토큰과 전체 스타일  ← 단일 소스
assets/js/data.js           질문·항목·원칙 등 정적 데이터
assets/js/store.js          localStorage 저장소
assets/js/ui.js             모달·폼·토스트·화면 조각 빌더
assets/js/screens-*.js      탭별 화면 정의 (61개 화면)
assets/js/app.js            라우터 · 화면 스택 · 다음 단계 제안

index.html                  설치 없이 열 때 쓰는 셸
app/layout.js               Next.js 루트 레이아웃 (CSS·메타데이터·매니페스트)
app/page.js                 Next.js 셸 — index.html과 같은 마크업을 JSX로
public/icon.svg             앱 아이콘
public/manifest.webmanifest 홈 화면 추가용 매니페스트
next.config.mjs             reactStrictMode 끔 (아래 주의 참고)
build-single.ps1            단일 파일 빌드
```

### 셸이 두 벌인 이유

화면 로직은 한 벌(`assets/js`)이지만 셸 마크업만 `index.html`과 `app/page.js` 두 곳에 있다.
**셸의 DOM 구조(id)를 바꾸면 두 파일을 함께 고쳐야 한다.** 셸이 가진 id는
`lockScreen lockInput lockMsg lockSubmit / hdBack hdTitle hdSub hdAct / steps stage screen nextBox /
tabs(.tab[data-tab]) / modal modalTitle modalClose modalBody modalFoot / toast filePick imgPick` 이다.

`app/page.js`는 `useEffect`에서 `data → store → ui → screens-* → app` 순서로 동적 import 한다.
순서가 중요하고(screens는 정의 시점에 `UI`·`DATA`를 참조한다), `app.js`는 DOM이 준비된 뒤 실행돼야 한다.
`reactStrictMode`를 끈 것은 StrictMode의 이중 실행이 이벤트 리스너를 두 번 붙이기 때문이다.

### 화면 하나 추가하기

```js
SCREENS['growth.foo'] = {
  tab: 'growth',
  title: '헤더 제목',
  ask: '이 화면이 묻는 것 한 가지',
  hint: '보조 설명',
  render(ctx) { return '...';   },   // 요소 최대 3개
  bind(root, ctx) { },
  next: { t: '다음 버튼 라벨', to: '다음.화면' }
};
```

`ctx`는 `date`, `params`, `go(id, params)`, `back()`, `refresh()`, `setDate()`를 준다.

## 단축키

| 키 | 동작 |
|---|---|
| `Ctrl/⌘ + S` | 즉시 저장 |
| `Esc` | 열린 시트 닫기 |

## 데이터

- 저장 위치: `localStorage` 키 `liferecorder.v1`
- 한도는 브라우저당 약 5MB. 사진은 긴 변 1000px / JPEG 72%로 자동 축소되고, `나 → 데이터 관리`에서 사용량을 볼 수 있다.
- 기기 변경·브라우저 데이터 삭제 전에는 반드시 JSON 백업을 받을 것.
