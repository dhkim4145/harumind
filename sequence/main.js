// 숫자 순서터치 (Sequence Game) - 하루마음 표준 UI 적용
// 모든 텍스트는 MSGS 객체에서 관리해 수정 용이

const MSGS = {
    title: '숫자 순서터치',
    subtitle: '숫자를 따라가며 집중을 다독여요.',
    levels: {
        easy: { name: '새싹', desc: '가벼운 마음으로 시작해볼까요?' },
        normal: { name: '나무', desc: '차분하게 집중력을 모아보아요.' },
        hard: { name: '숲', desc: '깊은 몰입의 즐거움을 느껴보세요.' }
    },
    feedback: {
        high: '💎 맑게 개인 하늘 같은 집중력이에요!',
        mid: '✨ 차분하게 마음을 잘 모으셨네요.',
        low: '🌿 괜찮아요, 잠시 쉬어가는 시간이었을 뿐이에요.'
    },
    detail: {
        high: '목표 시간보다 {diff}초나 빠르게 성공하셨어요! 놀라운 몰입도입니다. 💎',
        mid: '차분하게 {time}초 만에 완주하셨네요. 목표에 거의 다 왔어요! ✨',
        low: '시간에 쫓기지 않고 끝까지 해낸 마음이 중요해요. 수고하셨습니다. 🌿',
        manyMistakes: '🌿 조금 서둘렀네요. 다음엔 더 차분하게 집중해볼까요?',
        timeOver: '✨ 끝까지 포기하지 않고 찾아낸 인내심이 멋져요!'
    },
    modalTitle: '정말 멋져요!',
    modalButton: '다시 도전하기',
    meta: {
        time: '클리어 타임',
        level: '선택 난이도',
        score: '마음 지수'
    },
    labels: {
        difficulty: '난이도',
        time: '시간',
        target: '찾을 숫자',
        targetTime: '목표',
        selectDifficulty: '난이도 선택',
        timerHint: '천천히 호흡을 따라가요',
        targetHint: '왼쪽에서 오른쪽으로 차근차근',
        footer: '하루마음 · 숫자 순서터치'
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
    mistakes: 0
};

function init() {
    document.addEventListener('DOMContentLoaded', () => {
        // 테마 반영 및 공통 바인딩
        core.applyTheme(core.currentTheme);
        if (core.isBgmOn) core.ensureBgm();

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
    if (brand) brand.innerText = `하루마음 : ${MSGS.title}`;
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
        labelTargetTime: MSGS.labels.targetTime,
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
    state.mistakes = 0;

    highlightLevel(useLevel);
    updateStatusTexts(useLevel);
    updateTargetTime(cfg.limit);
    renderBoard(cfg.grid);
    setNextNum(state.expected);
    resetTimer();
    startTimer();

    if (core.isBgmOn) core.ensureBgm();
}

function highlightLevel(levelKey) {
    document.querySelectorAll('.lv-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.level === levelKey);
    });
}

function updateStatusTexts(levelKey) {
    const levelLabel = document.getElementById('level-label');
    const levelDesc = document.getElementById('level-desc');
    if (levelLabel) levelLabel.innerText = MSGS.levels[levelKey].name;
    if (levelDesc) levelDesc.innerText = MSGS.levels[levelKey].desc;
    const modalBtn = document.getElementById('modal-action');
    if (modalBtn) modalBtn.innerText = MSGS.modalButton;
}

function updateTargetTime(limit) {
    const targetTimeEl = document.getElementById('target-time');
    if (targetTimeEl) targetTimeEl.innerText = `${limit.toFixed(0)}초`;
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
        tile.addEventListener('click', () => handleTileClick(tile));
        board.appendChild(tile);
    });
}

