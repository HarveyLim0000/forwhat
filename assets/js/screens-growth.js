/* 성장 탭 — 배운 가르침을 실천으로, 그리고 습관과 생활 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const T = 'growth';
  const d = ctx => Store.day(ctx.date);

  /** 최근 n일 실천율 */
  function rate(id, n) {
    let hit = 0, seen = 0, day = Store.today();
    for (let i = 0; i < (n || 30); i++) {
      const r = Store.peek(day);
      if (r) { seen++; if (r.principles && r.principles[id]) hit++; }
      day = UI.addDays(day, -1);
    }
    return seen ? Math.round((hit / seen) * 100) : 0;
  }
  function todayPrinciple(date) {
    const list = Store.principles();
    return list[Number(date.replace(/-/g, '')) % list.length];
  }

  /* ============ 성장 홈 ============ */
  S['growth.home'] = {
    tab: T, title: '성장',
    ask: '오늘은 무엇을 실천할까요?',
    hint: '배운 것을 행동으로 옮기는 자리입니다.',
    foot: () => {
      const list = Store.principles();
      const m = Math.round(list.reduce((s, p) => s + rate(p.id, 30), 0) / list.length);
      return `최근 30일 평균 실천율 ${m}% · 원칙 ${list.length}개`;
    },
    render(ctx) {
      const r = d(ctx);
      const done = Store.principles().filter(p => r.principles[p.id]).length;
      return UI.pick({ t: '오늘의 가르침', d: todayPrinciple(ctx.date).t, to: 'growth.today' })
        + UI.pick({ t: '원칙 점검', d: `오늘 ${done} / ${Store.principles().length}개 실천`, to: 'growth.check' })
        + UI.pick({ t: '습관과 생활', d: `습관 ${Store.state.habits.length}개 추적 중`, to: 'life.home' });
    }
  };

  /* ============ 오늘의 가르침 ============ */
  S['growth.today'] = {
    tab: T, title: '오늘의 가르침', sub: ctx => UI.fmtDate(ctx.date),
    action: ctx => ({
      ico: 'more', fn: () => {
        const list = Store.principles();
        const p = list[Math.floor(Math.random() * list.length)];
        UI.modal({
          title: p.t,
          body: `<p>${UI.esc(p.d)}</p><p style="margin-top:14px;font-weight:600">${UI.esc(p.q)}</p>`,
          actions: [{ t: '닫기', primary: true, fn: UI.closeModal }]
        });
      }
    }),
    ask: ctx => todayPrinciple(ctx.date).t,
    hint: ctx => todayPrinciple(ctx.date).d,
    render(ctx) {
      const p = todayPrinciple(ctx.date);
      const r = d(ctx);
      return UI.block('오늘 점검할 질문', `<p style="font-size:17px;font-weight:600;letter-spacing:-.3px">${UI.esc(p.q)}</p>`)
        + UI.opts([{ v: 'y', t: '오늘 지켰다' }, { v: 'n', t: '아직 못 했다' }],
          Object.prototype.hasOwnProperty.call(r.principles, p.id) ? (r.principles[p.id] ? 'y' : 'n') : '')
        + UI.block('최근 30일', UI.bar('실천율', rate(p.id, 30), 100, rate(p.id, 30) + '%'));
    },
    bind(root, ctx) {
      const p = todayPrinciple(ctx.date);
      const r = d(ctx);
      root.addEventListener('click', e => {
        const o = e.target.closest('[data-opt]');
        if (!o) return;
        r.principles[p.id] = o.dataset.opt === 'y';
        Store.save();
        ctx.refresh();
      });
    },
    next: { t: '원칙 전체 점검하기', to: 'growth.check' }
  };

  /* ============ 원칙 점검 ============ */
  S['growth.check'] = {
    tab: T, title: '원칙 점검', sub: ctx => UI.fmtDate(ctx.date),
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('내 원칙 추가', [
          { k: 't', label: '원칙', ph: '예: 하루 한 사람에게 배운다' },
          { k: 'd', label: '설명', type: 'textarea', rows: 3 },
          { k: 'q', label: '하루 점검 질문', ph: '오늘 이 원칙을 지켰는가?' }
        ]);
        if (o && o.t) { Store.add('customPrinciples', Object.assign(o, { custom: true })); ctx.refresh(); }
      }
    }),
    ask: '오늘 지킨 원칙을 표시해 주세요.',
    hint: '전부 지키는 날은 없습니다. 하나라도 지켰다면 충분합니다.',
    render(ctx) {
      const r = d(ctx);
      return Store.principles().map(p => `
        <div class="check ${r.principles[p.id] ? 'is-on' : ''}" data-pr="${p.id}">
          <div class="check__box">✓</div>
          <div class="check__txt">${UI.esc(p.t)}
            <span class="check__sub">${UI.esc(p.q)}</span></div>
          ${p.custom ? `<button class="btn btn--ghost btn--sm" data-delpr="${p.id}">삭제</button>` : ''}
        </div>`).join('');
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.addEventListener('click', e => {
        const del = e.target.closest('[data-delpr]');
        if (del) { Store.remove('customPrinciples', del.dataset.delpr); return ctx.refresh(); }
        const c = e.target.closest('[data-pr]');
        if (!c) return;
        r.principles[c.dataset.pr] = !r.principles[c.dataset.pr];
        c.classList.toggle('is-on', !!r.principles[c.dataset.pr]);
        Store.commit(true);
      });
    },
    next: { t: '학습 사이클 점검하기', to: 'growth.cycle' }
  };

  /* ============ 학습 사이클 ============ */
  S['growth.cycle'] = {
    tab: T, title: '학습 사이클', sub: ctx => UI.fmtDate(ctx.date),
    ask: '오늘 공부는 어디까지 밟았나요?',
    hint: '훑어보기 → 질문 → 정독 → 암기 → 반복. 순서를 지키면 속도가 붙습니다.',
    render(ctx) {
      const r = d(ctx);
      const done = DATA.STUDY_CYCLE.filter(s => r.cycle[s.id]).length;
      return UI.block('오늘 공부한 대상',
        `<input class="input" data-f="cycleSubject" value="${UI.esc(r.cycleSubject)}" placeholder="예: 통계학 3장">`)
        + DATA.STUDY_CYCLE.map((s, i) => `
          <div class="check ${r.cycle[s.id] ? 'is-on' : ''}" data-cy="${s.id}">
            <div class="check__box">✓</div>
            <div class="check__txt">${i + 1}. ${UI.esc(s.t)}<span class="check__sub">${UI.esc(s.d)}</span></div>
          </div>`).join('')
        + `<div class="blk" style="margin-top:18px">
             <div class="prog"><span style="width:${(done / 5) * 100}%"></span></div>
             <div class="small muted" style="margin-top:8px">${done} / 5 단계</div>
           </div>`;
    },
    bind(root, ctx) {
      const r = d(ctx);
      const inp = root.querySelector('[data-f]');
      inp.addEventListener('input', () => { r.cycleSubject = inp.value; Store.commit(true); });
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-cy]');
        if (!c) return;
        r.cycle[c.dataset.cy] = !r.cycle[c.dataset.cy];
        Store.commit(true);
        ctx.refresh();
      });
    },
    next: { t: '나만의 무기 쌓기', to: 'growth.skill' }
  };

  /* ============ 주특기 ============ */
  S['growth.skill'] = {
    tab: T, title: '나만의 무기',
    ask: '주특기에 시간을 쌓고 있나요?',
    hint: '주특기는 선언이 아니라 누적된 시간으로 증명됩니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('주특기 추가', [
          { k: 't', label: '나만의 무기', ph: '예: 데이터 분석' },
          { k: 'goalHours', label: '목표 시간 (시간)', type: 'number', ph: '예: 1000' }
        ]);
        if (o && o.t) { Store.add('skills', Object.assign(o, { sessions: [] })); ctx.refresh(); }
      }
    }),
    render() {
      const sk = Store.state.skills;
      if (!sk.length) return UI.empty('오른쪽 위 + 를 눌러 주특기 하나를 정해보세요');
      return sk.map(s => {
        const min = (s.sessions || []).reduce((a, x) => a + (Number(x.min) || 0), 0);
        const goal = (Number(s.goalHours) || 100) * 60;
        return UI.block(s.t,
          `<div class="num__v">${Math.floor(min / 60)}<span style="font-size:14px;font-weight:500">시간</span> ${min % 60}<span style="font-size:14px;font-weight:500">분</span></div>
           <div class="prog" style="margin:10px 0 8px"><span style="width:${Math.min(100, (min / goal) * 100)}%"></span></div>
           <div class="small muted">목표 ${UI.esc(s.goalHours || 100)}시간 중 ${Math.round((min / goal) * 100)}%</div>
           <div class="row" style="margin-top:12px">
             <button class="btn btn--sm" data-addses="${s.id}">시간 기록</button>
             <button class="btn btn--ghost btn--sm" data-delskill="${s.id}">삭제</button>
           </div>`);
      }).join('');
    },
    bind(root, ctx) {
      root.addEventListener('click', async e => {
        const a = e.target.closest('[data-addses]');
        if (a) {
          const o = await UI.form('시간 기록', [
            { k: 'date', label: '날짜', type: 'date' },
            { k: 'min', label: '집중한 시간 (분)', type: 'number', ph: '예: 90' },
            { k: 'note', label: '무엇을 했나요 (선택)' }
          ], { date: ctx.date });
          if (o && o.min) {
            const s = Store.find('skills', a.dataset.addses);
            s.sessions = s.sessions || [];
            s.sessions.push(o);
            Store.commit();
            ctx.refresh();
          }
          return;
        }
        const dl = e.target.closest('[data-delskill]');
        if (dl && await UI.confirm('주특기 삭제', '누적 시간 기록도 함께 지워집니다.', '삭제')) {
          Store.remove('skills', dl.dataset.delskill);
          ctx.refresh();
        }
      });
    },
    next: { t: '받은 자극을 행동으로', to: 'growth.spark' }
  };

  /* ============ 자극 → 행동 ============ */
  S['growth.spark'] = {
    tab: T, title: '자극과 행동',
    ask: '무엇에 자극받았고, 무엇을 했나요?',
    hint: '자극은 행동으로 옮길 때만 남습니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('자극 기록', [
          { k: 'stimulus', label: '무엇에 자극받았나요', type: 'textarea', rows: 3 },
          { k: 'action', label: '그래서 무엇을 하겠습니까', type: 'textarea', rows: 3 }
        ]);
        if (o && o.stimulus) {
          Store.add('sparks', Object.assign(o, { date: ctx.date, done: false }));
          ctx.refresh();
        }
      }
    }),
    render() {
      const sp = Store.state.sparks;
      if (!sp.length) return UI.empty('오른쪽 위 + 를 눌러 오늘 받은 자극을 적어보세요');
      return `<div class="list">` + sp.map(s => `
        <div class="item">
          <div class="item__m">
            <div class="item__t">${UI.esc(s.stimulus)}</div>
            <div class="item__d">→ ${UI.esc(s.action || '아직 행동으로 옮기지 않음')}</div>
          </div>
          <div class="row">
            <button class="btn btn--ghost btn--sm" data-spark="${s.id}">${s.done ? '완료됨' : '완료'}</button>
            <button class="btn btn--ghost btn--sm" data-delspark="${s.id}">삭제</button>
          </div>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-spark]');
        if (t) {
          const s = Store.find('sparks', t.dataset.spark);
          s.done = !s.done;
          Store.commit();
          return ctx.refresh();
        }
        const dl = e.target.closest('[data-delspark]');
        if (dl) { Store.remove('sparks', dl.dataset.delspark); ctx.refresh(); }
      });
    },
    next: { t: '만난 사람 기록하기', to: 'growth.net' }
  };

  /* ============ 인적 네트워크 ============ */
  S['growth.net'] = {
    tab: T, title: '인적 네트워크',
    ask: '누구를 만났고, 나를 어떻게 알렸나요?',
    hint: '실력은 알려질 때 기회가 됩니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('만남 기록', [
          { k: 'name', label: '누구를 만났나요' },
          { k: 'date', label: '언제', type: 'date' },
          { k: 'how', label: '나를 어떻게 알렸나요', ph: '예: 진행한 프로젝트를 소개함' },
          { k: 'note', label: '배운 점 · 다음 할 일', type: 'textarea', rows: 3 }
        ], { date: ctx.date });
        if (o && o.name) { Store.add('network', o); ctx.refresh(); }
      }
    }),
    render() {
      const nt = Store.state.network;
      if (!nt.length) return UI.empty('오른쪽 위 + 를 눌러 오늘의 만남을 남겨보세요');
      return `<div class="list">` + nt.map(n => `
        <div class="item">
          <div class="item__m">
            <div class="item__t">${UI.esc(n.name)}</div>
            <div class="item__d">${UI.esc(n.how || '')}${n.note ? '\n' + UI.esc(n.note) : ''}</div>
          </div>
          <div class="item__s">${UI.esc(n.date || '')}</div>
          <button class="btn btn--ghost btn--sm" data-delnet="${n.id}">삭제</button>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-delnet]');
        if (b) { Store.remove('network', b.dataset.delnet); ctx.refresh(); }
      });
    },
    next: { t: '습관과 생활 보기', to: 'life.home' }
  };

  /* ============ 생활 홈 ============ */
  S['life.home'] = {
    tab: T, title: '습관과 생활',
    ask: '생활을 가볍게 남겨봅니다.',
    render() {
      const spend = Store.state.logs
        .filter(l => l.kind === 'money' && (l.date || '').startsWith(Store.today().slice(0, 7)))
        .reduce((s, l) => s + (Number(l.amount) || 0), 0);
      return UI.pick({ t: '오늘의 습관', d: `${Store.state.habits.length}개 추적 중`, to: 'life.habit' })
        + UI.pick({ t: '생활 로그', d: `이번 달 지출 ${spend.toLocaleString()}`, to: 'life.log' })
        + UI.pick({ t: '하고 싶은 일', d: `${Store.state.bucket.filter(b => b.done).length} / ${Store.state.bucket.length} 달성`, to: 'life.bucket' });
    }
  };

  /* ============ 습관 ============ */
  S['life.habit'] = {
    tab: T, title: '오늘의 습관', sub: ctx => UI.fmtDate(ctx.date),
    action: ctx => ({
      ico: 'plus', fn: () => UI.modal({
        title: '습관 추가',
        body: `<div class="field"><label class="label">직접 입력</label>
            <input class="input" id="hNew" placeholder="예: 물 2L 마시기"></div>
          <div class="blk__l">추천에서 고르기</div>
          <div class="chips">${DATA.HABIT_PRESETS.map(p => `<button class="chip" data-p="${UI.esc(p)}">${UI.esc(p)}</button>`).join('')}</div>`,
        actions: [
          { t: '닫기', fn: UI.closeModal },
          {
            t: '추가', primary: true, fn: () => {
              const v = document.querySelector('#hNew').value.trim();
              if (v) Store.add('habits', { t: v });
              UI.closeModal();
              ctx.refresh();
            }
          }
        ],
        after: body => body.addEventListener('click', e => {
          const c = e.target.closest('[data-p]');
          if (!c) return;
          Store.add('habits', { t: c.dataset.p });
          c.classList.add('is-on');
          UI.toast('추가했습니다');
        }),
        onClose: () => ctx.refresh()
      })
    }),
    ask: '오늘 지킨 습관을 눌러주세요.',
    render(ctx) {
      const r = d(ctx);
      const hb = Store.state.habits;
      if (!hb.length) return UI.empty('오른쪽 위 + 를 눌러 습관을 추가해보세요');
      return hb.map(h => {
        let n = 0, day = Store.today();
        while (true) {
          const x = Store.peek(day);
          if (x && (x.habits || {})[h.id]) { n++; day = UI.addDays(day, -1); } else break;
        }
        return `<div class="check ${r.habits[h.id] ? 'is-on' : ''}" data-habit="${h.id}">
          <div class="check__box">✓</div>
          <div class="check__txt">${UI.esc(h.t)}<span class="check__sub">연속 ${n}일</span></div>
          <button class="btn btn--ghost btn--sm" data-delhabit="${h.id}">삭제</button>
        </div>`;
      }).join('');
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.addEventListener('click', e => {
        const del = e.target.closest('[data-delhabit]');
        if (del) { Store.remove('habits', del.dataset.delhabit); return ctx.refresh(); }
        const h = e.target.closest('[data-habit]');
        if (!h) return;
        r.habits[h.dataset.habit] = !r.habits[h.dataset.habit];
        Store.commit();
        ctx.refresh();
      });
    },
    next: { t: '생활 로그 남기기', to: 'life.log' }
  };

  /* ============ 생활 로그 ============ */
  let kind = 'meal';
  S['life.log'] = {
    tab: T, title: '생활 로그',
    sub: () => (DATA.LOG_KINDS.find(k => k.id === kind) || {}).t,
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const def = DATA.LOG_KINDS.find(k => k.id === kind);
        const fields = [
          { k: 'date', label: '날짜', type: 'date' },
          { k: 'text', label: def.t, ph: def.ph, type: 'textarea', rows: 3 }
        ];
        if (kind === 'money') fields.push({ k: 'amount', label: '금액', type: 'number', ph: '숫자만' });
        const o = await UI.form(def.t + ' 기록', fields, { date: ctx.date });
        if (o && o.text) { Store.add('logs', Object.assign(o, { kind })); ctx.refresh(); }
      }
    }),
    ask: '무엇을 남길까요?',
    hint: '먹은 것, 쓴 돈, 만난 사람까지. 생활에 밀착한 기록입니다.',
    render() {
      const logs = Store.state.logs.filter(l => l.kind === kind)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return UI.chips(DATA.LOG_KINDS, k => k.id === kind, 'kind')
        + `<div class="list" style="margin-top:18px">` + (logs.length ? logs.slice(0, 60).map(l => `
          <div class="item">
            <div class="item__m"><div class="item__t">${UI.esc(l.text)}</div>
              <div class="item__d">${UI.esc(l.date)}${l.amount ? ' · ' + Number(l.amount).toLocaleString() : ''}</div></div>
            <button class="btn btn--ghost btn--sm" data-dellog="${l.id}">삭제</button>
          </div>`).join('') : UI.empty('오른쪽 위 + 를 눌러 기록해보세요')) + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const k = e.target.closest('[data-kind]');
        if (k) { kind = k.dataset.kind; return ctx.refresh(); }
        const dl = e.target.closest('[data-dellog]');
        if (dl) { Store.remove('logs', dl.dataset.dellog); ctx.refresh(); }
      });
    },
    next: { t: '하고 싶은 일 적기', to: 'life.bucket' }
  };

  /* ============ 버킷리스트 ============ */
  S['life.bucket'] = {
    tab: T, title: '하고 싶은 일',
    ask: '언젠가 해보고 싶은 일',
    hint: '눈에 보이는 곳에 두면 언젠가는 하게 됩니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('하고 싶은 일 추가', [{ k: 't', label: '무엇을 해보고 싶나요' }]);
        if (o && o.t) { Store.add('bucket', { t: o.t, done: false }); ctx.refresh(); }
      }
    }),
    render() {
      const bk = Store.state.bucket;
      if (!bk.length) return UI.empty('오른쪽 위 + 를 눌러 하나 적어보세요');
      return bk.map(b => `
        <div class="check ${b.done ? 'is-on' : ''}" data-bucket="${b.id}">
          <div class="check__box">✓</div>
          <div class="check__txt">${UI.esc(b.t)}${b.doneAt ? `<span class="check__sub">${UI.esc(b.doneAt)} 달성</span>` : ''}</div>
          <button class="btn btn--ghost btn--sm" data-delbucket="${b.id}">삭제</button>
        </div>`).join('');
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const del = e.target.closest('[data-delbucket]');
        if (del) { Store.remove('bucket', del.dataset.delbucket); return ctx.refresh(); }
        const b = e.target.closest('[data-bucket]');
        if (!b) return;
        const it = Store.find('bucket', b.dataset.bucket);
        it.done = !it.done;
        it.doneAt = it.done ? Store.today() : '';
        Store.commit();
        ctx.refresh();
      });
    },
    next: { t: '마음에 남은 문장 모으기', to: 'life.quote' }
  };

  /* ============ 문장 수집 ============ */
  S['life.quote'] = {
    tab: T, title: '문장 수집',
    ask: '마음에 남은 말을 모아둡니다.',
    hint: '그때 적어두지 않으면 사라집니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('문장 추가', [
          { k: 'text', label: '문장', type: 'textarea', rows: 3 },
          { k: 'source', label: '출처 (선택)', ph: '책 · 사람 · 강의' }
        ]);
        if (o && o.text) { Store.add('quotes', o); ctx.refresh(); }
      }
    }),
    render() {
      const qt = Store.state.quotes;
      if (!qt.length) return UI.empty('오른쪽 위 + 를 눌러 문장을 남겨보세요');
      return `<div class="list">` + qt.map(q => `
        <div class="item">
          <div class="item__m"><div class="item__t">“${UI.esc(q.text)}”</div>
            <div class="item__d">${UI.esc(q.source || '')}</div></div>
          <button class="btn btn--ghost btn--sm" data-delquote="${q.id}">삭제</button>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-delquote]');
        if (b) { Store.remove('quotes', b.dataset.delquote); ctx.refresh(); }
      });
    },
    next: { t: '내일의 나에게 메모', to: 'life.note' }
  };

  /* ============ 메모 ============ */
  S['life.note'] = {
    tab: T, title: '메모',
    ask: '잊지 말아야 할 것',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('메모 추가', [{ k: 'text', label: '메모', type: 'textarea', rows: 3 }]);
        if (o && o.text) { Store.add('notes', { text: o.text, date: ctx.date }); ctx.refresh(); }
      }
    }),
    render() {
      const nt = Store.state.notes;
      if (!nt.length) return UI.empty('오른쪽 위 + 를 눌러 메모를 남겨보세요');
      return `<div class="list">` + nt.slice(0, 40).map(n => `
        <div class="item">
          <div class="item__m"><div class="item__t">${UI.esc(n.text)}</div>
            <div class="item__d">${UI.esc(n.date || '')}</div></div>
          <button class="btn btn--ghost btn--sm" data-delnote="${n.id}">삭제</button>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-delnote]');
        if (b) { Store.remove('notes', b.dataset.delnote); ctx.refresh(); }
      });
    }
  };
})(window.SCREENS);
