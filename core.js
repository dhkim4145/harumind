// core.js - 모든 게임의 공통 엔진
class HaruCore {
    constructor() {
        this.audioCtx = null;
        this.bgmAudio = null;
        this.isSfxOn = localStorage.getItem('sfxOn') !== 'false';
        this.isBgmOn = localStorage.getItem('bgmOn') === 'true';
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        window.addEventListener('DOMContentLoaded', () => this.bindUI());
    }

    bindUI() {
        // 공통 UI 요소 연결 (설정 모달용)
        this.bindSettingsModal();
        
        // 기존: 상단 바의 버튼들도 지원
        const sfxBtn = document.getElementById('sfxBtn');
        if (sfxBtn) {
            this.updateSfxUi();
            sfxBtn.addEventListener('click', () => this.toggleSfx());
        }
        
        const bgmBtn = document.getElementById('bgmBtn');
        if (bgmBtn) {
            this.updateBgmUi();
            bgmBtn.addEventListener('click', () => this.toggleBgm());
        }
        
        const themeSel = document.getElementById('themeSelect');
        if (themeSel) {
            themeSel.value = this.currentTheme;
            themeSel.addEventListener('change', (e) => this.applyTheme(e.target.value));
        }
    }

    bindSettingsModal() {
        // 설정 모달 열기 버튼
        const settingsOpenBtn = document.getElementById('settingsOpenBtn');
        if (settingsOpenBtn) {
            settingsOpenBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // 설정 모달 닫기
        const settingsModalBack = document.getElementById('settingsModalBack');
        const settingsModalClose = document.getElementById('settingsModalClose');
        
        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => this.closeSettingsModal());
        }
        
        if (settingsModalBack) {
            settingsModalBack.addEventListener('click', (e) => {
                if (e.target === settingsModalBack) this.closeSettingsModal();
            });
        }

        // 모달 내부의 버튼들
        const modalSfxBtn = document.getElementById('modalSfxBtn');
        if (modalSfxBtn) {
            this.updateModalSfxUi();
            modalSfxBtn.addEventListener('click', () => this.toggleSfx());
        }

        const modalBgmBtn = document.getElementById('modalBgmBtn');
        if (modalBgmBtn) {
            this.updateModalBgmUi();
            modalBgmBtn.addEventListener('click', () => this.toggleBgm());
        }

        const modalThemeSel = document.getElementById('modalThemeSelect');
        if (modalThemeSel) {
            modalThemeSel.value = this.currentTheme;
            modalThemeSel.addEventListener('change', (e) => this.applyTheme(e.target.value));
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModalBack');
        if (modal) {
            modal.classList.add('isOpen');
            modal.style.display = 'flex';
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModalBack');
        if (modal) {
            modal.classList.remove('isOpen');
            modal.style.display = 'none';
        }
    }

    updateModalSfxUi() {
        const btn = document.getElementById('modalSfxBtn');
        if (btn) {
            if (this.isSfxOn) {
                btn.textContent = '🔊 효과음 : 켜기';
                btn.classList.remove('off');
            } else {
                btn.textContent = '🔇 효과음 : 끄기';
                btn.classList.add('off');
            }
        }
    }

    updateModalBgmUi() {
        const btn = document.getElementById('modalBgmBtn');
        if (btn) {
            if (this.isBgmOn) {
                btn.textContent = '🎵 배경음악 : 켜기';
                btn.classList.remove('off');
            } else {
                btn.textContent = '🔇 배경음악 : 끄기';
                btn.classList.add('off');
            }
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        const themes = {
            warm: { bg: '#2d1b1b', grad: '#4a2c2c' },
            dark: { bg: '#0b1020', grad: '#1b2457' },
            forest: { bg: '#111d16', grad: '#1b3a29' }
        };
        const s = themes[theme] || themes.dark;
        document.body.style.background = `radial-gradient(circle at 30% 10%, ${s.grad} 0%, ${s.bg} 70%)`;
    }

    // 효과음 재생 (타입별 사전 정의된 사운드)
    playSfx(type = 'click') {
        if (!this.isSfxOn) return;
        
        // AudioContext 초기화 및 suspended 상태 확인
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        switch(type) {
            case 'click':
                // 짧고 경쾌한 비프음
                this._playTone(440, 'sine', 0.05);
                break;
            case 'success':
                // '도-미-솔-도' 아르페지오 (팡팡 터지는 사운드)
                this._playTone(523, 'sine', 0.08);     // C5
                setTimeout(() => this._playTone(659, 'sine', 0.08), 50);   // E5
                setTimeout(() => this._playTone(783, 'sine', 0.08), 100);  // G5
                setTimeout(() => this._playTone(1046, 'sine', 0.12), 150); // C6
                break;
            default:
                this._playTone(440, 'sine', 0.05);
        }
    }

    _playTone(freq, type, duration) {
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch(e) {
            console.warn('SFX 생성 실패:', e);
        }
    }

    // 배경음 재생 (MP3 파일)
    ensureBgm() {
        if (!this.isBgmOn) return;
        
        // 이전 BGM이 있으면 먼저 멈추기
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
        
        if (!this.bgmAudio) {
            this.bgmAudio = document.getElementById('bgmAudio');
            if (!this.bgmAudio) {
                // bgmAudio 태그가 없으면 동적 생성 (권장하지 않음)
                this.bgmAudio = new Audio('../audio/piano1.mp3');
                this.bgmAudio.loop = true;
                this.bgmAudio.id = 'bgmAudio';
                document.body.appendChild(this.bgmAudio);
            }
        }
        
        if (this.bgmAudio) {
            // src 확인 (상대 경로: 게임 폴더에서 부모 디렉토리 오른적)
            const defaultSrc = '../audio/piano1.mp3';
            if (!this.bgmAudio.src || this.bgmAudio.src.includes('assets/audio') || this.bgmAudio.src.includes('/audio')) {
                this.bgmAudio.src = defaultSrc;
            }
            this.bgmAudio.volume = 0.25;
            this.bgmAudio.currentTime = 0;
            
            // 재생 시도 (Promise 기반)
            try {
                const playPromise = this.bgmAudio.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => console.log('🎵 BGM 재생 중'))
                        .catch(e => {
                            console.warn('⚠️ BGM 재생 실패:', e.name, e.message);
                            // 권한 문제 시 음소거 자동 재생 시도
                            if (e.name === 'NotAllowedError') {
                                this.bgmAudio.muted = true;
                                this.bgmAudio.play().catch(e2 => console.warn('음소거 재생도 실패'));
                            }
                        });
                } else {
                    // 구형 브라우저 (Promise 미반환)
                    console.log('🎵 BGM 재생 (구형 방식)');
                }
            } catch(e) {
                console.warn('⚠️ BGM play 예외:', e.message);
            }
        }
    }

