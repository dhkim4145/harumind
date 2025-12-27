// /memory/ui.js
// 화면 업데이트 + 효과음 + 보상 연출 (완료 팝업 제거 → 토스트+폭죽)

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

  const sfxBtn = document.getElementById("sfxBtn");
  const bigBtn = document.getElementById("bigBtn");

  // 상태
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

  // 효과음
  function playBeep(freq=880, ms=70, gain=0.03){
    if(!sfxOn) return;
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = 0;

      osc.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      g.gain.linearRampToValueAtTime(gain, now + 0.01);
      g.gain.linearRampToValueAtTime(0, now + ms/1000);

      osc.start(now);
      osc.stop(now + ms/1000 + 0.02);
      osc.onended = () => ctx.close();
    }catch(e){}
  }

  // 카드 점수 연출
  function showReward(tile, text){
    const r = document.createElement("div");
    r.className = "reward";
    r.textContent = text;

    const rect = tile.getBoundingClientRect();
    r.style.left = (rect.left + rect.width/2) + "px";
    r.style.top  = (rect.top  + rect.height/2) + "px";

    document.body.appendChild(r);
    setTimeout(()=>r.remove(), 900);
  }

  function setMessage(msg, hint){
    if(msgEl)  msgEl.innerHTML = msg || "";
    if(hintEl) hintEl.textContent = hint || "";
  }

  function renderStats({matched, score}){
    if(matchedEl) matchedEl.textContent = matched;
    if(scoreEl)   scoreEl.textContent   = score;
  }

  function renderDaily(dateStr){
    const d = HarumindStorage.loadDaily(dateStr);
    if(todayClearEl) todayClearEl.textContent = d.clears;
    if(todayBestEl)  todayBestEl.textContent  = d.best;
  }

  function openModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "flex";
  }
  function closeModal(){
    const m = document.getElementById("modalBack");
    if(m) m.style.display = "none";
  }

  // =========================
  // 🎉 완료 연출 (중앙 근처 + 4초)
  // =========================

  function ensureFxStyle(){
    if(document.getElementById("hmFxStyle")) return;

    const s = document.createElement("style");
    s.id = "hmFxStyle";
    s.textContent = `
      .hmFxWrap{ position:fixed; inset:0; pointer-events:none; z-index:9999; }
      .hmConfetti{ position:absolute; left:50%; top:18%; }
      .hmConfetti i{
        position:absolute; width:8px; height:12px; border-radius:3px;
        animation: hmFall 1100ms ease-out forwards;
      }
      @keyframes hmFall{
        0%{ transform:translate(var(--x0),0) rotate(0deg); opacity:0 }
        10%{ opacity:1 }
        100%{ transform:translate(var(--x1),520px) rotate(var(--r)); opacity:0 }
      }

      .hmToast{
        position:fixed;
        left:50%;
        top:58%;
        transform:translateX(-50%);
        background:rgba(18,24,45,.92);
        color:#e8ecff;
        border-radius:16px;
        padding:14px 16px;
        box-shadow:0 18px 40px rgba(0,0,0,.4);
        z-index:10000;
        animation: hmIn .15s ease-out;
      }
      @keyframes hmIn{ from{opacity:0; transform:translate(-50%,10px)} to{opacity:1} }
      .hmOut{ animation: hmOut .22s ease-in forwards }
      @keyframes hmOut{ to{opacity:0; transform:translate(-50%,10px)} }

      .hmTitle{ font-size:18px; font-weight:800; margin-bottom:6px }
      .hmSub{ font-size:14px; margin-bottom:12px }
      .hmRow{ display:flex; justify-content:space-between; align-items:center; gap:12px }
      .hmBtn{
        border:none; border-radius:999px; padding:10px 14px;
        background:rgba(110,231,183,.18); color:#fff; font-weight:700;
      }
    `;
    document.head.appendChild(s);
  }

  function playFinishSound(){
    playBeep(880,70,0.03);
    setTimeout(()=>playBeep(1170,70,0.03),100);
    setTimeout(()=>playBeep(1560,90,0.03),200);
  }

  function confetti(){
    ensureFxStyle();
    const wrap = document.createElement("div");
    wrap.className = "hmFxWrap";
    const box = document.createElement("div");
    box.className = "hmConfetti";
    wrap.appendChild(box);

    const colors = ["#6ee7b7","#60a5fa","#fbbf24","#f472b6","#a78bfa"];
    for(let i=0;i<22;i++){
      const p = document.createElement("i");
      p.style.background = colors[i%colors.length];
      p.style.setProperty("--x0", (Math.random()*200-100)+"px");
      p.style.setProperty("--x1", (Math.random()*500-250)+"px");
      p.style.setProperty("--r",  (Math.random()*720-360)+"deg");
      box.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(()=>wrap.remove(),1300);
  }

  function showFinishToast(onRestart){
    ensureFxStyle();

    const old = document.getElementById("hmToast");
    if(old) old.remove();

    const toast = document.createElement("div");
    toast.id = "hmToast";
    toast.className = "hmToast";
    toast.innerHTML = `
      <div class="hmTitle">완료! 정말 잘하셨어요 🎉</div>
      <div class="hmSub">오늘은 여기까지 🙂</div>
      <div class="hmRow">
        <div class="hmSub" style="margin:0">다시 하려면 ‘새로 시작’</div>
        <button class="hmBtn">새로 시작</button>
      </div>
    `;

    toast.querySelector(".hmBtn").onclick = ()=>{
      toast.classList.add("hmOut");
      setTimeout(()=>toast.remove(),220);
      if(typeof onRestart==="function") onRestart();
    };

    document.body.appendChild(toast);

    setTimeout(()=>{
      if(!toast.isConnected) return;
      toast.classList.add("hmOut");
      setTimeout(()=>toast.remove(),220);
    }, 4000);
  }

  // 🔑 game.js에서 호출되는 함수 (이름 유지)
  function showFinishPopup({onRestart}){
    setMessage("완료! 정말 잘하셨어요 🎉","");
    playFinishSound();
    confetti();
    showFinishToast(onRestart);
  }

  // 초기 세팅
  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;
  renderDaily(dateStr);

  setBigMode(bigOn);
  setSfx(sfxOn);

  if(bigBtn) bigBtn.onclick = ()=>setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = ()=>setSfx(!sfxOn);

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
    showFinishPopup
  };
})();
