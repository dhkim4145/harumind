// core.js - 모든 게임의 공통 엔진
class HaruCore {
    constructor() {
        this.audioCtx = null;
        this.bgmAudio = null;
        this.bgmStarted = false; // 제스처 후 BGM 시작 여부 추적
        
        // 기본값: SFX ON, BGM OFF (사용자가 명시적으로 ON 해야함)
        this.isSfxOn = localStorage.getItem('sfxOn') !== 'false';
        this.isBgmOn = localStorage.getItem('bgmOn') === 'true'; // 명시적으로 'true'일 때만 ON
        
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        window.addEventListener('DOMContentLoaded', () => this.bindUI());
        
        // 첫 사용자 제스처 감지 (자동재생 정책 대응)
        // ⚠️ once: true 제거 → bgmStarted 플래그로 중복 방지
        document.addEventListener('pointerdown', (e) => this.onFirstInteraction(e));
        document.addEventListener('click', (e) => this.onFirstInteraction(e));
    }

    // 첫 사용자 제스처 후 BGM 재생 시도
    // bgmOn이 ON인 경우 첫 제스처에만 시작 (한 번만 실행)
    onFirstInteraction() {
        // bgmStarted가 이미 true면 무시 (중복 호출 방지)
        if (this.bgmStarted) return;
        
        // isBgmOn이 true일 때만 시작
        if (this.isBgmOn) {
            this.ensureBgm();
            this.bgmStarted = true;
        }
    }

    bindUI() {
        // 공통 UI 요소 연결 (설정 모달용)
        this.bindSettingsModal();
        
        // 상단 바의 버튼들 (있으면 연결)
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
        // 구형 버튼 방식 (있으면 업데이트)
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
        
        // 신규 토글 방식 (memory.html)
        const sfxToggle = document.getElementById('sfxToggle');
        if(sfxToggle) {
          if(this.isSfxOn) {
            sfxToggle.classList.add('on');
          } else {
            sfxToggle.classList.remove('on');
          }
        }
    }

    updateModalBgmUi() {
        // 구형 버튼 방식 (있으면 업데이트)
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
        
        // 신규 토글 방식 (memory.html)
        const bgmToggle = document.getElementById('bgmToggle');
        if(bgmToggle) {
          if(this.isBgmOn) {
            bgmToggle.classList.add('on');
          } else {
            bgmToggle.classList.remove('on');
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
    // ⚠️ 직접 호출하지 말 것. toggleBgm() 또는 onFirstInteraction()에서만 호출
    ensureBgm() {
        if (!this.isBgmOn) return;

        // 기본 BGM 경로
        const defaultBgm = '/audio/bgm.mp3';
        const bodyAttr = (document.body && document.body.dataset && document.body.dataset.bgm) || '';
        const normalizeSrc = (src) => {
            if (!src) return defaultBgm;
            if (/^https?:\/\//.test(src) || src.startsWith('/')) return src;
            return '/' + src.replace(/^\.?(\/)+/, '');
        };
        const targetSrc = normalizeSrc(bodyAttr) || defaultBgm;

        // Audio 요소 찾기 또는 생성
        if (!this.bgmAudio) {
            this.bgmAudio = document.getElementById('bgmAudio');
            if (!this.bgmAudio) {
                this.bgmAudio = new Audio();
                this.bgmAudio.loop = true;
                this.bgmAudio.id = 'bgmAudio';
                this.bgmAudio.preload = 'auto';
                document.body.appendChild(this.bgmAudio);
            }
        }

        // src 설정
        const currentSrc = this.bgmAudio.src || '';
        if (!currentSrc || currentSrc !== targetSrc) {
            this.bgmAudio.src = targetSrc;
            this.bgmAudio.load();
        }

        // 재생 설정
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.25;

        // 재생 시도
        try {
            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('🎵 BGM 재생 중:', targetSrc);
                        this.bgmStarted = true;
                    })
                    .catch(e => {
                        console.warn('⚠️ BGM 재생 실패:', e.name, e.message);
                    });
            }
        } catch(e) {
            console.warn('⚠️ BGM play 예외:', e.message);
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
        // 📌 반드시 'true' 또는 'false' 문자열로 저장
        localStorage.setItem('bgmOn', this.isBgmOn ? 'true' : 'false');
        this.updateBgmUi();
        this.updateModalBgmUi();
        
        if (this.isBgmOn) {
            // BGM 켜기: 사용자가 설정에서 ON 선택한 경우 즉시 재생
            // (첫 제스처 대기 안 함 - 설정 자체가 명시적 요청)
            this.ensureBgm();
            this.bgmStarted = true;
        } else {
            // BGM 끄기
            this.stopBgm();
            // bgmStarted는 유지 (다시 ON으로 바꾸기 전까지 재생 안 함)
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

// 전역 객체로 생성 (모든 게임에서 window.core.playSfx() 식으로 접근)
window.core = new HaruCore();

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

/**
 * 모든 게임 공통 상단바 생성 함수
 * @param {string} title 게임 제목 (이모지 포함)
 * @param {object} opts 추가 옵션
 * @param {string} [opts.homeHref='../index.html'] 홈 버튼 경로
 * @param {Function} [opts.onSettings] 설정 버튼 클릭 핸들러
 */
function initGlobalHeader(title, opts = {}) {
    const {
        homeHref = '../index.html',
        onSettings = null,
    } = opts;

    // 이미 주입되어 있다면 중복 생성 방지
    if (document.querySelector('.top-container')) return;

    const headerHtml = `
        <div class="top-container">
            <div class="top-bar">
                <button type="button" class="nav-btn" id="globalHomeBtn" title="홈">🏠</button>
                <div class="top-title">${title || ''}</div>
                <button type="button" class="nav-btn" id="globalSettingsBtn" title="설정">⚙️</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', headerHtml);

    // 홈 버튼 이벤트
    const homeBtn = document.getElementById('globalHomeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            if (window.core) window.core.playSfx?.('click');
            window.location.href = homeHref;
        });
    }

    // 설정 버튼 이벤트
    const settingsBtn = document.getElementById('globalSettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (onSettings) return onSettings();
            if (window.core && typeof window.core.openSettingsModal === 'function') {
                window.core.playSfx?.('click');
                window.core.openSettingsModal();
            } else {
                console.warn('Settings modal not found');
            }
        });
    }
}

// 설정창 열기 공통 함수 (모달용)
function openSettingsModal() {
    const modal = document.getElementById('settingsModalBack');
    if (modal) {
        modal.classList.add('isOpen');
    }
}