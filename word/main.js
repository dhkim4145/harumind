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
    let shuffledChars = [];
    let userSelection = [];

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

    function setBool(key, value) {
        safeSet(key, value ? "1" : "0");
    }


    // ============================================================
    // [Confetti - Enhanced]
    // ============================================================
    function launchConfetti() {
        if(typeof confetti === 'undefined') return;
        
        const count = 150;
        const defaults = {
            origin: { y: 0.6 },
            zIndex: 200
        };

        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    // ============================================================
    // [Attendance System]
    // ============================================================
    function updateAttendance() {
        const today = new Date().toLocaleDateString();
        let lastDate = safeGet(STORAGE_KEYS.LAST_DATE);
        let streak = parseInt(safeGet(STORAGE_KEYS.STREAK) || '0');

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate === yesterday.toLocaleDateString()) {
                streak++;
            } else {
                streak = 1;
            }
            safeSet(STORAGE_KEYS.LAST_DATE, today);
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
        currentWord = randomItem.word;
        document.getElementById('hint').innerText = randomItem.hint;
        
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
                // 정답! 아르페지오 효과음
                core.playSfx('success');
                
                launchConfetti();
                pulseAnswerArea('sparkle', 800);
                
                setTimeout(() => {
                    document.getElementById('modal-word-display').innerText = currentWord;
                    document.getElementById('modal').style.display = 'flex';
                }, 500);
            } else {
                // 틀림
                core.playSfx('click');
                pulseAnswerArea('shake');
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
                window.location.href = '../index.html';
            });
        }

        // 테마 선택
        const themeSelect = document.getElementById('themeSelect');
        if(themeSelect) {
            themeSelect.value = core.currentTheme;
            themeSelect.addEventListener('change', (e) => {
                core.applyTheme(e.target.value);
                core.playSfx('click');
            });
        }
    }

    function updateSfxUi() {
        core.updateSfxUi();
    }

    function updateBgmUi() {
        core.updateBgmUi();
    }

    // ============================================================
    // [Initialization]
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        // 초기 테마 동기화
        core.applyTheme(core.currentTheme);

        // BGM 상태 복원 후 필요 시 재생 시도
        if(core.isBgmOn) {
            core.ensureBgm();
        }

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
})();