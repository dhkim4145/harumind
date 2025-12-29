// /memory/game.js
// 게임 로직(카드 생성/클릭/매칭/콤보/기록 저장)

(function(){
  const C = window.HARUMIND_CONFIG;
  const UI = window.HarumindUI;

  // DOM
  const levelSel = document.getElementById("level");
  const peekSel  = document.getElementById("peekSec");
  const newBtn   = document.getElementById("newGame");
  const howBtn   = document.getElementById("howBtn");

  // 상태
  let first = null;
  let lock = false;
  let matched = 0;
  let score = 0;
  let totalPairs = 0;
  let peekTimer = null;

  // ✅ 원형 링 상태
  let peekRing = null;
  let peekRingRAF = null;

  let streak = 0;

  function seededCards(level){
    const map = C.LEVEL_MAP;
    const [r,c] = map[level];
    totalPairs = (r*c)/2;

    UI.board.style.gridTemplateColumns = `repeat(${c},1fr)`;

    // 오늘/난이도 별 고정 배치(매일 바뀜)
    const seed = UI.dateStr + level;
    let h = 0;
    for(const ch of seed) h = Math.imul(31, h) + ch.charCodeAt(0) | 0;
    const rnd = () => (h = Math.imul(48271, h) & 2147483647) / 2147483647;

    const pool = [...C.EMOJIS].sort(()=>rnd()-0.5).slice(0, totalPairs);
    return [...pool, ...pool].sort(()=>rnd()-0.5);
  }

  function clearPeekTimer(){
    if(peekTimer){ clearTimeout(peekTimer); peekTimer = null; }
    hidePeekRing();
  }

  // ✅ 새로 시작 미리보기 시간: 쉬움/보통 3초, 어려움(4x3) 4초
  function getStartPeekSeconds(level){
    return (level === "4x3") ? 4 : 3;
  }

  // =========================
  // ✅ 원형 링 타이머(새로시작 전용)
  // - "메시지 박스(messageCard)" 오른쪽에 배치 (빨간 박스 위치)
  // - 카드 텍스트 안 겹치도록 padding-right 확보
  // - 링 안에 숫자(4→3→2→1) 표시
  // =========================
  function ensureRingStyle(){
    if(document.getElementById("hm-ring-style")) return;
    const s = document.createElement("style");
    s.id = "hm-ring-style";
    s.textContent = `
      /* ✅ 메시지 카드 오른쪽 공간 확보 (링 들어오면) */
      .messageCard.hmHasRing{
        position: relative;
        padding-right: 86px; /* 링+여백 */
      }

      /* ✅ 메시지 박스 오른쪽에 고정 */
      .hmRingWrap{
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: none;
      }

      /* ✅ 카드보다 작고, 덜 화려한 링 */
      .hmRing{
        width: 52px;
        height: 52px;
        border-radius: 999px;
        background: conic-gradient(
          rgba(110,231,183,.55) calc(var(--p, 0) * 1turn),
          rgba(255,255,255,.08) 0
        );
        border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 4px 10px rgba(0,0,0,.22);
        position: relative;
        opacity: .95;
      }
      .hmRing::after{
        content:"";
        position:absolute;
        inset:6px;
        border-radius: 999px;
        background: rgba(11,16,32,.92);
        border: 1px solid rgba(255,255,255,.08);
      }

      /* ✅ 링 안 숫자 */
      .hmRingNum{
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight: 900;
        font-size: 14px;
        color: rgba(232,236,255,.95);
        line-height: 1;
        letter-spacing: .2px;
        user-select: none;
        z-index: 2;
      }

      /* 모바일에서는 조금 더 작게 + 패딩도 축소 */
      @media (max-width:520px){
        .messageCard.hmHasRing{ padding-right: 78px; }
        .hmRing{ width: 48px; height: 48px; }
        .hmRing::after{ inset:6px; }
        .hmRingNum{ font-size: 13px; }
        .hmRingWrap{ right: 12px; }
      }
    `;
    document.head.appendChild(s);
  }

  function showPeekRing(initSec){
    ensureRingStyle();
    if(peekRing) return;

    const wrap = document.createElement("div");
    wrap.className = "hmRingWrap";
    wrap.innerHTML = `
      <div class="hmRing" style="--p: 0;">
        <div class="hmRingNum">${initSec || ""}</div>
      </div>
    `;

    // ✅ 메시지 카드 오른쪽에 링 넣기
    const msgCard = document.querySelector(".messageCard");
    if(msgCard){
      msgCard.classList.add("hmHasRing"); // 텍스트 안겹치게 공간 확보
      msgCard.appendChild(wrap);
    }else{
      // 혹시 구조가 바뀌었을 때의 안전장치
      document.body.appendChild(wrap);
    }

    peekRing = wrap;
  }

  function setPeekRingProgress(p01){
    if(!peekRing) return;
    const ring = peekRing.querySelector(".hmRing");
    if(ring) ring.style.setProperty("--p", String(Math.max(0, Math.min(1, p01))));
  }

  function setPeekRingNumber(n){
    if(!peekRing) return;
    const num = peekRing.querySelector(".hmRingNum");
    if(num) num.textContent = String(n);
  }

  function hidePeekRing(){
    if(peekRing){
      // ✅ 링 제거할 때 카드 padding도 원복
      const msgCard = document.querySelector(".messageCard");
      if(msgCard) msgCard.classList.remove("hmHasRing");

      peekRing.remove();
      peekRing = null;
    }
    if(peekRingRAF){
      cancelAnimationFrame(peekRingRAF);
      peekRingRAF = null;
    }
  }

  // ✅ build(autoPeekSec, showRing=false)
  // autoPeekSec가 숫자면 build 직후 자동 미리보기 실행
  // showRing=true일 때만 원형 링(새로시작 전용)
  function build(autoPeekSec, showRing=false){
    clearPeekTimer();
    UI.board.innerHTML = "";
    first = null; lock = false;
    matched = 0; score = 0; streak = 0;

    UI.renderStats({matched, score});
    UI.setMessage("같은 그림 2개를 찾아보세요!", "팁: 너무 빨리 누르지 않아도 돼요.");

    const level = levelSel.value;
    const cards = seededCards(level);

    cards.forEach(emoji=>{
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.state = "down";
      t.dataset.emoji = emoji;
      t.onclick = () => clickTile(t);
      UI.board.appendChild(t);
    });

    // ✅ 자동 미리보기
    if(typeof autoPeekSec === "number" && autoPeekSec > 0){
      doPeek(autoPeekSec, showRing);
    }
  }

  function clickTile(t){
    // ✅ matched 타일까지 눌리는 것 방지(안정성)
    if(lock || t.dataset.state === "up" || t.classList.contains("matched")) return;

    t.dataset.state = "up";

    if(!first){
      first = t;
      UI.setMessage(
        "하나 찾았어요. 같은 그림을 찾아볼까요?",
        "천천히 같은 그림을 찾아보세요 🙂"
      );
      return;
    }

    lock = true;

    if(first.dataset.emoji === t.dataset.emoji){
      first.classList.add("matched");
      t.classList.add("matched");

      matched++;
      streak++;

      const pts = C.comboPoints(streak);
      score += pts;

      UI.showReward(t, `+${pts}`);
      UI.renderStats({matched, score});

      if(streak >= 2){
        UI.setMessage("연속으로 잘하고 있어요! 👍", `연속 정답 ${streak}번째! (보너스 점수)`);
      }else{
        UI.setMessage("아주 좋아요!", "천천히 해도 잘 하고 있어요 🙂");
      }

      UI.playBeep(820 + Math.min(streak,6)*35, 55, 0.015);

      first = null;
      lock = false;

      if(matched === totalPairs){
        UI.setMessage(
          "완료! 정말 잘하셨어요 🎉",
          "오늘은 이 카드로 놀아보세요 🙂\n내일은 또 다른 카드가 나와요."
        );

        // 오늘 기록 저장 (로컬)
        const d = HarumindStorage.loadDaily(UI.dateStr);
        d.clears += 1;
        d.best = Math.max(d.best, score);
        HarumindStorage.saveDaily(UI.dateStr, d);
        UI.renderDaily(UI.dateStr);

        UI.showFinishPopup({
          title: "오늘의 게임 완료! 🎉",
          sub: "오늘은 이 카드로 놀아보세요 🙂\n내일은 또 다른 카드가 나와요.",
          dateStr: UI.dateStr,
          // ✅ 완료 팝업에서 재시작도 "새로시작"으로 취급 → 링 ON
          onRestart: () => build(getStartPeekSeconds(levelSel.value), true)
        });
      }

    }else{
      streak = 0;

      UI.setMessage("괜찮아요 🙂 다시 해보면 됩니다.", "한 번 더 찾아볼까요?");
      UI.playBeep(320, 70, 0.012);

      setTimeout(()=>{
        first.dataset.state = "down";
        t.dataset.state = "down";
        first = null;
        lock = false;
      }, C.MISMATCH_MS);
    }
  }

  // ✅ doPeek(sec, showRing=false)
  // showRing=true일 때만 원형 링 표시(새로시작 전용)
  // + 링 안에 숫자(4→3→2→1) 표시
  function doPeek(sec, showRing=false){
    // ✅ 미리보기 중/클릭 잠금 중이면 요청 무시 (꼬임 방지)
    if(lock) return;

    if(first){
      first.dataset.state = "down";
      first = null;
    }

    lock = true;
    clearPeekTimer();

    [...UI.board.children].forEach(t => t.dataset.state = "up");

    if(showRing){
      showPeekRing(sec);
      UI.setMessage("잠깐 보고 기억해요 🙂", "처음부터 다시 해볼게요.");

      const start = performance.now();
      const dur = sec * 1000;
      let lastShown = sec;

      const tick = (now) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / dur);
        setPeekRingProgress(t); // 0 → 1 차오름

        // ✅ 남은 초(4→3→2→1)
        const remain = Math.max(1, Math.ceil((dur - elapsed) / 1000));
        if(remain !== lastShown){
          lastShown = remain;
          setPeekRingNumber(remain);
        }

        if(t < 1) peekRingRAF = requestAnimationFrame(tick);
      };
      peekRingRAF = requestAnimationFrame(tick);

    }else{
      // 난이도 변경(2초), 잠깐보기(2초)는 기존 텍스트만
      UI.setMessage(`잠깐 보고 기억해요 🙂 (${sec}초)`, "끝나면 다시 물음표로 돌아갑니다.");
    }

    peekTimer = setTimeout(()=>{
      [...UI.board.children].forEach(t=>{
        if(!t.classList.contains("matched")) t.dataset.state = "down";
      });

      hidePeekRing();
      UI.setMessage("이제 시작해볼까요?", "팁: 너무 빨리 누르지 않아도 돼요.");
      lock = false;
      peekTimer = null;
    }, sec*1000);
  }

  // 이벤트
  // ✅ 새로 시작: 난이도별 3/4초 + 원형 링 ON
  newBtn.onclick = () => {
    const level = levelSel.value;
    build(getStartPeekSeconds(level), true);
  };

  // ✅ 난이도 변경: 새 판 + 2초 자동 미리보기(짧게) / 링 OFF
  levelSel.onchange = () => {
    build(2, false);
    UI.setMessage("난이도를 바꿨어요 🙂", "카드를 2초만 보여드릴게요.");
  };

  // ✅ 수동 잠깐보기: 선택한 초만큼 / 링 OFF
  peekSel.onchange = () => {
    const sec = parseInt(peekSel.value, 10) || 2;
    doPeek(sec, false);
    peekSel.value = "";
  };

  // 시작
  // ✅ 첫 진입도 “새로시작과 동일”하게 링 ON (원하면 false로 바꾸면 됨)
  build(getStartPeekSeconds(levelSel.value), true);
})();



