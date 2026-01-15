# Harumind Architecture Contracts (Day 5)

이 문서는 하루마음(Harumind) 프로젝트의 “깨지지 않는 약속(Contracts)”입니다.  
Day 1~10 동안은 코드 리팩토링보다, **규칙을 문서로 고정**하는 것을 우선합니다.

---

## 1) Public Core API Contract (MVP)

### ✅ Rule
- 각 게임의 `main.js`는 **아래 core API만 호출한다.**
- 금지: `main.js`에서 localStorage를 직접 만지기 시작하면 구조가 분산된다.

### State
- core.getTodayKey()
- core.isLockedToday()
- core.markPlayedToday()
- core.markVisit()

### UI
- core.showDailyLimitScreen()
- core.showCompletionModal({ difficulty, onHome, onFinish })

### Audio
- core.playSfx(type)
- core.toggleSfx()
- core.toggleBgm()

### Theme
- core.applyTheme(themeName)
- core.currentTheme

### Storage (future)
- core.storage.get(key)
- core.storage.set(key, value)

---

## 2) Page Contract Table (DOM Contracts)

이 DOM 요소들은 core.js가 전제한다.  
없으면 기능이 깨질 수 있다.

### ✅ Common Required (All Pages)
- #dailyLimitScreen
- #dailyLimitMessage
- .daily-limit-hint

### ✅ Game Pages Required
- #completionModal
- #completion-emoji
- #completion-base-message
- #completion-difficulty-message
- #completion-home-btn
- #completion-finish-btn

### ✅ Settings Modal (Only pages that have settings)
- #settingsOpenBtn
- #settingsModalBack
- #settingsModalClose
- #modalSfxBtn, #modalBgmBtn, #modalThemeSelect
- #sfxToggle, #bgmToggle

### ✅ Header (Global)
- .top-container
- #globalHomeBtn
- #globalSettingsBtn

### ✅ Audio
- #bgmAudio (없으면 core가 생성)

---

## 3) Known Risks (do not fix now, just note)

### R1) Audio keys duplicated
- sfxOn / bgmOn  vs  sfxMuted / bgmMuted  
- Risk: 페이지마다 토글 표시/상태가 다를 수 있음

### R2) Daily lock key naming mismatch
- harumin_lastPlayDate  vs  harumind_*  
- Risk: 표준화/서버 동기화 시 마이그레이션 비용 증가
