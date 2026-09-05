/* 저장소 — 모든 기록은 브라우저 localStorage에만 남는다 (서버 전송 없음) */
window.Store = (function () {
  const KEY = 'liferecorder.v1';

  const BLANK_DAY = () => ({
    mood: null, study: null, work: null, health: null,
    sleep: '', studyMin: '', workMin: '',
    acts: [], oneline: '', diary: '', photos: [], voice: '',
    weather: '', place: '', grateful: ['', '', ''],
    review: {}, good: '', bad: '', tomorrow: '', reviewDone: false,
    habits: {}, principles: {}, cycle: {}, cycleSubject: '', workNature: ''
  });

  const BLANK = () => ({
    version: 1,
    profile: { name: '기록자', startedAt: today(), pin: '', home: 'today', fontSize: 14, reminder: '' },
    days: {},
    customReview: [],
    story: {},
    events: [],
    family: [],
    milestones: [],
    albums: [],
    letters: [],
    habits: [],
    logs: [],
    bucket: [],
    quotes: [],
    notes: [],
    skills: [],
    network: [],
    sparks: [],
    customPrinciples: [],
    weekly: {}
  });

  function today(d) {
    const t = d ? new Date(d) : new Date();
    return [t.getFullYear(), String(t.getMonth() + 1).padStart(2, '0'), String(t.getDate()).padStart(2, '0')].join('-');
  }

  let state;
  try {
    state = Object.assign(BLANK(), JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch (e) {
    state = BLANK();
  }
  // 뒤늦게 추가된 컬렉션 보정
  Object.entries(BLANK()).forEach(([k, v]) => { if (state[k] === undefined) state[k] = v; });

  const listeners = [];
  let timer = null;

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      UI && UI.toast('저장 공간이 가득 찼습니다. 사진을 정리하거나 백업 후 초기화하세요.');
      return false;
    }
  }

  function commit(silent) {
    clearTimeout(timer);
    timer = setTimeout(persist, 250);
    if (!silent) listeners.forEach(fn => fn());
  }

  return {
    state,
    today,
    uid: () => Math.random().toString(36).slice(2, 10),

    onChange(fn) { listeners.push(fn); },
    save() { clearTimeout(timer); return persist(); },
    commit,

    /** 날짜 레코드를 가져온다 (없으면 생성) */
    day(date) {
      if (!state.days[date]) state.days[date] = BLANK_DAY();
      const d = state.days[date];
      Object.entries(BLANK_DAY()).forEach(([k, v]) => { if (d[k] === undefined) d[k] = v; });
      return d;
    },
    /** 존재하는 날짜 레코드만 (없으면 null) */
    peek(date) { return state.days[date] || null; },
    dates() { return Object.keys(state.days).sort(); },

    /** 의미 있는 내용이 하나라도 있는 날인지 */
    hasContent(d) {
      if (!d) return false;
      return d.mood != null || d.study != null || d.work != null || !!d.oneline || !!d.diary ||
        (d.acts && d.acts.length) || Object.values(d.review || {}).some(Boolean) ||
        !!d.good || !!d.bad || !!d.tomorrow || (d.photos && d.photos.length);
    },

    add(coll, obj) {
      obj.id = obj.id || this.uid();
      obj.createdAt = obj.createdAt || new Date().toISOString();
      state[coll].unshift(obj);
      commit();
      return obj;
    },
    remove(coll, id) {
      const i = state[coll].findIndex(x => x.id === id);
      if (i > -1) { state[coll].splice(i, 1); commit(); }
    },
    find(coll, id) { return state[coll].find(x => x.id === id); },

    /** 전체 회고 항목 = 기본 50개 + 사용자 추가 */
    reviewItems() { return DATA.REVIEW.concat(state.customReview); },

    /** 전체 원칙 = 가르침 12개 + 내가 세운 원칙 */
    principles() { return DATA.PRINCIPLES.concat(state.customPrinciples); },

    /** ISO 주차 키 (주간 질문 배정용) */
    weekKey(d) {
      const t = d ? new Date(d) : new Date();
      const x = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
      x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
      const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
      const w = Math.ceil(((x - y0) / 86400000 + 1) / 7);
      return x.getUTCFullYear() + '-W' + String(w).padStart(2, '0');
    },

    bytes() { return new Blob([JSON.stringify(state)]).size; },

    exportJSON() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lifetime-recorder-' + today() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },

    importJSON(text) {
      const next = JSON.parse(text);
      if (!next || typeof next !== 'object' || !next.days) throw new Error('형식이 올바르지 않습니다');
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, BLANK(), next);
      persist();
      listeners.forEach(fn => fn());
    },

    reset() {
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, BLANK());
      persist();
      listeners.forEach(fn => fn());
    }
  };
})();
