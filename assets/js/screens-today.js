/* 오늘 탭 — 하루를 한 걸음씩 남기는 흐름
   기분 → 공부 → 근무 → 몸 → 활동 → 장소 → 한 줄 → 감사 → 완료 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const T = 'today';
  const FLOW = ['today.mood', 'today.study', 'today.work', 'today.body',
    'today.acts', 'today.place', 'today.oneline', 'today.grateful', 'today.done'];

  const d = ctx => Store.day(ctx.date);
  const save = () => Store.commit(true);

  const dateAction = UI.dateAction;

  /* ---------- 홈 ---------- */
  S['today.home'] = {
    tab: T,
    title: '오늘',
    sub: ctx => UI.fmtDate(ctx.date),
    action: dateAction,
    /** 이번 주 일곱 칸. 색이 진하면 기분이 좋았던 날. 눌러서 그날로 이동한다. */
    band: ctx => {
      const base = new Date(ctx.date + 'T00:00:00');
      base.setDate(base.getDate() - base.getDay());
      const today = Store.today();
      let out = '';
      for (let i = 0; i < 7; i++) {
        const dt = new Date(base);
        dt.setDate(base.getDate() + i);
        const ds = Store.today(dt);
        const r = Store.peek(ds);
        const future = ds > today;
        const rec = Store.hasContent(r);
        out += `<button class="band__d ${ds === ctx.date ? 'is-sel' : ''} ${rec ? 'has-rec' : ''} ${future ? 'is-future' : ''}"
            ${future ? 'disabled' : `data-band="${ds}"`}>
            <span class="band__w">${UI.WD[i]}</span>
            <span class="band__n">${dt.getDate()}</span>
            <span class="band__dot"></span>
          </button>`;
      }
      return `<div class="band">${out}</div>`;
    },
    ask: ctx => Store.hasContent(Store.peek(ctx.date)) ? '오늘 기록을 이어가 볼까요?' : '오늘을 남겨볼까요?',
    hint: '한 화면에 하나씩 물어봅니다. 언제든 멈추고 나가도 저장됩니다.',
    foot: () => {
      let n = 0, day = Store.today();
      if (!Store.hasContent(Store.peek(day))) day = UI.addDays(day, -1);
      while (Store.hasContent(Store.peek(day))) { n++; day = UI.addDays(day, -1); }
      const total = Store.dates().filter(ds => Store.hasContent(Store.state.days[ds])).length;
      return total ? `연속 기록 ${n}일 · 지금까지 ${total}일` : '오늘이 첫 기록입니다';
    },
    render(ctx) {
      const rec = Store.peek(ctx.date);
      const has = Store.hasContent(rec);
      return UI.pick({ t: has ? '이어서 기록하기' : '오늘 기록하기', d: '기분부터 한 줄까지 아홉 걸음', to: 'today.mood' })
        + UI.pick({ t: '오늘 요약 보기', d: has ? '지금까지 남긴 것' : '아직 비어 있습니다', to: 'today.summary' })
        + UI.pick({ t: '하루 되돌아보기', d: '점검 항목과 반성 남기기', to: 'review.home' });
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-band]');
        if (!b) return;
        ctx.setDate(b.dataset.band);
        ctx.refresh();
      });
    }
  };

  /* ---------- 1. 기분 ---------- */
  S['today.mood'] = {
    tab: T, title: '기분', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘 하루는 어땠나요?',
    hint: '하나만 고르면 됩니다.',
    render(ctx) {
      const list = DATA.MOODS.slice().reverse().map(m => ({ v: m.v, t: m.ko, ico: UI.face(m.v) }));
      return UI.opts(list, d(ctx).mood);
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-opt]');
        if (!b) return;
        const v = +b.dataset.opt;
        d(ctx).mood = d(ctx).mood === v ? null : v;
        save();
        ctx.refresh();
      });
    },
    next: { t: '공부는 어땠는지 남기기', to: 'today.study' }
  };

  /* ---------- 2. 공부 만족도 ---------- */
  S['today.study'] = {
    tab: T, title: '공부 만족도', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘 공부는 만족스러웠나요?',
    hint: '점수는 남과 비교하는 값이 아니라 어제의 나와 비교하는 값입니다.',
    render(ctx) {
      const r = d(ctx);
      return UI.slider('study', r.study, 10, '공부에 대한 만족도')
        + UI.block('공부한 시간 (분)',
          `<input class="input" type="number" min="0" data-f="studyMin" value="${UI.esc(r.studyMin)}" placeholder="예: 120">`);
    },
    bind: bindFields,
    next: { t: '근무는 어땠는지 남기기', to: 'today.work' }
  };

  /* ---------- 3. 근무 만족도 ---------- */
  S['today.work'] = {
    tab: T, title: '근무 만족도', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘 일은 어땠나요?',
    hint: '일이 없던 날은 건너뛰어도 됩니다.',
    render(ctx) {
      const r = d(ctx);
      return UI.slider('work', r.work, 10, '근무에 대한 만족도')
        + UI.block('일한 시간 (분)',
          `<input class="input" type="number" min="0" data-f="workMin" value="${UI.esc(r.workMin)}" placeholder="예: 480">`);
    },
    bind: bindFields,
    next: { t: '몸 상태 남기기', to: 'today.body' }
  };

  /* ---------- 4. 몸과 마음 ---------- */
  S['today.body'] = {
    tab: T, title: '컨디션', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '몸과 마음은 어땠나요?',
    render(ctx) {
      const r = d(ctx);
      return UI.slider('health', r.health, 10, '오늘의 컨디션')
        + UI.block('잠을 몇 시간 잤나요',
          `<input class="input" type="number" step="0.5" min="0" max="24" data-f="sleep" value="${UI.esc(r.sleep)}" placeholder="예: 7">`);
    },
    bind: bindFields,
    next: { t: '오늘 한 일 고르기', to: 'today.acts' }
  };

  /* ---------- 5. 활동 ---------- */
  S['today.acts'] = {
    tab: T, title: '오늘 한 일', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘 무엇을 했나요?',
    hint: '여기서 고른 활동이 나중에 기분·만족도와의 관계로 정리됩니다.',
    render(ctx) {
      const r = d(ctx);
      return UI.chips(DATA.ACTIVITIES, a => r.acts.includes(a), 'act')
        + `<div class="row" style="margin-top:16px"><button class="btn btn--sm" id="addAct">활동 항목 추가</button></div>`;
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-act]');
        if (!c) return;
        const a = c.dataset.act;
        const i = r.acts.indexOf(a);
        if (i > -1) r.acts.splice(i, 1); else r.acts.push(a);
        c.classList.toggle('is-on');
        save();
      });
      root.querySelector('#addAct').onclick = async () => {
        const o = await UI.form('활동 항목 추가', [{ k: 't', label: '활동 이름', ph: '예: 낚시' }]);
        if (o && o.t && !DATA.ACTIVITIES.includes(o.t)) {
          DATA.ACTIVITIES.push(o.t);
          r.acts.push(o.t);
          Store.commit();
          ctx.refresh();
        }
      };
    },
    next: { t: '어디에 있었는지 남기기', to: 'today.place' }
  };

  /* ---------- 6. 장소와 일의 성격 ---------- */
  S['today.place'] = {
    tab: T, title: '오늘의 자리', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘은 어디에서 보냈나요?',
    render(ctx) {
      const r = d(ctx);
      return UI.block('머문 곳', `<input class="input" data-f="place" value="${UI.esc(r.place)}" placeholder="집 · 회사 · 도서관">`)
        + UI.block('날씨', `<input class="input" data-f="weather" value="${UI.esc(r.weather)}" placeholder="맑음 · 비 · 흐림">`)
        + UI.block('오늘 한 일의 성격', `<select class="select" data-f="workNature">
            <option value="">선택 안 함</option>
            ${DATA.WORK_NATURE.map(w => `<option${r.workNature === w ? ' selected' : ''}>${UI.esc(w)}</option>`).join('')}
          </select>`);
    },
    bind: bindFields,
    next: { t: '오늘을 한 문장으로', to: 'today.oneline' }
  };

  /* ---------- 7. 한 줄 ---------- */
  S['today.oneline'] = {
    tab: T, title: '오늘 한 줄', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘을 한 문장으로 남긴다면?',
    hint: '나중에 목록에서 가장 먼저 보이는 문장입니다.',
    render(ctx) {
      return `<input class="input" data-f="oneline" value="${UI.esc(d(ctx).oneline)}" placeholder="예: 바빴지만 남는 게 있었다">`;
    },
    bind: bindFields,
    next: { t: '감사한 일 세 가지', to: 'today.grateful' }
  };

  /* ---------- 8. 감사 ---------- */
  S['today.grateful'] = {
    tab: T, title: '감사', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW, action: dateAction,
    ask: '오늘 감사한 일 세 가지는?',
    hint: '아주 작은 것도 됩니다. 하나만 적어도 충분합니다.',
    render(ctx) {
      const g = d(ctx).grateful;
      return [0, 1, 2].map(i =>
        `<div class="field"><input class="input" data-grat="${i}" value="${UI.esc(g[i] || '')}" placeholder="${i + 1}."></div>`).join('');
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.querySelectorAll('[data-grat]').forEach(el =>
        el.addEventListener('input', () => { r.grateful[+el.dataset.grat] = el.value; save(); }));
    },
    next: { t: '오늘 기록 마치기', to: 'today.done' }
  };

  /* ---------- 9. 완료 ---------- */
  S['today.done'] = {
    tab: T, title: '오늘 기록 완료', sub: ctx => UI.fmtDate(ctx.date), flow: FLOW,
    ask: '오늘 기록을 남겼습니다.',
    hint: '여기서 멈춰도 좋습니다. 이어서 하루를 되돌아볼 수도 있습니다.',
    render(ctx) {
      const r = d(ctx);
      Store.save();
      const mood = r.mood ? DATA.MOODS.find(m => m.v === r.mood).ko : '—';
      return UI.nums([['기분', mood], ['공부', r.study == null ? '—' : r.study], ['근무', r.work == null ? '—' : r.work]])
        + `<div class="blk" style="margin-top:20px">${UI.pick({ t: '일기도 쓰기', d: '길게 남기고 싶은 날', to: 'today.diary' })}
           ${UI.pick({ t: '사진과 목소리 남기기', d: '기기 안에만 저장됩니다', to: 'today.photo' })}</div>`;
    },
    next: { t: '하루 되돌아보기 시작', to: 'review.home', label: '이어서 (강제는 아닙니다)' }
  };

  /* ---------- 요약 ---------- */
  S['today.summary'] = {
    tab: T, title: '오늘 요약', sub: ctx => UI.fmtDate(ctx.date), action: dateAction,
    ask: '지금까지 남긴 것',
    render(ctx) {
      const r = d(ctx);
      if (!Store.hasContent(r)) {
        return UI.empty('이 날은 아직 비어 있습니다')
          + UI.pick({ t: '지금 기록하기', to: 'today.mood' });
      }
      const mood = r.mood ? DATA.MOODS.find(m => m.v === r.mood).ko : '—';
      const rows = [
        ['기분', mood],
        ['공부 만족도', r.study == null ? '—' : r.study + ' / 10'],
        ['근무 만족도', r.work == null ? '—' : r.work + ' / 10'],
        ['컨디션', r.health == null ? '—' : r.health + ' / 10'],
        ['수면', r.sleep ? r.sleep + '시간' : '—'],
        ['머문 곳', r.place || '—'],
        ['한 줄', r.oneline || '—']
      ];
      return `<div class="list">` + rows.map(([k, v]) =>
        `<div class="item"><div class="item__m"><div class="item__t">${UI.esc(k)}</div></div>
         <div class="item__s">${UI.esc(v)}</div></div>`).join('') + `</div>`
        + (r.acts.length ? UI.block('오늘 한 일', `<div class="chips">${r.acts.map(a => `<span class="tag">${UI.esc(a)}</span>`).join('')}</div>`) : '')
        + `<div class="blk">${UI.pick({ t: '기록 고치기', d: '처음 화면부터 다시', to: 'today.mood' })}
           ${UI.pick({ t: '일기 보기 · 쓰기', to: 'today.diary' })}
           ${UI.pick({ t: '사진과 목소리', to: 'today.photo' })}</div>`;
    }
  };

  /* ---------- 일기 ---------- */
  S['today.diary'] = {
    tab: T, title: '일기', sub: ctx => UI.fmtDate(ctx.date), action: dateAction,
    ask: '오늘 하루를 자유롭게 적어보세요.',
    render(ctx) {
      const r = d(ctx);
      return `<textarea class="ta ta--tall" data-f="diary" placeholder="누가 무엇을 했고, 나는 무엇을 느꼈는지.">${UI.esc(r.diary)}</textarea>
        <div class="small muted" style="margin-top:8px" id="cnt">${(r.diary || '').length}자</div>`;
    },
    bind(root, ctx) {
      const r = d(ctx);
      const ta = root.querySelector('[data-f="diary"]');
      ta.addEventListener('input', () => {
        r.diary = ta.value;
        root.querySelector('#cnt').textContent = ta.value.length + '자';
        save();
      });
    },
    next: { t: '사진과 목소리 남기기', to: 'today.photo' }
  };

  /* ---------- 사진과 음성 ---------- */
  S['today.photo'] = {
    tab: T, title: '사진과 목소리', sub: ctx => UI.fmtDate(ctx.date), action: dateAction,
    ask: '오늘의 사진과 목소리를 남겨두세요.',
    hint: '기기 안에만 저장되며 사진은 자동으로 축소됩니다.',
    render(ctx) {
      const r = d(ctx);
      return UI.block('사진',
        (r.photos.length
          ? `<div class="thumbs">` + r.photos.map((p, i) =>
            `<div class="thumb"><img src="${p}" alt=""><button data-delphoto="${i}">✕</button></div>`).join('') + `</div>`
          : UI.empty('첨부한 사진이 없습니다'))
        + `<div class="row" style="margin-top:12px"><button class="btn btn--sm" id="addPhoto">사진 첨부</button></div>`)
        + UI.block('음성 메모',
          (r.voice
            ? `<audio controls src="${r.voice}" style="width:100%"></audio>
               <div class="row" style="margin-top:10px"><button class="btn btn--sm" id="delVoice">음성 삭제</button></div>`
            : UI.empty('녹음된 음성이 없습니다'))
          + `<div class="row" style="margin-top:12px"><button class="btn btn--sm" id="rec">녹음 시작</button></div>`);
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.querySelector('#addPhoto').onclick = async () => {
        const url = await UI.pickImage(1000);
        if (!url) return;
        r.photos.push(url);
        if (Store.save()) { UI.toast('사진을 첨부했습니다'); ctx.refresh(); }
        else r.photos.pop();
      };
      root.querySelectorAll('[data-delphoto]').forEach(b => b.onclick = () => {
        r.photos.splice(+b.dataset.delphoto, 1);
        Store.save();
        ctx.refresh();
      });
      const dv = root.querySelector('#delVoice');
      if (dv) dv.onclick = () => { r.voice = ''; Store.save(); ctx.refresh(); };
      root.querySelector('#rec').onclick = function () {
        UI.audio(this, url => {
          r.voice = url;
          if (Store.save()) { UI.toast('음성을 저장했습니다'); ctx.refresh(); }
          else r.voice = '';
        });
      };
    },
    next: { t: '하루 되돌아보기 시작', to: 'review.home' }
  };

  /* 공통 — data-f 입력을 해당 날짜 레코드에 바로 반영 */
  function bindFields(root, ctx) {
    const r = d(ctx);
    root.querySelectorAll('[data-f]').forEach(el =>
      el.addEventListener('input', () => { r[el.dataset.f] = el.value; save(); }));
    root.querySelectorAll('[data-f]').forEach(el =>
      el.addEventListener('change', () => { r[el.dataset.f] = el.value; save(); }));
    const wrap = root.querySelector('[data-sl]');
    if (wrap) {
      const key = wrap.dataset.sl;
      wrap.querySelector('input[type=range]').addEventListener('input', e => {
        r[key] = +e.target.value;
        save();
      });
    }
  }
})(window.SCREENS);
