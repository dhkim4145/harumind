// /memory/ui.js
// 화면 업데이트 + 효과음 + 리워드(+10) + 완료 토스트(4초/폭죽/클릭 닫기)
// + (추가) 오늘현황 토글, 잠깐보기(2초) 버튼, 방법보기 모달, 배경음악(BGM) 이어듣기/상태저장

(function(){
  const C = window.HARUMIND_CONFIG;

  // DOM
  const board = document.getElementById("board");
  const matchedEl = document.getElementById("matched");
  const scoreEl = document.getElementById("score");
  const msgEl = document.getElementById("msg");
  const hintEl = document.getElementById("hint");

  const todayKeyEl   = document.getElementById("todayKey");
  const todayClearEl = document.getElementById("todayClear");
  const todayBestEl  = document.getElementById("todayBest");

  const sfxBtn  = document.getElementById("sfxBtn");
  const bigBtn  = document.getElementById("bigBtn");

  // index.html에 있는 UI 버튼들
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

  let sfxOn = HarumindStorage.getBool(C.KEYS.SFX, true);
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);

  // ===== 스타일(토스트/폭죽) 주입 =====
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

  // ===== 설정 =====
  function setBigMode(on){
    bigOn = !!on;
    HarumindStorage.setBool(C.KEYS.BIG, bigOn);
    document.body.classList.toggle("bigText", bigOn);
    if(bigBtn) bigBtn.textContent = bigOn ? "🔎 큰 글씨: 켜짐" : "🔎➖ 큰 글씨: 꺼짐";
  }

  function setSfx(on){
    sfxOn = !!on;
    HarumindStorage.setBool(C.KEYS.SFX, sfxOn);
    if(sfxBtn) sfxBtn.textContent = sfxOn ? "🔔 효과음: 켜짐" : "🔕 효과음: 꺼짐";
  }

  // ===== 비프음 =====
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

  // ===== +10 리워드 =====
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

  // ===== 메시지/통계 =====
  function setMessage(msg, hint){
    if(msgEl) msgEl.textContent = msg || "";
    if(hintEl) hintEl.textContent = hint || "";
  }

  function renderStats({matched, score}){
    if(matchedEl) matchedEl.textContent = matched;
    if(scoreEl) scoreEl.textContent = score;
  }

  function renderDaily(dateStr){
    const d = HarumindStorage.loadDaily(dateStr);
    if(todayClearEl) todayClearEl.textContent = d.clears;
    if(todayBestEl)  todayBestEl.textContent  = d.best;
  }

  // ===== 모달(호환용) =====
  function openModal(){
    if(modalBack) modalBack.style.display = "flex";
  }
  function closeModal(){
    if(modalBack) modalBack.style.display = "none";
  }

  // ===== 완료 토스트(4초 + 클릭 닫기) =====
  let finishTimer = null;

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

  // ✅ game.js가 호출하는 이름 유지
  function showFinishPopup({title, dateStr}){
    ensureStyle();

    // 기존 제거 + 타이머 정리
    document.querySelector(".hmToastBack")?.remove();
    document.querySelector(".hmToast")?.remove();
    if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }

    const d = HarumindStorage.loadDaily(dateStr);
    const extra = `오늘 완료: ${d.clears}회 · 오늘 최고: ${d.best}점`;

    const back = document.createElement("div");
    back.className = "hmToastBack";

    const toast = document.createElement("div");
    toast.className = "hmToast";
    toast.innerHTML = `
      <div class="hmTitle">${title || "완료! 🎉"}</div>
      <div class="hmHintLine">다시 하려면 ‘새로 시작’</div>
      <div class="hmMini"><b style="color:#e8ecff">${extra}</b></div>
    `;

    document.body.appendChild(back);
    document.body.appendChild(toast);

    // 폭죽 + 효과음(짧게 2번)
    launchConfetti();
    playBeep(988, 90, 0.035);
    setTimeout(()=>playBeep(1174, 80, 0.028), 120);

    // ✅ 닫기(클릭 or 4초)
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

  // =========================================================
  // 추가 UI: 오늘현황 토글 / 잠깐보기 / 방법보기 / 배경음악(BGM)
  // =========================================================

  function initStatsToggle(){
    if(!statsWrap || !statsToggle) return;

    statsWrap.classList.remove('isOpen');
    statsToggle.setAttribute('aria-expanded','false');
    statsToggle.innerHTML = '오늘 현황 <span class="chev">∨</span>';

    statsToggle.addEventListener('click', () => {
      const open = statsWrap.classList.toggle('isOpen');
      statsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      statsToggle.innerHTML = (open ? '닫기 ' : '오늘 현황 ') + '<span class="chev">∨</span>';
    });
  }

  function initPeekButton(){
    if(!peekBtn || !peekSel) return;

    peekBtn.addEventListener('click', () => {
      peekBtn.disabled = true;

      peekSel.value = "2";
      peekSel.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(() => {
        peekSel.value = "";
        peekBtn.disabled = false;
      }, 2200);
    });
  }

  function initHowModal(){
    if(!howBtn || !modalBack || !modalCloseBtn || !modalCard) return;

    const open = () => { modalBack.style.display = "flex"; };
    const close = () => { modalBack.style.display = "none"; };

    howBtn.addEventListener('click', open);
    modalCloseBtn.addEventListener('click', close);

    modalBack.addEventListener('click', (e) => {
      if(e.target === modalBack) close();
    });

    document.addEventListener('keydown', (e) => {
      if(e.key === "Escape" && modalBack.style.display === "flex") close();
    });
  }

  // ---- BGM 이어듣기 핵심 ----
  const BGM_KEY_ON   = "HARUMIND_BGM_ON";
  const BGM_KEY_TIME = "HARUMIND_BGM_TIME";

  function initBgm(){
    if(!bgm || !bgmBtn) return;

    // 기본 볼륨(원하면 조절)
    bgm.volume = 0.35;
    bgm.muted = false;

    // 상태 복원
    let on = false;
    let loadedOnce = false;

    try{
      on = (localStorage.getItem(BGM_KEY_ON) === "1");
    }catch(e){}

    // 마지막 재생 위치 복원 (가능한 경우)
    function restoreTimeIfAny(){
      try{
        const t = parseFloat(localStorage.getItem(BGM_KEY_TIME) || "0");
        if(Number.isFinite(t) && t > 0){
          // 메타데이터 로드 후 seek이 안전하므로, 가능하면 loadedmetadata 후 적용
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

    // 재생 위치를 주기적으로 저장 (이어듣기)
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

    // iOS/모바일: 최초 재생 전에 load() 1회는 도움이 되지만,
    // "다시 켤 때마다 load()"를 하면 currentTime이 날아가서 이어듣기가 깨짐.
    async function safePlay(){
      // 최초 1회만 load() 시도
      if(!loadedOnce){
        try{ bgm.load(); }catch(e){}
        loadedOnce = true;
      }

      // 재생 직전 위치 복원
      restoreTimeIfAny();

      // play 시도
      const p = bgm.play();
      if(p && typeof p.then === "function"){
        await p;
      }
    }

    function stop(){
      // pause는 currentTime 유지됨 (이어듣기 OK)
      try{
        // 끄는 순간도 저장해두면 더 안정적
        localStorage.setItem(BGM_KEY_TIME, String(bgm.currentTime || 0));
      }catch(e){}
      bgm.pause();
      stopTimeSaver();
    }

    // 버튼 토글
    bgmBtn.addEventListener("click", async () => {
      if(!on){
        on = true;
        saveOn();
        setLabel();
        try{
          await safePlay();
          startTimeSaver();
        }catch(e){
          // 재생이 막힌 케이스(브라우저 정책/무음모드 등)
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

    // 화면 숨김 시: 자동 정지하되 위치 저장 → 다시 켜면 이어듣기
    document.addEventListener("visibilitychange", () => {
      if(document.hidden && on){
        stop();
        // on 상태는 유지(원하면 자동 OFF로 바꿔도 되는데, 지금은 “이어듣기” 우선)
        // 즉, 다시 돌아와서 사용자가 버튼 한 번 누르면 이어서 재생됨
      }
    });

    // 오디오 에러 발생 시 안전장치
    bgm.addEventListener("error", () => {
      if(on){
        on = false;
        saveOn();
        setLabel();
        stopTimeSaver();
      }
    });

    // 처음 라벨 표시
    setLabel();

    // “자동재생”은 대부분 막히므로, on이 저장되어 있어도 바로 재생은 시도하지 않음.
    // 대신 위치만 복원해두고, 사용자가 버튼 누르면 즉시 이어서 재생되게 함.
    restoreTimeIfAny();
  }

  // ===== 초기 세팅 =====
  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;

  renderDaily(dateStr);
  setBigMode(bigOn);
  setSfx(sfxOn);

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);

  // 추가 UI 초기화
  initStatsToggle();
  initPeekButton();
  initHowModal();
  initBgm();

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
    showFinishPopup,
  };
})();

