/* 되돌아보기 탭 — 50개 점검 항목을 분류별로 한 화면씩, 그다음 반성 세 문장 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const T = 'review';
  const CATS = DATA.REVIEW_CATS.filter(c => c !== '전체');
  const WRITE = ['review.good', 'review.bad', 'review.tomorrow', 'review.done'];

  const d = ctx => Store.day(ctx.date);

  function items(cat) {
    return Store.reviewItems().filter(i => i.cat === cat);
  }
  function checkedCount(ctx) {
    return Object.values(d(ctx).review).filter(Boolean).length;
  }
  function streak() {
    let n = 0, day = Store.today();
    while (true) {
      const r = Store.peek(day);
      if (r && r.reviewDone) { n++; day = UI.addDays(day, -1); } else break;
    }
    return n;
  }

  /* ---------- 홈 ---------- */
  S['review.home'] = {
    tab: T,
    title: '되돌아보기',
    sub: ctx => UI.fmtDate(ctx.date),
    action: ctx => ({
      ico: 'more',
      fn: () => UI.modal({
        title: '점검 도구',
        body: `<button class="btn btn--block" id="rCopy" style="margin-bottom:10px">어제 체크를 그대로 가져오기</button>
               <button class="btn btn--block" id="rClear">오늘 체크 전체 해제</button>`,
        actions: [{ t: '닫기', primary: true, fn: UI.closeModal }],
        after: body => {
          body.querySelector('#rCopy').onclick = () => {
            const y = Store.peek(UI.addDays(ctx.date, -1));
            if (!y || !Object.keys(y.review || {}).length) return UI.toast('어제 기록이 없습니다');
            d(ctx).review = Object.assign({}, y.review);
            Store.save();
            UI.closeModal();
            ctx.refresh();
            UI.toast('어제 체크를 가져왔습니다');
          };
          body.querySelector('#rClear').onclick = async () => {
            UI.closeModal();
            if (await UI.confirm('전체 해제', '오늘 체크한 항목을 모두 지웁니다.', '해제')) {
              d(ctx).review = {};
              Store.save();
              ctx.refresh();
            }
          };
        }
      })
    }),
    ask: '하루를 되돌아볼까요?',
    hint: ctx => {
      const all = Store.reviewItems().length;
      const n = checkedCount(ctx);
      const s = streak();
      return `점검 항목 ${all}개 중 ${n}개 체크${s ? ` · 연속 회고 ${s}일` : ''}`;
    },
    foot: '못 지킨 항목이 곧 내일의 할 일이 됩니다.',
    render(ctx) {
      const n = checkedCount(ctx);
      return UI.pick({ t: n ? '점검 이어서 하기' : '항목 점검하기', d: `${CATS.length}개 분류를 한 화면씩`, to: 'review.cat', params: { i: 0 } })
        + UI.pick({ t: '반성 남기기', d: '잘한 일 · 아쉬운 일 · 내일', to: 'review.good' })
        + UI.pick({ t: '오늘의 질문 하나만', d: '시간이 없는 날에는 이것만', to: 'review.one' });
    }
  };

  /* ---------- 분류별 점검 ---------- */
  S['review.cat'] = {
    tab: T,
    title: ctx => (CATS[ctx.params.i || 0] || '점검'),
    sub: ctx => `${(ctx.params.i || 0) + 1} / ${CATS.length} 분류`,
    steps: ctx => ({ i: ctx.params.i || 0, n: CATS.length }),
    action: ctx => ({
      ico: 'plus',
      fn: async () => {
        const o = await UI.form('점검 항목 추가', [
          { k: 't', label: '점검할 내용', ph: '예: 오늘 악기 연습을 했다' },
          { k: 'cat', label: '분류', type: 'select', options: CATS }
        ], { cat: CATS[ctx.params.i || 0] });
        if (o && o.t) {
          Store.add('customReview', { t: o.t, cat: o.cat || '생활', custom: true });
          ctx.refresh();
        }
      }
    }),
    ask: ctx => ASK[CATS[ctx.params.i || 0]] || '오늘 어땠나요?',
    hint: '해당되는 것만 체크하세요. 못 지킨 항목이 곧 내일의 할 일입니다.',
    render(ctx) {
      const cat = CATS[ctx.params.i || 0];
      const r = d(ctx);
      const list = items(cat);
      const done = list.filter(i => r.review[i.id]).length;
      return `<div class="blk">
          <div class="prog"><span style="width:${list.length ? (done / list.length) * 100 : 0}%"></span></div>
          <div class="small muted" style="margin-top:8px">${done} / ${list.length} 체크</div>
        </div>
        <div>` + list.map(i => `
          <div class="check ${r.review[i.id] ? 'is-on' : ''}" data-chk="${i.id}">
            <div class="check__box">✓</div>
            <div class="check__txt">${UI.esc(i.t)}</div>
            ${i.custom ? `<button class="btn btn--ghost btn--sm" data-delchk="${i.id}">삭제</button>` : ''}
          </div>`).join('') + `</div>`;
    },
    bind(root, ctx) {
      const r = d(ctx);
      root.addEventListener('click', e => {
        const del = e.target.closest('[data-delchk]');
        if (del) { Store.remove('customReview', del.dataset.delchk); return ctx.refresh(); }
        const c = e.target.closest('[data-chk]');
        if (!c) return;
        const id = c.dataset.chk;
        r.review[id] = !r.review[id];
        c.classList.toggle('is-on', r.review[id]);
        Store.commit(true);
        const list = items(CATS[ctx.params.i || 0]);
        const done = list.filter(x => r.review[x.id]).length;
        root.querySelector('.prog span').style.width = (done / list.length) * 100 + '%';
        root.querySelector('.small.muted').textContent = `${done} / ${list.length} 체크`;
      });
    },
    next: ctx => {
      const i = ctx.params.i || 0;
      return i < CATS.length - 1
        ? { t: `다음: ${CATS[i + 1]}`, to: 'review.cat', params: { i: i + 1 } }
        : { t: '반성 남기기', to: 'review.good' };
    }
  };

  const ASK = {
    '공부': '공부는 어땠나요?',
    '근무': '오늘 일은 어땠나요?',
    '관계': '사람들과는 어땠나요?',
    '건강': '몸은 잘 챙겼나요?',
    '마음': '마음은 어땠나요?',
    '시간': '시간은 어떻게 썼나요?',
    '생활': '생활은 어땠나요?',
    '성장': '오늘 나는 자랐나요?'
  };

  /* ---------- 반성 세 문장 ---------- */
  function writeScreen(id, title, ask, hint, field, next) {
    S[id] = {
      tab: T, title, sub: ctx => UI.fmtDate(ctx.date), flow: WRITE, ask, hint,
      render(ctx) {
        return `<textarea class="ta ta--tall" data-f="${field}" placeholder="${UI.esc(hint2[field] || '')}">${UI.esc(d(ctx)[field])}</textarea>`;
      },
      bind(root, ctx) {
        const r = d(ctx);
        const ta = root.querySelector('textarea');
        ta.addEventListener('input', () => { r[field] = ta.value; Store.commit(true); });
      },
      next
    };
  }
  const hint2 = {
    good: '작은 것이라도 좋습니다. 오늘 나를 칭찬할 한 가지.',
    bad: '자책이 아니라 관찰로 적어보세요. 무엇이 아쉬웠나요?',
    tomorrow: '내일 딱 하나만 한다면 무엇을 하시겠어요?'
  };

  writeScreen('review.good', '잘한 일', '오늘 잘한 일은 무엇인가요?',
    '하루에 하나는 반드시 있습니다.', 'good',
    { t: '아쉬웠던 일 적기', to: 'review.bad' });

  writeScreen('review.bad', '반성', '아쉬웠던 일은 무엇인가요?',
    '고칠 것을 찾는 자리이지, 나를 깎는 자리가 아닙니다.', 'bad',
    { t: '내일의 나에게 남기기', to: 'review.tomorrow' });

  writeScreen('review.tomorrow', '내일의 나에게', '내일의 나에게 한마디 남긴다면?',
    '내일 이 화면을 먼저 보게 됩니다.', 'tomorrow',
    { t: '되돌아보기 마치기', to: 'review.done' });

  /* ---------- 완료 ---------- */
  S['review.done'] = {
    tab: T, title: '되돌아보기 완료', sub: ctx => UI.fmtDate(ctx.date), flow: WRITE,
    ask: '오늘 하루를 정리했습니다.',
    hint: '이 기록은 나중에 통계에서 어떤 항목을 자주 놓쳤는지 알려줍니다.',
    render(ctx) {
      const r = d(ctx);
      r.reviewDone = true;
      Store.save();
      const all = Store.reviewItems().length;
      return UI.nums([['체크', checkedCount(ctx) + ' / ' + all], ['연속 회고', streak() + '일']])
        + `<div class="blk" style="margin-top:20px">
            ${UI.pick({ t: '오늘의 가르침 보기', d: '배운 원칙을 실천으로', to: 'growth.today' })}
            ${UI.pick({ t: '기록 다시 보기', d: '달력과 목록', to: 'memory.cal' })}
          </div>`;
    },
    next: { t: '오늘의 가르침으로', to: 'growth.today', label: '이어서 (강제는 아닙니다)' }
  };

  /* ---------- 질문 하나만 ---------- */
  S['review.one'] = {
    tab: T, title: '오늘의 질문', sub: ctx => UI.fmtDate(ctx.date),
    ask: ctx => {
      if (!ctx.params.pick) {
        const list = Store.reviewItems();
        const seed = Number(ctx.date.replace(/-/g, '')) + (ctx.params.n || 0);
        ctx.params.pick = list[seed % list.length].id;
      }
      const it = Store.reviewItems().find(x => x.id === ctx.params.pick);
      return it ? it.t : '오늘 하루를 기록으로 남겼다';
    },
    hint: '오늘은 이 하나만 생각해도 충분합니다.',
    render(ctx) {
      const r = d(ctx);
      const it = Store.reviewItems().find(x => x.id === ctx.params.pick);
      const answered = it && Object.prototype.hasOwnProperty.call(r.review, it.id);
      const sel = answered ? (r.review[it.id] ? 'yes' : 'no') : '';
      return UI.opts([{ v: 'yes', t: '그렇게 했다' }, { v: 'no', t: '못 했다' }], sel)
        + `<div class="row" style="margin-top:18px"><button class="btn btn--sm" id="another">다른 질문 뽑기</button></div>`;
    },
    bind(root, ctx) {
      const r = d(ctx);
      const it = Store.reviewItems().find(x => x.id === ctx.params.pick);
      root.addEventListener('click', e => {
        const o = e.target.closest('[data-opt]');
        if (o && it) {
          r.review[it.id] = o.dataset.opt === 'yes';
          Store.save();
          ctx.refresh();
          UI.toast('기록했습니다');
        }
      });
      root.querySelector('#another').onclick = () => {
        ctx.replace('review.one', { n: (ctx.params.n || 0) + 1 });
      };
    },
    next: { t: '반성 남기기', to: 'review.good' }
  };
})(window.SCREENS);
