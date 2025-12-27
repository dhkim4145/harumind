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
    bigBtn.textContent = bigOn ? "🔎 큰 글씨: 켜짐" : "🔎 큰 글씨: 끄기";
  }

  function setSfx(on){
    sfxOn = !!on;
    HarumindStorage.setBool(C.KEYS.SFX, sfxOn);
    sfxBtn.textContent = sfxOn ? "🔔 효과음: 끄기" : "🔕 효과음: 켜기";
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

  function showReward(tile, text){
    const r = document.createElement("div");
    r.className = "reward";
    r.textContent = text;

    const rect = tile.getBoundingClientRect();
    r.style.left = (rect.left + rect.width/2) + "px";
    r.style.top  = (rect.top + rect.height/2) + "px";

    document.body.appendChild(r);
    setTimeout(()=>r.remove(), 900);
  }

  // ✅ 페이지 메시지 (HTML 허용)
  function setMessage(msg, hint){
    msgEl.innerHTML = msg || "";
    hintEl.textContent = hint || "";
  }

  function renderStats({matched, score}){
    matchedEl.textContent = matched;
    scoreEl.textContent = score;
  }

  function renderDaily(dateStr){
    const d = HarumindStorage.loadDaily(dateStr);
    todayClearEl.textContent = d.clears;
    todayBestEl.textContent = d.best;
  }

  // 방법 보기
  function openModal(){
    document.getElementById("modalBack").style.display = "flex";
  }
  function closeModal(){
    document.getElementById("modalBack").style.display = "none";
  }

  // =========================
  // 완료 팝업
  // =========================
  function showFinishPopup({title, sub, dateStr, onRestart}){
    const back = document.createElement("div");
    back.className = "finishBack";

    const card = document.createElement("div");
    card.className = "finishCard";

    const d = HarumindStorage.loadDaily(dateStr);
    const extra = `오늘 완료: ${d.clears}회 · 오늘 최고: ${d.best}점`;

    card.innerHTML = `
      <div class="big">${title}</div>
      <div class="small">
        ${sub}<br/>
        <b style="color:#e8ecff">${extra}</b>
      </div>
      <div class="actions">
        <button id="finishRestartBtn">새로 시작</button>
        <button id="finishCloseBtn">확인</button>
      </div>
    `;

    document.body.appendChild(back);
    document.body.appendChild(card);

    const cleanup = () => {
      back.remove();
      card.remove();
    };

    // 새로 시작 → 리셋 (메시지 안 남김)
    card.querySelector("#finishRestartBtn").onclick = () => {
      cleanup();
      if(typeof onRestart === "function") onRestart();
    };

    // ✅ 확인 → 팝업 닫고, 페이지 메시지는 "다른 안내"
    card.querySelector("#finishCloseBtn").onclick = () => {
      cleanup();
      setMessage("다시 하려면 ‘새로 시작’을 눌러주세요 🙂", "");
    };

    // 배경 클릭 닫기 (원하면)
    // back.onclick = cleanup;
  }

  // =========================
  // 초기 세팅
  // =========================
  const dateStr = HarumindStorage.todayKey();
  todayKeyEl.textContent = dateStr;
  renderDaily(dateStr);

  setBigMode(bigOn);
  setSfx(sfxOn);

  bigBtn.onclick = () => setBigMode(!bigOn);
  sfxBtn.onclick = () => setSfx(!sfxOn);

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
    showFinishPopup,
  };
})();
