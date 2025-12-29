// /memory/ui-core.js
// UI 공통 + 설정(큰글씨/효과음) + HarumindUI export
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

  let sfxOn = HarumindStorage.getBool(C.KEYS.SFX, true);
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);

  // ✅ LIVE PILL(맞춘 개수/지금 점수) 대상 pill 찾기
  const matchedPill = matchedEl?.closest(".pill");
  const scorePill   = scoreEl?.closest(".pill");

  // ===== 설정 =====
  function setBigMode(on){
    bigOn = !!on;
    HarumindStorage.setBool(C.KEYS.BIG, bigOn);
    document.body.classList.toggle("bigText", bigOn);

    if(bigBtn){
      bigBtn.textContent = bigOn
        ? "🔠 큰 글씨"
        : "🔡 작은 글씨";

      bigBtn.classList.toggle("bigOn", bigOn);
      bigBtn.classList.toggle("bigOff", !bigOn);
    }
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

  // ✅ LIVE PILL: 값이 바뀔 때만 1회 회전(1~2초)
  function pulseLivePill(pill){
    if(!pill) return;
    if(!pill.classList.contains("live")) return;

    pill.classList.remove("spin");
    void pill.offsetWidth; // reflow
    pill.classList.add("spin");

    setTimeout(() => pill.classList.remove("spin"), 1600);
  }

  function renderStats({matched, score}){
    const mStr = String(matched);
    const sStr = String(score);

    if(matchedEl){
      if(matchedEl.textContent !== mStr){
        matchedEl.textContent = mStr;
        pulseLivePill(matchedPill);
      }
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

  // ===== 모달(호환용: game.js가 호출할 수도 있음) =====
  function openModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "flex";
  }
  function closeModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "none";
  }

  // ===== 초기 세팅 =====
  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;

  renderDaily(dateStr);
  setBigMode(bigOn);
  setSfx(sfxOn);

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);

  // ✅ 다른 파일들이 접근할 수 있도록 "공유 상태"를 window에 올려둠
  window.HarumindUIState = {
    C,
    board,
    dateStr,
    get sfxOn(){ return sfxOn; },
    setSfx,
    setBigMode,
    renderDaily,
    renderStats,
    setMessage,
    playBeep,
    showReward,
    openModal,
    closeModal,
  };

  // 실제로 game.js가 쓰는 인터페이스는 최종적으로 여기서 export
  // (toast/extras 파일이 showFinishPopup 등을 추가로 붙임)
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
    // showFinishPopup은 ui-toast.js에서 붙임
  };
})();
