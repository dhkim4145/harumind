// /memory/ui-settings.js
// 설정 패널 (모바일 토글 / PC 항상 열림)

(function(){
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const mq = window.matchMedia("(max-width:520px)");

  function setMobileOpen(open){
    if(!settingsPanel || !settingsBtn) return;
    if(open){
      settingsPanel.classList.remove("isClosed");
      settingsBtn.classList.add("isOpen");
      settingsBtn.setAttribute("aria-expanded","true");
      settingsBtn.setAttribute("aria-label","설정 닫기");
    }else{
      settingsPanel.classList.add("isClosed");
      settingsBtn.classList.remove("isOpen");
      settingsBtn.setAttribute("aria-expanded","false");
      settingsBtn.setAttribute("aria-label","설정 열기");
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
})();
