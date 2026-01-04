// 숫자 순서터치 (Sequence Game) - 하루마음 표준 UI 적용
// 모든 텍스트는 MSGS 객체에서 관리해 수정 용이

const STORAGE_KEYS = {
    LAST_DATE: "harumind_sequence_lastDate",
    STREAK: "harumind_sequence_streak",
    DAILY_PREFIX: "harumind_sequence_daily_"
};

const MSGS = {
    title: '🔢 숫자 순서터치',
    subtitle: '숫자를 따라가며 집중을 다독여요.',
    levels: {
        easy: { name: '새싹', desc: '가벼운 마음으로 시작해볼까요?', emoji: '🌱' },
        normal: { name: '나무', desc: '차분하게 집중력을 모아보아요.', emoji: '🌳' },
        hard: { name: '숲', desc: '깊은 몰입의 즐거움을 느껴보세요.', emoji: '🌲' }
    },
    encouragement: [
        '괜찮아요, 천천히 가도 괜찮아요',
        '여유 있게 이어가도 괜찮아요',
        '이 시간도 괜찮아요',
        '서두르지 않아도 괜찮아요',
        '잠시 머물러도 괜찮아요'
    ],
    labels: {
        difficulty: '난이도',
        time: '시간',
        target: '찾을 숫자',
        selectDifficulty: '난이도 선택',
        timerHint: '천천히 호흡을 따라가요',
        targetHint: '왼쪽에서 오른쪽으로 차근차근',
        footer: '하루마음 · harumind.kr'
    }
};

const LEVELS = {
    easy: { grid: 3, limit: 10 },
    normal: { grid: 4, limit: 25 },
    hard: { grid: 5, limit: 45 }
};

const state = {
    level: 'easy',
    expected: 1,
    max: 0,
    timerId: null,
    startTime: 0,
    elapsed: 0,
    isPlaying: false,
    wrongCount: 0,
    totalClicks: 0
};

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

function loadDailyStats(dateKey) {
    try {
        const raw = safeGet(STORAGE_KEYS.DAILY_PREFIX + dateKey);
        if (!raw) return { clears: 0 };
        const obj = JSON.parse(raw);
        return { clears: Number(obj.clears) || 0 };
    } catch(e) {
        return { clears: 0 };
    }
}

function saveDailyStats(dateKey, data) {
    safeSet(STORAGE_KEYS.DAILY_PREFIX + dateKey, JSON.stringify({
        clears: Number(data?.clears) || 0
    }));
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
        safeSet(STORAGE_KEYS.STREAK, String(streak));
        if (window.core && typeof core.markVisit === 'function') {
            core.markVisit();
        }
    }
    
    const attendanceEl = document.getElementById('attendanceInline');
    if(attendanceEl) {
        attendanceEl.innerText = `🔥 ${streak}일째`;
    }
}

function init() {
    document.addEventListener('DOMContentLoaded', () => {
        // 테마 반영 및 공통 바인딩
        core.applyTheme(core.currentTheme);
        if (core.isBgmOn) core.ensureBgm();

        updateAttendance();
        bindHeader();
        bindLevels();
        applyStaticCopy();
        startGame('easy');
    });
}

function bindHeader() {
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            core.playSfx('click');
            window.location.href = '../index.html';
        });
    }

    const brand = document.querySelector('.brand');
    if (brand) brand.innerText = `🔢 하루마음 : ${MSGS.title.replace('🔢 ', '')}`;
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) subtitle.innerText = MSGS.subtitle;

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = core.currentTheme;
        themeSelect.addEventListener('change', (e) => {
            core.playSfx('click');
        });
    }
}

function bindLevels() {
    document.querySelectorAll('.lv-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const levelKey = btn.dataset.level;
            startGame(levelKey);
        });
    });
}

function applyStaticCopy() {
    const copyMap = {
        labelDifficulty: MSGS.labels.difficulty,
        labelTime: MSGS.labels.time,
        labelTarget: MSGS.labels.target,
        hintTime: MSGS.labels.timerHint,
        hintTarget: MSGS.labels.targetHint,
        labelSelectDifficulty: MSGS.labels.selectDifficulty
    };

    document.querySelectorAll('[data-msg]').forEach((el) => {
        const key = el.dataset.msg;
        if (copyMap[key]) {
            el.innerText = copyMap[key];
        }
    });

    document.querySelectorAll('.lv-btn').forEach((btn) => {
        const key = btn.dataset.level;
        if (MSGS.levels[key]) btn.innerText = MSGS.levels[key].name;
    });

    const footer = document.getElementById('footerText');
    if (footer) footer.innerText = MSGS.labels.footer;
}

