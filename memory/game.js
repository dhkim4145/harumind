// /memory/game.js
// 게임 로직(카드 생성/클릭/매칭/콤보/기록 저장)
// ✅ 완료 후 "사라지지 않는 메시지 + 다시 해볼까요 버튼" 구조

(function(){
  const C = window.HARUMIND_CONFIG;
  const UI = window.HarumindUI;

  // DOM
  const levelSel = document.getElementById("level");
  const peekSel  = document.getElementById("peekSec");

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

    const seed = UI.dateStr + level;
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

  function build(autoPeekSec){
    clearPeekTimer();
    UI.board.innerHTML = "";
    first = null;
    lock = false;
    matched = 0;
    score = 0;
    streak = 0;

    UI.renderStats({ matched, score });
    UI.clearFinishState();
    UI.setMessage("카드를 눌러서 시작해요 🙂", "처음엔 천천히 눌러보면 돼요.");

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

    if(typeof autoPeekSec === "number" && autoPeekSec > 0){
      doPeek(autoPeekSec);
    }
  }

  function clickTile(t){
    if(lock || t.dataset.state === "up" || t.classList.contains("matched")) return;

    t.dataset.state = "up";

    if(!first){
      first = t;
      UI.setMessage("하나 찾았어요!", "같은 그림을 찾아볼까요?");
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
      UI.renderStats({ matched, score });

      UI.playBeep(820 + Math.min(streak,6)*35, 55, 0.015);

      first = null;
      lock = false;

      if(matched === totalPairs){
        finishGame();
      }

    }else{
      streak = 0;
      UI.playBeep(320, 70, 0.012);

      setTimeout(()=>{
        first.dataset.state = "down";
        t.dataset.state = "down";
        first = null;
        lock = false;
      }, C.MISMATCH_MS);
    }
  }

  function finishGame(){
    // 오늘 기록 저장
    const d = HarumindStorage.loadDaily(UI.dateStr);
    d.clears += 1;
    d.best = Math.max(d.best, score);
    HarumindStorage.saveDaily(UI.dateStr, d);
    UI.renderDaily(UI.dateStr);

    UI.setFinishState({
      title: "🎉 오늘의 게임을 마쳤어요!",
      message: "아주 잘하셨어요 🙂",
      buttonText: "🔁 다시 해볼까요?",
      hint: "난이도는 위에서 언제든 바꿀 수 있어요.",
      onRestart: () => build(2)
    });
  }

  function doPeek(sec){
    if(lock) return;

    if(first){
      first.dataset.state = "down";
      first = null;
    }

    lock = true;
    clearPeekTimer();

    [...UI.board.children].forEach(t => t.dataset.state = "up");
    UI.setMessage("잠깐 보고 기억해요 🙂", "끝나면 다시 물음표로 돌아갑니다.");

    peekTimer = setTimeout(()=>{
      [...UI.board.children].forEach(t=>{
        if(!t.classList.contains("matched")) t.dataset.state = "down";
      });
      UI.setMessage("이제 시작해볼까요?", "천천히 해도 괜찮아요 🙂");
      lock = false;
      peekTimer = null;
    }, sec * 1000);
  }

  // 이벤트
  levelSel.onchange = () => build(2);
  peekSel.onchange = () => {
    doPeek(2);
    peekSel.value = "";
  };

  // 첫 진입
  build(2);
})();
