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
  }

  function build(){
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
  }

  function clickTile(t){
    if(lock || t.dataset.state === "up") return;

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

      // 연속이면 음을 살짝 올림
      UI.playBeep(820 + Math.min(streak,6)*35, 55, 0.015);

      first = null;
      lock = false;

      if(matched === totalPairs){
        // ✅ 완료 문구 (줄바꿈 적용)
        UI.setMessage(
          "완료! 정말 잘하셨어요 🎉",
          "오늘은 이 카드로 놀아보세요 🙂<br/>내일은 또 다른 카드가 나와요."
        );

        // 오늘 기록 저장 (로컬)
        const d = HarumindStorage.loadDaily(UI.dateStr);
        d.clears += 1;
        d.best = Math.max(d.best, score);
        HarumindStorage.saveDaily(UI.dateStr, d);
        UI.renderDaily(UI.dateStr);

        // ✅ 완료 팝업 문구도 동일 톤으로 통일
        UI.showFinishPopup({
          title: "오늘의 게임 완료! 🎉",
          sub: "오늘은 이 카드로 놀아보세요 🙂\n내일은 또 다른 카드가 나와요.",
          dateStr: UI.dateStr,
          onRestart: build
        });

        UI.playBeep(988, 90, 0.035);
      }

    }else{
      // 틀리면 콤보 리셋
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

  function doPeek(sec){
    if(lock) return;

    // 카드 1장 열어둔 상태면 꼬임 방지
    if(first){
      first.dataset.state = "down";
      first = null;
    }

    lock = true;
    clearPeekTimer();

    [...UI.board.children].forEach(t => t.dataset.state = "up");
    UI.setMessage(`잠깐 보고 기억해요 🙂 (${sec}초)`, "끝나면 다시 물음표로 돌아갑니다.");

    peekTimer = setTimeout(()=>{
      [...UI.board.children].forEach(t=>{
        if(!t.classList.contains("matched")) t.dataset.state = "down";
      });
      UI.setMessage("이제 시작해볼까요?", "팁: 너무 빨리 누르지 않아도 돼요.");
      lock = false;
      peekTimer = null;
    }, sec*1000);
  }

  // 이벤트
  newBtn.onclick = build;

  levelSel.onchange = () => {
    build();
    UI.setMessage("난이도를 바꿨어요 🙂 새로 시작했어요.", "천천히 해도 괜찮아요.");
  };

  peekSel.onchange = () => {
    const sec = parseInt(peekSel.value, 10) || 2;
    doPeek(sec);
    peekSel.value = ""; // 같은 값 재선택 가능
  };

  howBtn.onclick = UI.openModal;

  // 시작
  build();
})();

