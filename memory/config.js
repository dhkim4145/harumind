// /memory/config.js
// 화면/로직에서 공통으로 쓰는 "설정값" 모음

window.HARUMIND_CONFIG = {
  VERSION: "v1.36",
  TIMEZONE: "Asia/Seoul",

  EMOJIS: ["🍎","🍌","🍇","🍓","🍒","🍑","🍍","🍉","🐶","🐱","🐻","⭐","🌙","☀️","🎈","🚗"],

  LEVEL_MAP: {
    "2x2": [2,2],
    "3x2": [2,3],
    "4x3": [3,4],
  },

  // 틀렸을 때 다시 뒤집히는 시간(ms)
  MISMATCH_MS: 700,

  // 콤보 점수 규칙: 10,12,14,16,18,20(최대)
  comboPoints(streakNow){
    const bonus = Math.min((streakNow - 1) * 2, 10);
    return 10 + bonus;
  },

  // 로컬 저장 키
  KEYS: {
    SFX: "harumind_sfx_on",
    BIG: "harumind_bigtext_on",
    DAILY_PREFIX: "harumind_memory_daily_", // + YYYY-MM-DD
  }
};
