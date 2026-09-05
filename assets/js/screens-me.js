/* 나 탭 — 통계, 데이터, 설정 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const T = 'me';
  const METRICS = {
    mood: ['기분', 5], study: ['공부 만족도', 10],
    work: ['근무 만족도', 10], health: ['컨디션', 10]
  };
  let metric = 'study';
  let year = null;

  function days() {
    return Store.dates().map(ds => [ds, Store.state.days[ds]]).filter(([, r]) => Store.hasContent(r));
  }
  function streak() {
    let n = 0, day = Store.today();
    if (!Store.hasContent(Store.peek(day))) day = UI.addDays(day, -1);
    while (Store.hasContent(Store.peek(day))) { n++; day = UI.addDays(day, -1); }
    return n;
  }

  /* ============ 홈 ============ */
  S['me.home'] = {
    tab: T, title: '나',
    ask: ctx => (Store.state.profile.name || '기록자') + '님의 기록',
    hint: () => {
      const n = days().length;
      const st = streak();
      return `${n}일 기록 · 연속 ${st}일 · ${Store.state.profile.startedAt}부터`;
    },
    foot: 'Lifetime Recorder · 기록은 이 브라우저에만 저장됩니다',
    render() {
      const kb = Math.round(Store.bytes() / 1024);
      return UI.pick({ t: '통계 보기', d: '기록이 쌓이면 패턴이 보입니다', to: 'me.stats' })
        + UI.pick({ t: '데이터 관리', d: `${kb} KB 사용 중 · 백업과 복원`, to: 'me.data' })
        + UI.pick({ t: '설정', d: '이름 · 글자 크기 · 잠금 · 알림', to: 'me.settings' });
    }
  };

  /* ============ 통계 홈 ============ */
  S['me.stats'] = {
    tab: T, title: '통계',
    ask: '무엇을 볼까요?',
    hint: () => {
      const st = days().map(([, r]) => r.study).filter(v => v != null);
      const wk = days().map(([, r]) => r.work).filter(v => v != null);
      return `평균 공부 만족도 ${UI.r1(UI.avg(st))} · 평균 근무 만족도 ${UI.r1(UI.avg(wk))}`;
    },
    render() {
      return UI.pick({ t: '한 해 그림', d: '365일을 한눈에', to: 'me.pixels' })
        + UI.pick({ t: '만족도 추이', d: '최근 60일 흐름', to: 'me.trend' })
        + UI.pick({ t: '무엇이 나를 좋게 하나', d: '활동과 기분의 관계', to: 'me.corr' });
    }
  };

  function metricChips() {
    return UI.chips(Object.keys(METRICS).map(k => ({ id: k, t: METRICS[k][0] })), k => k.id === metric, 'metric');
  }
  function bindMetric(root, ctx) {
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-metric]');
      if (c) { metric = c.dataset.metric; ctx.refresh(); }
    });
  }

  /* ============ 한 해 그림 ============ */
  S['me.pixels'] = {
    tab: T, title: '한 해 그림',
    sub: () => (year || new Date().getFullYear()) + '년',
    ask: ctx => (year || Number(ctx.date.slice(0, 4))) + '년의 하루하루',
    hint: () => METRICS[metric][0] + ' · 색이 진할수록 높은 값입니다. 가로는 일, 세로는 월.',
    render(ctx) {
      if (!year) year = Number(ctx.date.slice(0, 4));
      const max = METRICS[metric][1];
      let g = `<div class="px--h"></div>`;
      for (let i = 1; i <= 31; i++) g += `<div class="px--h">${i % 5 === 0 || i === 1 ? i : ''}</div>`;
      for (let m = 1; m <= 12; m++) {
        g += `<div class="px--r">${m}</div>`;
        const last = new Date(year, m, 0).getDate();
        for (let i = 1; i <= 31; i++) {
          if (i > last) { g += `<div></div>`; continue; }
          const ds = `${year}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const r = Store.peek(ds);
          const v = r ? r[metric] : null;
          const style = v != null ? UI.tint(metric === 'mood' ? (v - 1) / 4 : v / max) : '';
          g += `<div class="px" style="${style}" title="${ds}${v != null ? ' · ' + v : ''}"></div>`;
        }
      }
      return metricChips()
        + `<div class="pixels__wrap" style="margin-top:18px"><div class="pixels">${g}</div></div>
           <div class="row" style="margin-top:16px">
             <button class="btn btn--sm" id="yPrev">${year - 1}년</button>
             <button class="btn btn--sm" id="yNext">${year + 1}년</button>
           </div>`;
    },
    bind(root, ctx) {
      bindMetric(root, ctx);
      root.querySelector('#yPrev').onclick = () => { year--; ctx.refresh(); };
      root.querySelector('#yNext').onclick = () => { year++; ctx.refresh(); };
    },
    next: { t: '만족도 추이 보기', to: 'me.trend' }
  };

  /* ============ 추이 ============ */
  S['me.trend'] = {
    tab: T, title: '만족도 추이',
    ask: '최근 60일은 어땠나요?',
    hint: () => METRICS[metric][0] + ' 기준',
    render(ctx) {
      const max = METRICS[metric][1];
      const series = [];
      let day = Store.today();
      for (let i = 0; i < 60; i++) {
        const r = Store.peek(day);
        series.unshift(r ? r[metric] : null);
        day = UI.addDays(day, -1);
      }
      const w = 600, h = 150, pad = 10;
      const step = (w - pad * 2) / (series.length - 1);
      let path = '', open = false, dots = '', area = '', ax0 = null, ax1 = null;
      series.forEach((v, i) => {
        if (v == null) { open = false; return; }
        const x = pad + i * step, y = h - pad - (v / max) * (h - pad * 2);
        path += (open ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
        area += (open ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
        dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="#A7CFAE"/>`;
        if (ax0 == null) ax0 = x;
        ax1 = x;
        open = true;
      });
      // 선 아래를 옅게 채워 흐름이 눈에 먼저 들어오게 한다
      if (ax0 != null) area += ` L${ax1.toFixed(1)} ${h - pad} L${ax0.toFixed(1)} ${h - pad} Z`;
      const vals = series.filter(v => v != null);
      return metricChips()
        + `<div class="blk" style="margin-top:18px">
            <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block">
              <line x1="${pad}" y1="${pad}" x2="${w - pad}" y2="${pad}" stroke="#DCE7DB" stroke-dasharray="3 4"/>
              <line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="#DCE7DB" stroke-dasharray="3 4"/>
              <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#DCE7DB"/>
              <path d="${area}" fill="rgba(167,207,174,.28)" stroke="none"/>
              <path d="${path}" fill="none" stroke="#A7CFAE" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
              ${dots}
            </svg>
            <div class="sl__ends"><span>60일 전</span><span>오늘</span></div>
          </div>`
        + UI.nums([['평균', UI.r1(UI.avg(vals))], ['최고', vals.length ? Math.max.apply(null, vals) : '—'], ['기록', vals.length + '일']]);
    },
    bind: bindMetric,
    next: { t: '활동과 기분의 관계', to: 'me.corr' }
  };

  /* ============ 활동 상관 ============ */
  S['me.corr'] = {
    tab: T, title: '활동과 기분',
    ask: '무엇을 한 날 기분이 좋았나요?',
    hint: '해당 활동을 한 날의 평균 기분입니다. 2일 이상 기록된 활동만 나옵니다.',
    render() {
      const map = {};
      days().forEach(([, r]) => {
        if (r.mood == null) return;
        (r.acts || []).forEach(a => { (map[a] = map[a] || []).push(r.mood); });
      });
      const rows = Object.entries(map)
        .filter(([, v]) => v.length >= 2)
        .map(([a, v]) => ({ a, n: v.length, avg: UI.avg(v) }))
        .sort((x, y) => y.avg - x.avg);
      if (!rows.length) return UI.empty('활동과 기분을 함께 기록하면 나타납니다');
      return rows.slice(0, 14).map(r => UI.bar(r.a, r.avg, 5, UI.r1(r.avg) + ` (${r.n}일)`)).join('');
    },
    next: { t: '요일별 패턴 보기', to: 'me.weekday' }
  };

  /* ============ 요일 패턴 ============ */
  S['me.weekday'] = {
    tab: T, title: '요일 패턴',
    ask: '어느 요일이 힘든가요?',
    hint: () => METRICS[metric][0] + ' 요일별 평균',
    render(ctx) {
      const b = [[], [], [], [], [], [], []];
      days().forEach(([ds, r]) => {
        if (r[metric] == null) return;
        b[new Date(ds + 'T00:00:00').getDay()].push(r[metric]);
      });
      const rows = b.map((x, i) => ({ w: UI.WD[i], v: UI.avg(x) }));
      const max = Math.max.apply(null, rows.map(r => r.v || 0).concat([1]));
      return metricChips()
        + `<div style="margin-top:18px">`
        + rows.map(r => UI.bar(r.w + '요일', r.v || 0, max, r.v == null ? '—' : UI.r1(r.v))).join('')
        + `</div>`;
    },
    bind: bindMetric,
    next: { t: '자주 놓친 항목 보기', to: 'me.itemrate' }
  };

  /* ============ 항목 실천율 ============ */
  S['me.itemrate'] = {
    tab: T, title: '점검 항목 실천율',
    ask: '무엇을 자주 놓쳤나요?',
    hint: '전체 기록일 대비 체크 비율입니다. 낮은 항목이 다음 달의 과제입니다.',
    render() {
      const list = days();
      if (!list.length) return UI.empty('기록이 쌓이면 나타납니다');
      const rows = Store.reviewItems().map(it => {
        const hit = list.filter(([, r]) => r.review && r.review[it.id]).length;
        return { t: it.t, pct: Math.round((hit / list.length) * 100) };
      }).sort((a, b) => a.pct - b.pct);
      return UI.block('가장 자주 놓친 항목', rows.slice(0, 7).map(r => UI.bar(r.t, r.pct, 100, r.pct + '%')).join(''))
        + UI.block('가장 잘 지킨 항목', rows.slice(-7).reverse().map(r => UI.bar(r.t, r.pct, 100, r.pct + '%')).join(''));
    }
  };

  /* ============ 데이터 ============ */
  function demo() {
    const acts = DATA.ACTIVITIES;
    for (let i = 0; i < 120; i++) {
      const ds = UI.addDays(Store.today(), -i);
      const r = Store.day(ds);
      if (Store.hasContent(r)) continue;
      const w = Math.sin(i / 6) + Math.sin(i / 23) * 0.5;
      r.mood = Math.max(1, Math.min(5, Math.round(3.4 + w * 0.8)));
      r.study = Math.max(0, Math.min(10, Math.round(6 + w * 2)));
      r.work = Math.max(0, Math.min(10, Math.round(6 - w * 1.5)));
      r.health = Math.max(0, Math.min(10, Math.round(6 + Math.cos(i / 5) * 2)));
      r.sleep = (6 + (i % 5) * 0.4).toFixed(1);
      r.acts = [acts[i % acts.length], acts[(i * 3 + 5) % acts.length]];
      r.oneline = ['평범하지만 나쁘지 않은 하루', '바빴지만 남는 게 있었다', '조금 지쳤다', '오랜만에 여유로웠다'][i % 4];
      Store.reviewItems().forEach((it, k) => { if ((i + k) % 3 === 0) r.review[it.id] = true; });
      Store.principles().forEach((p, k) => { if ((i + k) % 4 === 0) r.principles[p.id] = true; });
      if (i % 3 === 0) r.reviewDone = true;
    }
    Store.save();
  }

  S['me.data'] = {
    tab: T, title: '데이터 관리',
    ask: '기록은 이 브라우저에만 있습니다.',
    hint: '서버로 보내지 않습니다. 기기를 바꾸기 전에 반드시 백업하세요.',
    render() {
      const kb = Math.round(Store.bytes() / 1024);
      return UI.nums([['기록한 날', days().length + '일'], ['사용 용량', kb + ' KB'], ['남은 용량', Math.max(0, 5000 - kb).toLocaleString() + ' KB']])
        + `<div class="blk" style="margin-top:22px">
            <div class="prog"><span style="width:${Math.min(100, (kb / 5000) * 100)}%"></span></div>
          </div>
          <div class="blk">
            <button class="btn btn--primary btn--block" id="bExport" style="margin-bottom:10px">JSON으로 백업</button>
            <button class="btn btn--block" id="bImport" style="margin-bottom:10px">백업에서 복원</button>
            <button class="btn btn--block" id="bDemo" style="margin-bottom:10px">예시 데이터 채우기</button>
            <button class="btn btn--ghost btn--block" id="bReset">전체 초기화</button>
          </div>`;
    },
    bind(root, ctx) {
      root.querySelector('#bExport').onclick = () => Store.exportJSON();
      root.querySelector('#bImport').onclick = () => UI.$('#filePick').click();
      root.querySelector('#bDemo').onclick = async () => {
        if (await UI.confirm('예시 데이터', '지난 120일의 비어 있는 날을 예시 기록으로 채웁니다. 이미 쓴 기록은 건드리지 않습니다.', '채우기')) {
          demo();
          ctx.refresh();
          UI.toast('예시 데이터를 채웠습니다');
        }
      };
      root.querySelector('#bReset').onclick = async () => {
        if (!await UI.confirm('전체 초기화', '모든 기록이 영구히 삭제됩니다. 되돌릴 수 없습니다.', '삭제')) return;
        if (!await UI.confirm('한 번 더 확인', '백업을 받지 않았다면 지금 취소하세요.', '그래도 삭제')) return;
        Store.reset();
        UI.toast('초기화했습니다');
        ctx.goTab('today');
      };
    }
  };

  /* ============ 설정 ============ */
  S['me.settings'] = {
    tab: T, title: '설정',
    ask: '기록 환경을 맞춥니다.',
    render() {
      const p = Store.state.profile;
      return `<div class="field"><label class="label">이름</label>
          <input class="input" data-p="name" value="${UI.esc(p.name)}"></div>
        <div class="field"><label class="label">기록 시작일</label>
          <input class="input" type="date" data-p="startedAt" value="${UI.esc(p.startedAt)}"></div>
        <div class="field"><label class="label">글자 크기</label>
          <select class="select" data-p="fontSize">
            ${[14, 15, 16, 17, 18].map(s => `<option value="${s}"${+p.fontSize === s ? ' selected' : ''}>${s}px</option>`).join('')}
          </select></div>`;
    },
    bind(root) {
      const p = Store.state.profile;
      root.querySelectorAll('[data-p]').forEach(el => {
        el.addEventListener('change', () => {
          p[el.dataset.p] = el.value;
          Store.save();
          if (el.dataset.p === 'fontSize') document.body.style.fontSize = el.value + 'px';
          UI.toast('설정을 저장했습니다');
        });
      });
    },
    next: { t: '시작 화면과 알림 설정', to: 'me.start' }
  };

  S['me.start'] = {
    tab: T, title: '시작 화면과 알림',
    ask: '앱을 열면 어디부터 볼까요?',
    render() {
      const p = Store.state.profile;
      const tabs = [['today', '오늘'], ['review', '되돌아보기'], ['memory', '기억'], ['growth', '성장'], ['me', '나']];
      return UI.opts(tabs.map(([v, t]) => ({ v, t })), p.home || 'today')
        + UI.block('기록 알림 시간',
          `<input class="input" type="time" data-p="reminder" value="${UI.esc(p.reminder)}">
           <div class="small muted" style="margin-top:8px">앱을 열어 둔 동안에만 알립니다.</div>`);
    },
    bind(root, ctx) {
      const p = Store.state.profile;
      root.addEventListener('click', e => {
        const o = e.target.closest('[data-opt]');
        if (!o) return;
        p.home = o.dataset.opt;
        Store.save();
        ctx.refresh();
        UI.toast('시작 화면을 바꿨습니다');
      });
      root.querySelector('[data-p]').addEventListener('change', e => {
        p.reminder = e.target.value;
        Store.save();
        UI.toast('알림 시간을 저장했습니다');
      });
    },
    next: { t: 'PIN 잠금 설정', to: 'me.lock' }
  };

  S['me.lock'] = {
    tab: T, title: 'PIN 잠금',
    ask: '기록을 잠글까요?',
    hint: '숫자 4–8자리. 비우면 잠금이 풀립니다. 잊으면 백업 파일로만 복구할 수 있습니다.',
    render() {
      return `<div class="field">
          <input class="input" type="password" inputmode="numeric" maxlength="8" id="pin"
                 value="${UI.esc(Store.state.profile.pin)}" placeholder="PIN"></div>
        <button class="btn btn--primary btn--block" id="savePin">적용</button>`;
    },
    bind(root, ctx) {
      root.querySelector('#savePin').onclick = () => {
        const v = root.querySelector('#pin').value.trim();
        if (v && !/^\d{4,8}$/.test(v)) return UI.toast('숫자 4–8자리로 입력하세요');
        Store.state.profile.pin = v;
        Store.save();
        UI.toast(v ? 'PIN 잠금을 설정했습니다' : 'PIN 잠금을 해제했습니다');
      };
    },
    next: { t: '이 서비스에 대하여', to: 'me.about' }
  };

  S['me.about'] = {
    tab: T, title: '이 서비스에 대하여',
    ask: 'Lifetime Recorder',
    render() {
      return `<p class="muted" style="line-height:1.95">
        하루의 기분과 만족도, 되돌아보기, 자서전, 가족의 기억을 한곳에 모으는 개인 기록 도구입니다.
        한 화면에는 하나만 묻고, 다음 할 일은 제안만 합니다.<br><br>
        네트워크 요청 없이 동작하며 데이터는 이 브라우저 저장소에만 남습니다.
        기기를 바꾸거나 브라우저 데이터를 지우기 전에는 데이터 관리에서 JSON 백업을 받아 두세요.</p>
        <div class="blk" style="margin-top:22px">${UI.pick({ t: '데이터 백업하러 가기', to: 'me.data' })}</div>`;
    }
  };
})(window.SCREENS);
