// Word Fragments Game - Enhanced Version
(function() {
    // ============================================================
    // [Config & State]
    // ============================================================
    const STORAGE_KEYS = {
        BGM: "harumind_bgm",
        LAST_DATE: "harumind_wordfrag_lastDate",
        STREAK: "harumind_wordfrag_streak"
    };

    // State
    let currentWord = "";
    let currentWordData = null;
    let shuffledChars = [];
    let userSelection = [];
    let attemptsForCurrentWord = 1;
    let modalAutoCloseTimer = null;
    let pendingNavigation = null; // 배웅 모달 후 실행할 네비게이션

    const DAILY_STATS_PREFIX = 'harumind_wordfrag_stats_';
    const EXIT_PROMPT_COUNT_PREFIX = 'harumind_exit_prompt_count_';
    const EXIT_PROMPT_LAST_SHOWN = 'harumind_exit_last_shown_meaning';

    // ============================================================
    // [Storage Helper]
    // ============================================================
    function safeGet(key) {
        try { return localStorage.getItem(key); } 
        catch(e) { return null; }
    }

    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } 
        catch(e) {}
    }

    function getBool(key, defaultValue) {
        const v = safeGet(key);
        if(v === null) return defaultValue;
        return v === "1";
    }

    function getTodayKeySafe() {
        if (window.core && typeof core.getTodayKey === 'function') return core.getTodayKey();
        return getTodayKey();
    }

    function loadDailyStats(dateKey) {
        try {
            const raw = safeGet(DAILY_STATS_PREFIX + dateKey);
            if (!raw) return { clears: 0, attempts: 0 };
            const obj = JSON.parse(raw);
            return {
                clears: Number(obj.clears) || 0,
                attempts: Number(obj.attempts) || 0
            };
        } catch(e) {
            return { clears: 0, attempts: 0 };
        }
    }

    function saveDailyStats(dateKey, data) {
        safeSet(DAILY_STATS_PREFIX + dateKey, JSON.stringify({
            clears: Number(data?.clears) || 0,
            attempts: Number(data?.attempts) || 0
        }));
    }

    function setBool(key, value) {
        safeSet(key, value ? "1" : "0");
    }

    // ============================================================
    // [Exit Prompt / Meaning History]
    // ============================================================
    function getMeaningHistory() {
        const items = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('harumind_meaning_')) {
                    try {
                        const value = localStorage.getItem(key);
                        const parsed = JSON.parse(value);
                        if (parsed && parsed.meaning) {
                            items.push(parsed);
                        }
                    } catch(e) {
                        // 파싱 실패하면 무시
                    }
                }
            }
        } catch(e) {}
        return items;
    }

    function getExitPromptCountToday() {
        const today = getTodayKey();
        const key = EXIT_PROMPT_COUNT_PREFIX + today;
        const count = parseInt(safeGet(key) || '0');
        return count;
    }

    function incrementExitPromptCount() {
        const today = getTodayKey();
        const key = EXIT_PROMPT_COUNT_PREFIX + today;
        const count = getExitPromptCountToday();
        safeSet(key, String(count + 1));
    }

    function canShowExitPrompt() {
        const history = getMeaningHistory();
        if (history.length < 5) return false;
        
        const todayCount = getExitPromptCountToday();
        if (todayCount >= 2) return false;
        
        // 25% 확률
        if (Math.random() > 0.25) return false;
        
        return true;
    }

    function selectRandomMeaning(history) {
        if (!history || history.length === 0) return null;
        
        const lastShown = safeGet(EXIT_PROMPT_LAST_SHOWN);
        
        // 연속 중복 방지: 가능하면 다른 것 선택
        let candidates = history;
        if (lastShown && history.length > 1) {
            candidates = history.filter(item => {
                const itemId = item.savedAt || item.date || '';
                return itemId !== lastShown;
            });
            if (candidates.length === 0) candidates = history;
        }
        
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        
        // 선택된 항목 기록
        const selectedId = selected.savedAt || selected.date || String(Date.now());
        safeSet(EXIT_PROMPT_LAST_SHOWN, selectedId);
        
        return selected;
    }

    function showExitModal(navigationFn) {
        const history = getMeaningHistory();
        const selected = selectRandomMeaning(history);
        
        if (!selected || !selected.meaning) {
            // 선택 실패하면 바로 이동
            navigationFn();
            return;
        }
        
        pendingNavigation = navigationFn;
        
        const meaningEl = document.getElementById('exit-meaning');
        if (meaningEl) {
            meaningEl.innerText = selected.meaning;
            meaningEl.classList.remove('reveal');
            void meaningEl.offsetWidth;
            meaningEl.classList.add('reveal');
        }
        
        document.getElementById('exitModal').style.display = 'flex';
        incrementExitPromptCount();
    }

    function confirmExit() {
        document.getElementById('exitModal').style.display = 'none';
        if (pendingNavigation) {
            pendingNavigation();
            pendingNavigation = null;
        }
    }

    function handleNavigationAttempt(navigationFn) {
        if (canShowExitPrompt()) {
            showExitModal(navigationFn);
        } else {
            navigationFn();
        }
    }


    // ============================================================
    // [Attendance System]
    // ============================================================
    function getTodayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + 
               String(d.getMonth() + 1).padStart(2, '0') + '-' + 
               String(d.getDate()).padStart(2, '0');
    }

    function updateAttendance() {
        const today = getTodayKey();
        let lastDate = safeGet(STORAGE_KEYS.LAST_DATE);
        let streak = parseInt(safeGet(STORAGE_KEYS.STREAK) || '0');

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = yesterday.getFullYear() + '-' + 
                               String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(yesterday.getDate()).padStart(2, '0');
            if (lastDate === yesterdayKey) {
                streak++;
            } else {
                streak = 1;
            }
            safeSet(STORAGE_KEYS.LAST_DATE, today);
            if (window.core && typeof core.markVisit === 'function') {
                core.markVisit();
            }
            safeSet(STORAGE_KEYS.STREAK, String(streak));
        }
        
        const attendanceEl = document.getElementById('attendanceInline');
        if(attendanceEl) {
            attendanceEl.innerText = `🔥 ${streak}일째`;
        }
    }

    // ============================================================
    // [Game Logic]
    // ============================================================
    function nextLevel() {
        if(typeof WORD_DATABASE === 'undefined') {
            document.getElementById('hint').innerText = "데이터 오류 (data.js 확인)";
            return;
        }

        const randomItem = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
        currentWord = randomItem.word.replace(/\s+/g, ''); // 공백 제거
        currentWordData = randomItem;
        document.getElementById('hint').innerText = randomItem.hint;
        attemptsForCurrentWord = 1;
        
        let tempChars = currentWord.split('');
        while (tempChars.join('') === currentWord && currentWord.length > 1) {
            tempChars.sort(() => Math.random() - 0.5);
        }
        shuffledChars = tempChars;
        userSelection = [];
        renderTiles();
        renderAnswer();
    }

    function renderTiles() {
        const area = document.getElementById('tiles-area');
        area.innerHTML = shuffledChars.map((char, i) => `
            <div class="tile" id="tile-${i}" onclick="window.gameSelectChar('${char}', ${i})">${char}</div>
        `).join('');
    }

    function renderAnswer() {
        const area = document.getElementById('answer-area');
        area.innerHTML = userSelection.map(char => `<div class="answer-char">${char}</div>`).join('');
    }

    function pulseAnswerArea(className, duration = 400) {
        const area = document.getElementById('answer-area');
        if(!area) return;
        area.classList.remove(className);
        void area.offsetWidth;
        area.classList.add(className);
        setTimeout(() => area.classList.remove(className), duration);
    }

    function selectChar(char, index) {
        const tile = document.getElementById(`tile-${index}`);
        if (tile.classList.contains('selected')) return;

        core.playSfx('click');
        tile.classList.add('selected');
        userSelection.push(char);
        renderAnswer();
        pulseAnswerArea('pulse');

        if (userSelection.length === currentWord.length) {
            if (userSelection.join('') === currentWord) {
                // 정답!
                const todayKey = getTodayKeySafe();
                const stats = loadDailyStats(todayKey);
                const attemptsTotal = stats.attempts + attemptsForCurrentWord;
                const clears = stats.clears + 1;
                saveDailyStats(todayKey, { clears, attempts: attemptsTotal });

                setTimeout(() => {
                    document.getElementById('modal-word-display').innerText = currentWord;
                    const feedbackEl = document.getElementById('modal-feedback');
                    const emojiEl = document.getElementById('modal-emoji-display');
                    if (emojiEl && currentWordData?.emoji) {
                        emojiEl.textContent = currentWordData.emoji;
                    }
                    if (feedbackEl && currentWordData?.meaning) {
                        feedbackEl.innerText = currentWordData.meaning;
                        // meaning 카드 페이드인 트리거
                        feedbackEl.classList.remove('reveal');
                        void feedbackEl.offsetWidth;
                        feedbackEl.classList.add('reveal');
                    }
                    document.getElementById('modal').style.display = 'flex';
                    
                    // 2초 후 자동 닫힘
                    if (modalAutoCloseTimer) clearTimeout(modalAutoCloseTimer);
                    modalAutoCloseTimer = setTimeout(() => {
                        autoCloseModal();
                    }, 2000);
                }, 500);
            } else {
                // 틀림
                core.playSfx('click');
                pulseAnswerArea('shake');
                attemptsForCurrentWord += 1;
                setTimeout(() => {
                    resetCurrentWord();
                }, 500);
            }
        }
    }

    function resetCurrentWord() {
        userSelection = [];
        renderAnswer();
        document.querySelectorAll('.tile').forEach(t => t.classList.remove('selected'));
    }

    function closeModal() {
        if (modalAutoCloseTimer) clearTimeout(modalAutoCloseTimer);
        document.getElementById('modal').style.display = 'none';
        nextLevel();
    }

    function autoCloseModal() {
        document.getElementById('modal').style.display = 'none';
        nextLevel();
    }

    // ============================================================
    // [UI Controls]
    // ============================================================
    function initControls() {
        const homeBtn = document.getElementById('homeBtn');
        if(homeBtn) {
            homeBtn.addEventListener('click', () => {
                core.playSfx('click');
                handleNavigationAttempt(() => {
                    window.location.href = '../index.html';
                });
            });
        }

    }

    // ============================================================
    // [Initialization]
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        // 초기 테마 동기화
        core.applyTheme(core.currentTheme);
        // ✅ BGM은 core.js의 제스처 감지로 자동 재생

        // Init controls
        initControls();
        
        // Update attendance
        updateAttendance();
        
        // Start game
        if (typeof WORD_DATABASE !== 'undefined') {
            nextLevel();
        } else {
            document.getElementById('hint').innerText = "데이터 오류 (data.js 확인)";
        }
    });

    // Export functions to window
    window.gameSelectChar = selectChar;
    window.resetCurrentWord = resetCurrentWord;
    window.nextLevel = nextLevel;
    window.closeModal = closeModal;
    window.confirmExit = confirmExit;
})();