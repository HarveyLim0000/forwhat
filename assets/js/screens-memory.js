/* 기억 탭 — 일기·달력, 자서전, 가족 기록 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const T = 'memory';

  /* ============ 기억 홈 ============ */
  S['memory.home'] = {
    tab: T, title: '기억',
    ask: '무엇을 다시 볼까요?',
    hint: '지난 기록을 되짚거나, 인생 이야기를 이어 씁니다.',
    foot: () => {
      const p = Store.dates().reduce((s, ds) => s + (Store.state.days[ds].photos || []).length, 0);
      return `사진 ${p}장 · 가족 사건 ${Store.state.milestones.length}건 보관 중`;
    },
    render() {
      const days = Store.dates().filter(ds => Store.hasContent(Store.state.days[ds])).length;
      const answered = Object.values(Store.state.story).filter(x => x && x.a).length;
      return UI.pick({ t: '일기와 달력', d: `${days}일의 기록`, to: 'memory.cal' })
        + UI.pick({ t: '자서전', d: `인생 질문 ${answered}개 작성`, to: 'story.home' })
        + UI.pick({ t: '가족 기록', d: `구성원 ${Store.state.family.length}명`, to: 'family.home' });
    }
  };

  /* ============ 달력 ============ */
  let cursor = null;
  S['memory.cal'] = {
    tab: T, title: '달력',
    sub: () => {
      const [y, m] = (cursor || Store.today().slice(0, 7)).split('-');
      return `${y}년 ${Number(m)}월`;
    },
    ask: '어떤 날을 다시 볼까요?',
    hint: '점이 있는 날은 기록이 있는 날입니다. 날짜를 누르면 그날로 갑니다.',
    render(ctx) {
      if (!cursor) cursor = ctx.date.slice(0, 7);
      const [y, m] = cursor.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const days = new Date(y, m, 0).getDate();
      let cells = '';
      for (let i = 0; i < first.getDay(); i++) cells += `<div class="cal__d is-empty"></div>`;
      for (let i = 1; i <= days; i++) {
        const ds = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const r = Store.peek(ds);
        const rec = Store.hasContent(r);
        cells += `<div class="cal__d ${ds === Store.today() ? 'is-today' : ''} ${rec ? 'has-rec' : ''}" data-day="${ds}">
            <span class="cal__n">${i}</span><span class="cal__dot"></span></div>`;
      }
      return `<div class="cal">${UI.WD.map(w => `<div class="cal__h">${w}</div>`).join('')}${cells}</div>
        <div class="row" style="margin-top:16px">
          <button class="btn btn--sm" id="mPrev">지난달</button>
          <button class="btn btn--sm" id="mNow">이번 달</button>
          <button class="btn btn--sm" id="mNext">다음달</button>
        </div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-day]');
        if (!c) return;
        ctx.setDate(c.dataset.day);
        ctx.go('today.summary');
      });
      const shift = n => {
        const [y, m] = cursor.split('-').map(Number);
        const x = new Date(y, m - 1 + n, 1);
        cursor = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
        ctx.refresh();
      };
      root.querySelector('#mPrev').onclick = () => shift(-1);
      root.querySelector('#mNext').onclick = () => shift(1);
      root.querySelector('#mNow').onclick = () => { cursor = Store.today().slice(0, 7); ctx.refresh(); };
    },
    next: { t: '기록 목록으로 보기', to: 'memory.list' }
  };

  /* ============ 목록 · 검색 ============ */
  let q = '';
  S['memory.list'] = {
    tab: T, title: '기록 목록',
    ask: '지난 기록을 찾아봅니다.',
    render() {
      const rows = Store.dates().slice().reverse()
        .map(ds => [ds, Store.state.days[ds]])
        .filter(([, r]) => Store.hasContent(r))
        .filter(([, r]) => {
          if (!q) return true;
          const hay = [r.oneline, r.diary, r.good, r.bad, r.tomorrow, r.place, (r.acts || []).join(' ')].join(' ');
          return hay.toLowerCase().includes(q.toLowerCase());
        });
      return `<input class="input" id="q" value="${UI.esc(q)}" placeholder="기록 내용 검색" style="margin-bottom:18px">
        <div class="list">` + (rows.length ? rows.slice(0, 100).map(([ds, r]) => {
          const mood = r.mood ? DATA.MOODS.find(m => m.v === r.mood).ko : '';
          return `<div class="item item--tap" data-day="${ds}">
            <div class="item__m">
              <div class="item__t">${UI.fmtShort(ds)}${mood ? ' · ' + mood : ''}</div>
              <div class="item__d">${UI.esc(r.oneline || (r.diary || '').slice(0, 90) || '내용 없음')}</div>
            </div>
            <div class="item__s">${(r.photos || []).length ? '사진 ' + r.photos.length : ''}</div>
          </div>`;
        }).join('') : UI.empty('조건에 맞는 기록이 없습니다')) + `</div>`;
    },
    bind(root, ctx) {
      const inp = root.querySelector('#q');
      inp.addEventListener('input', () => {
        q = inp.value;
        clearTimeout(inp._t);
        inp._t = setTimeout(() => {
          const pos = inp.selectionStart;
          ctx.refresh();
          const n = document.querySelector('#q');
          if (n) { n.focus(); n.setSelectionRange(pos, pos); }
        }, 280);
      });
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-day]');
        if (!c) return;
        ctx.setDate(c.dataset.day);
        ctx.go('today.summary');
      });
    },
    next: { t: '그날의 기억 보기', to: 'memory.past' }
  };

  /* ============ 그날의 기억 ============ */
  S['memory.past'] = {
    tab: T, title: '그날의 기억',
    ask: '같은 날짜의 지난 기록',
    hint: ctx => UI.fmtDate(ctx.date) + ' 기준',
    action: UI.dateAction,
    render(ctx) {
      const rows = [1, 2, 3, 5, 10].map(n => {
        const ds = (Number(ctx.date.slice(0, 4)) - n) + ctx.date.slice(4);
        const r = Store.peek(ds);
        if (!r || !Store.hasContent(r)) return '';
        return `<div class="tl__i">
          <div class="tl__y">${n}년 전 · ${UI.fmtDate(ds)}</div>
          <div class="item__t">${UI.esc(r.oneline || '기록')}</div>
          ${r.diary ? `<div class="item__d">${UI.esc(r.diary.slice(0, 200))}</div>` : ''}
        </div>`;
      }).filter(Boolean).join('');
      return rows ? `<div class="tl">${rows}</div>`
        : UI.empty('아직 지난 해의 같은 날짜 기록이 없습니다');
    }
  };

  /* ============ 자서전 ============ */
  const key = (c, i) => c + ':' + i;
  const ans = k => Store.state.story[k] || null;
  function allQs() {
    const out = [];
    DATA.CHAPTERS.forEach(c => c.qs.forEach((qq, i) => out.push({ k: key(c.id, i), q: qq, c })));
    return out;
  }
  function weekQ() {
    const wk = Store.weekKey();
    let k = Store.state.weekly[wk];
    if (!k || !allQs().some(x => x.k === k)) {
      const rest = allQs().filter(x => !(ans(x.k) && ans(x.k).a));
      if (!rest.length) return null;
      k = rest[0].k;
      Store.state.weekly[wk] = k;
      Store.commit(true);
    }
    return allQs().find(x => x.k === k);
  }

  S['story.home'] = {
    tab: T, title: '자서전',
    ask: '인생 이야기를 이어 써볼까요?',
    hint: () => {
      const total = allQs().length;
      const done = allQs().filter(x => ans(x.k) && ans(x.k).a).length;
      return `${total}개 질문 중 ${done}개 작성 · 한 주에 하나면 1년에 한 권`;
    },
    render() {
      return UI.pick({ t: '이번 주 질문', d: '가장 쉬운 시작점', to: 'story.week' })
        + UI.pick({ t: '인생 챕터', d: '유년기부터 지금까지 8장', to: 'story.chapters' })
        + UI.pick({ t: '인생 연표', d: '연도별 큰 사건', to: 'story.timeline' });
    }
  };

  S['story.week'] = {
    tab: T, title: '이번 주 질문',
    sub: () => {
      const [y, w] = Store.weekKey().split('-W');
      return `${y}년 ${Number(w)}주차`;
    },
    action: ctx => ({
      ico: 'more', fn: () => {
        const rest = allQs().filter(x => !(ans(x.k) && ans(x.k).a));
        if (!rest.length) return UI.toast('남은 질문이 없습니다');
        Store.state.weekly[Store.weekKey()] = rest[Math.floor(Math.random() * rest.length)].k;
        Store.commit();
        ctx.refresh();
        UI.toast('다른 질문으로 바꿨습니다');
      }
    }),
    ask: () => { const w = weekQ(); return w ? w.q : '모든 질문에 답했습니다.'; },
    hint: () => { const w = weekQ(); return w ? w.c.t : '훌륭합니다. 이제 책으로 묶어보세요.'; },
    render(ctx) {
      const w = weekQ();
      if (!w) return UI.pick({ t: '책으로 만들기', to: 'story.book' });
      return answerBody(w.k);
    },
    bind(root, ctx) {
      const w = weekQ();
      if (w) bindAnswer(root, ctx, w.k);
    },
    next: { t: '인생 챕터 보기', to: 'story.chapters' }
  };

  S['story.chapters'] = {
    tab: T, title: '인생 챕터',
    ask: '어느 시절부터 이야기할까요?',
    render() {
      return `<div class="list">` + DATA.CHAPTERS.map(c => {
        const done = c.qs.filter((qq, i) => ans(key(c.id, i)) && ans(key(c.id, i)).a).length;
        return `<div class="item item--tap" data-ch="${c.id}">
          <div class="item__m"><div class="item__t">${UI.esc(c.t)}</div>
            <div class="item__d">${done} / ${c.qs.length} 작성</div></div>
          <div class="item__s">${done === c.qs.length ? '완료' : '이어쓰기'}</div>
        </div>`;
      }).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-ch]');
        if (c) ctx.go('story.chapter', { cid: c.dataset.ch });
      });
    },
    next: { t: '책으로 만들기', to: 'story.book' }
  };

  S['story.chapter'] = {
    tab: T,
    title: ctx => (DATA.CHAPTERS.find(c => c.id === ctx.params.cid) || {}).t || '챕터',
    ask: '어떤 질문에 답해볼까요?',
    render(ctx) {
      const c = DATA.CHAPTERS.find(x => x.id === ctx.params.cid);
      return `<div class="list">` + c.qs.map((qq, i) => {
        const a = ans(key(c.id, i));
        return `<div class="item item--tap" data-q="${c.id}:${i}">
          <div class="item__m"><div class="item__t">${UI.esc(qq)}</div>
            ${a && a.a ? `<div class="item__d">${UI.esc(a.a.slice(0, 100))}${a.a.length > 100 ? '…' : ''}</div>` : ''}</div>
          <div class="item__s">${a && a.a ? '작성됨' : ''}</div>
        </div>`;
      }).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-q]');
        if (b) ctx.go('story.answer', { k: b.dataset.q });
      });
    }
  };

  function answerBody(k) {
    const cur = ans(k) || { a: '', voice: '' };
    return `<textarea class="ta ta--tall" id="ansTa" placeholder="떠오르는 대로 적어보세요. 문장이 거칠어도 괜찮습니다.">${UI.esc(cur.a)}</textarea>
      <div class="row" style="margin-top:12px">
        <button class="btn btn--sm" id="ansSave">저장</button>
        <button class="btn btn--sm" id="ansRec">${cur.voice ? '음성 다시 녹음' : '음성으로 답하기'}</button>
        <span class="small muted" id="ansCnt">${cur.a.length}자</span>
      </div>
      ${cur.voice ? `<audio controls src="${cur.voice}" style="width:100%;margin-top:14px"></audio>` : ''}`;
  }
  function bindAnswer(root, ctx, k) {
    const ta = root.querySelector('#ansTa');
    const cur = ans(k) || { a: '', voice: '' };
    ta.addEventListener('input', () => root.querySelector('#ansCnt').textContent = ta.value.length + '자');
    root.querySelector('#ansSave').onclick = () => {
      Store.state.story[k] = { a: ta.value, voice: cur.voice || '', at: new Date().toISOString() };
      Store.save();
      UI.toast('자서전에 기록했습니다');
      ctx.refresh();
    };
    root.querySelector('#ansRec').onclick = function () {
      UI.audio(this, url => {
        Store.state.story[k] = { a: ta.value, voice: url, at: new Date().toISOString() };
        if (Store.save()) { UI.toast('음성 답변을 저장했습니다'); ctx.refresh(); }
      });
    };
  }

  S['story.answer'] = {
    tab: T,
    title: '자서전',
    sub: ctx => {
      const [cid] = ctx.params.k.split(':');
      return (DATA.CHAPTERS.find(c => c.id === cid) || {}).t || '';
    },
    ask: ctx => {
      const [cid, i] = ctx.params.k.split(':');
      const c = DATA.CHAPTERS.find(x => x.id === cid);
      return c ? c.qs[+i] : '';
    },
    render(ctx) { return answerBody(ctx.params.k); },
    bind(root, ctx) { bindAnswer(root, ctx, ctx.params.k); },
    next: ctx => {
      const [cid, i] = ctx.params.k.split(':');
      const c = DATA.CHAPTERS.find(x => x.id === cid);
      const n = +i + 1;
      return n < c.qs.length
        ? { t: '다음 질문', to: 'story.answer', params: { k: cid + ':' + n } }
        : { t: '다른 챕터 보기', to: 'story.chapters' };
    }
  };

  S['story.timeline'] = {
    tab: T, title: '인생 연표',
    ask: '내 인생의 큰 사건들',
    hint: '연도만 적어도 충분합니다. 이것이 자서전의 뼈대가 됩니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('인생 사건 추가', [
          { k: 'year', label: '연도', type: 'number', ph: '예: 2014' },
          { k: 'month', label: '월 (선택)', type: 'number', ph: '1–12' },
          { k: 'title', label: '무슨 일이 있었나요', ph: '예: 첫 직장 입사' },
          { k: 'desc', label: '설명 (선택)', type: 'textarea', rows: 4 }
        ]);
        if (o && o.year && o.title) { Store.add('events', o); ctx.refresh(); }
      }
    }),
    render() {
      const ev = Store.state.events.slice().sort((a, b) =>
        (String(a.year) + String(a.month || '00').padStart(2, '0'))
          .localeCompare(String(b.year) + String(b.month || '00').padStart(2, '0')));
      if (!ev.length) return UI.empty('오른쪽 위 + 를 눌러 첫 사건을 남겨보세요');
      return `<div class="tl">` + ev.map(e => `
        <div class="tl__i">
          <div class="tl__y">${UI.esc(e.year)}년${e.month ? ' ' + UI.esc(e.month) + '월' : ''}</div>
          <div class="item__t">${UI.esc(e.title)}</div>
          ${e.desc ? `<div class="item__d">${UI.esc(e.desc)}</div>` : ''}
          <button class="btn btn--ghost btn--sm" data-delev="${e.id}" style="margin-top:6px">삭제</button>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-delev]');
        if (b) { Store.remove('events', b.dataset.delev); ctx.refresh(); }
      });
    },
    next: { t: '책으로 만들기', to: 'story.book' }
  };

  S['story.book'] = {
    tab: T, title: '책으로 만들기',
    ask: '지금까지 쓴 이야기를 한 권으로',
    hint: '인쇄 창에서 “PDF로 저장”을 고르면 파일로 남습니다.',
    render() {
      const total = allQs().length;
      const done = allQs().filter(x => ans(x.k) && ans(x.k).a).length;
      const chars = Object.values(Store.state.story).reduce((s, x) => s + ((x && x.a) ? x.a.length : 0), 0);
      return UI.nums([['답변', done + ' / ' + total], ['글자', chars.toLocaleString()], ['원고지', Math.round(chars / 200) + '매']])
        + `<div class="blk" style="margin-top:22px">
            <button class="btn btn--primary btn--block" id="print">책 미리보기 · 인쇄</button>
          </div>`;
    },
    bind(root) {
      root.querySelector('#print').onclick = () => {
        const p = Store.state.profile;
        let html = `<div class="book"><h1>${UI.esc(p.name)}의 기록</h1>
          <p class="muted">${UI.esc(p.startedAt)} — ${Store.today()}</p>`;
        DATA.CHAPTERS.forEach(c => {
          const list = c.qs.map((qq, i) => ({ q: qq, a: ans(key(c.id, i)) })).filter(x => x.a && x.a.a);
          if (!list.length) return;
          html += `<h2>${UI.esc(c.t)}</h2>`;
          list.forEach(x => {
            html += `<h3>${UI.esc(x.q)}</h3><p>${UI.esc(x.a.a).replace(/\n/g, '<br>')}</p>`;
          });
        });
        const ev = Store.state.events.slice().sort((a, b) => a.year - b.year);
        if (ev.length) {
          html += `<h2>인생 연표</h2>`;
          ev.forEach(e => html += `<p><b>${UI.esc(e.year)}${e.month ? '.' + UI.esc(e.month) : ''}</b> — ${UI.esc(e.title)}${e.desc ? '<br>' + UI.esc(e.desc) : ''}</p>`);
        }
        html += `</div>`;
        let out = document.getElementById('bookOut');
        if (!out) {
          out = document.createElement('div');
          out.id = 'bookOut';
          document.body.appendChild(out);
        }
        out.innerHTML = html;
        document.body.classList.add('printing');
        setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 80);
      };
    }
  };

  /* ============ 가족 ============ */
  S['family.home'] = {
    tab: T, title: '가족 기록',
    ask: '가족의 무엇을 남길까요?',
    hint: '나중에 가장 찾게 되는 기록입니다.',
    render() {
      return UI.pick({ t: '가족 구성원', d: `${Store.state.family.length}명 · 생일 D-day`, to: 'family.members' })
        + UI.pick({ t: '가족 사건', d: `${Store.state.milestones.length}건 기록됨`, to: 'family.events' })
        + UI.pick({ t: '앨범과 편지', d: `앨범 ${Store.state.albums.length}개 · 편지 ${Store.state.letters.length}통`, to: 'family.albums' });
    }
  };

  S['family.members'] = {
    tab: T, title: '가족 구성원',
    ask: '우리 가족을 등록해 두세요.',
    hint: '생일을 넣으면 다가오는 날을 세어 알려줍니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('가족 구성원 추가', [
          { k: 'name', label: '이름' },
          { k: 'rel', label: '관계', type: 'select', options: DATA.RELATIONS },
          { k: 'birth', label: '생일', type: 'date' },
          { k: 'note', label: '메모 (선택)', ph: '좋아하는 것, 기억할 점' }
        ]);
        if (o && o.name) { Store.add('family', o); ctx.refresh(); }
      }
    }),
    render() {
      const fam = Store.state.family;
      if (!fam.length) return UI.empty('오른쪽 위 + 를 눌러 가족을 등록해보세요');
      const t = Store.today(), y = Number(t.slice(0, 4));
      const dd = fam.filter(f => f.birth).map(f => {
        let next = y + '-' + f.birth.slice(5);
        if (UI.diffDays(t, next) < 0) next = (y + 1) + '-' + f.birth.slice(5);
        return { f, left: UI.diffDays(t, next) };
      }).sort((a, b) => a.left - b.left).slice(0, 4);

      return (dd.length ? UI.block('다가오는 생일',
        dd.map(x => UI.bar(x.f.name, 365 - x.left, 365, x.left === 0 ? '오늘!' : 'D-' + x.left)).join('')) : '')
        + `<div class="list">` + fam.map(f => `
          <div class="item">
            ${f.photo ? `<div class="thumb" style="width:46px;height:46px;flex:none"><img src="${f.photo}" alt=""></div>` : ''}
            <div class="item__m">
              <div class="item__t">${UI.esc(f.name)} <span class="tag">${UI.esc(f.rel)}</span></div>
              <div class="item__d">${UI.esc(f.birth || '생일 미등록')}${f.note ? ' · ' + UI.esc(f.note) : ''}</div>
            </div>
            <div class="row">
              <button class="btn btn--ghost btn--sm" data-photo="${f.id}">사진</button>
              <button class="btn btn--ghost btn--sm" data-delfam="${f.id}">삭제</button>
            </div>
          </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', async e => {
        const p = e.target.closest('[data-photo]');
        if (p) {
          const url = await UI.pickImage(400);
          if (!url) return;
          Store.find('family', p.dataset.photo).photo = url;
          Store.save();
          return ctx.refresh();
        }
        const dl = e.target.closest('[data-delfam]');
        if (dl && await UI.confirm('구성원 삭제', '이 구성원을 목록에서 지웁니다.', '삭제')) {
          Store.remove('family', dl.dataset.delfam);
          ctx.refresh();
        }
      });
    },
    next: { t: '가족 사건 남기기', to: 'family.events' }
  };

  S['family.events'] = {
    tab: T, title: '가족 사건',
    ask: '기억해 둘 가족의 일',
    hint: '언제 · 누가 · 무엇을. 세 가지만 있으면 됩니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('가족 사건 기록', [
          { k: 'date', label: '언제', type: 'date' },
          { k: 'title', label: '무슨 일', ph: '예: 아버지 환갑' },
          { k: 'desc', label: '이야기', type: 'textarea', rows: 5 },
          { k: 'whoTxt', label: '누구와 (쉼표로 구분)', ph: '어머니, 동생' }
        ], { date: ctx.date });
        if (o && o.title) {
          o.who = (o.whoTxt || '').split(',').map(s => s.trim()).filter(Boolean);
          delete o.whoTxt;
          Store.add('milestones', o);
          ctx.refresh();
        }
      }
    }),
    render() {
      const ms = Store.state.milestones.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (!ms.length) return UI.empty('오른쪽 위 + 를 눌러 첫 기록을 남겨보세요');
      return `<div class="tl">` + ms.map(m => `
        <div class="tl__i">
          <div class="tl__y">${UI.esc(m.date || '')}</div>
          <div class="item__t">${UI.esc(m.title)}</div>
          ${m.desc ? `<div class="item__d">${UI.esc(m.desc)}</div>` : ''}
          ${(m.who || []).length ? `<div style="margin-top:6px">${m.who.map(w => `<span class="tag">${UI.esc(w)}</span>`).join(' ')}</div>` : ''}
          <button class="btn btn--ghost btn--sm" data-delms="${m.id}" style="margin-top:6px">삭제</button>
        </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-delms]');
        if (b) { Store.remove('milestones', b.dataset.delms); ctx.refresh(); }
      });
    },
    next: { t: '앨범 만들기', to: 'family.albums' }
  };

  S['family.albums'] = {
    tab: T, title: '앨범',
    ask: '사진을 묶어 둡니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('앨범 만들기', [
          { k: 'title', label: '앨범 이름', ph: '예: 2026 제주 여행' },
          { k: 'note', label: '설명 (선택)' }
        ]);
        if (o && o.title) { Store.add('albums', Object.assign(o, { photos: [] })); ctx.refresh(); }
      }
    }),
    render() {
      const al = Store.state.albums;
      if (!al.length) return UI.empty('오른쪽 위 + 를 눌러 첫 앨범을 만들어보세요');
      return al.map(a => UI.block(a.title + ` (${(a.photos || []).length}장)`,
        ((a.photos || []).length
          ? `<div class="thumbs">` + a.photos.map((p, i) =>
            `<div class="thumb"><img src="${p}" alt=""><button data-delimg="${a.id}:${i}">✕</button></div>`).join('') + `</div>`
          : UI.empty('사진이 없습니다'))
        + `<div class="row" style="margin-top:12px">
             <button class="btn btn--sm" data-addimg="${a.id}">사진 추가</button>
             <button class="btn btn--ghost btn--sm" data-delalb="${a.id}">앨범 삭제</button>
           </div>`)).join('');
    },
    bind(root, ctx) {
      root.addEventListener('click', async e => {
        const ai = e.target.closest('[data-addimg]');
        if (ai) {
          const url = await UI.pickImage(1000);
          if (!url) return;
          const a = Store.find('albums', ai.dataset.addimg);
          a.photos = a.photos || [];
          a.photos.push(url);
          if (Store.save()) ctx.refresh(); else a.photos.pop();
          return;
        }
        const di = e.target.closest('[data-delimg]');
        if (di) {
          const [id, i] = di.dataset.delimg.split(':');
          Store.find('albums', id).photos.splice(+i, 1);
          Store.save();
          return ctx.refresh();
        }
        const da = e.target.closest('[data-delalb]');
        if (da && await UI.confirm('앨범 삭제', '앨범과 안의 사진이 모두 지워집니다.', '삭제')) {
          Store.remove('albums', da.dataset.delalb);
          ctx.refresh();
        }
      });
    },
    next: { t: '편지 남기기', to: 'family.letters' }
  };

  S['family.letters'] = {
    tab: T, title: '편지',
    ask: '나중에 열어볼 편지',
    hint: '정한 날짜가 되기 전까지 내용을 감춥니다.',
    action: ctx => ({
      ico: 'plus', fn: async () => {
        const o = await UI.form('편지 쓰기', [
          { k: 'to', label: '받는 사람' },
          { k: 'title', label: '제목' },
          { k: 'body', label: '내용', type: 'textarea', rows: 8 },
          { k: 'openAt', label: '열어볼 날짜', type: 'date' }
        ]);
        if (o && o.title) { Store.add('letters', o); ctx.refresh(); }
      }
    }),
    render() {
      const lt = Store.state.letters;
      if (!lt.length) return UI.empty('오른쪽 위 + 를 눌러 첫 편지를 남겨보세요');
      return `<div class="list">` + lt.map(l => {
        const locked = l.openAt && UI.diffDays(Store.today(), l.openAt) > 0;
        return `<div class="item">
          <div class="item__m">
            <div class="item__t">${UI.esc(l.title)} <span class="tag">${UI.esc(l.to || '미지정')}</span></div>
            <div class="item__d">${locked
            ? `${UI.esc(l.openAt)}에 열립니다 · D-${UI.diffDays(Store.today(), l.openAt)}`
            : UI.esc(l.body)}</div>
          </div>
          <div class="row">
            ${locked ? `<button class="btn btn--ghost btn--sm" data-open="${l.id}">미리 열기</button>` : ''}
            <button class="btn btn--ghost btn--sm" data-dellt="${l.id}">삭제</button>
          </div>
        </div>`;
      }).join('') + `</div>`;
    },
    bind(root, ctx) {
      root.addEventListener('click', e => {
        const o = e.target.closest('[data-open]');
        if (o) {
          const l = Store.find('letters', o.dataset.open);
          return UI.modal({
            title: l.title,
            body: `<p style="white-space:pre-wrap">${UI.esc(l.body)}</p>`,
            actions: [{ t: '닫기', primary: true, fn: UI.closeModal }]
          });
        }
        const dl = e.target.closest('[data-dellt]');
        if (dl) { Store.remove('letters', dl.dataset.dellt); ctx.refresh(); }
      });
    }
  };
})(window.SCREENS);
