/* 앱 셸 — 하단 탭 5개, 화면 스택, 단계 표시, 다음 단계 제안
   화면 하나 = 질문 하나 + 요소 최대 3개. 다음 단계는 제안이며 강제하지 않는다. */
(function () {
  const $ = UI.$, $$ = UI.$$;
  const S = window.SCREENS;

  const ROOT = {
    today: 'today.home', review: 'review.home', memory: 'memory.home',
    growth: 'growth.home', me: 'me.home'
  };

  let stack = [{ id: ROOT[Store.state.profile.home] ? ROOT[Store.state.profile.home] : 'today.home', params: {} }];
  let date = Store.today();
  let lastId = null;

  const ctx = {
    get date() { return date; },
    get params() { return stack[stack.length - 1].params; },
    get id() { return stack[stack.length - 1].id; },
    setDate(d) { date = d; },
    go(id, params) {
      if (!S[id]) return UI.toast('준비되지 않은 화면입니다');
      stack.push({ id: id, params: params || {} });
      render();
    },
    replace(id, params) {
      if (!S[id]) return;
      stack[stack.length - 1] = { id: id, params: params || {} };
      render();
    },
    goTab(t) { stack = [{ id: ROOT[t], params: {} }]; render(); },
    back() { if (stack.length > 1) { stack.pop(); render(); } },
    refresh() { render(); },
    /** 헤더만 갱신 (입력 중 화면을 다시 그리지 않기 위해) */
    touch() { head(); }
  };

  function val(x) { return typeof x === 'function' ? x(ctx) : x; }

  const ICO = {
    cal: '<path d="M4 7h16v13H4zM4 7V6a1 1 0 011-1h14a1 1 0 011 1v1M8 3v4M16 3v4M4 11h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M7 9V4h10v5M7 18H5v-6h14v6h-2M7 14h10v6H7z"/>',
    more: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>'
  };

  function head() {
    const def = S[ctx.id];
    $('#hdTitle').textContent = val(def.title) || '';
    $('#hdSub').textContent = val(def.sub) || '';
    $('#hdBack').hidden = stack.length <= 1;
    $$('.tab').forEach(b => b.classList.toggle('is-on', b.dataset.tab === def.tab));

    const act = def.action ? def.action(ctx) : null;
    const btn = $('#hdAct');
    if (act) {
      btn.hidden = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" class="ic">${ICO[act.ico] || ICO.more}</svg>`;
      btn.onclick = act.fn;
    } else {
      btn.hidden = true;
      btn.onclick = null;
    }
  }

  function render() {
    const def = S[ctx.id];
    head();

    // 단계 표시 — flow(화면 id 배열) 또는 steps({i,n})
    const stepsEl = $('#steps');
    const flow = val(def.flow);
    let si = -1, sn = 0;
    if (def.steps) { const s = def.steps(ctx); si = s.i; sn = s.n; }
    else if (flow && flow.length) { sn = flow.length; si = flow.indexOf(ctx.id); }
    if (sn > 1) {
      let dots = '';
      for (let k = 0; k < sn; k++) dots += `<span class="${k <= si ? 'is-on' : ''}"></span>`;
      stepsEl.innerHTML = dots;
      stepsEl.hidden = false;
    } else {
      stepsEl.hidden = true;
    }

    // 본문
    const ask = val(def.ask), hint = val(def.hint), band = val(def.band);
    // 화면 노드를 새것으로 교체한다. bind() 가 root 에 붙인 리스너가 렌더마다 쌓이는 것을 막는다.
    // 같은 화면을 다시 그릴 때(체크 토글 등)는 등장 애니메이션을 재생하지 않는다.
    const el = UI.resetNode('screen', 'screen' + (lastId === ctx.id ? ' no-anim' : ''));
    lastId = ctx.id;
    // 흐름 화면에서는 자동 저장을 조용히 알려준다
    const foot = val(def.foot) || (sn > 1 ? '입력하는 대로 저장됩니다' : '');
    el.innerHTML =
      (band || '') +
      (ask ? `<h1 class="ask">${UI.esc(ask)}</h1>` : '') +
      (hint ? `<p class="hint">${UI.esc(hint)}</p>` : '') +
      def.render(ctx) +
      (foot ? `<p class="foot">${UI.esc(foot)}</p>` : '');
    if (def.bind) def.bind(el, ctx);

    // 다음 단계 제안
    const next = val(def.next);
    const box = $('#nextBox');
    if (next) {
      const skip = next.skip === null ? null : (next.skip || { t: '나중에 할게요', to: ROOT[def.tab] });
      box.innerHTML =
        `<div class="nextbox__l">${UI.esc(next.label || '이어서')}</div>
         <button class="btn btn--primary btn--block" data-go="${UI.esc(next.to)}"${next.params ? ` data-params='${UI.esc(JSON.stringify(next.params))}'` : ''}>${UI.esc(next.t)}</button>
         ${skip ? `<button class="btn btn--ghost btn--block" data-go="${UI.esc(skip.to)}" data-reset="1" style="margin-top:8px">${UI.esc(skip.t)}</button>` : ''}`;
      box.hidden = false;
    } else {
      box.hidden = true;
    }

    $('#stage').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /* ---------- 이동 ---------- */
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (b) ctx.goTab(b.dataset.tab);
  });
  $('#hdBack').onclick = () => ctx.back();

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (!g || $('#modal').contains(g)) return;
    const id = g.dataset.go;
    const params = g.dataset.params ? JSON.parse(g.dataset.params) : {};
    if (g.dataset.reset) {
      const tab = S[id] && S[id].tab;
      if (tab && ROOT[tab] === id) return ctx.goTab(tab);
    }
    ctx.go(id, params);
  });

  /* 큰 슬라이더의 숫자 표시는 셸이 공통으로 처리 */
  document.addEventListener('input', e => {
    const r = e.target;
    if (r.type !== 'range') return;
    const wrap = r.closest('[data-sl]');
    if (!wrap) return;
    const out = wrap.querySelector('[data-slv]');
    if (out) out.textContent = r.value;
  });

  /* 스크롤하면 헤더에 구분선이 생긴다 */
  window.addEventListener('scroll', () => {
    document.body.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });

  /* ---------- 모달 ---------- */
  $('#modalClose').onclick = UI.closeModal;
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') UI.closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) UI.closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      Store.save();
      UI.toast('저장했습니다');
    }
  });

  /* ---------- 백업 복원 ---------- */
  $('#filePick').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = async () => {
      if (!await UI.confirm('백업 복원', '이 기기의 기록을 백업 파일 내용으로 덮어씁니다.', '복원')) return;
      try {
        Store.importJSON(fr.result);
        UI.toast('복원했습니다');
        ctx.goTab('today');
      } catch (err) {
        UI.toast('복원 실패: ' + err.message);
      }
    };
    fr.readAsText(f);
    e.target.value = '';
  });

  /* ---------- 기록 알림 ---------- */
  let notified = '';
  setInterval(() => {
    const r = Store.state.profile.reminder;
    if (!r) return;
    const n = new Date();
    const hhmm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    if (hhmm === r && notified !== hhmm && !Store.hasContent(Store.peek(Store.today()))) {
      notified = hhmm;
      UI.toast('오늘의 기록을 남길 시간입니다');
    }
  }, 30000);

  /* ---------- 시작 ---------- */
  function boot() {
    document.body.style.fontSize = (Store.state.profile.fontSize || 15) + 'px';
    render();
  }

  if (Store.state.profile.pin) {
    $('#lockScreen').hidden = false;
    const tryUnlock = () => {
      if ($('#lockInput').value === Store.state.profile.pin) {
        $('#lockScreen').hidden = true;
        boot();
      } else {
        $('#lockMsg').textContent = 'PIN이 맞지 않습니다.';
      }
    };
    $('#lockSubmit').onclick = tryUnlock;
    $('#lockInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    setTimeout(() => $('#lockInput').focus(), 60);
  } else {
    boot();
  }

  window.addEventListener('beforeunload', () => Store.save());
  window.Nav = ctx;
})();
