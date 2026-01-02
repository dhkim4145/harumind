// core.js - 모든 게임의 공통 엔진
class HaruCore {
    constructor() {
        this.audioCtx = null;
        this.isSfxOn = localStorage.getItem('sfxOn') !== 'false';
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        window.addEventListener('DOMContentLoaded', () => this.bindUI());
    }

    bindUI() {
        // 공통 UI 요소 연결
        const sfxBtn = document.getElementById('sfxBtn');
        if (sfxBtn) {
            sfxBtn.textContent = this.isSfxOn ? '🔊 효과' : '🔇 효과';
            sfxBtn.onclick = () => this.toggleSfx();
        }
        
        const themeSel = document.getElementById('themeSelect');
        if (themeSel) {
            themeSel.value = this.currentTheme;
            themeSel.onchange = (e) => this.applyTheme(e.target.value);
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

    playSfx(freq, type = 'sine', duration = 0.1) {
        if (!this.isSfxOn) return;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.connect(g); g.connect(this.audioCtx.destination);
        osc.start(); osc.stop(this.audioCtx.currentTime + duration);
    }

    toggleSfx() {
        this.isSfxOn = !this.isSfxOn;
        localStorage.setItem('sfxOn', this.isSfxOn);
        const sfxBtn = document.getElementById('sfxBtn');
        if (sfxBtn) sfxBtn.textContent = this.isSfxOn ? '🔊 효과' : '🔇 효과';
    }
}

// 전역 객체로 생성 (모든 게임에서 core.playSfx() 식으로 접근)
const core = new HaruCore();