/* UI 유틸 — DOM 헬퍼, 모달, 폼, 토스트, 화면 조각 빌더
   조각은 모두 "한 화면 최대 3요소" 원칙에 맞춰 크고 단순하게 만든다. */
window.UI = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const WD = ['일', '월', '화', '수', '목', '금', '토'];

  function fmtDate(ds) {
    const d = new Date(ds + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
  }
  function fmtShort(ds) {
    const d = new Date(ds + 'T00:00:00');
    return `${d.getMonth() + 1}.${d.getDate()} (${WD[d.getDay()]})`;
  }
  function addDays(ds, n) {
    const d = new Date(ds + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return Store.today(d);
  }
  function diffDays(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const r1 = n => n == null ? '—' : (Math.round(n * 10) / 10).toFixed(1);

  /** 같은 노드에 innerHTML 만 갈아끼우면 addEventListener 가 계속 쌓인다.
      노드 자체를 새것으로 교체해 이전 리스너를 버린다. */
  function resetNode(id, cls) {
    const old = document.getElementById(id);
    const el = document.createElement(old.tagName);
    el.id = id;
    el.className = cls != null ? cls : old.className;
    old.replaceWith(el);
    return el;
  }

  /* ---------- 토스트 ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2300);
  }

  /* ---------- 모달 ---------- */
  let onClose = null;
  function modal(opt) {
    $('#modalTitle').textContent = opt.title || '';
    // 시트를 다시 열 때 이전 after() 리스너가 남지 않도록 본문 노드를 교체한다
    resetNode('modalBody', 'modal__body').innerHTML = opt.body || '';
    const foot = $('#modalFoot');
    foot.innerHTML = '';
    (opt.actions || []).forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn' + (a.primary ? ' btn--primary' : '');
      b.textContent = a.t;
      b.onclick = () => a.fn && a.fn();
      foot.appendChild(b);
    });
    $('#modal').hidden = false;
    onClose = opt.onClose || null;
    if (opt.after) opt.after($('#modalBody'));
    const first = $('#modalBody input, #modalBody textarea, #modalBody select');
    if (first) setTimeout(() => first.focus(), 40);
  }
  function closeModal() {
    $('#modal').hidden = true;
    if (onClose) { const f = onClose; onClose = null; f(); }
  }

  function confirm(title, msg, okText) {
    return new Promise(res => {
      modal({
        title,
        body: `<p class="muted">${esc(msg)}</p>`,
        actions: [
          { t: '취소', fn: () => { closeModal(); res(false); } },
          { t: okText || '확인', primary: true, fn: () => { closeModal(); res(true); } }
        ],
        onClose: () => res(false)
      });
    });
  }

  /* fields: [{k,label,type:'text|textarea|number|date|time|select',ph,options,rows}] */
  function form(title, fields, values, okText) {
    values = values || {};
    const body = fields.map(f => {
      const v = values[f.k] == null ? '' : values[f.k];
      let ctrl;
      if (f.type === 'textarea') {
        ctrl = `<textarea class="ta" data-k="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
      } else if (f.type === 'select') {
        ctrl = `<select class="select" data-k="${f.k}">` +
          (f.options || []).map(o => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('') +
          `</select>`;
      } else {
        ctrl = `<input class="input" data-k="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.ph || '')}">`;
      }
      return `<div class="field"><label class="label">${esc(f.label)}</label>${ctrl}</div>`;
    }).join('');

    return new Promise(res => {
      modal({
        title, body,
        actions: [
          { t: '취소', fn: () => { closeModal(); res(null); } },
          {
            t: okText || '저장', primary: true, fn: () => {
              const out = {};
              $$('#modalBody [data-k]').forEach(el => out[el.dataset.k] = el.value.trim());
              closeModal();
              res(out);
            }
          }
        ],
        onClose: () => res(null)
      });
    });
  }

  /* ---------- 사진 선택 + 축소 ---------- */
  function pickImage(maxPx) {
    return new Promise(res => {
      const inp = $('#imgPick');
      inp.value = '';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return res(null);
        const fr = new FileReader();
        fr.onload = () => {
          const img = new Image();
          img.onload = () => {
            const m = maxPx || 1000;
            const s = Math.min(1, m / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * s);
            c.height = Math.round(img.height * s);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            res(c.toDataURL('image/jpeg', 0.72));
          };
          img.onerror = () => res(null);
          img.src = fr.result;
        };
        fr.readAsDataURL(f);
      };
      inp.click();
    });
  }

  /* ---------- 음성 녹음 (버튼 하나로 시작/정지) ---------- */
  function audio(btn, onUrl) {
    if (btn._rec && btn._rec.state === 'recording') return btn._rec.stop();
    if (!navigator.mediaDevices) return toast('이 브라우저에서는 녹음을 지원하지 않습니다');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const rec = new MediaRecorder(stream);
      const chunks = [];
      btn._rec = rec;
      btn._label = btn.textContent;
      btn.textContent = '녹음 중지';
      btn.classList.add('btn--primary');
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        btn.textContent = btn._label;
        btn.classList.remove('btn--primary');
        btn._rec = null;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 900 * 1024) return toast('녹음이 너무 깁니다. 1분 이내로 남겨주세요.');
        const fr = new FileReader();
        fr.onload = () => onUrl(fr.result);
        fr.readAsDataURL(blob);
      };
      rec.start();
    }).catch(() => toast('마이크 권한이 필요합니다'));
  }

  /* ---------- 날짜 이동 (헤더 버튼) ----------
     본문 요소를 늘리지 않기 위해 날짜 변경은 헤더 아이콘 하나로 처리한다. */
  function dateAction(ctx) {
    return {
      ico: 'cal',
      fn: () => modal({
        title: '날짜 고르기',
        body: `<div class="field"><label class="label">날짜</label>
            <input class="input" type="date" id="dPick" value="${ctx.date}"></div>
          <div class="row">
            <button class="btn btn--sm" id="dPrev">어제</button>
            <button class="btn btn--sm" id="dToday">오늘</button>
            <button class="btn btn--sm" id="dNext">내일</button>
          </div>`,
        actions: [{ t: '닫기', primary: true, fn: closeModal }],
        after: body => {
          const set = v => { ctx.setDate(v); closeModal(); ctx.refresh(); };
          body.querySelector('#dPick').onchange = e => set(e.target.value);
          body.querySelector('#dPrev').onclick = () => set(addDays(ctx.date, -1));
          body.querySelector('#dToday').onclick = () => set(Store.today());
          body.querySelector('#dNext').onclick = () => set(addDays(ctx.date, 1));
        }
      })
    };
  }

  /* ---------- 화면 조각 ---------- */
  const CHEVRON = `<svg viewBox="0 0 24 24" class="prow__go" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;
  const CHECK = `<svg viewBox="0 0 24 24" class="opt__ck" aria-hidden="true"><path d="M5 12.6l4.6 4.6L19 7.6"/></svg>`;

  /** 갈래 선택 행. 박스가 아니라 목록의 한 줄이다. 한 화면에 3개까지만 쓴다. */
  function pick(o) {
    return `<button class="prow" data-go="${esc(o.to)}"${o.params ? ` data-params='${esc(JSON.stringify(o.params))}'` : ''}>
      <span class="prow__mid">
        <span class="prow__t">${esc(o.t)}</span>
        ${o.d ? `<span class="prow__d">${esc(o.d)}</span>` : ''}
      </span>${CHEVRON}</button>`;
  }

  function nums(pairs) {
    return `<div class="nums">` + pairs.map(([k, v]) =>
      `<div class="num"><div class="num__k">${esc(k)}</div><div class="num__v">${esc(v)}</div></div>`).join('') + `</div>`;
  }

  function bar(k, v, max, label) {
    const p = max ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
    return `<div class="bar"><div class="bar__k">${esc(k)}</div>
      <div class="bar__t"><span class="bar__f" style="width:${p}%"></span></div>
      <div class="bar__v">${esc(label != null ? label : v)}</div></div>`;
  }

  /** 0~max 큰 슬라이더. 값이 화면 중앙에 크게 표시된다. */
  function slider(k, val, max, caption, ends) {
    const has = val != null && val !== '';
    const v = has ? val : Math.round((max || 10) / 2);
    return `<div class="sl" data-sl="${k}">
      <div class="sl__v" data-slv>${has ? val : '—'}</div>
      <div class="sl__c">${esc(caption || '')}</div>
      <input type="range" min="0" max="${max || 10}" step="1" value="${v}">
      <div class="sl__ends"><span>${esc((ends && ends[0]) || '전혀 아니다')}</span><span>${esc((ends && ends[1]) || '매우 그렇다')}</span></div>
    </div>`;
  }

  /** 기분 5단계 표정 — 입 모양만 바뀌는 단순한 선 그림 */
  const MOUTH = {
    1: 'M8.4 16.3Q12 13.2 15.6 16.3',
    2: 'M8.6 15.7Q12 14.3 15.4 15.7',
    3: 'M8.8 15.2H15.2',
    4: 'M8.6 14.4Q12 16.1 15.4 14.4',
    5: 'M8.4 13.9Q12 17.3 15.6 13.9'
  };
  function face(v) {
    return `<svg viewBox="0 0 24 24" class="face" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2"/>
      <circle cx="9.1" cy="10" r=".95" class="face__eye"/>
      <circle cx="14.9" cy="10" r=".95" class="face__eye"/>
      <path d="${MOUTH[v] || MOUTH[3]}"/></svg>`;
  }

  /** 세로 선택지 목록. 선택은 배경색이 아니라 오른쪽 체크로 표시한다. */
  function opts(list, selected) {
    return `<div class="opts">` + list.map(o => {
      const on = String(o.v) === String(selected);
      return `<button class="opt ${on ? 'is-on' : ''}" data-opt="${esc(o.v)}">
        ${o.ico || ''}<span class="opt__t">${esc(o.t)}</span>${CHECK}</button>`;
    }).join('') + `</div>`;
  }

  function chips(list, isOn, attr) {
    return `<div class="chips">` + list.map(x =>
      `<button class="chip ${isOn(x) ? 'is-on' : ''}" data-${attr || 'chip'}="${esc(typeof x === 'string' ? x : x.id)}">${esc(typeof x === 'string' ? x : x.t)}</button>`
    ).join('') + `</div>`;
  }

  function block(label, body) {
    return `<div class="blk">${label ? `<div class="blk__l">${esc(label)}</div>` : ''}${body}</div>`;
  }

  function empty(t) { return `<div class="empty">${esc(t)}</div>`; }

  /** 라이트그린 한 색조의 농도로 값의 크기를 표현 */
  function tint(ratio) {
    const a = 0.16 + Math.max(0, Math.min(1, ratio)) * 0.84;
    return `background:rgba(167,207,174,${a.toFixed(2)})`;
  }

  return {
    $, $$, esc, WD, fmtDate, fmtShort, addDays, diffDays, avg, r1,
    toast, modal, closeModal, confirm, form, pickImage, audio, dateAction, resetNode,
    pick, nums, bar, slider, opts, chips, block, empty, tint, face
  };
})();
