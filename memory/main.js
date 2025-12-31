// /memory/main.js
// 모든 게임 로직 통합 파일 (바이브 코딩 최적화)

(function(){
  const C = window.HARUMIND_CONFIG;
  if(!C) {
    console.error("HARUMIND_CONFIG가 로드되지 않았습니다. config.js를 먼저 로드해주세요.");
    return;
  }

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
  let tempMsgTimer = null;
  let currentStateMsg = { msg: "", hint: "" };
  let finishTimer = null;

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
      if(!raw) return { clears:0, best:0 };
      const obj = JSON.parse(raw);
      return {
        clears: toNum(obj?.clears),
        best:   toNum(obj?.best),
      };
    }catch(e){
      return { clears:0, best:0 };
    }
  }

  function saveDaily(dateStr, data){
    safeSet(getDailyKey(dateStr), JSON.stringify({
      clears: toNum(data?.clears),
      best:   toNum(data?.best),
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

  // 설정 상태
  let sfxOn = HarumindStorage.getBool(C.KEYS.SFX, true);
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);

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
    if(sfxBtn) sfxBtn.textContent = sfxOn ? "🔔 효과음: 켜짐" : "🔕 효과음: 꺼짐";
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

  // 메시지/통계
  function setMessage(msg, hint){
    if(msgEl) msgEl.textContent = msg || "";
    if(hintEl) hintEl.textContent = hint || "";
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

  function renderStats({matched, score, totalPairs}){
    const mStr = String(matched);
    const sStr = String(score);

    if(matchedEl){
      if(matchedEl.textContent !== mStr){
        matchedEl.textContent = mStr;
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

  // 방법 보기 모달 (수정 버전)
  function initHowModal(){
    const hBtn = document.getElementById("howBtn");
    const mBack = document.getElementById("modalBack");
    const mClose = document.getElementById("modalCloseBtn");

    // 최소한 열기 버튼과 배경은 있어야 실행합니다.
    if(!hBtn || !mBack) return;

    // 디버깅: 닫기 버튼 객체 확인
    console.log('닫기 버튼 객체:', mClose);
    if(mClose) {
      console.log('닫기 버튼 존재 확인:', mClose);
      console.log('닫기 버튼 스타일:', window.getComputedStyle(mClose));
      console.log('닫기 버튼 z-index:', window.getComputedStyle(mClose).zIndex);
      console.log('닫기 버튼 pointer-events:', window.getComputedStyle(mClose).pointerEvents);
    }

    const open = () => { 
      mBack.style.display = "flex";
      mBack.classList.add("isOpen"); // CSS의 pointer-events:auto를 위해 클래스 추가
      // CSS 레이아웃 점검: 모달이 열릴 때 닫기 버튼 상태 확인
      if(mClose) {
        setTimeout(() => {
          const rect = mClose.getBoundingClientRect();
          console.log('모달 열림 후 닫기 버튼 위치:', rect);
          console.log('모달 열림 후 닫기 버튼 pointer-events:', window.getComputedStyle(mClose).pointerEvents);
          console.log('모달 열림 후 modalBack pointer-events:', window.getComputedStyle(mBack).pointerEvents);
          console.log('모달 열림 후 modalBack z-index:', window.getComputedStyle(mBack).zIndex);
          console.log('모달 열림 후 modalCard z-index:', window.getComputedStyle(document.getElementById("modalCard")).zIndex);
        }, 100);
      }
    };
    const close = () => { 
      mBack.style.display = "none";
      mBack.classList.remove("isOpen"); // 클래스 제거
    };

    hBtn.addEventListener('click', open);

    // 닫기 버튼이 HTML에 존재할 때만 리스너 등록
    if(mClose) {
      // 테스트: 인라인 onclick 이벤트 추가
      mClose.onclick = () => { 
        alert('인라인 클릭 성공'); 
        close(); 
      };
      
      // 기존 addEventListener도 유지 (비교 테스트용)
      mClose.addEventListener('click', (e) => {
        console.log('addEventListener 클릭 이벤트 발생:', e);
        e.stopPropagation();
        close();
      });
    }

    // 배경 클릭 시 닫기
    mBack.addEventListener('click', (e) => {
      console.log('modalBack 클릭 이벤트:', e.target, e.currentTarget);
      if(e.target === mBack) close();
    });

    // Esc 키 대응
    document.addEventListener('keydown', (e) => {
      if(e.key === "Escape" && mBack.style.display === "flex") close();
    });
  }
  
  // BGM 이어듣기
  const BGM_KEY_ON   = "HARUMIND_BGM_ON";
  const BGM_KEY_TIME = "HARUMIND_BGM_TIME";

  function initBgm(){
    if(!bgm || !bgmBtn) return;

    bgm.volume = 0.35;
    bgm.muted = false;

    // 디폴트는 무조건 꺼짐
    let on = false;
    let loadedOnce = false;

    // 저장값이 있어도 "처음 진입 자동 켜짐"은 하지 않음
    try{
      const saved = localStorage.getItem(BGM_KEY_ON);
      if(saved === null){
        localStorage.setItem(BGM_KEY_ON, "0");
      }
    }catch(e){}

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
      bgmBtn.textContent = on ? "🎵 배경음악 켜짐" : "🔇 배경음악 꺼짐";
    }

    function saveOn(){
      try{ localStorage.setItem(BGM_KEY_ON, on ? "1" : "0"); }catch(e){}
    }

    let timeSaveTimer = null;
    function startTimeSaver(){
      stopTimeSaver();
      timeSaveTimer = setInterval(() => {
        if(!on) return;
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

      const p = bgm.play();
      if(p && typeof p.then === "function"){
        await p;
      }
    }

    function stop(){
      try{
        localStorage.setItem(BGM_KEY_TIME, String(bgm.currentTime || 0));
      }catch(e){}
      bgm.pause();
      stopTimeSaver();
    }

    bgmBtn.addEventListener("click", async () => {
      if(!on){
        on = true;
        saveOn();
        setLabel();
        try{
          await safePlay();
          startTimeSaver();
        }catch(e){
          on = false;
          saveOn();
          setLabel();
          console.log("BGM play error:", e);
          alert("배경음악 재생이 막혔거나 로딩에 실패했어요.\n(휴대폰 무음/블루투스/브라우저 정책/네트워크 확인)");
        }
      }else{
        on = false;
        saveOn();
        setLabel();
        stop();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if(document.hidden && on){
        stop();
      }
    });

    bgm.addEventListener("error", () => {
      if(on){
        on = false;
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

    const level = levelSel.value;
    const cards = seededCards(level);
    
    renderStats({ matched, score, totalPairs });
    clearFinishState();
    setStatsComplete(false);
    setStateMessage("같은 그림을 찾아볼까요?", "카드를 눌러 같은 그림을 찾아보세요.");

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
  }

  function clickTile(t){
    if(lock || t.dataset.state === "up" || t.classList.contains("matched")) return;

    t.dataset.state = "up";

    if(!first){
      first = t;
      showTempMessage("👀 잘 보고 있어요…", "", 800);
      setStateMessage("같은 그림을 찾아볼까요?", "");
      return;
    }

    lock = true;
    clearTempMsgTimer();

    if(first.dataset.emoji === t.dataset.emoji){
      first.classList.add("matched");
      t.classList.add("matched");

      matched++;
      streak++;

      const pts = C.comboPoints(streak);
      score += pts;

      showReward(t, `+${pts}`);
      renderStats({ matched, score, totalPairs });

      playBeep(820 + Math.min(streak,6)*35, 55, 0.015);

      clearTempMsgTimer();
      setTimeout(() => {
        if(matched === 1){
          setStateMessage("🎉 하나 찾았어요!", "남은 그림도 천천히 찾아보세요.\n(연속으로 맞추면 더 많은 점수를 얻을 수 있어요!)");
        }else if(matched < totalPairs){
          setStateMessage("👍 잘하고 있어요.", "남은 그림도 천천히 찾아보세요.");
        }
      }, 200);

      first = null;
      lock = false;

      if(matched === totalPairs){
        finishGame();
      }

    }else{
      streak = 0;
      playBeep(320, 70, 0.012);

      clearTempMsgTimer();
      setMessage("🙂 괜찮아요.", "다시 천천히 찾아보세요.");

      setTimeout(()=>{
        first.dataset.state = "down";
        t.dataset.state = "down";
        first = null;
        lock = false;
        
        setStateMessage("같은 그림을 찾아볼까요?", "");
      }, C.MISMATCH_MS);
    }
  }

  function finishGame(){
    const d = HarumindStorage.loadDaily(dateStr);
    d.clears += 1;
    d.best = Math.max(d.best, score);
    HarumindStorage.saveDaily(dateStr, d);
    renderDaily(dateStr);

    clearTempMsgTimer();
    setStateMessage("🎉 오늘의 게임을 마쳤어요!", "정말 잘하셨어요.");

    setStatsComplete(true);

    setFinishState({
      title: "🎉 오늘의 게임을 마쳤어요!",
      message: "아주 잘하셨어요 🙂",
      buttonText: "🔁 다시 해볼까요?",
      hint: "난이도는 위에서 언제든 바꿀 수 있어요.",
      onRestart: () => build(2)
    });
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
      setStateMessage("같은 그림을 찾아볼까요?", "카드를 눌러 같은 그림을 찾아보세요.");
      lock = false;
      peekTimer = null;
    }, sec * 1000);
  }

  // 이벤트
  if(levelSel) levelSel.onchange = () => build(2);
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
    resizeTimer = setTimeout(updateLevelTextForMobile, 150);
  };
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);

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

