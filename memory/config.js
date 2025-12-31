// /memory/config.js
// 화면/로직에서 공통으로 쓰는 "설정값" 모음

window.HARUMIND_CONFIG = {
  VERSION: "v1.37",
  TIMEZONE: "Asia/Seoul",

  EMOJIS: [
    '🍐','🍏', // 초록색 과일 시리즈
    '🍎','🍓', // 빨간색 과일 시리즈
    '🍊','🍑', // 주황/분홍 과일 시리즈
    '🐶','🐹', // 귀여운 동물 시리즈
    '🐱','🐰', // 귀여운 동물 시리즈 2
    '🐼','🐻', // 곰돌이 시리즈
    '🦊','🐺', // 여우와 늑대 (비슷한 동물)
    '🏐','⚽', // 공 시리즈
    '👁️','👄'  // 신체 부위 (헷갈림 유발)
  ],

  LEVEL_MAP: {
    "2x2": [2,2],   // 2쌍
    "3x2": [2,3],   // 3쌍
    "4x3": [3,4],   // 6쌍
    "4x4": [4,4],   // 8쌍 (9쌍 이모지 중 8쌍 사용)
  },

  // 틀렸을 때 다시 뒤집히는 시간(ms)
  MISMATCH_MS: 700,

  // 콤보 점수 규칙: 더 후하게! 10, 15, 22, 31, 42, 55, 70, 87, 106, 127(최대)
  // 콤보가 쌓일수록 보너스가 빠르게 증가 (2차 곡선)
  comboPoints(streakNow){
    if(streakNow <= 1) return 10;
    // 기본 10점 + 증가폭이 점점 커지는 보너스
    // 2콤보: +5, 3콤보: +7, 4콤보: +9, 5콤보: +11, 6콤보: +13...
    // 공식: 10 + (streak-1) * (streak+3) / 2
    const bonus = Math.floor((streakNow - 1) * (streakNow + 3) / 2);
    const maxBonus = 117; // 최대 보너스 117점 (총 127점)
    return 10 + Math.min(bonus, maxBonus);
  },

  // 로컬 저장 키
  KEYS: {
    SFX: "harumind_sfx_on",
    BIG: "harumind_bigtext_on",
    DAILY_PREFIX: "harumind_memory_daily_", // + YYYY-MM-DD
  }
};
