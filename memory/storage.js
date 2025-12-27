// /memory/storage.js
// localStorage 저장/불러오기 담당 (안정성 강화)

(function(){
  const C = window.HARUMIND_CONFIG;

  function safeGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function safeSet(key, value){
    try{ localStorage.setItem(key, value); return true; }catch(e){ return false; }
  }

  function toNum(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function todayKey(){
    try{
      // TIMEZONE이 잘못된 경우 예외가 날 수 있어서 보호
      return new Intl.DateTimeFormat("en-CA", { timeZone: C.TIMEZONE }).format(new Date());
    }catch(e){
      // fallback: 로컬 타임존
      return new Intl.DateTimeFormat("en-CA").format(new Date());
    }
  }

  function getBool(key, defaultValue){
    const v = safeGet(key);
    if(v === null) return defaultValue;
    return v === "1";
  }

  function setBool(key, value){
    safeSet(key, value ? "1" : "0");
  }

  function getDailyKey(dateStr){
    return C.KEYS.DAILY_PREFIX + dateStr;
  }

  function loadDaily(dateStr){
    try{
      const raw = safeGet(getDailyKey(dateStr));
      if(!raw) return { clears:0, best:0 };
      const obj = JSON.parse(raw);
      return {
        clears: toNum(obj?.clears),
        best:   toNum(obj?.best),
      };
    }catch(e){
      return { clears:0, best:0 };
    }
  }

  function saveDaily(dateStr, data){
    safeSet(getDailyKey(dateStr), JSON.stringify({
      clears: toNum(data?.clears),
      best:   toNum(data?.best),
    }));
  }

  window.HarumindStorage = {
    todayKey,
    getBool,
    setBool,
    loadDaily,
    saveDaily,
  };
})();
