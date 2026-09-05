'use client';

/* 셸 마크업 — index.html 의 body 와 같은 구조를 JSX 로 옮긴 것.
   화면 로직은 assets/js/* 를 그대로 쓴다. 사본을 만들지 않으므로
   index.html(오프라인 실행)과 Next.js 배포본이 항상 같은 코드를 본다. */

import { useEffect, useRef } from 'react';

export default function Page() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // 평가 순서가 중요하다: data → store → ui → screens → app
    // (screens 는 정의 시점에 UI/DATA 를 참조하고, app 은 DOM 이 있어야 한다)
    (async () => {
      await import('../assets/js/data.js');
      await import('../assets/js/store.js');
      await import('../assets/js/ui.js');
      await import('../assets/js/screens-today.js');
      await import('../assets/js/screens-review.js');
      await import('../assets/js/screens-memory.js');
      await import('../assets/js/screens-growth.js');
      await import('../assets/js/screens-me.js');
      await import('../assets/js/app.js');
    })();
  }, []);

  return (
    <>
      <div className="lock" id="lockScreen" hidden>
        <div className="lock__box">
          <div className="lock__title">잠금 해제</div>
          <p className="lock__desc">이 기기에 설정된 PIN을 입력하세요.</p>
          <input type="password" inputMode="numeric" maxLength={8} id="lockInput" className="input" placeholder="PIN" />
          <div className="lock__msg" id="lockMsg"></div>
          <button className="btn btn--primary btn--block" id="lockSubmit">열기</button>
        </div>
      </div>

      <div className="shell" id="shell">
        <header className="hd">
          <button className="hd__icon" id="hdBack" aria-label="뒤로" hidden>
            <svg viewBox="0 0 24 24" className="ic"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="hd__mid">
            <div className="hd__t" id="hdTitle">오늘</div>
            <div className="hd__s" id="hdSub"></div>
          </div>
          <button className="hd__icon" id="hdAct" aria-label="동작" hidden></button>
        </header>

        <div className="steps" id="steps" hidden></div>

        <main className="stage" id="stage">
          <div className="screen" id="screen"></div>
          <div className="nextbox" id="nextBox" hidden></div>
        </main>

        <nav className="tabs" id="tabs">
          <button className="tab" data-tab="today">
            <svg viewBox="0 0 24 24" className="ic"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1M12 18a6 6 0 100-12 6 6 0 000 12zM9 21h6" /></svg>
            <span>오늘</span>
          </button>
          <button className="tab" data-tab="review">
            <svg viewBox="0 0 24 24" className="ic"><path d="M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17" /></svg>
            <span>되돌아보기</span>
          </button>
          <button className="tab" data-tab="memory">
            <svg viewBox="0 0 24 24" className="ic"><path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5A1.5 1.5 0 0020 18.5v-13z" /></svg>
            <span>기억</span>
          </button>
          <button className="tab" data-tab="growth">
            <svg viewBox="0 0 24 24" className="ic"><path d="M12 21v-8M12 13c0-4 2.5-6.5 8-7 0 5-3 8-8 7zM12 15c0-3.5-2-5.5-7-6 0 4.5 2.5 7 7 6z" /></svg>
            <span>성장</span>
          </button>
          <button className="tab" data-tab="me">
            <svg viewBox="0 0 24 24" className="ic"><path d="M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" /></svg>
            <span>나</span>
          </button>
        </nav>
      </div>

      <div className="modal" id="modal" hidden>
        <div className="modal__box" role="dialog" aria-modal="true">
          <div className="modal__head">
            <h2 className="modal__title" id="modalTitle"></h2>
            <button className="hd__icon" id="modalClose" aria-label="닫기">
              <svg viewBox="0 0 24 24" className="ic"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="modal__body" id="modalBody"></div>
          <div className="modal__foot" id="modalFoot"></div>
        </div>
      </div>

      <div className="toast" id="toast" hidden></div>
      <input type="file" id="filePick" accept="application/json" hidden />
      <input type="file" id="imgPick" accept="image/*" hidden />
    </>
  );
}
