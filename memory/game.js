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
  let tempMsgTimer = null; // 임시 메시지 타이머
  let currentStateMsg = { msg: "", hint: "" }; // 현재 상태 메시지 저장

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

  function clearTempMsgTimer(){
    if(tempMsgTimer){
      clearTimeout(tempMsgTimer);
      tempMsgTimer = null;
    }
  }

  function setStateMessage(msg, hint){
    // 상태 메시지 설정 및 저장
    currentStateMsg = { msg, hint };
    UI.setMessage(msg, hint);
  }

  function showTempMessage(msg, hint, duration = 800){
    // 임시 메시지 표시 (자동 복귀)
    clearTempMsgTimer();
    UI.setMessage(msg, hint);
    tempMsgTimer = setTimeout(() => {
      // 원래 상태 메시지로 복귀
      UI.setMessage(currentStateMsg.msg, currentStateMsg.hint);
      tempMsgTimer = null;
    }, duration);
  }

  function build(autoPeekSec){
    clearPeekTimer();
    clearTempMsgTimer();
    UI.board.innerHTML = "";
    first = null;
    lock = false;
    matched = 0;
    score = 0;
    streak = 0;

    const level = levelSel.value;
    const cards = seededCards(level);
    
    UI.renderStats({ matched, score, totalPairs });
    if (UI.clearFinishState) UI.clearFinishState();
    if (UI.setStatsComplete) UI.setStatsComplete(false); // 완료 상태 해제
    // 시작/새로시작 메시지
    setStateMessage("같은 그림을 찾아볼까요?", "카드를 눌러 같은 그림을 찾아보세요.");

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
      // 첫 카드 클릭: 임시 메시지 표시 후 상태 메시지 업데이트
      showTempMessage("👀 잘 보고 있어요…", "", 800);
      // 첫 카드 선택 후 상태 메시지 업데이트 (힌트 제거)
      setStateMessage("같은 그림을 찾아볼까요?", "");
      return;
    }

    lock = true;
    // 두 번째 카드 클릭: 임시 메시지 제거 (성공/실패 판정 후 메시지 표시)
    clearTempMsgTimer();

    if(first.dataset.emoji === t.dataset.emoji){
      first.classList.add("matched");
      t.classList.add("matched");

      matched++;
      streak++;

      const pts = C.comboPoints(streak);
      score += pts;

      UI.showReward(t, `+${pts}`);
      UI.renderStats({ matched, score, totalPairs });

      UI.playBeep(820 + Math.min(streak,6)*35, 55, 0.015);

      // 매칭 성공 시 안내 메시지 분기 (약간의 지연 후 표시)
      clearTempMsgTimer();
      setTimeout(() => {
        if(matched === 1){
          // 첫 매칭 성공 - 콤보 점수 힌트 추가 (별도 줄로 분리)
          setStateMessage("🎉 하나 찾았어요!", "남은 그림도 천천히 찾아보세요.\n(연속으로 맞추면 더 많은 점수를 얻을 수 있어요!)");
        }else if(matched < totalPairs){
          // 중간 매칭 성공
          setStateMessage("👍 잘하고 있어요.", "남은 그림도 천천히 찾아보세요.");
        }
      }, 200);
      // 마지막 매칭 성공 (matched === totalPairs)은 finishGame()에서 메시지 처리

      first = null;
      lock = false;

      if(matched === totalPairs){
        finishGame();
      }

    }else{
      streak = 0;
      UI.playBeep(320, 70, 0.012);

      // 매칭 실패 시 임시 메시지 표시 (카드 뒤집기 완료 후 기본 진행 메시지로 복귀)
      clearTempMsgTimer();
      UI.setMessage("🙂 괜찮아요.", "다시 천천히 찾아보세요.");

      setTimeout(()=>{
        first.dataset.state = "down";
        t.dataset.state = "down";
        first = null;
        lock = false;
        
        // 카드 뒤집기 완료 후 기본 진행 메시지로 복귀
        setStateMessage("같은 그림을 찾아볼까요?", "");
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

    // 완료 상태: 상단 메시지 설정 (임시 메시지 덮어쓰기)
    clearTempMsgTimer();
    setStateMessage("🎉 오늘의 게임을 마쳤어요!", "정말 잘하셨어요.");

    // 점수판 완료 상태 표시
    if (UI.setStatsComplete) UI.setStatsComplete(true);

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
    UI.setMessage("잠깐 보고 기억해요 🙂", "잠시 후 다시 물음표로 돌아갑니다.");

    peekTimer = setTimeout(()=>{
      [...UI.board.children].forEach(t=>{
        if(!t.classList.contains("matched")) t.dataset.state = "down";
      });
      setStateMessage("같은 그림을 찾아볼까요?", "카드를 눌러 같은 그림을 찾아보세요.");
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

