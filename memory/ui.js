// /memory/ui.js
// 화면 업데이트 + 팝업 + 효과음 + 보상 연출

(function(){
  const C = window.HARUMIND_CONFIG;

  // DOM
  const board = document.getElementById("board");
  const matchedEl = document.getElementById("matched");
  const scoreEl = document.getElementById("score");
  const msgEl = document.getElementById("msg");
  const hintEl = document.getElementById("hint");

  // (있을 수도/없을 수도 있는 요소들)
  const todayKeyEl = document.getElementById("todayKey");
  const todayClearEl = document.getElementById("todayClear");
  const todayBestEl = document.getElementById("todayBest");

  const sfxBtn = document.getElementById("sfxBtn");
  const bigBtn = document.getElementById("bigBtn");

  // 상태(설정)
  let sfxOn = HarumindStorage.getBool(C.KEYS.SFX, true);
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);

  function setBigMode(on){
    bigOn = !!on;
    HarumindStorage.setBool(C.KEYS.BIG, bigOn);
    document.body.classList.toggle("bigText", bigOn);
    if(bigBtn) bigBtn.textContent = bigOn ? "🔎 큰 글씨: 켜짐" : "🔎 큰 글씨: 끄기";
  }

  function setSfx(on){
    sfxOn = !!on;
    HarumindStorage.setBool(C.KEYS.SFX, sfxOn);
    if(sfxBtn) sfxBtn.textContent = sfxOn ? "🔔 효과음: 끄기" : "🔕 효과음: 켜기";
  }

  // 비프톤
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

  // ✅ +10 리워드(화면 기준 fixed + 화면 밖 방지)
  function showReward(tile, text){
    const r = document.createElement("div");
    r.className = "reward";
    r.textContent = text;

    const rect = tile.getBoundingClientRect();

    // 타일 중앙(화면 기준)
    let x = rect.left + rect.width / 2;
    let y = rect.top  + rect.height / 2;

    // 화면 밖으로 나가면 스크롤/흔들림이 생길 수 있어 제한
    const pad = 12;
    x = Math.max(pad, Math.min(window.innerWidth  - pad, x));
    y = Math.max(pad, Math.min(window.innerHeight - pad, y));

    r.style.left = x + "px";
    r.style.top  = y + "px";

    document.body.appendChild(r);
    setTimeout(()=>r.remove(), 900);
  }

  // ✅ 페이지 메시지 (msg는 pre-line이라 \n 줄바꿈 가능)
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

  // 방법 보기(모달) — index.html에서 처리하므로, 여기서는 함수만 남김(호환용)
  function openModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "flex";
  }
  function closeModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "none";
  }

  // =========================
  // 초기 세팅
  // =========================
  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;

  renderDaily(dateStr);

  setBigMode(bigOn);
  setSfx(sfxOn);

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);

  // 외부 공개
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
  };
})();
