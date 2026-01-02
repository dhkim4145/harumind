/**
 * 숫자 순서터치 (Sequence Game)
 * Memory의 모달 + Word의 배경색 로직 통합
 */

let currentNum = 1;
let maxNum = 9;
let timer = null;
let seconds = 0;
let isPlaying = false;

const LEVELS = {
    easy: { grid: 3, max: 9, limit: 12 },
    normal: { grid: 4, max: 16, limit: 30 },
    hard: { grid: 5, max: 25, limit: 55 }
};

function startGame(level) {
    const config = LEVELS[level];
    maxNum = config.max;
    currentNum = 1;
    seconds = 0;
    isPlaying = true;

    // UI 초기화
    document.querySelectorAll('.lv-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(level === 'easy' ? '쉬움' : level === 'normal' ? '보통' : '어려움'));
    });
    document.getElementById('next-num').innerText = currentNum;
    document.body.style.background = "#0b1020"; // 배경 초기화

    // 그리드 생성
    const board = document.getElementById('game-board');
    board.style.gridTemplateColumns = `repeat(${config.grid}, 1fr)`;
    board.innerHTML = '';

    // 숫자 섞기
    let numbers = Array.from({length: maxNum}, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);

    numbers.forEach(num => {
        const tile = document.createElement('div');
        tile.className = 'num-tile';
        tile.innerText = num;
        tile.onclick = () => handleTouch(num, tile);
        board.appendChild(tile);
    });

    // 타이머 시작
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        document.getElementById('timer').innerText = `시간: ${seconds}초`;
    }, 1000);

    if (window.core) core.ensureBgm();
}

function handleTouch(num, el) {
    if (!isPlaying) return;

    if (num === currentNum) {
        if (window.core) core.playSfx('click');
        el.classList.add('found');
        currentNum++;

        if (currentNum > maxNum) {
            endGame();
        } else {
            document.getElementById('next-num').innerText = currentNum;
        }
    } else {
        // 오답 효과 (shake)
        el.classList.add('wrong');
        setTimeout(() => el.classList.remove('wrong'), 400);
    }
}

function endGame() {
    isPlaying = false;
    clearInterval(timer);
    if (window.core) core.playSfx('success');

    // 점수 계산 (Word Game 방식)
    const activeLevel = document.querySelector('.lv-btn.active').innerText;
    const levelKey = activeLevel === '쉬움' ? 'easy' : activeLevel === '보통' ? 'normal' : 'hard';
    const limit = LEVELS[levelKey].limit;
    const mindScore = Math.max(10, Math.round((limit / Math.max(seconds, limit * 0.5)) * 100));

    // 배경색 전환 (Word Game 방식)
    updateBackground(mindScore);
    
    // 모달 표시 (Memory Game 방식)
    showResult(mindScore);
}

function updateBackground(score) {
    let color = "#0b1020";
    if (score >= 90) color = "#1a2a4a"; // 최상
    else if (score >= 70) color = "#16253d"; // 우수
    
    document.body.style.transition = "background 1.5s ease";
    document.body.style.background = color;
}

function showResult(score) {
    const modal = document.getElementById('modal');
    const modalScore = document.getElementById('modal-score');
    const modalEmoji = document.getElementById('modal-emoji');

    modalEmoji.innerText = score >= 90 ? '💎' : score >= 70 ? '✨' : '🌿';
    modalScore.innerText = `오늘의 마음 지수: ${score}점`;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    const activeLevel = document.querySelector('.lv-btn.active').innerText;
    startGame(activeLevel === '쉬움' ? 'easy' : activeLevel === '보통' ? 'normal' : 'hard');
}

// 초기 실행
window.onload = () => startGame('easy');