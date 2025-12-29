// /memory/ui-toast.js
// 완료 토스트(4초 + 클릭 닫기) + 폭죽 + 스타일 주입
(function(){
  const S = window.HarumindUIState;
  if(!S) return;

  // ===== 스타일(토스트/폭죽) 주입 =====
  function ensureStyle(){
    if(document.getElementById("hm-ui-style")) return;
    const s = document.createElement("style");
    s.id = "hm-ui-style";
    s.textContent = `
      .hmToastBack{
        position:fixed; inset:0;
        background:transparent;
        z-index:9997;
        pointer-events:auto;
      }
      .hmToast{
        position:fixed;
        left:50%;
        top:58%;
        transform:translate(-50%, -50%);
        width:min(520px, calc(100% - 32px));
        background:#1a2250;
        border:1px solid rgba(110,231,183,.55);
        border-radius:22px;
        box-shadow:0 18px 48px rgba(0,0,0,.55);
        padding:16px 18px 14px;
        text-align:center;
        z-index:9998;
        pointer-events:auto;
        cursor:pointer;
        animation: hmToastIn .22s ease-out forwards;
      }
      @keyframes hmToastIn{
        from{ opacity:0; transform:translate(-50%, -44%) scale(.98); }
        to  { opacity:1; transform:translate(-50%, -50%) scale(1); }
      }
      .hmTitle{
        font-size:22px;
        font-weight:900;
        color:#e8ecff;
      }
      .hmHintLine{
        margin-top:10px;
        font-size:14px;
        color:rgba(185,194,255,.95);
        font-weight:800;
      }
      .hmMini{
        margin-top:8px;
        font-size:13px;
        color:rgba(185,194,255,.95);
        line-height:1.6;
        white-space:pre-line;
      }

      .hmConfetti{
        position:fixed;
        left:50%;
        top:58%;
        transform:translate(-50%, -50%);
        width:min(520px, calc(100% - 32px));
        height:180px;
        z-index:9999;
        pointer-events:none;
        overflow:visible;
      }
      .hmConfetti i{
        position:absolute;
        top:20px;
        left:50%;
        width:8px;
        height:14px;
        border-radius:3px;
        opacity:.95;
        transform:translateX(-50%) rotate(0deg);
        animation: hmPop 900ms ease-out forwards;
        will-change: transform, opacity;
      }
      @keyframes hmPop{
        0%   { opacity:0; transform: translate(-50%, 10px) rotate(0deg) scale(.8); }
        10%  { opacity:1; }
        100% { opacity:0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  // ===== 완료 토스트 =====
  let finishTimer = null;

  function launchConfetti(){
    const box = document.createElement("div");
    box.className = "hmConfetti";

    for(let i=0;i<26;i++){
      const p = document.createElement("i");
      p.style.setProperty("--dx", (Math.random()*460 - 230).toFixed(0) + "px");
      p.style.setProperty("--dy", (Math.random()*-180 - 90).toFixed(0) + "px");
      p.style.setProperty("--rot", (Math.random()*720 - 360).toFixed(0) + "deg");

      const colors = ["#6ee7b7","#93c5fd","#fca5a5","#fde68a","#c4b5fd","#f9a8d4"];
      p.style.background = colors[Math.floor(Math.random()*colors.length)];

      p.style.left = (50 + (Math.random()*40 - 20)) + "%";
      p.style.top  = (30 + (Math.random()*20 - 10)) + "px";

      const w = 6 + Math.random()*6;
      const h = 10 + Math.random()*10;
      p.style.width = w + "px";
      p.style.height = h + "px";

      box.appendChild(p);
    }

    document.body.appendChild(box);
    setTimeout(()=>box.remove(), 950);
  }

  // ✅ game.js가 호출하는 이름 유지
  function showFinishPopup({title, dateStr}){
    ensureStyle();

    document.querySelector(".hmToastBack")?.remove();
    document.querySelector(".hmToast")?.remove();
    if(finishTimer){ clearTimeout(finishTimer); finishTimer = null; }

    const d = HarumindStorage.loadDaily(dateStr);
    const extra = `오늘 횟수: ${d.clears}회 · 오늘 최고: ${d.best}점`;

    const back = document.createElement("div");
    back.className = "hmToastBack";

    const toast = document.createElement("div");
    toast.className = "hmToast";
    toast.innerHTML = `
      <div class="hmTitle">${title || "완료! 🎉"}</div>
      <div class="hmHintLine">다시 하려면 ‘새로 시작’</div>
      <div class="hmMini"><b style="color:#e8ecff">${extra}</b></div>
    `;

    document.body.appendChild(back);
    document.body.appendChild(toast);

    // 폭죽 + 효과음(짧게 2번)
    launchConfetti();
    S.playBeep(988, 90, 0.035);
    setTimeout(()=>S.playBeep(1174, 80, 0.028), 120);

    const closeNow = () => {
      back.remove();
      toast.remove();
      if(finishTimer){
        clearTimeout(finishTimer);
        finishTimer = null;
      }
      back.removeEventListener("click", closeNow);
      toast.removeEventListener("click", closeNow);
    };

    back.addEventListener("click", closeNow);
    toast.addEventListener("click", closeNow);

    finishTimer = setTimeout(closeNow, 4000);
  }

  // HarumindUI에 추가로 “붙이기”
  window.HarumindUI.showFinishPopup = showFinishPopup;
})();