function startGame(levelKey = 'easy') {
    const useLevel = LEVELS[levelKey] ? levelKey : 'easy';
    const cfg = LEVELS[useLevel];
    state.level = useLevel;
    state.expected = 1;
    state.max = cfg.grid * cfg.grid;
    state.isPlaying = true;
    state.elapsed = 0;
    state.wrongCount = 0;
    state.totalClicks = 0;

    highlightLevel(useLevel);
    
    // Add animation to status pills
    animateStatusUpdate();
    
    updateStatusTexts(useLevel);
    renderBoard(cfg.grid);
    setNextNum(state.expected);
    resetTimer();
    
    // Start timer after a small delay for visual effect
    setTimeout(() => startTimer(), 400);

    if (core.isBgmOn) core.ensureBgm();
}

function initCenterEmoji(levelKey) {
    const centerEmoji = document.getElementById('center-emoji');
    const centerMessage = document.getElementById('center-message');
    if (!centerEmoji || !centerMessage) return;
    
    const emoji = MSGS.levels[levelKey]?.emoji || '';
    centerEmoji.innerText = emoji;
    centerEmoji.style.opacity = '1';
    centerMessage.style.opacity = '0';
}

function highlightLevel(levelKey) {
    document.querySelectorAll('.lv-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.level === levelKey);
    });
}

function animateStatusUpdate() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach((pill) => {
        pill.classList.remove('update');
        void pill.offsetWidth; // reflow
        pill.classList.add('update');
    });
}

function updateStatusTexts(levelKey) {
    const levelLabel = document.getElementById('level-label');
    const levelDesc = document.getElementById('level-desc');
    if (levelLabel) {
        const emoji = MSGS.levels[levelKey]?.emoji || '';
        const name = MSGS.levels[levelKey]?.name || '';
        levelLabel.innerText = emoji + ' ' + name;
    }
    if (levelDesc) levelDesc.innerText = MSGS.levels[levelKey].desc;
}

function renderBoard(grid) {
    const board = document.getElementById('game-board');
    if (!board) return;
    board.style.gridTemplateColumns = `repeat(${grid}, 1fr)`;
    board.innerHTML = '';

    const numbers = Array.from({ length: grid * grid }, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);

    numbers.forEach((num) => {
        const tile = document.createElement('div');
        tile.className = 'num-tile';
        tile.innerText = num;
        tile.dataset.value = String(num);
        tile.style.listStyle = 'none';
        tile.style.outline = 'none';
        tile.style.webkitTapHighlightColor = 'transparent';
        tile.setAttribute('tabindex', '-1');
        tile.addEventListener('click', () => handleTileClick(tile));
        board.appendChild(tile);
    });
}

function handleTileClick(tile) {
    if (!state.isPlaying) return;

    const value = Number(tile.dataset.value);
    state.totalClicks += 1;
    core.playSfx('click');

    if (value === state.expected) {
        tile.classList.add('found');
        state.expected += 1;
        setNextNum(state.expected);

        if (state.expected > state.max) {
            finishGame();
        }
    } else {
        state.wrongCount += 1;
        tile.classList.remove('wrong');
        void tile.offsetWidth; // reflow for animation restart
        tile.classList.add('wrong');
        setTimeout(() => tile.classList.remove('wrong'), 350);
    }
}

function setNextNum(num) {
    const nextNum = document.getElementById('next-num');
    if (!nextNum) return;
    nextNum.innerText = num > state.max ? '-' : num;
}

function resetTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    state.startTime = performance.now();
    updateTimerDisplay(0);
}

function startTimer() {
    state.timerId = setInterval(() => {
        const now = performance.now();
        state.elapsed = (now - state.startTime) / 1000;
        updateTimerDisplay(state.elapsed);
    }, 100);
}

function updateTimerDisplay(seconds) {
    const timer = document.getElementById('timer');
    if (timer) timer.innerText = `${seconds.toFixed(1)}s`;
}

function finishGame() {
    state.isPlaying = false;
    if (state.timerId) clearInterval(state.timerId);
    const elapsed = state.elapsed || (performance.now() - state.startTime) / 1000;

    // 일일 클리어 횟수 저장
    const todayKey = getTodayKey();
    const dailyStats = loadDailyStats(todayKey);
    dailyStats.clears += 1;
    saveDailyStats(todayKey, dailyStats);

    updateAttendance();
    core.playSfx('success');
    showResult(elapsed);
}

function showResult(elapsed) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    // 30% 확률로 위로 문구 표시
    const showMessage = Math.random() < 0.3;
    const message = showMessage 
        ? MSGS.encouragement[Math.floor(Math.random() * MSGS.encouragement.length)]
        : '';

    const emojiEl = document.getElementById('modal-emoji');
    const messageEl = document.getElementById('modal-message');

    if (emojiEl) emojiEl.innerText = '🌿';
    if (messageEl) messageEl.innerText = message;

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    const modalBtn = document.getElementById('modal-action');
    if (modalBtn) {
        modalBtn.onclick = () => {
            closeModal();
        };
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    startGame(state.level);
}

init();