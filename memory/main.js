// /memory/main.js
// 모든 게임 로직 통합 파일 (바이브 코딩 최적화)

(function(){
  // ============================================================
  // [Config] - 게임 설정값 (원래 config.js에서 통합)
  // ============================================================
  const C = {
    VERSION: "v1.51",
    TIMEZONE: "Asia/Seoul",
    EMOJIS: [
      '🐶','🐱', // 기본 안정감, 가장 무난
      '🐰','🐹', // 작고 조용한 친구들
      '🐼','🐨', // 느긋함, 차분함
      '🐸','🐥', // 부드럽고 가벼운 생명감
      '🐧','🐢', // 느림·집중·인내 (하루마음 핵심)
      '🐮','🐷'  // 온순함, 평온함
    ],
    LEVEL_MAP: {
      "4x3": [3,4],   // 6쌍만 유지
    },
    // 틀렸을 때 다시 뒤집히는 시간(ms)
    MISMATCH_MS: 700,
    KEYS: {
      BIG: "harumind_memory_big",
    },
  };

  // ============================================================
  // [Storage helpers]
  // ============================================================
  function todayKey(){
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function safeGet(key){
    try{
      return localStorage.getItem(key) || "";
    }catch(e){
      return "";
    }
  }

  function safeSet(key, val){
    try{
      localStorage.setItem(key, val);
    }catch(e){}
  }

  function getBool(key, def=false){
    const v = safeGet(key);
    if(v === "1" || v === "true") return true;
    if(v === "0" || v === "false") return false;
    return def;
  }

  function setBool(key, val){
    safeSet(key, val ? "1" : "0");
  }

  window.HarumindStorage = {
    todayKey,
    getBool,
    setBool,
  };

  // ============================================================
  // [UI/Effects] - UI 공통, 설정, 효과음, 토스트, 폭죽, BGM 등
  // ============================================================

  // DOM 요소
  const board = document.getElementById("board");
  const msgEl = document.getElementById("msg");
  const hintEl = document.getElementById("hint");

  const sfxBtn  = document.getElementById("sfxBtn");
  const bigBtn  = document.getElementById("bigBtn");
  const homeBtn = document.getElementById("homeBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const mq = window.matchMedia("(max-width: 640px)");

  const peekBtn = document.getElementById("peekBtn");
  const peekSel = document.getElementById("peekSec");
  const howBtn   = document.getElementById("howBtn");
  const modalBack = document.getElementById("modalBack");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCard = document.getElementById("modalCard");
  const bgm = document.getElementById("bgmAudio");
  const bgmBtn = document.getElementById("bgmBtn");
  const themeSelect = document.getElementById("themeSelect");

  // 설정 상태
  let bigOn = HarumindStorage.getBool(C.KEYS.BIG, false);
  let bgmOn = false;
  let currentStateMsg = { msg: "", hint: "" };
  
  // tone 함수 통합: core.playSfx() 호출로 단순화
  const tone = (type = 'click') => core.playSfx(type);

  // 테마 적용 함수 - core 엔진 사용
  function applyTheme(themeKey){
    core.applyTheme(themeKey);
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

  // 비프음 (core 엔진 사용)
  function playBeep(freq=880, ms=70){
    core.playSfx('click');
  }

  // 메시지/통계
  function setMessage(msg, hint){
    // 페이드 아웃
    if(msgEl){
      msgEl.classList.add("fadeOut");
    }
    if(hintEl){
      hintEl.classList.add("fadeOut");
    }
    
    // 페이드 인
    setTimeout(() => {
      if(msgEl){
        msgEl.textContent = msg || "";
        msgEl.classList.remove("fadeOut");
      }
      if(hintEl){
        hintEl.textContent = hint || "";
        hintEl.classList.remove("fadeOut");
      }
    }, 200);
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

  // 모바일에서 설정 패널 열고 닫기
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

  // 잠깐보기 버튼
  function initPeekButton(){
    if(!peekBtn || !peekSel) return;

    function enterPeekMode(sec){
      document.body.classList.add("peeking");
    }

    function exitPeekMode(){
      document.body.classList.remove("peeking");
    }

    peekBtn.addEventListener('click', () => {
      peekBtn.disabled = true;

      // 힌트모드 진입(4초)
      enterPeekMode(4);

      // 기존 로직 유지: 4초 보기 트리거
      peekSel.value = "4";
      peekSel.dispatchEvent(new Event('change', { bubbles: true }));

      // 끝나면 원복
      setTimeout(() => {
        peekSel.value = "";
        peekBtn.disabled = false;
        exitPeekMode();
      }, 2200);
    });
  }

  // 방법 보기 모달
  function initHowModal(){
    const hBtn = document.getElementById("howBtn");
    const mBack = document.getElementById("modalBack");
    const mClose = document.getElementById("modalCloseBtn");

    if(!hBtn || !mBack) return;

    const open = () => { 
      mBack.style.display = "flex";
      mBack.classList.add("isOpen");
    };
    const close = () => { 
      mBack.style.display = "none";
      mBack.classList.remove("isOpen");
    };

    hBtn.addEventListener('click', open);

    if(mClose) {
      mClose.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
      });
    }

    mBack.addEventListener('click', (e) => {
      if(e.target === mBack) close();
    });

    document.addEventListener('keydown', (e) => {
      if(e.key === "Escape" && mBack.style.display === "flex") close();
    });
  }
  
  // BGM 이어듣기
  const BGM_KEY_ON   = "harumind_bgm";
  const BGM_KEY_TIME = "harumind_bgm_time";

  // 배경음악 트랙을 랜덤으로 선택
  function selectRandomTrack(){
    const tracks = [
      "./assets/audio/piano1.mp3",
      "./assets/audio/piano2.mp3",
      "./assets/audio/piano3.mp3",
      "./assets/audio/acoustic1.mp3",
      "./assets/audio/acoustic2.mp3",
      "./assets/audio/acoustic3.mp3",
      "./assets/audio/bgm.mp3",
    ];
    if(!tracks.length) return "";
    const idx = Math.floor(Math.random() * tracks.length);
    return tracks[idx];
  }

  // 배경음악 재생 함수
  async function playBgm(){
    if(!bgm) return;
    try{
      bgm.play().catch((e) => {
        console.log("BGM play error:", e.message);
      });
    }catch(e){
      console.log("BGM play error:", e);
    }
  }

  // 성공 효과음
  function playSuccessSound(){
    core.playSfx('ding');
  }

  // 실패 효과음
  function playFailSound(){
    core.playSfx('error');
  }

  function initBgm(){
    if(!bgm || !bgmBtn) return;

    bgm.volume = 0.15;
    bgm.loop = false; // 한 곡만 반복되지 않도록 false로 설정
    bgm.muted = false;

    // 기본 곡 설정 (랜덤 선택)
    bgm.src = selectRandomTrack();

    // 디폴트는 무조건 꺼짐
    bgmOn = false;
    bgm.pause(); // 명시적으로 일시정지하여 자동 재생 방지
    let loadedOnce = false;

    // 로컬 스토리지에서 불러오지 않고, 무조건 꺼짐 상태 유지
    // 사용자가 버튼을 눌렀을 때만 저장됨

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
      bgmBtn.innerHTML = bgmOn ? "🎵 배경" : "🔇 배경";
      bgmBtn.style.opacity = bgmOn ? '1' : '0.6';
    }

    function saveOn(){
      try{ localStorage.setItem(BGM_KEY_ON, bgmOn ? "1" : "0"); }catch(e){}
    }

    let timeSaveTimer = null;
    function startTimeSaver(){
      stopTimeSaver();
      timeSaveTimer = setInterval(() => {
        if(!bgmOn) return;
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

      await playBgm();
    }

    function stop(){
      try{
        localStorage.setItem(BGM_KEY_TIME, String(bgm.currentTime || 0));
      }catch(e){}
      bgm.pause();
      stopTimeSaver();
    }

    bgmBtn.addEventListener("click", async () => {
      if(!bgmOn){
        bgmOn = true;
        saveOn();
        setLabel();
        try{
          await safePlay();
          startTimeSaver();
        }catch(e){
          bgmOn = false;
          saveOn();
          setLabel();
          console.log("BGM play error:", e);
          alert("배경음악 재생이 막혔거나 로딩에 실패했어요.\n(휴대폰 무음/블루투스/브라우저 정책/네트워크 확인)");
        }
      }else{
        bgmOn = false;
        saveOn();
        setLabel();
        stop();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if(document.hidden && bgmOn){
        stop();
      }
    });

    bgm.addEventListener("ended", () => {
      if(bgmOn){
        bgm.src = selectRandomTrack();
        playBgm();
      }
    });

    bgm.addEventListener("error", () => {
      if(bgmOn){
        bgmOn = false;
        saveOn();
        setLabel();
        stopTimeSaver();
      }
    });

    setLabel();
  }

  // ============================================================
  // [Logic] - 게임 로직 (카드 생성/클릭/매칭/콤보/기록 저장)
  // ============================================================

  let selectedLevel = "4x3"; // 기본값: 보통 (6쌍)
  let dateStr = HarumindStorage.todayKey();
  let first = null;
  let lock = false;
  let matched = 0;
  let totalPairs = 0;
  let peekTimer = null;
  let tempMsgTimer = null;

  function seededCards(level, customSeed){
    const map = C.LEVEL_MAP;
    const [r,c] = map[level];
    totalPairs = (r*c)/2;

    if(board) board.style.gridTemplateColumns = `repeat(${c},1fr)`;

    // customSeed가 있으면 사용, 없으면 dateStr + level 사용 (공식 배치)
    const seed = customSeed || (dateStr + level);
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

  function build(autoPeekSec, useRandomSeed = false){
    clearPeekTimer();
    clearTempMsgTimer();
    if(board) board.innerHTML = "";
    first = null;
    lock = false;
    matched = 0;
    totalPairs = 0;
    
    const level = selectedLevel;
    // useRandomSeed가 true면 새로운 랜덤 seed 생성, false면 dateStr 기반 공식 배치
    let customSeed = null;
    if(useRandomSeed){
      customSeed = Math.random().toString(36).substring(2, 15) + level;
    }
    const cards = seededCards(level, customSeed);
    
    setStateMessage("천천히 찾아보세요", "");
    
    // 힌트 버튼 리셋
    if(peekBtn){
      peekBtn.disabled = false;
    }

    cards.forEach((emoji, index)=>{
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.state = "down";
      t.dataset.emoji = emoji;
      t.onclick = () => clickTile(t);
      // 페이드 인 효과를 위한 초기 투명도
      t.style.opacity = "0";
      if(board) {
        board.appendChild(t);
      } else {
        console.error('[ERROR] board가 null입니다!');
      }
      
      // 각 카드에 순차적으로 페이드 인 적용
      setTimeout(() => {
        t.style.transition = "opacity 0.4s ease-in";
        t.style.opacity = "1";
      }, index * 10); // 10ms씩 간격을 두어 자연스럽게
    });

    // 게임 보드 위치로 부드럽게 스크롤
    if(board){
      setTimeout(() => {
        board.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    // 게임 진행 중 힌트 버튼 표시
    if(peekBtn){
      peekBtn.style.display = "";
    }

    if(typeof autoPeekSec === "number" && autoPeekSec > 0){
      doPeek(autoPeekSec);
    }

    // 랜덤 BGM 선택 및 재생
    bgm.src = selectRandomTrack();
    if(bgmOn){
      playBgm();
    }
  }

  // 게임 진행 중인지 확인
  function isGameInProgress(){
    return first !== null || peekTimer !== null || matched > 0;
  }

  function clickTile(t){
    if(lock || t.dataset.state === "up" || t.classList.contains("matched")) return;

    // 즉시 UI 업데이트 (성능 최우선)
    t.dataset.state = "up";

    if(!first){
      first = t;
      setStateMessage("잘 보고 있어요", "");
      return;
    }

    lock = true;
    clearTempMsgTimer();

    // 두 번째 카드 확인 시간을 주기 위해 약간의 지연 (손맛을 위한 미세 조정)
    setTimeout(() => {
      if(first.dataset.emoji === t.dataset.emoji){
        first.classList.add("matched");
        t.classList.add("matched");

        matched++;

        // 맑은 실로폰 느낌의 성공음 재생
        playSuccessSound();

        if(matched < totalPairs){
          setStateMessage("조용히 잘 이어가고 있어요", "천천히 이어가면 돼요");
        }

        first = null;
        lock = false;

        if(matched === totalPairs){
          finishGame();
        }

      }else{
        playFailSound();
        setMessage("괜찮아요", "");

        setTimeout(()=>{
          first.dataset.state = "down";
          t.dataset.state = "down";
          first = null;
          lock = false;
          
          setStateMessage("천천히 찾아보세요", "");
        }, C.MISMATCH_MS);
      }
    }, 100); // 100ms 지연으로 두 번째 카드 확인 시간 제공
  }

  function finishGame(){
    clearTempMsgTimer();
    setStateMessage("모든 친구들을 찾았어요 🌿", "");

    if(peekBtn){
      peekBtn.style.display = "none";
    }

    showResultModal();
  }

  // 결과 모달 표시
  function showResultModal(){
    const resultModalBack = document.getElementById("resultModalBack");
    const resultEmoji = document.getElementById("resultEmoji");
    const resultMessage = document.getElementById("resultMessage");
    const resultRestartBtn = document.getElementById("resultRestartBtn");

    if(!resultModalBack) return;

    const messages = [
      "차분하게 마무리했어요.",
      "괜찮아요, 천천히 했으니까요.",
      "조용한 마음으로 잘 이어갔어요.",
    ];

    if(resultEmoji) resultEmoji.textContent = "🌿";
    if(resultMessage) resultMessage.textContent = messages[Math.floor(Math.random() * messages.length)];

    resultModalBack.classList.add("isOpen");

    if(resultRestartBtn){
      const handleRestart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resultModalBack.classList.remove("isOpen");
        setTimeout(() => build(4, true), 80);
      };

      resultRestartBtn.replaceWith(resultRestartBtn.cloneNode(true));
      const newRestartBtn = document.getElementById("resultRestartBtn");
      if(newRestartBtn){
        newRestartBtn.addEventListener('click', handleRestart);
      }
    }

    const closeOnBackdrop = (e) => {
      if(e.target === resultModalBack){
        resultModalBack.classList.remove("isOpen");
        resultModalBack.removeEventListener('click', closeOnBackdrop);
      }
    };
    resultModalBack.addEventListener('click', closeOnBackdrop);
  }

  function doPeek(sec){
    if(lock) return;

    lock = true; // 힌트 중에는 다른 카드 클릭 막기
    clearPeekTimer();

    // 게임 보드 위치로 스크롤
    if(board){
      board.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if(board){
      // 1단계: 매칭되지 않은 모든 카드를 앞면으로 보여주기
      const allCards = [...board.children];
      allCards.forEach(t => {
        if(!t.classList.contains("matched")){
          t.dataset.state = "up";
        }
      });

      // 2단계: 힌트 시간이 끝나면 모든 카드를 일괄 닫기 (사용자가 열어둔 카드도 포함)
      peekTimer = setTimeout(()=>{
        if(board){
          allCards.forEach(t => {
            if(!t.classList.contains("matched")){
              t.dataset.state = "down";
            }
          });
        }
        setStateMessage("🌿 천천히 찾아보세요", "");
        lock = false;
        peekTimer = null;
      }, sec * 1000);
    } else {
      // board가 없는 경우에도 lock 해제
      peekTimer = setTimeout(()=>{
        lock = false;
        peekTimer = null;
      }, sec * 1000);
    }

    setMessage("잠깐 보고 기억해요", "친구들이 조용히 숨어 있어요.");
  }

  // 하단 토스트 메시지 표시
  // 이벤트
  if(peekSel) peekSel.onchange = () => {
    doPeek(4);
    peekSel.value = "";
  };

  // ============================================================
  // 초기화
  // ============================================================

  dateStr = HarumindStorage.todayKey();

  setBigMode(bigOn);
  core.updateSfxUi(); // core에서 UI 동기화

  if(bigBtn) bigBtn.onclick = () => setBigMode(!bigOn);
  
  // Home 버튼
  if(homeBtn) {
    homeBtn.addEventListener('click', () => {
      core.playSfx('click');
      window.location.href = '../index.html';
    });
  }
  
  // SFX/BGM 버튼은 core.js에서 자동 처리됨 (bindUI에서)
  
  // 테마 선택 이벤트
  if(themeSelect){
    themeSelect.value = core.currentTheme;
    themeSelect.onchange = () => {
      applyTheme(themeSelect.value);
      core.playSfx('click');
    };
  }
  
  // 초기 테마 적용
  applyTheme(core.currentTheme);

  // UI 초기화
  initPeekButton();
  initHowModal();
  initBgm();

  // 난이도 선택 UI 제거: 단일 난이도(4x3)로 자동 시작

  // HarumindUI export
  window.HarumindUI = {
    board,
    dateStr,
    setMessage,
    playBeep,
    openModal,
    closeModal,
  };

  // 첫 진입
  build(4);
})();