function handleTileClick(tile) {
    if (!state.isPlaying) return;

    const value = Number(tile.dataset.value);
    core.playSfx('click');

    if (value === state.expected) {
        tile.classList.add('found');
        state.expected += 1;
        setNextNum(state.expected);

        if (state.expected > state.max) {
            finishGame();
        }
    } else {
        state.mistakes += 1;
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

    const limit = LEVELS[state.level].limit;
    
    // 시간 점수 (0~100)
    const timeScore = Math.min(100, (limit / Math.max(elapsed, 0.1)) * 100);
    
    // 정확도 점수 (0~100)
    const accuracy = Math.max(0, ((state.max - state.mistakes) / state.max) * 100);
    
    // 최종 마음 지수: 시간 70% + 정확도 30%
    const rawScore = (timeScore * 0.7) + (accuracy * 0.3);
    const mindScore = Math.max(15, Math.min(100, Math.round(rawScore)));

    core.playSfx('success');
    animateBackground(mindScore);
    
    // 90점 이상일 때만 폭죽
    if (mindScore >= 90) {
        launchConfetti();
    }
    
    showResult(mindScore, elapsed, accuracy);
}

function animateBackground(score) {
    const baseBg = window.getComputedStyle(document.body).background;
    let target = '#122435';
    if (score >= 90) target = '#1d325d';
    else if (score >= 70) target = '#172b4e';

    document.body.style.transition = 'background 1.5s ease';
    document.body.style.background = target;
    setTimeout(() => core.applyTheme(core.currentTheme), 1600);
}

function launchConfetti() {
    if (typeof confetti === 'undefined') return;
    const base = { particleCount: 120, spread: 70, origin: { y: 0.6 }, ticks: 70, zIndex: 200 };
    confetti({ ...base, angle: 60, origin: { x: 0.15, y: 0.6 }, scalar: 0.9 });
    confetti({ ...base, angle: 120, origin: { x: 0.85, y: 0.6 }, scalar: 1 });
}

function showResult(score, elapsed, accuracy) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    const { emoji, feedback } = getFeedback(score, state.mistakes);
    const levelName = MSGS.levels[state.level].name;
    const limit = LEVELS[state.level].limit;
    const diff = limit - elapsed;

    const emojiEl = document.getElementById('modal-emoji');
    const titleEl = document.getElementById('modal-title');
    const scoreEl = document.getElementById('modal-score');
    const feedbackEl = document.getElementById('modal-feedback');
    const detailEl = document.getElementById('modal-detail');
    const metaEl = document.getElementById('modal-meta');
    const timeEl = document.getElementById('report-time');
    const limitEl = document.getElementById('report-limit');
    const accEl = document.getElementById('report-acc');
    const evalEl = document.getElementById('report-eval');
    const noteEl = document.getElementById('report-note');
    const gaugeEl = document.getElementById('report-gauge');

    if (emojiEl) emojiEl.innerText = emoji;
    if (titleEl) titleEl.innerText = MSGS.modalTitle;
    if (scoreEl) scoreEl.innerText = `${MSGS.meta.score}: ${score}점`;
    if (feedbackEl) feedbackEl.innerText = feedback;
    if (detailEl) detailEl.innerText = buildDetail(score, elapsed, diff, state.mistakes);
    if (metaEl) metaEl.innerText = `${MSGS.meta.time} ${elapsed.toFixed(1)}s · ${MSGS.meta.level} ${levelName}`;

    if (timeEl) timeEl.innerText = `${elapsed.toFixed(1)}초`;
    if (limitEl) limitEl.innerText = `${limit.toFixed(0)}초`;
    if (accEl) accEl.innerText = `${Math.round(accuracy)}% (실수 ${state.mistakes}회)`;
    if (evalEl) {
        if (diff > 0) {
            evalEl.innerText = `목표보다 ${diff.toFixed(1)}초 단축!`;
        } else {
            evalEl.innerText = `조금 늦었지만 끝까지 해냈어요!`;
        }
    }

    if (noteEl) {
        if (score >= 90 && diff > 0) {
            noteEl.innerText = `목표보다 ${diff.toFixed(1)}초나 더 빠르게 집중하셨네요!`;
        } else if (state.mistakes > state.max * 0.3) {
            noteEl.innerText = '조금 서둘렀네요. 다음엔 더 차분하게 집중해볼까요?';
        } else if (elapsed > limit) {
            noteEl.innerText = '끝까지 포기하지 않고 찾아낸 인내심이 멋져요!';
        } else {
            noteEl.innerText = '조금 늦어도 괜찮아요. 끝까지 찾아낸 인내심이 멋져요!';
        }
    }

    if (gaugeEl) {
        gaugeEl.style.width = '0%';
        void gaugeEl.offsetWidth;
        gaugeEl.style.width = `${score}%`;
    }

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

function getFeedback(score, mistakes) {
    if (score >= 90) return { emoji: '💎', feedback: MSGS.feedback.high };
    if (score >= 70) return { emoji: '✨', feedback: MSGS.feedback.mid };
    return { emoji: '🌿', feedback: MSGS.feedback.low };
}

function buildDetail(score, elapsed, diff, mistakes) {
    const diffAbs = Math.abs(diff).toFixed(1);
    if (score >= 90 && diff > 0) {
        return MSGS.detail.high.replace('{diff}', diffAbs);
    }
    if (mistakes > state.max * 0.3) {
        return MSGS.detail.manyMistakes;
    }
    if (elapsed > LEVELS[state.level].limit) {
        return MSGS.detail.timeOver;
    }
    if (score >= 70) {
        return MSGS.detail.mid.replace('{time}', elapsed.toFixed(1));
    }
    return MSGS.detail.low;
}

init();