// /memory/main.js
// 모든 게임 로직 통합 파일 (바이브 코딩 최적화)

(function(){
  // ============================================================
  // [Config] - 게임 설정값 (원래 config.js에서 통합)
  // ============================================================
  const C = {
    VERSION: "v1.46",
    TIMEZONE: "Asia/Seoul",

    EMOJIS: [
      '🍐','🍏', // 초록색 과일 시리즈
      '🍎','🍓', // 빨간색 과일 시리즈
      '🍊','🍑', // 주황/분홍 과일 시리즈
      '🐶','🐹', // 귀여운 동물 시리즈
      '🐱','🐰', // 귀여운 동물 시리즈 2
      '🐼','🐻', // 곰돌이 시리즈
      '🦊','🐺', // 여우와 늑대 (비슷한 동물)
      '🏐','⚽', // 공 시리즈
      '👁️','👄'  // 신체 부위 (헷갈림 유발)
    ],

    LEVEL_MAP: {
      "3x2": [2,3],   // 3쌍
      "4x3": [3,4],   // 6쌍
      "4x4": [4,4],   // 8쌍 (9쌍 이모지 중 8쌍 사용)
    },

    // 틀렸을 때 다시 뒤집히는 시간(ms)
    MISMATCH_MS: 700,

    // 콤보 점수 규칙: 더 후하게! 10, 15, 22, 31, 42, 55, 70, 87, 106, 127(최대)
    // 콤보가 쌓일수록 보너스가 빠르게 증가 (2차 곡선)
    comboPoints(streakNow){
      if(streakNow <= 1) return 10;
      // 기본 10점 + 증가폭이 점점 커지는 보너스
      // 2콤보: +5, 3콤보: +7, 4콤보: +9, 5콤보: +11, 6콤보: +13...
      // 공식: 10 + (streak-1) * (streak+3) / 2
      const bonus = Math.floor((streakNow - 1) * (streakNow + 3) / 2);
      const maxBonus = 117; // 최대 보너스 117점 (총 127점)
      return 10 + Math.min(bonus, maxBonus);
    },

    // 로컬 저장 키
    KEYS: {
      SFX: "harumind_sfx_on",
      BIG: "harumind_bigtext_on",
      THEME: "harumind_theme",
      DAILY_PREFIX: "harumind_memory_daily_", // + YYYY-MM-DD
    }
  };

  // ============================================================
  // [State] - 게임 상태 변수
  // ============================================================
  let first = null;
  let lock = false;
  let matched = 0;
  let score = 0;
  let totalPairs = 0;
  let peekTimer = null;
  let streak = 0;
  let maxStreak = 0; // 최고 콤보
  let tempMsgTimer = null;
  let currentStateMsg = { msg: "", hint: "" };
  let finishTimer = null;
  let gameStartTime = null; // 게임 시작 시간
  let lastWidth = window.innerWidth; // 이전 너비 저장 변수

  // BGM 관련 전역 변수
  let bgmOn = false;
  let currentBgmSrc = null; // 직전 재생된 곡 저장
  const bgmTracks = [
    'assets/audio/piano1.mp3',
    'assets/audio/piano2.mp3',
    'assets/audio/piano3.mp3',
    'assets/audio/acoustic1.mp3',
    'assets/audio/acoustic2.mp3',
    'assets/audio/acoustic3.mp3'
  ];
  function selectRandomTrack(){
    let selected;
    do {
      selected = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
    } while (selected === currentBgmSrc && bgmTracks.length > 1);
    currentBgmSrc = selected;
    return selected;
  }

  // BGM 재생 함수
  async function playBgm(){
    if(!bgm) return;
    try{
      bgm.load();
      const p = bgm.play();
      if(p && typeof p.then === "function"){
        await p;
      }
    }catch(e){
      console.log("BGM play error:", e);
    }
  }

  // ============================================================
  // [Storage] - localStorage 저장/불러오기
  // ============================================================
  function safeGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function safeSet(key, value){
    try{ localStorage.setItem(key, value); return true; }catch(e){ return false; }
  }

  function toNum(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function todayKey(){
    try{
      return new Intl.DateTimeFormat("en-CA", { timeZone: C.TIMEZONE }).format(new Date());
    }catch(e){
      return new Intl.DateTimeFormat("en-CA").format(new Date());
    }
  }

  function getBool(key, defaultValue){
    const v = safeGet(key);
    if(v === null) return defaultValue;
    return v === "1";
  }

  function setBool(key, value){
    safeSet(key, value ? "1" : "0");
  }

  function getDailyKey(dateStr){
    return C.KEYS.DAILY_PREFIX + dateStr;
  }

  function loadDaily(dateStr){
    try{
      const raw = safeGet(getDailyKey(dateStr));
      if(!raw) return { clears:0, best:0, bestTime:0 };
      const obj = JSON.parse(raw);
      return {
        clears: toNum(obj?.clears),
        best:   toNum(obj?.best),
        bestTime: toNum(obj?.bestTime), // 초 단위
      };
    }catch(e){
      return { clears:0, best:0, bestTime:0 };
    }
  }

  function saveDaily(dateStr, data){
    safeSet(getDailyKey(dateStr), JSON.stringify({
      clears: toNum(data?.clears),
      best:   toNum(data?.best),
      bestTime: toNum(data?.bestTime), // 초 단위
    }));
  }

  window.HarumindStorage = {
    todayKey,
    getBool,
    setBool,
    loadDaily,
    saveDaily,
  };

  // ============================================================
  // [UI/Effects] - UI 공통, 설정, 효과음, 토스트, 폭죽, BGM 등
  // ============================================================

  // DOM 요소
  const board = document.getElementById("board");
  const matchedEl = document.getElementById("matched");
  const scoreEl = document.getElementById("score");
  const totalPairsEl = document.getElementById("totalPairs");
  const scoreHintEl = document.getElementById("scoreHint");
  const msgEl = document.getElementById("msg");
  const hintEl = document.getElementById("hint");

  const todayKeyEl   = document.getElementById("todayKey");
  const todayClearEl = document.getElementById("todayClear");
  const todayBestEl  = document.getElementById("todayBest");

  const sfxBtn  = document.getElementById("sfxBtn");
  const bigBtn  = document.getElementById("bigBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");

  const statsWrap   = document.getElementById("statsWrap");
  const statsToggle = document.getElementById("statsToggle");
  const peekBtn = document.getElementById("peekBtn");
  const peekSel = document.getElementById("peekSec");
  const howBtn   = document.getElementById("howBtn");
  const modalBack = document.getElementById("modalBack");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCard = document.getElementById("modalCard");
  const bgm = document.getElementById("bgm");
  const bgmBtn = document.getElementById("bgmBtn");
  const themeSelect = document.getElementById("themeSelect");

  // 설정 상태
  let sfxOn = HarumindStorage.getBool(C.KEYS.SFX, true);
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);
  let currentTheme = safeGet(C.KEYS.THEME) || "warm"; // warm, dark, forest

  // 테마 정의
  const themes = {
    warm: {
      name: "기본(따뜻한)",
      bg: "#0b1020",
      bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1b2457 0%, #0b1020 55%, #050813 100%)",
      text: "#e8ecff",
      muted: "#b9c2ff",
      accent: "#6ee7b7",
      cardBg: "rgba(255,255,255,.06)",
      cardBorder: "rgba(255,255,255,.08)"
    },
    dark: {
      name: "다크(밤하늘)",
      bg: "#000000",
      bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1a0a2e 0%, #000000 55%, #000000 100%)",
      text: "#f0f0f0",
      muted: "#a0a0a0",
      accent: "#9b59b6",
      cardBg: "rgba(255,255,255,.04)",
      cardBorder: "rgba(255,255,255,.06)"
    },
    forest: {
      name: "숲속(그린)",
      bg: "#0a1a0a",
      bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1a3a1a 0%, #0a1a0a 55%, #051005 100%)",
      text: "#e8ffe8",
      muted: "#b8ffb8",
      accent: "#52d452",
      cardBg: "rgba(255,255,255,.05)",
      cardBorder: "rgba(255,255,255,.08)"
    }
  };

  // 테마 적용 함수
  function applyTheme(themeKey){
    const theme = themes[themeKey] || themes.warm;
    const root = document.documentElement;
    
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--muted", theme.muted);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--card-bg", theme.cardBg);
    root.style.setProperty("--card-border", theme.cardBorder);
    
    // body 배경 그라데이션 직접 적용
    document.body.style.background = theme.bgGradient;
    
    currentTheme = themeKey;
    safeSet(C.KEYS.THEME, themeKey);
  }

  // LIVE PILL 대상
  const matchedPill = matchedEl?.closest(".pill");
  const scorePill   = scoreEl?.closest(".pill");

  // 스타일(토스트/폭죽) 주입
  function ensureStyle(){
    if(document.getElementById("hm-ui-style")) return;
    const s = document.createElement("style");
    s.id = "hm-ui-style";
    s.textContent = `
      .hmToastBack{
        position:fixed; inset:0;
        background:transparent;
        z-index:9997;
        pointer-events:auto;
      }
      .hmToast{
        position:fixed;
        left:50%;
        top:58%;
        transform:translate(-50%, -50%);
        width:min(520px, calc(100% - 32px));
        background:#1a2250;
        border:1px solid rgba(110,231,183,.55);
        border-radius:22px;
        box-shadow:0 18px 48px rgba(0,0,0,.55);
        padding:16px 18px 14px;
        text-align:center;
        z-index:9998;
        pointer-events:auto;
        cursor:pointer;
        animation: hmToastIn .22s ease-out forwards;
      }
      @keyframes hmToastIn{
        from{ opacity:0; transform:translate(-50%, -44%) scale(.98); }
        to  { opacity:1; transform:translate(-50%, -50%) scale(1); }
      }
      .hmTitle{
        font-size:22px;
        font-weight:900;
        color:#e8ecff;
      }
      .hmHintLine{
        margin-top:10px;
        font-size:14px;
        color:rgba(185,194,255,.95);
        font-weight:800;
      }
      .hmMini{
        margin-top:8px;
        font-size:13px;
        color:rgba(185,194,255,.95);
        line-height:1.6;
        white-space:pre-line;
      }

      .hmConfetti{
        position:fixed;
        left:50%;
        top:58%;
        transform:translate(-50%, -50%);
        width:min(520px, calc(100% - 32px));
        height:180px;
        z-index:9999;
        pointer-events:none;
        overflow:visible;
      }
      .hmConfetti i{
        position:absolute;
        top:20px;
        left:50%;
        width:8px;
        height:14px;
        border-radius:3px;
        opacity:.95;
        transform:translateX(-50%) rotate(0deg);
        animation: hmPop 900ms ease-out forwards;
        will-change: transform, opacity;
      }
      @keyframes hmPop{
        0%   { opacity:0; transform: translate(-50%, 10px) rotate(0deg) scale(.8); }
        10%  { opacity:1; }
        100% { opacity:0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); }
      }

      .hmEmojiFirework{
        position:fixed;
        z-index:10000;
        pointer-events:none;
        font-size:24px;
        opacity:0;
        transform:translate(-50%, -50%) rotate(0deg) scale(1);
        will-change: transform, opacity;
      }
      .hmEmojiFirework.launch{
        animation: emojiFireworkPop 2s ease-out forwards;
      }
      @keyframes emojiFireworkPop{
        0%   { opacity:0; transform: translate(-50%, -50%) rotate(0deg) scale(0.3); }
        10%  { opacity:1; transform: translate(-50%, -50%) rotate(0deg) scale(var(--scale)); }
        100% { opacity:0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)) scale(0.1); }
      }

      .comboFeedback{
        position:fixed;
        z-index:10000;
        pointer-events:none;
        font-weight:900;
        white-space:nowrap;
        opacity:0;
        transform:translate(-50%, -50%) scale(0.5);
        transition:opacity 0.3s ease, transform 0.3s ease;
        text-align:center;
        letter-spacing:1px;
      }
      .comboFeedback.show{
        opacity:1;
        animation: comboFloat 1.5s ease-out forwards;
      }
      @keyframes comboFloat{
        0%   { opacity:0; transform:translate(-50%, -40%) scale(0.5); }
        15%  { opacity:1; transform:translate(-50%, -50%) scale(1.1); }
        85%  { opacity:1; transform:translate(-50%, -70%) scale(1); }
        100% { opacity:0; transform:translate(-50%, -80%) scale(0.8); }
      }
    `;
    document.head.appendChild(s);
  }

  // 설정 함수
  function setBigMode(on){
    bigOn = !!on;
    HarumindStorage.setBool(C.KEYS.BIG, bigOn);
    document.body.classList.toggle("bigText", bigOn);

    if(bigBtn){
      bigBtn.textContent = bigOn ? "🔠 큰 글씨" : "🔡 작은 글씨";
      bigBtn.classList.toggle("bigOn", bigOn);
      bigBtn.classList.toggle("bigOff", !bigOn);
    }
  }

  function setSfx(on){
    sfxOn = !!on;
    HarumindStorage.setBool(C.KEYS.SFX, sfxOn);
    if(sfxBtn) sfxBtn.textContent = sfxOn ? "✨ 맑은 소리" : "🔇 소리 없이";
  }

  // 비프음
  function playBeep(freq=880, ms=70, gain=0.03){
    if(!sfxOn) return;
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      g.gain.value = 0;
      osc.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.01);
      g.gain.linearRampToValueAtTime(0, now + ms/1000);

      osc.start(now);
      osc.stop(now + ms/1000 + 0.02);
      osc.onended = () => ctx.close();
    }catch(e){}
  }

  // 성공음: 맑은 실로폰 느낌 + 0.5초 잔향
  function playSuccessSound(streak = 1){
    if(!sfxOn) return;
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // base frequency: 맑은 실로폰 느낌 (약간의 스트릭 보정)
      const baseFreq = 880 + Math.min(streak, 6) * 35;

      // 두 개의 오실레이터로 풍부한 벨(Bell) 톤 생성
      const osc1 = ctx.createOscillator();
      osc1.type = "triangle";
      osc1.frequency.value = baseFreq;

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = baseFreq * 2.005; // 약간 비튼 하모닉

      // 톤을 부드럽게 만드는 밴드패스 필터
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = baseFreq * 1.2;
      filter.Q.value = 6;

      // 잔향/데케이용 게인
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      // 굵은 어택 -> 0.5초에 걸쳐 지수적으로 사라짐 (잔향)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);   // 빠른 어택
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);   // 0.5초 데케이

      // 연결
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);

      // 안전하게 컨텍스트 종료
      setTimeout(()=> {
        try{ ctx.close(); }catch(e){}
      }, 800);
    }catch(e){}
  }

  // 실패음: 200Hz 짧은 '툭' (귀 피로 저감)
  function playFailSound(){
    if(!sfxOn) return;
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 200; // 낮고 짧은 '툭' 소리

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.005);   // 짧은 펀치
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12); // 빠른 감쇠

      // 약간의 하이컷(귀 피로 저감)
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);

      setTimeout(()=> {
        try{ ctx.close(); }catch(e){}
      }, 220);
    }catch(e){}
  }

  // 축하 효과음: 경쾌한 fanfare 사운드
  function playFanfare(){
    if(!sfxOn) return;
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // 주요 멜로디: 3개의 톤으로 경쾌한 fanfare 구성
      const notes = [
        { freq: 880, time: 0, dur: 0.15 },   // A5
        { freq: 1046.5, time: 0.2, dur: 0.15 }, // C6
        { freq: 1318.5, time: 0.4, dur: 0.25 }, // E6
        { freq: 1046.5, time: 0.7, dur: 0.15 }, // C6
        { freq: 1318.5, time: 0.9, dur: 0.3 }   // E6 (긴 마무리)
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc1 = ctx.createOscillator();
        osc1.type = "triangle";
        osc1.frequency.value = freq;

        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 2; // 옥타브 위 하모닉

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.08, now + time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + time);
        osc1.stop(now + time + dur + 0.05);
        osc2.start(now + time);
        osc2.stop(now + time + dur + 0.05);
      });

      // 베이스 톤 추가 (더 풍성하게)
      const bassOsc = ctx.createOscillator();
      bassOsc.type = "sawtooth";
      bassOsc.frequency.value = 220; // A3

      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.04, now + 0.1);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = "lowpass";
      bassFilter.frequency.value = 400;

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(ctx.destination);

      bassOsc.start(now);
      bassOsc.stop(now + 0.85);

      setTimeout(() => {
        try{ ctx.close(); }catch(e){}
      }, 1300);
    }catch(e){}
  }

  // +점수 리워드
  function showReward(tile, text){
    const r = document.createElement("div");
    r.className = "reward";
    r.textContent = text;

    const rect = tile.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top  + rect.height / 2;

    const pad = 12;
    x = Math.max(pad, Math.min(window.innerWidth  - pad, x));
    y = Math.max(pad, Math.min(window.innerHeight - pad, y));

    r.style.left = x + "px";
    r.style.top  = y + "px";

    document.body.appendChild(r);
    setTimeout(()=>r.remove(), 900);
  }

  // 콤보 피드백 애니메이션
  function showComboFeedback(streak){
    if(streak <= 1) return; // 2콤보 이상일 때만 표시
    
    ensureStyle();
    
    const comboText = document.createElement("div");
    comboText.className = "comboFeedback";
    
    // 콤보 수에 따라 텍스트와 스타일 변화
    const emojis = streak >= 5 ? "🔥🔥🔥" : streak >= 3 ? "🔥🔥" : "🔥";
    comboText.textContent = `${streak} Combo! ${emojis}`;
    
    // 콤보 수에 따라 크기와 색상 변화
    const baseSize = 24;
    const sizeMultiplier = 1 + (streak - 2) * 0.1; // 2콤보: 1.0x, 3콤보: 1.1x, ...
    const fontSize = Math.min(baseSize * sizeMultiplier, 40); // 최대 40px
    
    // 색상 그라데이션: 낮은 콤보(노란색) → 높은 콤보(빨강-주황)
    const hue = Math.min(60 - (streak - 2) * 8, 0); // 60(노랑) → 0(빨강)
    const saturation = Math.min(85 + streak * 3, 100);
    const lightness = 65;
    comboText.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    comboText.style.fontSize = fontSize + "px";
    comboText.style.textShadow = `0 0 ${fontSize/2}px hsl(${hue}, ${saturation}%, ${lightness}%), 0 0 ${fontSize}px rgba(255, 200, 100, 0.5)`;
    
    // 화면 중앙 상단에 표시
    comboText.style.left = "50%";
    comboText.style.top = "25%";
    comboText.style.transform = "translate(-50%, -50%)";
    
    document.body.appendChild(comboText);
    
    // 애니메이션 시작
    requestAnimationFrame(() => {
      comboText.classList.add("show");
    });
    
    // 정리
    setTimeout(() => {
      comboText.classList.remove("show");
      setTimeout(() => comboText.remove(), 500);
    }, 1500);
  }

  // 메시지/통계
  function setMessage(msg, hint){
    // 페이드 아웃
    if(msgEl){
      msgEl.classList.add("fadeOut");
    }
    if(hintEl){
      hintEl.classList.add("fadeOut");
    }
    
    // 페이드 인
    setTimeout(() => {
      if(msgEl){
        msgEl.textContent = msg || "";
        msgEl.classList.remove("fadeOut");
      }
      if(hintEl){
        hintEl.textContent = hint || "";
        hintEl.classList.remove("fadeOut");
      }
    }, 200);
  }

  // LIVE PILL: 값이 바뀔 때만 1회 회전
  function pulseLivePill(pill){
    if(!pill) return;
    if(!pill.classList.contains("live")) return;

    pill.classList.remove("spin");
    void pill.offsetWidth; // reflow
    pill.classList.add("spin");

    setTimeout(() => pill.classList.remove("spin"), 1200);
  }

  // 숫자 애니메이션
  function animateNumber(element){
    if(!element) return;
    element.classList.remove("numberPop");
    void element.offsetWidth; // reflow
    element.classList.add("numberPop");
    setTimeout(() => {
      element.classList.remove("numberPop");
    }, 500);
  }

  // 하트 가루 효과
  function launchHeartConfetti(targetElement){
    if(!targetElement) return;
    
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for(let i = 0; i < 8; i++){
      const heart = document.createElement("div");
      heart.textContent = "💖";
      heart.style.position = "fixed";
      heart.style.left = centerX + "px";
      heart.style.top = centerY + "px";
      heart.style.fontSize = (12 + Math.random() * 8) + "px";
      heart.style.pointerEvents = "none";
      heart.style.zIndex = "10001";
      heart.style.opacity = "0.9";
      
      const angle = (Math.PI * 2 * i) / 8;
      const distance = 30 + Math.random() * 20;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      
      heart.style.setProperty("--dx", dx + "px");
      heart.style.setProperty("--dy", dy + "px");
      heart.style.setProperty("--rot", (Math.random() * 360) + "deg");
      
      document.body.appendChild(heart);
      
      // 애니메이션 적용
      requestAnimationFrame(() => {
        heart.style.transition = "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        heart.style.transform = `translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0)`;
        heart.style.opacity = "0";
      });
      
      setTimeout(() => heart.remove(), 800);
    }
  }

  function renderStats({matched, score, totalPairs}){
    const mStr = String(matched);
    const sStr = String(score);

    if(matchedEl){
      if(matchedEl.textContent !== mStr){
        matchedEl.textContent = mStr;
        animateNumber(matchedEl);
        pulseLivePill(matchedPill);
      }
    }

    // 진행 상황 표시 (맞춘 개수 / 전체)
    if(totalPairsEl && totalPairs){
      totalPairsEl.textContent = ` / ${totalPairs}`;
    }

    if(scoreEl){
      if(scoreEl.textContent !== sStr){
        scoreEl.textContent = sStr;
        animateNumber(scoreEl);
        pulseLivePill(scorePill);
      }
    }
  }

  function renderDaily(dateStr){
    const d = HarumindStorage.loadDaily(dateStr);
    if(todayClearEl) todayClearEl.textContent = d.clears;
    if(todayBestEl)  todayBestEl.textContent  = d.best;
  }

  // 모달
  function openModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "flex";
  }
  function closeModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "none";
  }

  // 완료 상태 표시
  function setStatsComplete(complete){
    const statsArea = document.querySelector(".statsArea");
    if(statsArea){
      if(complete){
        statsArea.classList.add("isComplete");
      }else{
        statsArea.classList.remove("isComplete");
      }
    }
  }

  // 완료 상태 UI (작은 바 형태)
  function getMsgCard(){
    return document.querySelector(".messageCard");
  }

  function ensureBar(){
    const host = getMsgCard();
    if(!host) return null;

    let bar = document.getElementById("hmFinishBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "hmFinishBar";
      bar.className = "hmFinishBar";
      host.appendChild(bar);
    }
    return bar;
  }

  function setFinishState({ title, message, buttonText, hint, onRestart }){
    const bar = ensureBar();
    if(!bar) return;

    bar.innerHTML = `
      <div class="hmFinishText">
        <div class="hmFinishTitle">${title || "🎉 오늘의 게임 완료!"}</div>
        <div class="hmFinishSub">${hint || "난이도는 위에서 바꿀 수 있어요"}</div>
      </div>
      <button class="hmFinishBtn" type="button">${buttonText || "🔁 다시 해볼까요?"}</button>
    `;

    const btn = bar.querySelector(".hmFinishBtn");
    if(btn) btn.onclick = () => onRestart && onRestart();
  }

  function clearFinishState(){
    const bar = document.getElementById("hmFinishBar");
    if(bar) bar.remove();
  }

  // 폭죽 효과
  function launchConfetti(){
    const box = document.createElement("div");
    box.className = "hmConfetti";

    for(let i=0;i<26;i++){
      const p = document.createElement("i");
      p.style.setProperty("--dx", (Math.random()*460 - 230).toFixed(0) + "px");
      p.style.setProperty("--dy", (Math.random()*-180 - 90).toFixed(0) + "px");
      p.style.setProperty("--rot", (Math.random()*720 - 360).toFixed(0) + "deg");

      const colors = ["#6ee7b7","#93c5fd","#fca5a5","#fde68a","#c4b5fd","#f9a8d4"];
      p.style.background = colors[Math.floor(Math.random()*colors.length)];

      p.style.left = (50 + (Math.random()*40 - 20)) + "%";
      p.style.top  = (30 + (Math.random()*20 - 10)) + "px";

      const w = 6 + Math.random()*6;
      const h = 10 + Math.random()*10;
      p.style.width = w + "px";
      p.style.height = h + "px";

      box.appendChild(p);
    }

    document.body.appendChild(box);
    setTimeout(()=>box.remove(), 950);
  }

  // 이모지 파편 폭죽 효과 (결과 모달용)
  function launchEmojiFireworks(){
    ensureStyle();
    
    // 축하 효과음 재생
    playFanfare();
    
    const emojis = ['🎉', '✨', '🌟', '💫', '🎊', '💖', '⭐', '💝', '🌺', '🦋'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for(let i = 0; i < 30; i++){
      const emoji = document.createElement("div");
      emoji.className = "hmEmojiFirework";
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      
      // 화면 중앙에서 시작
      emoji.style.left = centerX + "px";
      emoji.style.top = centerY + "px";
      
      // 랜덤 방향과 거리
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
      const distance = 150 + Math.random() * 200;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 50; // 위로 약간 더 튀도록
      
      emoji.style.setProperty("--dx", dx + "px");
      emoji.style.setProperty("--dy", dy + "px");
      emoji.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      emoji.style.setProperty("--scale", (0.8 + Math.random() * 0.4).toFixed(2));
      
      // 랜덤 크기
      const size = 20 + Math.random() * 15;
      emoji.style.fontSize = size + "px";
      
      document.body.appendChild(emoji);
      
      // 애니메이션 시작
      requestAnimationFrame(() => {
        emoji.classList.add("launch");
      });
    }
    
    // 정리
    setTimeout(() => {
      document.querySelectorAll(".hmEmojiFirework").forEach(el => el.remove());
    }, 2000);
  }

  // 완료 토스트
  function showFinishPopup({title, dateStr}){
    ensureStyle();

    document.querySelector(".hmToastBack")?.remove();
    document.querySelector(".hmToast")?.remove();
    if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }

    const d = HarumindStorage.loadDaily(dateStr);
    const extra = `오늘 횟수: ${d.clears}회 · 오늘 최고: ${d.best}점`;

    const back = document.createElement("div");
    back.className = "hmToastBack";

    const toast = document.createElement("div");
    toast.className = "hmToast";
    toast.innerHTML = `
      <div class="hmTitle">${title || "완료! 🎉"}</div>
      <div class="hmHintLine">다시 하려면 '새로 시작'</div>
      <div class="hmMini"><b style="color:#e8ecff">${extra}</b></div>
    `;

    document.body.appendChild(back);
    document.body.appendChild(toast);

    // 폭죽 + 효과음(짧게 2번)
    launchConfetti();
    playBeep(988, 90, 0.035);
    setTimeout(()=>playBeep(1174, 80, 0.028), 120);

    const closeNow = () => {
      back.remove();
      toast.remove();
      if(finishTimer){
        clearTimeout(finishTimer);
        finishTimer = null;
      }
      back.removeEventListener("click", closeNow);
      toast.removeEventListener("click", closeNow);
    };

    back.addEventListener("click", closeNow);
    toast.addEventListener("click", closeNow);

    finishTimer = setTimeout(closeNow, 4000);
  }

  // 설정 패널 (모바일 토글 / PC 항상 열림)
  function initSettingsPanel(){
    if(!settingsBtn || !settingsPanel) return;
    const mq = window.matchMedia("(max-width:520px)");

    function setMobileOpen(open){
      if(!settingsPanel || !settingsBtn) return;
      if(open){
        settingsPanel.classList.remove("isClosed");
        settingsBtn.classList.add("isOpen");
        settingsBtn.setAttribute("aria-expanded","true");
        settingsBtn.setAttribute("aria-label","설정 닫기");
        settingsBtn.setAttribute("title","설정 닫기");
      }else{
        settingsPanel.classList.add("isClosed");
        settingsBtn.classList.remove("isOpen");
        settingsBtn.setAttribute("aria-expanded","false");
        settingsBtn.setAttribute("aria-label","설정 열기");
        settingsBtn.setAttribute("title","설정 열기");
      }
    }

    function syncViewport(){
      if(!settingsPanel) return;

      if(mq.matches){
        settingsPanel.classList.add("isClosed");
        if(settingsBtn){
          settingsBtn.classList.remove("isOpen");
          settingsBtn.setAttribute("aria-expanded","false");
          settingsBtn.setAttribute("aria-label","설정 열기");
          settingsBtn.setAttribute("title","설정 열기");
        }
      }else{
        settingsPanel.classList.remove("isClosed");
      }
    }

    if(settingsBtn){
      settingsBtn.addEventListener("click", function(){
        if(!mq.matches) return;
        const isClosed = settingsPanel.classList.contains("isClosed");
        setMobileOpen(isClosed);
      });
    }

    if(mq.addEventListener) mq.addEventListener("change", syncViewport);
    else if(mq.addListener) mq.addListener(syncViewport);

    syncViewport();
  }

  // 오늘 현황 토글
  function initStatsToggle(){
    if(!statsWrap || !statsToggle) return;

    statsWrap.classList.remove('isOpen');

    function syncLabel(){
      const open = statsWrap.classList.contains('isOpen');
      statsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      statsToggle.innerHTML = open
        ? '오늘 현황 닫기 <span class="chev">▴</span>'
        : '오늘 현황 보기 <span class="chev">▾</span>';
    }

    syncLabel();

    statsToggle.addEventListener('click', () => {
      statsWrap.classList.toggle('isOpen');
      syncLabel();
    });
  }

  // 잠깐보기 버튼
  function initPeekButton(){
    if(!peekBtn || !peekSel) return;

    // 힌트 배너 1회 생성
    let banner = document.querySelector(".hmPeekBanner");
    if(!banner){
      banner = document.createElement("div");
      banner.className = "hmPeekBanner";
      banner.innerHTML = `
        <span class="hmPeekBadge">👀</span>
        <span>힌트시간이에요</span>
        <span class="hmPeekCount">2</span>
      `;
      document.body.appendChild(banner);
    }

    const countEl = banner.querySelector(".hmPeekCount");

    function enterPeekMode(sec){
      document.body.classList.add("peeking");
      if(countEl) countEl.textContent = String(sec);
      banner.classList.add("show");
    }

    function exitPeekMode(){
      banner.classList.remove("show");
      document.body.classList.remove("peeking");
    }

    peekBtn.addEventListener('click', () => {
      peekBtn.disabled = true;

      // 힌트모드 진입(2초)
      enterPeekMode(2);

      // 1초 뒤 카운트 다운 느낌
      setTimeout(() => {
        if(document.body.classList.contains("peeking") && countEl){
          countEl.textContent = "1";
        }
      }, 1100);

      // 기존 로직 유지: 2초 보기 트리거
      peekSel.value = "2";
      peekSel.dispatchEvent(new Event('change', { bubbles: true }));

      // 끝나면 원복
      setTimeout(() => {
        peekSel.value = "";
        peekBtn.disabled = false;
        exitPeekMode();
      }, 2200);
    });
  }

  // 방법 보기 모달
  function initHowModal(){
    const hBtn = document.getElementById("howBtn");
    const mBack = document.getElementById("modalBack");
    const mClose = document.getElementById("modalCloseBtn");

    if(!hBtn || !mBack) return;

    const open = () => { 
      mBack.style.display = "flex";
      mBack.classList.add("isOpen");
    };
    const close = () => { 
      mBack.style.display = "none";
      mBack.classList.remove("isOpen");
    };

    hBtn.addEventListener('click', open);

    if(mClose) {
      mClose.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
      });
    }

    mBack.addEventListener('click', (e) => {
      if(e.target === mBack) close();
    });

    document.addEventListener('keydown', (e) => {
      if(e.key === "Escape" && mBack.style.display === "flex") close();
    });
  }
  
  // BGM 이어듣기
  const BGM_KEY_ON   = "HARUMIND_BGM_ON";
  const BGM_KEY_TIME = "HARUMIND_BGM_TIME";

  function initBgm(){
    if(!bgm || !bgmBtn) return;

    bgm.volume = 0.15;
    bgm.loop = false; // 한 곡만 반복되지 않도록 false로 설정
    bgm.muted = false;

    // 기본 곡 설정 (랜덤 선택)
    bgm.src = selectRandomTrack();

    // 디폴트는 무조건 꺼짐
    bgmOn = false;
    bgm.pause(); // 명시적으로 일시정지하여 자동 재생 방지
    let loadedOnce = false;

    // 로컬 스토리지에서 불러오지 않고, 무조건 꺼짐 상태 유지
    // 사용자가 버튼을 눌렀을 때만 저장됨

    function restoreTimeIfAny(){
      try{
        const t = parseFloat(localStorage.getItem(BGM_KEY_TIME) || "0");
        if(Number.isFinite(t) && t > 0){
          if(bgm.readyState >= 1){
            bgm.currentTime = Math.max(0, t);
          }else{
            bgm.addEventListener("loadedmetadata", () => {
              try{ bgm.currentTime = Math.max(0, t); }catch(e){}
            }, { once:true });
          }
        }
      }catch(e){}
    }

    function setLabel(){
      bgmBtn.textContent = bgmOn ? "🎵 따뜻한 멜로디" : "🔇 고요하게";
    }

    function saveOn(){
      try{ localStorage.setItem(BGM_KEY_ON, bgmOn ? "1" : "0"); }catch(e){}
    }

    let timeSaveTimer = null;
    function startTimeSaver(){
      stopTimeSaver();
      timeSaveTimer = setInterval(() => {
        if(!bgmOn) return;
        if(!bgm || bgm.paused) return;
        try{ localStorage.setItem(BGM_KEY_TIME, String(bgm.currentTime || 0)); }catch(e){}
      }, 1000);
    }
    function stopTimeSaver(){
      if(timeSaveTimer){ clearInterval(timeSaveTimer); timeSaveTimer = null; }
    }

    async function safePlay(){
      if(!loadedOnce){
        try{ bgm.load(); }catch(e){}
        loadedOnce = true;
      }

      restoreTimeIfAny();

      await playBgm();
    }

    function stop(){
      try{
        localStorage.setItem(BGM_KEY_TIME, String(bgm.currentTime || 0));
      }catch(e){}
      bgm.pause();
      stopTimeSaver();
    }

    bgmBtn.addEventListener("click", async () => {
      if(!bgmOn){
        bgmOn = true;
        saveOn();
        setLabel();
        try{
          await safePlay();
          startTimeSaver();
        }catch(e){
          bgmOn = false;
          saveOn();
          setLabel();
          console.log("BGM play error:", e);
          alert("배경음악 재생이 막혔거나 로딩에 실패했어요.\n(휴대폰 무음/블루투스/브라우저 정책/네트워크 확인)");
        }
      }else{
        bgmOn = false;
        saveOn();
        setLabel();
        stop();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if(document.hidden && bgmOn){
        stop();
      }
    });

    bgm.addEventListener("ended", () => {
      if(bgmOn){
        bgm.src = selectRandomTrack();
        playBgm();
      }
    });

    bgm.addEventListener("error", () => {
      if(bgmOn){
        bgmOn = false;
        saveOn();
        setLabel();
        stopTimeSaver();
      }
    });

    setLabel();
  }

  // 난이도 select 텍스트 원본 유지
  function updateLevelTextForMobile(){
    const levelSel = document.getElementById("level");
    if(!levelSel) return;
    
    Array.from(levelSel.options).forEach(opt => {
      if(!opt.dataset.originalText){
        opt.dataset.originalText = opt.textContent;
      }
      opt.textContent = opt.dataset.originalText;
    });
    
    levelSel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ============================================================
  // [Logic] - 게임 로직 (카드 생성/클릭/매칭/콤보/기록 저장)
  // ============================================================

  const levelSel = document.getElementById("level");

  function seededCards(level){
    const map = C.LEVEL_MAP;
    const [r,c] = map[level];
    totalPairs = (r*c)/2;

    if(board) board.style.gridTemplateColumns = `repeat(${c},1fr)`;

    const seed = dateStr + level;
    let h = 0;
    for(const ch of seed) h = Math.imul(31, h) + ch.charCodeAt(0) | 0;
    const rnd = () => (h = Math.imul(48271, h) & 2147483647) / 2147483647;

    const pool = [...C.EMOJIS].sort(()=>rnd()-0.5).slice(0, totalPairs);
    return [...pool, ...pool].sort(()=>rnd()-0.5);
  }

  function clearPeekTimer(){
    if(peekTimer){
      clearTimeout(peekTimer);
      peekTimer = null;
    }
  }

  function clearTempMsgTimer(){
    if(tempMsgTimer){
      clearTimeout(tempMsgTimer);
      tempMsgTimer = null;
    }
  }

  function setStateMessage(msg, hint){
    currentStateMsg = { msg, hint };
    setMessage(msg, hint);
  }

  function showTempMessage(msg, hint, duration = 800){
    clearTempMsgTimer();
    setMessage(msg, hint);
    tempMsgTimer = setTimeout(() => {
      setMessage(currentStateMsg.msg, currentStateMsg.hint);
      tempMsgTimer = null;
    }, duration);
  }

  function build(autoPeekSec){
    clearPeekTimer();
    clearTempMsgTimer();
    if(board) board.innerHTML = "";
    first = null;
    lock = false;
    matched = 0;
    score = 0;
    streak = 0;
    maxStreak = 0;
    gameStartTime = Date.now(); // 게임 시작 시간 기록

    const level = levelSel.value;
    const cards = seededCards(level);
    
    renderStats({ matched, score, totalPairs });
    clearFinishState();
    setStatsComplete(false);
    setStateMessage("숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨", "카드를 눌러 예쁜 인연을 찾아주세요.");

    cards.forEach(emoji=>{
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.state = "down";
      t.dataset.emoji = emoji;
      t.onclick = () => clickTile(t);
      if(board) board.appendChild(t);
    });

    if(typeof autoPeekSec === "number" && autoPeekSec > 0){
      doPeek(autoPeekSec);
    }

    // 랜덤 BGM 선택 및 재생
    bgm.src = selectRandomTrack();
    if(bgmOn){
      playBgm();
    }
  }

  // 게임 진행 중인지 확인
  function isGameInProgress(){
    return first !== null || peekTimer !== null || matched > 0;
  }

  function clickTile(t){
    if(lock || t.dataset.state === "up" || t.classList.contains("matched")) return;

    // 즉시 UI 업데이트 (성능 최우선)
    t.dataset.state = "up";

    if(!first){
      first = t;
      showTempMessage("어디에 있을까요? 마음의 눈으로 슥- 보세요 🧐", "", 800);
      setStateMessage("숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨", "");
      return;
    }

    lock = true;
    clearTempMsgTimer();

    // 두 번째 카드 확인 시간을 주기 위해 약간의 지연 (손맛을 위한 미세 조정)
    setTimeout(() => {
      // 매칭 판정 및 점수 계산
      if(first.dataset.emoji === t.dataset.emoji){
        // 성공 처리
        first.classList.add("matched");
        t.classList.add("matched");

        matched++;
        streak++;
        maxStreak = Math.max(maxStreak, streak);

        const pts = C.comboPoints(streak);
        score += pts;

        // UI 업데이트도 비동기로 처리
        setTimeout(() => {
          showReward(t, `+${pts}`);
          renderStats({ matched, score, totalPairs });
          
          // 콤보 피드백 표시 (2콤보 이상)
          if(streak >= 2){
            showComboFeedback(streak);
          }
          
          // 매칭 성공 시 하트 가루 효과
          if(scorePill){
            launchHeartConfetti(scorePill);
          }

          // 맑은 실로폰 느낌의 성공음 재생
          playSuccessSound(streak);

          if(matched === 1){
            setStateMessage("찾았다! 두 친구가 드디어 만났네요 💛", "기분 좋은 리듬을 타면 보너스 점수가 쌓여요 🎵");
          }else if(matched < totalPairs){
            // 연속 매칭 중인지 확인 (streak >= 2)
            if(streak >= 2){
              setStateMessage("와우! 마음이 척척 통하고 있어요! 😍", "지금 이 리듬을 놓치지 마세요!");
            } else {
              setStateMessage("찾았다! 두 친구가 드디어 만났네요 💛", "기분 좋은 리듬을 타면 보너스 점수가 쌓여요 🎵");
            }
          }
        }, 0);

        first = null;
        lock = false;

        if(matched === totalPairs){
          finishGame();
        }

      }else{
        // 실패 처리
        first.classList.add("shake");
        t.classList.add("shake");
        
        streak = 0;
        playFailSound();

        setMessage("조금 수줍음이 많은 친구들이네요. 다시 천천히 찾아봐요 😊", "");

        setTimeout(()=>{
          first.classList.remove("shake");
          t.classList.remove("shake");
          first.dataset.state = "down";
          t.dataset.state = "down";
          first = null;
          lock = false;
          
          setStateMessage("숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨", "");
        }, C.MISMATCH_MS);
      }
    }, 100); // 100ms 지연으로 두 번째 카드 확인 시간 제공
  }

  function finishGame(){
    const d = HarumindStorage.loadDaily(dateStr);
    d.clears += 1;
    
    // 게임 시간 계산 (초 단위)
    const gameTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
    
    // 최고 기록 업데이트
    const isNewBestScore = score > d.best;
    const isNewBestTime = d.bestTime === 0 || (gameTime > 0 && gameTime < d.bestTime);
    
    d.best = Math.max(d.best, score);
    if(isNewBestTime){
      d.bestTime = gameTime;
    }
    
    HarumindStorage.saveDaily(dateStr, d);
    renderDaily(dateStr);

    clearTempMsgTimer();
    setStateMessage("오늘도 마음의 근육이 한 뼘 더 자라났어요! 🎉", "정말 따뜻한 집중력이었어요.");

    setStatsComplete(true);

    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const timeStr = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;

    // 결과 모달 표시
    showResultModal({
      time: timeStr,
      timeSeconds: gameTime,
      combo: maxStreak,
      score: score,
      isNewBestScore: isNewBestScore,
      isNewBestTime: isNewBestTime
    });

    setFinishState({
      title: "오늘도 마음의 근육이 한 뼘 더 자라났어요! 🎉",
      message: "정말 따뜻한 집중력이었어요.",
      buttonText: "🔁 다시 해볼까요?",
      hint: "난이도는 위에서 언제든 바꿀 수 있어요.",
      onRestart: () => build(2)
    });
  }

  // 결과 모달 표시
  function showResultModal({ time, timeSeconds, combo, score, isNewBestScore, isNewBestTime }){
    const resultModalBack = document.getElementById("resultModalBack");
    const resultModalTitle = document.getElementById("resultModalTitle");
    const resultTime = document.getElementById("resultTime");
    const resultCombo = document.getElementById("resultCombo");
    const resultScore = document.getElementById("resultScore");
    const resultMessage = document.getElementById("resultMessage");
    const resultRestartBtn = document.getElementById("resultRestartBtn");
    const resultShareBtn = document.getElementById("resultShareBtn");

    if(!resultModalBack) return;

    // 이모지 폭죽 효과 (모달이 열리기 전에 실행)
    launchEmojiFireworks();

    // 따뜻한 결과 메시지 랜덤 선택
    const warmMessages = [
      "정말 잘하셨어요! 당신의 집중력이 빛났어요 🌟",
      "멋져요! 오늘도 마음의 근육이 튼튼해졌네요 💪",
      "완벽해요! 따뜻한 마음으로 하나씩 찾아낸 모습이 아름다워요 💛",
      "훌륭해요! 이런 작은 성취들이 모여 큰 기쁨이 되죠 ✨",
      "수고하셨어요! 오늘도 자신과의 약속을 잘 지키셨네요 🎉",
      "대단해요! 천천히 그리고 확실하게, 정말 멋진 여정이었어요 🌺"
    ];
    const message = warmMessages[Math.floor(Math.random() * warmMessages.length)];

    // 기존 뱃지 제거
    document.querySelectorAll(".resultRecordBadge").forEach(badge => badge.remove());

    // 신기록 뱃지 추가
    if(isNewBestScore && resultScore){
      const badge = document.createElement("span");
      badge.className = "resultRecordBadge";
      badge.textContent = "신기록! 👑";
      resultScore.parentElement.appendChild(badge);
    }

    if(isNewBestTime && resultTime){
      const badge = document.createElement("span");
      badge.className = "resultRecordBadge";
      badge.textContent = "신기록! 👑";
      resultTime.parentElement.appendChild(badge);
    }

    if(resultTime) resultTime.textContent = time;
    if(resultCombo) resultCombo.textContent = combo;
    if(resultScore) resultScore.textContent = score;
    if(resultMessage) resultMessage.textContent = message;

    resultModalBack.classList.add("isOpen");

    // 다시 하기 버튼 - 이전 리스너 제거 후 새로 등록
    if(resultRestartBtn){
      // 기존 이벤트 리스너 제거를 위해 새 함수 생성
      const handleRestart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resultModalBack.classList.remove("isOpen");
        // 모달이 완전히 닫힌 후 게임 재시작
        setTimeout(() => {
          build(2);
        }, 100);
      };
      
      // 기존 리스너 제거 후 새로 등록
      resultRestartBtn.replaceWith(resultRestartBtn.cloneNode(true));
      const newRestartBtn = document.getElementById("resultRestartBtn");
      if(newRestartBtn){
        newRestartBtn.addEventListener('click', handleRestart);
      }
    }

    // 공유 버튼 이벤트
    if(resultShareBtn){
      const handleShare = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 난이도 이름 가져오기
        const levelMap = {
          "3x2": "쉬움 (3쌍)",
          "4x3": "보통 (6쌍)",
          "4x4": "어려움 (8쌍)"
        };
        const levelName = levelMap[levelSel?.value || "3x2"] || "쉬움 (3쌍)";
        
        // 날짜 가져오기
        const today = new Date();
        const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        
        // 반짝임 지수 계산 (점수 기반, 최대 5개)
        const sparkleCount = Math.min(5, Math.max(1, Math.floor(score / 50) + 1));
        const sparkles = "⭐".repeat(sparkleCount);
        
        // 공유 텍스트 생성 (박스 형태)
        const shareText = `╔═══════════════════════════╗
║   ✨ 하루마음 기록 ✨   ║
╠═══════════════════════════╣
║ 📅 날짜: ${dateStr}                ║
║ 🎮 난이도: ${levelName}            ║
║ 🏆 최종점수: ${score}점              ║
║ ⏱️ 소요시간: ${time}                ║
║ 🔥 최고콤보: ${combo} Combo         ║
╠═══════════════════════════╣
║ 내 마음의 반짝임 지수: ${sparkles}  ║
╠═══════════════════════════╣
║ 지금 바로 마음을 챙겨보세요!         ║
║ ${window.location.href}    ║
╚═══════════════════════════╝`;
        
        try {
          // 클립보드 API 사용
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(shareText);
            showShareToast();
          } else {
            // fallback: 구식 방법
            const textArea = document.createElement("textarea");
            textArea.value = shareText;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              showShareToast();
            } catch(err) {
              console.error('복사 실패:', err);
              alert('복사에 실패했습니다. 브라우저를 확인해주세요.');
            }
            document.body.removeChild(textArea);
          }
        } catch(err) {
          console.error('클립보드 복사 오류:', err);
          alert('복사에 실패했습니다. 브라우저를 확인해주세요.');
        }
      };
      
      // 기존 리스너 제거 후 새로 등록
      resultShareBtn.replaceWith(resultShareBtn.cloneNode(true));
      const newShareBtn = document.getElementById("resultShareBtn");
      if(newShareBtn){
        newShareBtn.addEventListener('click', handleShare);
      }
    }

    // 배경 클릭 시 닫기
    const closeOnBackdrop = (e) => {
      if(e.target === resultModalBack){
        resultModalBack.classList.remove("isOpen");
        resultModalBack.removeEventListener('click', closeOnBackdrop);
      }
    };
    resultModalBack.addEventListener('click', closeOnBackdrop);
  }

  function doPeek(sec){
    if(lock) return;

    if(first){
      first.dataset.state = "down";
      first = null;
    }

    lock = true;
    clearPeekTimer();

    if(board){
      [...board.children].forEach(t => t.dataset.state = "up");
    }
    setMessage("잠깐 보고 기억해요 🙂", "잠시 후 다시 물음표로 돌아갑니다.");

    peekTimer = setTimeout(()=>{
      if(board){
        [...board.children].forEach(t=>{
          if(!t.classList.contains("matched")) t.dataset.state = "down";
        });
      }
      setStateMessage("숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨", "카드를 눌러 예쁜 인연을 찾아주세요.");
      lock = false;
      peekTimer = null;
    }, sec * 1000);
  }

  // 하단 토스트 메시지 표시
  function showRestartToast(){
    let toast = document.querySelector(".restartToast");
    if(!toast){
      toast = document.createElement("div");
      toast.className = "restartToast";
      toast.textContent = "게임이 재시작되었어요";
      document.body.appendChild(toast);
    }
    
    toast.classList.remove("show");
    void toast.offsetWidth; // reflow
    toast.classList.add("show");
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  // 공유 완료 토스트 메시지
  function showShareToast(){
    let toast = document.querySelector(".shareToast");
    if(!toast){
      toast = document.createElement("div");
      toast.className = "shareToast";
      toast.textContent = "기록이 복사되었습니다. 친구에게 자랑해보세요!";
      document.body.appendChild(toast);
    }
    
    toast.classList.remove("show");
    void toast.offsetWidth; // reflow
    toast.classList.add("show");
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // 이벤트
  if(levelSel) {
    let previousLevel = levelSel.value; // 이전 난이도 저장
    levelSel.onchange = () => {
      const newLevel = levelSel.value;
      // 게임 진행 중이면 즉시 재시작 + 메시지
      if(isGameInProgress()){
        previousLevel = newLevel;
        build(2);
        showRestartToast();
      } else {
        previousLevel = newLevel;
        build(2);
      }
    };
  }
  if(peekSel) peekSel.onchange = () => {
    doPeek(2);
    peekSel.value = "";
  };

  // ============================================================
  // 초기화
  // ============================================================

  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;

  renderDaily(dateStr);
  setBigMode(bigOn);
  setSfx(sfxOn);
  updateLevelTextForMobile();

  // 리사이즈 및 화면 회전 시에도 모바일/PC 전환 대응
  let resizeTimer = null;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastWidth) {
        updateLevelTextForMobile();
        lastWidth = window.innerWidth;
      }
    }, 150);
  };
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);
  
  // 테마 선택 이벤트
  if(themeSelect){
    themeSelect.value = currentTheme;
    themeSelect.onchange = () => {
      applyTheme(themeSelect.value);
    };
  }
  
  // 초기 테마 적용
  applyTheme(currentTheme);

  // UI 초기화
  initSettingsPanel();
  initStatsToggle();
  initPeekButton();
  initHowModal();
  initBgm();

  // HarumindUI export
  window.HarumindUI = {
    board,
    dateStr,
    setMessage,
    renderStats,
    renderDaily,
    playBeep,
    showReward,
    openModal,
    closeModal,
    setStatsComplete,
    setFinishState,
    clearFinishState,
  };

  // 첫 진입
  build(2);
})();