    stopBgm() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
    }

    toggleSfx() {
        this.isSfxOn = !this.isSfxOn;
        localStorage.setItem('sfxOn', this.isSfxOn);
        this.updateSfxUi();
        this.updateModalSfxUi();
        // 토글 피드백음
        if (this.isSfxOn) this.playSfx('click');
    }

    toggleBgm() {
        this.isBgmOn = !this.isBgmOn;
        localStorage.setItem('bgmOn', this.isBgmOn);
        this.updateBgmUi();
        this.updateModalBgmUi();
        
        if (this.isBgmOn) {
            this.ensureBgm();
        } else {
            this.stopBgm();
        }
        // 토글 피드백음
        this.playSfx('click');
    }

    updateSfxUi() {
        const sfxBtn = document.getElementById('sfxBtn');
        if (sfxBtn) {
            if (this.isSfxOn) {
                sfxBtn.textContent = '🔊 효과';
                sfxBtn.classList.remove('off');
            } else {
                sfxBtn.textContent = '🔇 효과';
                sfxBtn.classList.add('off');
            }
        }
    }

    updateBgmUi() {
        const bgmBtn = document.getElementById('bgmBtn');
        if (bgmBtn) {
            if (this.isBgmOn) {
                bgmBtn.textContent = '🎵 배경';
                bgmBtn.classList.remove('off');
            } else {
                bgmBtn.textContent = '🔇 배경';
                bgmBtn.classList.add('off');
            }
        }
    }
}

// 전역 객체로 생성 (모든 게임에서 core.playSfx() 식으로 접근)
const core = new HaruCore();

// 게임 출석 및 추천 기능
core.getGameAttendance = function(gameType) {
    const key = `harumind_${gameType}_lastDate`;
    const lastDate = localStorage.getItem(key);
    const today = new Date().toISOString().slice(0, 10);
    return lastDate === today;
};

core.getTodayGameCount = function() {
    let count = 0;
    if (this.getGameAttendance('memory')) count++;
    if (this.getGameAttendance('wordfrag')) count++;
    if (this.getGameAttendance('sequence')) count++;
    return count;
};

core.getTotalGameCount = function() {
    return 3;
};

core.getTodayKey = function() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

core.markVisit = function() {
    const today = this.getTodayKey();
    const key = 'harumind_visit_days';
    let days = [];
    try {
        days = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(days)) days = [];
    } catch(e) {
        days = [];
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffKey = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
    const set = new Set(days.filter(d => d >= cutoffKey));
    set.add(today);
    const next = Array.from(set).sort();
    localStorage.setItem(key, JSON.stringify(next));
};

core.getWeeklyVisitCount = function() {
    const key = 'harumind_visit_days';
    let days = [];
    try {
        days = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(days)) days = [];
    } catch(e) {
        days = [];
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6); // 오늘 포함 7일
    const cutoffKey = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
    return days.filter(d => d >= cutoffKey).length;
};

core.getLeastPlayedGame = function() {
    const games = [
        { key: 'memory', name: '같은 그림 찾기', emoji: '🧩', path: 'memory/memory.html' },
        { key: 'wordfrag', name: '단어 조합하기', emoji: '✍️', path: 'word/word.html' },
        { key: 'sequence', name: '숫자 순서터치', emoji: '🔢', path: 'sequence/sequence.html' }
    ];
    
    const streaks = games.map(g => ({
        ...g,
        streak: parseInt(localStorage.getItem(`harumind_${g.key}_streak`) || '0', 10)
    }));
    
    streaks.sort((a, b) => a.streak - b.streak);
    return streaks[0];
};