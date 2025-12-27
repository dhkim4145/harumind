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

  // (있을 수도/없을 수도 있는 요소들)  ← 방어코드 적용 대상
  const todayKeyEl = document.getElementById("todayKey");     // 날짜 표시용 (없어도 OK)
  const todayClearEl = document.getElementById("todayClear"); // 오늘 한 횟수 (없어도 OK)
  const todayBestEl = document.getElementById("todayBest");   // 오늘 최고 점수 (없어도 OK)

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

  // ✅ 페이지 메시지 (HTML 허용: <br/> 가능)
  function setMessage(msg, hint){
    if(msgEl) msgEl.innerHTML = msg || "";
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

  // 방법 보기 (팝업)
  function openModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "flex";
  }
  function closeModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "none";
  }

  // =========================
  // 완료 팝업 (밀림 방지: 스크롤 잠금 포함)
  // =========================
  function showFinishPopup({title, sub, dateStr, onRestart}){
    const back = document.createElement("div");
    back.className = "finishBack";

    const card = document.createElement("div");
    card.className = "finishCard";

    // ✅ 팝업 뜰 때 뒤 화면 스크롤 잠금 (밀림 방지)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      // ✅ 스크롤 원복
      document.body.style.overflow = prevOverflow;
    };

    // 새로 시작 → 리셋 (메시지 안 남김)
    card.querySelector("#finishRestartBtn").onclick = () => {
      cleanup();
      if(typeof onRestart === "function") onRestart();
    };

    // 확인 → 팝업 닫고, 페이지 메시지는 다른 안내
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

  // 날짜 표시 요소가 있으면만 넣기 (없어도 게임 정상)
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
    showFinishPopup,
  };
})();
