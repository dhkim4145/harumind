// /memory/ui-extras.js
// 오늘현황 토글 / 잠깐보기 / 방법보기 / 배경음악(BGM 이어듣기)
(function(){
  const S = window.HarumindUIState;
  if(!S) return;

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

  // ✅ 오늘 현황 토글 (현재 index에서 statsWrap/statsToggle 없으면 자동으로 아무것도 안 함)
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

    // ✅ 힌트모드 진입(2초)
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

    bgm.volume = 0.35;
    bgm.muted = false;

    // ✅ 디폴트는 무조건 꺼짐 (자동재생 정책 + UI/실동작 불일치 방지)
    let on = false;
    let loadedOnce = false;

    // ✅ 저장값이 있어도 "처음 진입 자동 켜짐"은 하지 않음
    //    (원하면 사용자가 버튼 눌러서 켜는 순간부터 적용)
    //    단, 키가 아예 없으면 명시적으로 0 저장해서 상태를 고정
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
      // 기존 톤 유지
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
      // 탭 이동/잠금 시 끄고 시간 저장
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

    // ✅ 첫 진입은 항상 꺼짐으로 표시 + 자동 재생 없음
    setLabel();
  }

  // 초기화 실행
  initStatsToggle();
  initPeekButton();
  initHowModal();
  initBgm();
})();

// ===============================
// ❓ 방법 보기 버튼 (모달 열기)
// ===============================
(function(){
  const howBtn = document.getElementById("howBtn");
  const modalBack = document.getElementById("modalBack");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  if(howBtn && modalBack){
    howBtn.addEventListener("click", function(){
      modalBack.classList.add("isOpen");
    });
  }

  if(modalCloseBtn && modalBack){
    modalCloseBtn.addEventListener("click", function(){
      modalBack.classList.remove("isOpen");
    });
  }
})();
