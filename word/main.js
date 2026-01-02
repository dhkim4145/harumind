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
    let bgmOn = false;
    const tone = (freq, type = 'sine', duration = 0.1) => core.playSfx(freq, type, duration);

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
        
        const attendanceEl = document.getElementById('attendance');
        if(attendanceEl) {
            attendanceEl.innerText = `🔥 연속 출석 ${streak}일`;
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

    function selectChar(char, index) {
        const tile = document.getElementById(`tile-${index}`);
        if (tile.classList.contains('selected')) return;

        tone(880, 'sine', 0.07);
        tile.classList.add('selected');
        userSelection.push(char);
        renderAnswer();

        if (userSelection.length === currentWord.length) {
            if (userSelection.join('') === currentWord) {
                // 정답!
                tone(523.25, 'sine', 0.3);
                setTimeout(() => tone(659.25, 'sine', 0.25), 120);
                launchConfetti();
                
                setTimeout(() => {
                    tone(1046.5, 'sine', 0.35);
                    document.getElementById('modal-word-display').innerText = currentWord;
                    document.getElementById('modal').style.display = 'flex';
                }, 500);
            } else {
                // 틀림
                tone(200, 'sawtooth', 0.18);
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
        // SFX 버튼 - core.js에 위임
        const sfxBtn = document.getElementById('sfxBtn');
        if(sfxBtn) {
            sfxBtn.addEventListener('click', () => {
                core.toggleSfx();
                sfxBtn.style.opacity = core.isSfxOn ? '1' : '0.6';
                tone(440, 'sine', 0.05);
            });
        }

        // BGM 버튼
        const bgmBtn = document.getElementById('bgmBtn');
        if(bgmBtn) {
            bgmBtn.addEventListener('click', () => {
                bgmOn = !bgmOn;
                setBool(STORAGE_KEYS.BGM, bgmOn);
                bgmBtn.textContent = bgmOn ? '🎵 배경' : '🔇 배경';
                bgmBtn.style.opacity = bgmOn ? '1' : '0.6';
                // BGM 재생/정지 로직은 필요시 추가
                tone(550, 'sine', 0.05);
            });
        }

        // 테마 선택
        const themeSelect = document.getElementById('themeSelect');
        if(themeSelect) {
            themeSelect.value = core.currentTheme;
            themeSelect.addEventListener('change', (e) => {
                core.applyTheme(e.target.value);
                sfxBtn && tone(660, 'sine', 0.05);
            });
        }
    }

    // ============================================================
    // [Initialization]
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        // Load settings
        bgmOn = getBool(STORAGE_KEYS.BGM, false);
        const bgmBtn = document.getElementById('bgmBtn');
        if(bgmBtn) {
            bgmBtn.textContent = bgmOn ? '🎵 배경' : '🔇 배경';
            bgmBtn.style.opacity = bgmOn ? '1' : '0.6';
        }

        // 초기 테마 동기화
        core.applyTheme(core.currentTheme);

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