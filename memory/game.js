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
  let peekTickTimer = null; // ✅ 새로시작 카운트다운용 interval
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
    if(peekTickTimer){ clearInterval(peekTickTimer); peekTickTimer = null; }
  }

  // ✅ 새로 시작 미리보기 시간: 쉬움/보통 3초, 어려움(4x3) 4초
  function getStartPeekSeconds(level){
    return (level === "4x3") ? 4 : 3;
  }

  // ✅ build(autoPeekSec, countdown=false)
  // autoPeekSec가 숫자면 build 직후 자동 미리보기 실행
  // countdown=true일 때만 카운트다운(초 감소)을 보여줌 (새로시작 전용)
  function build(autoPeekSec, countdown=false){
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
      doPeek(autoPeekSec, countdown);
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
          // ✅ 완료 팝업에서 재시작도 "새로시작"이므로 카운트다운 ON
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

  // ✅ doPeek(sec, countdown=false)
  // countdown=true일 때만 (4→3→2→1)처럼 초가 줄어드는 타이머 표시
  function doPeek(sec, countdown=false){
    // ✅ 미리보기 중/클릭 잠금 중이면 요청 무시 (꼬임 방지)
    if(lock) return;

    if(first){
      first.dataset.state = "down";
      first = null;
    }

    lock = true;
    clearPeekTimer();

    [...UI.board.children].forEach(t => t.dataset.state = "up");

    // 기본 표시
    UI.setMessage(`잠깐 보고 기억해요 🙂 (${sec}초)`, "끝나면 다시 물음표로 돌아갑니다.");

    // ✅ 새로시작에서만 카운트다운
    if(countdown){
      let remain = sec;
      peekTickTimer = setInterval(() => {
        remain -= 1;
        if(remain > 0){
          UI.setMessage(`잠깐 보고 기억해요 🙂 (${remain}초)`, "끝나면 다시 물음표로 돌아갑니다.");
        }
      }, 1000);
    }

    peekTimer = setTimeout(()=>{
      clearPeekTimer();

      [...UI.board.children].forEach(t=>{
        if(!t.classList.contains("matched")) t.dataset.state = "down";
      });
      UI.setMessage("이제 시작해볼까요?", "팁: 너무 빨리 누르지 않아도 돼요.");
      lock = false;
      peekTimer = null;
    }, sec*1000);
  }

  // 이벤트
  // ✅ 새로 시작: 난이도별 3/4초 + 카운트다운 ON
  newBtn.onclick = () => {
    const level = levelSel.value;
    build(getStartPeekSeconds(level), true);
  };

  // ✅ 난이도 변경: 새 판 + 2초 자동 미리보기(짧게) / 카운트다운 OFF
  levelSel.onchange = () => {
    build(2, false);
    UI.setMessage("난이도를 바꿨어요 🙂", "카드를 2초만 보여드릴게요.");
  };

  // ✅ 수동 잠깐보기: 선택한 초만큼 / 카운트다운 OFF
  peekSel.onchange = () => {
    const sec = parseInt(peekSel.value, 10) || 2;
    doPeek(sec, false);
    peekSel.value = "";
  };

  // 시작
  // ✅ 첫 진입도 “새로시작과 동일”하게 카운트다운 ON (원하면 false로 바꿔도 됨)
  build(getStartPeekSeconds(levelSel.value), true);
})();
