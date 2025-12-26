// /memory/storage.js
// localStorage 저장/불러오기 담당

(function(){
  const C = window.HARUMIND_CONFIG;

  function todayKey(){
    return new Intl.DateTimeFormat("en-CA", { timeZone: C.TIMEZONE }).format(new Date());
  }

  function getBool(key, defaultValue){
    const v = localStorage.getItem(key);
    if(v === null) return defaultValue;
    return v === "1";
  }

  function setBool(key, value){
    localStorage.setItem(key, value ? "1" : "0");
  }

  function getDailyKey(dateStr){
    return C.KEYS.DAILY_PREFIX + dateStr;
  }

  function loadDaily(dateStr){
    try{
      const raw = localStorage.getItem(getDailyKey(dateStr));
      if(!raw) return { clears:0, best:0 };
      const obj = JSON.parse(raw);
      return { clears: Number(obj.clears||0), best: Number(obj.best||0) };
    }catch{
      return { clears:0, best:0 };
    }
  }

  function saveDaily(dateStr, data){
    localStorage.setItem(getDailyKey(dateStr), JSON.stringify({
      clears: Number(data.clears||0),
      best: Number(data.best||0),
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
