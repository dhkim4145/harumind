// /memory/main.js
// 모든 게임 로직 통합 파일 (바이브 코딩 최적화)

window.addEventListener('DOMContentLoaded', function() {
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
      // 앞면 아이콘 후보 (SVG key) - 8쌍 기본
      FRONT_ICONS: [
        'leaf', 'cloud', 'moon', 'flower', 'coffee', 'star', 'droplet', 'heart'
      ],
      // 앞면 아이콘별 파스텔톤 글로우 색상
      FRONT_GLOW: {
        leaf: 'rgba(110, 231, 183, 0.9)',
        cloud: 'rgba(180, 210, 255, 0.85)',
        moon: 'rgba(190, 210, 255, 0.9)',
        flower: 'rgba(255, 170, 200, 0.9)',
        coffee: 'rgba(255, 210, 170, 0.9)',
        star: 'rgba(255, 255, 200, 0.95)',
        droplet: 'rgba(120, 200, 255, 0.9)',
        heart: 'rgba(255, 150, 170, 0.95)'
      },
    LEVEL_MAP: {
      "4x3": [3,4],   // 6쌍만 유지
    },
    // 틀렸을 때 다시 뒤집히는 시간(ms)
    MISMATCH_MS: 700,
    KEYS: {
      BIG: "harumind_memory_big",
    },
    // 뒷면 아이콘 후보 (물음표 비중 높게)
    BACK_ICONS: ['question', 'question', 'question', 'breath', 'coffee', 'star'],
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
  // [UI/Effects] - UI 공통, 효과음, 메시지 등
  // ============================================================

  // DOM 요소
  const board = document.getElementById("board");

  const homeBtn = document.getElementById("homeBtn");
  const peekBtn = document.getElementById("peekBtn");
  const peekSel = document.getElementById("peekSec");
  const howBtn   = document.getElementById("howBtn");
  const modalBack = document.getElementById("modalBack");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCard = document.getElementById("modalCard");

  // 설정 상태 초기화
  function initSettings(){
    // localStorage에서 설정 불러오기
    const sfxMuted = getBool('sfxMuted', false); // 기본: SFX 켜짐
    const bgmMuted = getBool('bgmMuted', true);   // 기본: BGM 꺼짐
    const theme = safeGet('theme') || 'warm';
    
    // UI 상태 동기화
    const sfxToggle = document.getElementById('sfxToggle');
    const bgmToggle = document.getElementById('bgmToggle');
    
    if(sfxToggle){
      if(!sfxMuted){
        sfxToggle.classList.add('on');
      } else {
        sfxToggle.classList.remove('on');
      }
    }
    
    if(bgmToggle){
      if(!bgmMuted){
        bgmToggle.classList.add('on');
      } else {
        bgmToggle.classList.remove('on');
      }
    }
  }
  
  // 효과음 재생 (core 엔진 사용)
  const tone = (type = 'click') => { 
    if(window.core && !getBool('sfxMuted', false)) {
      window.core.playSfx(type);
    }
  };



  // 모달 (How-to 모달만 유지)
  function openModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "flex";
  }
  function closeModal(){
    const modalBack = document.getElementById("modalBack");
    if(modalBack) modalBack.style.display = "none";
  }

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
  let currentBackIcon = ''; // 현재 게임의 뒷면 아이콘
  let lastMatchedKey = null; // 마지막으로 맞춘 아이콘 키

  // 랜덤 뒷면 아이콘 선택
  function selectRandomBackIcon() {
    const icons = C.BACK_ICONS;
    const selected = icons[Math.floor(Math.random() * icons.length)];
    currentBackIcon = selected;
    updateCardBackStyle();
  }

  // CSS 변수로 뒷면 아이콘 업데이트
  function updateCardBackStyle() {
    if (!window.HEALING_ICONS) {
      console.warn('⚠️ HEALING_ICONS not loaded yet');
      return;
    }
    if (!currentBackIcon) {
      console.warn('⚠️ currentBackIcon not set');
      return;
    }
    
    let svgContent = window.HEALING_ICONS[currentBackIcon];
    if (!svgContent) {
      console.warn('⚠️ SVG content not found for:', currentBackIcon);
      return;
    }
    
    // SVG stroke를 white로 고정. 아이콘별 라인 두께를 다르게 적용
    svgContent = svgContent.replace(/stroke="currentColor"/g, 'stroke="white"');
    if(currentBackIcon === 'star'){
      // 별은 더 섬세하게: 1.5 유지
      svgContent = svgContent.replace(/stroke-width="[\d.]+"/g, 'stroke-width="1.5"');
    } else {
      // 그 외는 약간 두껍게
      svgContent = svgContent.replace(/stroke-width="[\d.]+"/g, 'stroke-width="2"');
    }
    
    // SVG를 UTF-8로 안전하게 인코딩 (base64 대신)
    const dataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}")`;
    
    // CSS 변수 업데이트
    document.documentElement.style.setProperty('--card-back-icon', dataUri);
    console.log('✅ Card back icon set to:', currentBackIcon, '✨');
  }

  // Glow burst 효과 트리거
  function triggerGlowBurst(tile){
    if(!tile) return;
    tile.classList.add('glow-burst');
    setTimeout(()=> tile.classList.remove('glow-burst'), 600);
  }

  // 주어진 HEALING_ICONS key를 흰색 stroke로 교체해 data URI 반환
  function iconKeyToDataUri(key, strokeWidth = '2'){
    if(!window.HEALING_ICONS) return null;
    let svg = window.HEALING_ICONS[key];
    if(!svg) return null;
    svg = svg
      .replace(/stroke="currentColor"/g, 'stroke="white"')
      .replace(/stroke-width="[\d.]+"/g, `stroke-width="${strokeWidth}"`);
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }

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

    const pool = [...C.FRONT_ICONS].sort(()=>rnd()-0.5).slice(0, totalPairs);
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

  // 메시지 관련 기능 제거

  function build(autoPeekSec, useRandomSeed = false){
    clearPeekTimer();
    clearTempMsgTimer();
    if(board) board.innerHTML = "";
    first = null;
    lock = false;
    matched = 0;
    totalPairs = 0;
    
    // 설정 초기화
    initSettings();
    
    // 매 게임마다 새로운 뒷면 아이콘 선택
    selectRandomBackIcon();
    
    const level = selectedLevel;
    // useRandomSeed가 true면 새로운 랜덤 seed 생성, false면 dateStr 기반 공식 배치
    let customSeed = null;
    if(useRandomSeed){
      customSeed = Math.random().toString(36).substring(2, 15) + level;
    }
    const cards = seededCards(level, customSeed);
    
    // 하단 메시지 제거: 상태 메시지 표시 생략
    
    // 힌트 버튼 리셋
    if(peekBtn){
      peekBtn.disabled = false;
    }

    cards.forEach((iconKey, index)=>{
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.state = "down";
        // 매칭 식별자: 아이콘 키 보존
        t.dataset.emoji = iconKey;
        // 앞면 SVG를 엘리먼트 CSS 변수로 주입
        const frontUri = iconKeyToDataUri(iconKey, '2');
        if(frontUri){
          t.style.setProperty('--front-icon', frontUri);
        }
      // 아이콘별 글로우 색상 주입
      const glow = C.FRONT_GLOW[iconKey] || 'rgba(110, 231, 183, 0.85)';
      t.style.setProperty('--icon-glow', glow);
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

    // 게임 보드 위치로 스크롤 (제거됨 - 시니어 친화적)

    // 게임 진행 중 힌트 버튼 표시
    if(peekBtn){
      peekBtn.style.display = "";
    }

    if(typeof autoPeekSec === "number" && autoPeekSec > 0){
      doPeek(autoPeekSec);
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
      // 상태 메시지 표시 생략
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

        // 마지막으로 맞춘 아이콘 키 저장
        lastMatchedKey = t.dataset.emoji;

        // 시각적 광채 폭발 (소리와 동기화)
        triggerGlowBurst(first);
        triggerGlowBurst(t);

        // 맑은 실로폰 느낌의 성공음 재생
          if(window.core) window.core.playSfx('success');

        if(matched < totalPairs){
          // 상태 메시지 표시 생략
        }

        first = null;
        lock = false;

        if(matched === totalPairs){
          finishGame();
        }

      }else{
          if(window.core) window.core.playSfx('click');
        // 상태 메시지 표시 생략

        setTimeout(()=>{
          first.dataset.state = "down";
          t.dataset.state = "down";
          first = null;
          lock = false;
          
          // 상태 메시지 표시 생략
        }, C.MISMATCH_MS);
      }
    }, 100); // 100ms 지연으로 두 번째 카드 확인 시간 제공
  }

  function finishGame(){
    clearTempMsgTimer();
    // 상태 메시지 표시 생략

    if(peekBtn){
      peekBtn.style.display = "none";
    }

    // 무지개 스윕 오버레이
    document.body.classList.add('rainbow-sweep');
    setTimeout(()=> document.body.classList.remove('rainbow-sweep'), 1400);

    // 웅장한 피날레 사운드 (가능하면 finale, 없으면 레이어드 success)
    if(window.core && typeof window.core.playSfx === 'function'){
      window.core.playSfx('finale');
      setTimeout(()=> window.core.playSfx('success'), 120);
      setTimeout(()=> window.core.playSfx('success'), 280);
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
      "잠시 멈춰간 이 시간이 당신에게 힘이 되었길",
      "어둠 속에서도 빛을 찾아낸 당신의 마음을 응원합니다",
      "조급했던 마음이 조금은 가라앉았길 바라요",
    ];

    const ICON_LABELS = {
      leaf:'나뭇잎', cloud:'구름', moon:'달', flower:'꽃', coffee:'찻잔', star:'별', droplet:'물방울', heart:'하트'
    };
    const label = ICON_LABELS[lastMatchedKey] || '별';
    if(resultEmoji) resultEmoji.textContent = "🌿";
    if(resultMessage){
      const base = messages[Math.floor(Math.random() * messages.length)];
      resultMessage.textContent = `오늘 당신의 마음은 ${label}처럼 따뜻하네요. ${base}`;
    }

    // 둥둥 떠다니는 아이콘들 추가
    let floatWrap = document.querySelector('#resultModalCard .floatingIcons');
    if(!floatWrap){
      floatWrap = document.createElement('div');
      floatWrap.className = 'floatingIcons';
      const keys = ['leaf','cloud','moon','flower','coffee','star','droplet','heart'];
      for(let i=0;i<8;i++){
        const k = keys[i % keys.length];
        const el = document.createElement('div');
        el.className = 'icon';
        const uri = iconKeyToDataUri(k, '2');
        el.style.backgroundImage = uri || '';
        el.style.left = (Math.random()*90+5)+"%";
        el.style.top = (Math.random()*80+10)+"%";
        el.style.animationDelay = (Math.random()*2)+"s";
        floatWrap.appendChild(el);
      }
      const cardEl = document.getElementById('resultModalCard');
      if(cardEl) cardEl.appendChild(floatWrap);
    }

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

    if(board){
      // 1단계: 매칭되지 않은 모든 카드를 앞면으로 보여주기 (애니메이션과 함께)
      const allCards = [...board.children];
      allCards.forEach(t => {
        if(!t.classList.contains("matched")){
          // 상태 변경과 클래스 추가를 동시에 처리
          t.dataset.state = "up";
          // 애니메이션 시작을 위해 리플로우 트리거
          void t.offsetWidth;
          t.classList.add("opening");
        }
      });

      // 2단계: 힌트 시간이 끝나면 모든 카드를 일괄 닫기 (사용자가 열어둔 카드도 포함)
      peekTimer = setTimeout(()=>{
        if(board){
          allCards.forEach(t => {
            if(!t.classList.contains("matched")){
              // opening 클래스 제거 후 closing 클래스 추가로 애니메이션 시작
              t.classList.remove("opening");
              t.classList.add("closing");
              // 애니메이션 완료 후에만 상태 변경 (350ms = 0.35s 애니메이션)
              setTimeout(() => {
                t.dataset.state = "down";
                t.classList.remove("closing");
              }, 350);
            }
          });
        }
        // 상태 메시지 표시 생략
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

    // 상태 메시지 표시 생략
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
  
  // Home 버튼
  if(homeBtn) {
    homeBtn.addEventListener('click', () => {
      if(window.core) window.core.playSfx('click');
      window.location.href = '../index.html';
    });
  }

  // UI 초기화
  initPeekButton();
  initHowModal();
  // ✅ BGM은 core.js의 제스처 감지로 자동 재생

  // HarumindUI export
  window.HarumindUI = {
    board,
    dateStr,
    openModal,
    closeModal,
  };

  // 첫 진입
  build(4);
})();
}); // window.addEventListener DOMContentLoaded 닫기

