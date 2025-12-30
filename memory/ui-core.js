// /memory/ui-core.js
// UI 공통 + 설정(큰글씨/효과음) + HarumindUI export
(function(){
  const C = window.HARUMIND_CONFIG;

  // DOM
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

  // ===== +점수 리워드 =====
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

    setTimeout(() => pill.classList.remove("spin"), 1200); // ✅ 체감 길면 여기 900~1200 추천
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

  // ===== 모달 =====
  function openModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "flex";
  }
  function closeModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "none";
  }

  // ===== 모바일에서 난이도 select 텍스트 간소화 =====
  function simplifyLevelText(){
    const levelSel = document.getElementById("level");
    if(!levelSel) return;
    
    const isMobile = window.innerWidth <= 520;
    if(!isMobile) return;
    
    // 모바일에서만 옵션 텍스트 간소화 (value는 유지)
    Array.from(levelSel.options).forEach(opt => {
      const text = opt.textContent;
      // "(2x2)", "(3x2)", "(4x3)" 패턴 제거
      const simplified = text.replace(/\s*\([^)]+\)\s*/, "");
      if(simplified !== text){
        opt.textContent = simplified;
      }
    });
  }

  // ===== 초기 세팅 =====
  const dateStr = HarumindStorage.todayKey();
  if(todayKeyEl) todayKeyEl.textContent = dateStr;

  renderDaily(dateStr);
  setBigMode(bigOn);
  setSfx(sfxOn);
  simplifyLevelText(); // 모바일에서 난이도 텍스트 간소화

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  if(sfxBtn) sfxBtn.onclick = () => setSfx(!sfxOn);

  // ✅ 다른 파일들이 접근할 수 있도록 "공유 상태"
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

  // 기본 export
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
  };
})();


// ===== 완료 상태 UI (작은 바 형태로, 카드 크기 안 커지게) =====
(function(){
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

  // ✅ game.js가 호출: UI.setFinishState(...)
  HarumindUI.setFinishState = function({ title, message, buttonText, hint, onRestart }){
    const bar = ensureBar();
    if(!bar) return;

    // bar만 갱신 (msg/hint는 그대로 두어서 카드가 안 커짐)
    bar.innerHTML = `
      <div class="hmFinishText">
        <div class="hmFinishTitle">${title || "🎉 오늘의 게임 완료!"}</div>
        <div class="hmFinishSub">${hint || "난이도는 위에서 바꿀 수 있어요"}</div>
      </div>
      <button class="hmFinishBtn" type="button">${buttonText || "🔁 다시 해볼까요?"}</button>
    `;

    const btn = bar.querySelector(".hmFinishBtn");
    if(btn) btn.onclick = () => onRestart && onRestart();
  };

  HarumindUI.clearFinishState = function(){
    const bar = document.getElementById("hmFinishBar");
    if(bar) bar.remove();
  };
})();
