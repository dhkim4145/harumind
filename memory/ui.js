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
  // 🎉 완료 연출 (팝업 대신)
  // - 효과음 + 폭죽(컨페티) + 토스트(자동 사라짐)
  // - 화면을 막지 않음(클릭/스크롤 방해 최소)
  // - game.js가 기존 showFinishPopup을 호출해도 동작하도록 "이름 유지"
  // =========================

  function ensureFinishFxStyles(){
    if(document.getElementById("hmFinishFxStyle")) return;

    const style = document.createElement("style");
    style.id = "hmFinishFxStyle";
    style.textContent = `
      .hmFxWrap{
        position:fixed; inset:0;
        pointer-events:none;
        z-index:9999;
      }
      .hmConfetti{
        position:absolute;
        left:50%; top:14%;
        width:1px; height:1px;
      }
      .hmConfetti i{
        position:absolute;
        width:8px; height:12px;
        border-radius:3px;
        opacity:.95;
        transform: translate3d(0,0,0) rotate(0deg);
        animation: hmConfettiFall 1100ms ease-out forwards;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,.35));
      }
      @keyframes hmConfettiFall{
        0%   { transform: translate3d(var(--x0), 0px, 0) rotate(0deg); opacity:0; }
        10%  { opacity:1; }
        100% { transform: translate3d(var(--x1), 520px, 0) rotate(var(--rot)); opacity:0; }
      }

      .hmToast{
        position:fixed;
        left:50%;
        bottom:18px;
        transform:translateX(-50%);
        max-width:min(560px, calc(100% - 24px));
        background: rgba(18,24,45,.92);
        color:#e8ecff;
        border:1px solid rgba(255,255,255,.10);
        border-radius:16px;
        padding:12px 14px;
        box-shadow: 0 18px 40px rgba(0,0,0,.40);
        backdrop-filter: blur(10px);
        pointer-events:auto;
        z-index:10000;
        animation: hmToastIn 160ms ease-out forwards;
      }
      @keyframes hmToastIn{
        from{ transform:translateX(-50%) translateY(10px); opacity:0; }
        to  { transform:translateX(-50%) translateY(0px);  opacity:1; }
      }
      .hmToast.fadeOut{
        animation: hmToastOut 220ms ease-in forwards;
      }
      @keyframes hmToastOut{
        to{ transform:translateX(-50%) translateY(10px); opacity:0; }
      }
      .hmToastTop{
        font-weight:800;
        font-size:16px;
        letter-spacing:.2px;
        margin-bottom:4px;
      }
      .hmToastSub{
        font-size:13px;
        color: rgba(233,238,255,.82);
        line-height:1.35;
      }
      .hmToastRow{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-top:10px;
      }
      .hmToastBtn{
        border:none;
        padding:10px 12px;
        border-radius:999px;
        background: rgba(110,231,183,.18);
        color:#e8ecff;
        font-weight:700;
        cursor:pointer;
      }
      .hmToastBtn:active{ transform: scale(.98); }
    `;
    document.head.appendChild(style);
  }

  function playFinishJingle(){
    // 짧고 기분좋은 3음 (너무 길면 부담)
    playBeep(880, 70, 0.03);
    setTimeout(()=>playBeep(1174, 70, 0.03), 90);
    setTimeout(()=>playBeep(1568, 90, 0.03), 180);
  }

  function spawnConfetti(){
    ensureFinishFxStyles();

    const wrap = document.createElement("div");
    wrap.className = "hmFxWrap";

    const conf = document.createElement("div");
    conf.className = "hmConfetti";
    wrap.appendChild(conf);

    // 색 6종 (너무 화려하지 않게, 어두운 테마에 잘 보이게)
    const colors = ["#6ee7b7","#60a5fa","#fbbf24","#f472b6","#a78bfa","#34d399"];

    // 파편 수 (과하면 산만해서 22개 정도)
    const N = 22;
    for(let i=0;i<N;i++){
      const p = document.createElement("i");
      const c = colors[i % colors.length];
      p.style.background = c;

      // 시작/종료 x, 회전 랜덤
      const x0 = (Math.random()*220 - 110).toFixed(1) + "px";
      const x1 = (Math.random()*520 - 260).toFixed(1) + "px";
      const rot = (Math.random()*720 - 360).toFixed(0) + "deg";

      p.style.setProperty("--x0", x0);
      p.style.setProperty("--x1", x1);
      p.style.setProperty("--rot", rot);

      // 각자 지연 조금씩
      p.style.animationDelay = (Math.random()*120).toFixed(0) + "ms";

      conf.appendChild(p);
    }

    document.body.appendChild(wrap);

    // 자동 제거
    setTimeout(()=>wrap.remove(), 1300);
  }

  function showFinishToast({title, sub, dateStr, onRestart}){
    ensureFinishFxStyles();

    // 기존 토스트가 있으면 제거(중복 방지)
    const old = document.getElementById("hmFinishToast");
    if(old) old.remove();

    const d = HarumindStorage.loadDaily(dateStr);
    const extra = `오늘 완료: ${d.clears}회 · 오늘 최고: ${d.best}점`;

    const toast = document.createElement("div");
    toast.className = "hmToast";
    toast.id = "hmFinishToast";

    toast.innerHTML = `
      <div class="hmToastTop">${title || "완료! 정말 잘하셨어요 🎉"}</div>
      <div class="hmToastSub">${(sub || "오늘은 이 카드로 놀아보세요 🙂<br/>내일은 또 다른 카드가 나와요.")}</div>
      <div class="hmToastSub" style="margin-top:6px; font-weight:700; color:#e8ecff;">${extra}</div>
      <div class="hmToastRow">
        <div class="hmToastSub" style="margin:0;">다시 하려면 버튼을 눌러주세요</div>
        <button class="hmToastBtn" type="button">새로 시작</button>
      </div>
    `;

    const btn = toast.querySelector(".hmToastBtn");
    btn.onclick = () => {
      // 즉시 사라지고 리셋
      toast.classList.add("fadeOut");
      setTimeout(()=>toast.remove(), 240);
      if(typeof onRestart === "function") onRestart();
    };

    document.body.appendChild(toast);

    // 자동으로 사라짐 (너무 빨리 꺼지면 아쉬워서 2.4초)
    setTimeout(()=>{
      if(!toast.isConnected) return;
      toast.classList.add("fadeOut");
      setTimeout(()=>toast.remove(), 240);
    }, 2400);
  }

  // ✅ 기존 이름 유지: game.js 수정 없이 "팝업 대신 연출"로 바꿈
  function showFinishPopup({title, sub, dateStr, onRestart}){
    // 화면 메시지는 남겨도 되고(이미 화면에 완료 문구 있으면 생략 가능)
    // 여기서는 "너무 떠들지 않게" 힌트는 비움
    setMessage("완료! 정말 잘하셨어요 🎉", "");

    // 효과음 + 폭죽 + 토스트(자동 사라짐)
    playFinishJingle();
    spawnConfetti();
    showFinishToast({title, sub, dateStr, onRestart});
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
    showFinishPopup, // 이름 그대로 유지
  };
})();
