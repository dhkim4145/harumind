// Word Fragments Game - Enhanced Version
(function() {
    // ============================================================
    // [Config & State]
    // ============================================================
    const STORAGE_KEYS = {
        SFX: "harumind_wordfrag_sfx_on",
        THEME: "harumind_wordfrag_theme",
        LAST_DATE: "harumind_wordfrag_lastDate",
        STREAK: "harumind_wordfrag_streak"
    };

    // 테마 정의
    const themes = {
        warm: {
            name: "따뜻한",
            bg: "#0b1020",
            bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1b2457 0%, #0b1020 55%, #050813 100%)",
            text: "#e8ecff",
            muted: "#b9c2ff",
            accent: "#6ee7b7",
            cardBg: "rgba(255,255,255,.06)",
            cardBorder: "rgba(255,255,255,.08)"
        },
        dark: {
            name: "밤하늘",
            bg: "#000000",
            bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1a0a2e 0%, #000000 55%, #000000 100%)",
            text: "#f0f0f0",
            muted: "#a0a0a0",
            accent: "#9b59b6",
            cardBg: "rgba(255,255,255,.04)",
            cardBorder: "rgba(255,255,255,.06)"
        },
        forest: {
            name: "숲속",
            bg: "#0a1a0a",
            bgGradient: "radial-gradient(1200px 800px at 30% 10%, #1a3a1a 0%, #0a1a0a 55%, #051005 100%)",
            text: "#e8ffe8",
            muted: "#b8ffb8",
            accent: "#52d452",
            cardBg: "rgba(255,255,255,.05)",
            cardBorder: "rgba(255,255,255,.08)"
        }
    };

    // State
    let currentWord = "";
    let shuffledChars = [];
    let userSelection = [];
    let sfxOn = true;
    let currentTheme = "warm";

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
    // [Theme System]
    // ============================================================
    function applyTheme(themeKey) {
        const theme = themes[themeKey] || themes.warm;
        const root = document.documentElement;
        
        root.style.setProperty("--bg", theme.bg);
        root.style.setProperty("--text", theme.text);
        root.style.setProperty("--muted", theme.muted);
        root.style.setProperty("--accent", theme.accent);
        root.style.setProperty("--card-bg", theme.cardBg);
        root.style.setProperty("--card-border", theme.cardBorder);
        
        document.body.style.background = theme.bgGradient;
        
        currentTheme = themeKey;
        safeSet(STORAGE_KEYS.THEME, themeKey);
    }

    // ============================================================
    // [Sound System - from memory game]
    // ============================================================
    function playBeep(freq=880, ms=70, gain=0.03) {
        if(!sfxOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.value = freq;
            g.gain.setValueAtTime(gain, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms/1000);
            
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + ms/1000);
        } catch(e) {}
    }

    function playSuccessSound() {
        if(!sfxOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99]; // C-E-G 화음
            
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                
                osc.type = "sine";
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5 + i * 0.1);
                
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + 0.5 + i * 0.1);
            });
        } catch(e) {}
    }

    function playFailSound() {
        if(!sfxOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            
            osc.type = "sawtooth";
            osc.frequency.value = 200;
            g.gain.setValueAtTime(0.03, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    function playCelebration() {
        if(!sfxOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C
            
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                
                osc.type = "sine";
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.12);
                
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.12);
                osc.stop(ctx.currentTime + 0.4 + i * 0.12);
            });
        } catch(e) {}
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

        playBeep(880, 50, 0.02);
        tile.classList.add('selected');
        userSelection.push(char);
        renderAnswer();

        if (userSelection.length === currentWord.length) {
            if (userSelection.join('') === currentWord) {
                // 정답!
                playSuccessSound();
                launchConfetti();
                
                setTimeout(() => {
                    playCelebration();
                    document.getElementById('modal-word-display').innerText = currentWord;
                    document.getElementById('modal').style.display = 'flex';
                }, 500);
            } else {
                // 틀림
                playFailSound();
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
        // SFX 버튼
        const sfxBtn = document.getElementById('sfxBtn');
        if(sfxBtn) {
            sfxBtn.addEventListener('click', () => {
                sfxOn = !sfxOn;
                setBool(STORAGE_KEYS.SFX, sfxOn);
                sfxBtn.textContent = sfxOn ? '🔊 사운드' : '🔇 사운드';
                playBeep(440, 50, 0.02);
            });
        }

        // 테마 선택
        const themeSelect = document.getElementById('themeSelect');
        if(themeSelect) {
            themeSelect.value = currentTheme;
            themeSelect.addEventListener('change', (e) => {
                applyTheme(e.target.value);
                playBeep(660, 50, 0.02);
            });
        }
    }

    // ============================================================
    // [Initialization]
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        // Load settings
        sfxOn = getBool(STORAGE_KEYS.SFX, true);
        currentTheme = safeGet(STORAGE_KEYS.THEME) || "warm";
        
        // Apply theme
        applyTheme(currentTheme);
        
        // Update UI
        const sfxBtn = document.getElementById('sfxBtn');
        if(sfxBtn) {
            sfxBtn.textContent = sfxOn ? '🔊 사운드' : '🔇 사운드';
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