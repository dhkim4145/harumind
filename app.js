const CONTENT = {
  피곤함: {
    color: "rgba(100,120,180,0.7)",
    transition: ["피곤했던 오늘", "그대로 둡니다"],
    completeEmotion: "피곤했던 오늘 그대로"
  },
  불안함: {
    color: "rgba(140,100,180,0.7)",
    transition: ["불안했던 오늘", "여기서 멈춥니다"],
    completeEmotion: "불안했던 오늘 그대로"
  },
  공허함: {
    color: "rgba(80,80,90,0.6)",
    transition: ["비어있던 오늘", "그대로 둡니다"],
    completeEmotion: "비어있던 오늘 그대로"
  },
  쓸쓸함: {
    color: "rgba(196,150,110,0.7)",
    transition: ["쓸쓸했던 오늘", "그대로 둡니다"],
    completeEmotion: "쓸쓸했던 오늘 그대로"
  },
  복잡함: {
    color: "rgba(60,160,160,0.7)",
    transition: ["복잡했던 오늘", "정리하지 않아도 됩니다"],
    completeEmotion: "복잡했던 오늘 그대로"
  },
  괜찮음: {
    color: "rgba(196,168,80,0.7)",
    transition: ["괜찮았던 오늘", "그대로입니다"],
    completeEmotion: "괜찮았던 오늘 그대로"
  }
};

const FLOW_STEP1 = {
  피곤함: "여기 머뭅니다",
  불안함: "숨을 내쉽니다",
  공허함: "비워둡니다",
  쓸쓸함: "여기 있습니다",
  복잡함: "흩어진 채 둡니다",
  괜찮음: "그대로입니다"
};

const FLOW_COMMON = {
  2: "그대로 둡니다",
  3: "괜찮습니다",
  4: "오늘은 여기까지입니다"
};

const FLOW_STEP_SEMANTICS = {
  1: {
    피곤함: { react: 'dark', effect: 'relax' },
    불안함: { react: 'bright', effect: 'breathe' },
    공허함: { react: 'gray', effect: 'empty' },
    쓸쓸함: { react: 'edge', effect: 'presence' },
    복잡함: { react: 'silent', effect: 'stay' },
    괜찮음: { react: 'silent', effect: 'silence' }
  },
  2: { react: 'dark', effect: 'settle' },
  3: { react: 'bright', effect: 'okay' },
  4: { react: 'dark', effect: 'close' }
};

function getKoreaDateParts(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  } catch (err) {
    return {
      year: String(date.getFullYear()), month: String(date.getMonth() + 1),
      day: String(date.getDate()), hour: String(date.getHours())
    };
  }
}

function createFlowCopyContext(date = new Date()) {
  const parts = getKoreaDateParts(date);
  const month = Number(parts.month);
  const hour = Number(parts.hour);
  const season = month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  let time = 'daytime';
  if (hour >= 18 && hour <= 21) time = 'evening';
  else if (hour >= 22) time = 'lateNight';
  else if (hour <= 5) time = 'dawn';

  let transitionTime = 'daytime';
  if (hour >= 15 && hour <= 17) transitionTime = 'lateAfternoon';
  else if (hour >= 18 && hour <= 21) transitionTime = 'evening';
  else if (hour >= 22 || hour <= 5) transitionTime = 'night';
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return { season, time, transitionTime, dateKey };
}

let flowCopyContext = null;

function clampContextMod(value) {
  return Math.min(1.15, Math.max(0.85, value));
}

function createFlowEffectProfile(context = flowCopyContext) {
  const base = { tint: '196,168,130', tintOpacity: 0, intensity: 1, motion: 1, trail: 1 };
  if (!context || typeof HARUMIND_FLOW_COPY === 'undefined') return base;
  const season = HARUMIND_FLOW_COPY.seasons?.[context.season]?.effect || {};
  const time = HARUMIND_FLOW_COPY.times?.[context.time]?.effect || {};
  return {
    tint: season.tint || base.tint,
    tintOpacity: Math.min(0.018, Math.max(0, season.tintOpacity || 0)),
    intensity: clampContextMod((season.intensity || 1) * (time.intensity || 1)),
    motion: clampContextMod((season.motion || 1) * (time.motion || 1)),
    trail: clampContextMod((season.trail || 1) * (time.trail || 1))
  };
}

let flowEffectProfile = createFlowEffectProfile();

function contextIntensity(value) {
  return value * flowEffectProfile.intensity;
}

function contextDuration(value, includeTrail = false) {
  const modifier = flowEffectProfile.motion * (includeTrail ? flowEffectProfile.trail : 1);
  return Math.round(value * clampContextMod(modifier));
}

function applyFlowEffectProfile() {
  const root = document.documentElement;
  root.style.setProperty('--context-tint', flowEffectProfile.tint);
  root.style.setProperty('--context-tint-opacity', flowEffectProfile.tintOpacity);
  if (flowCopyContext) {
    root.dataset.flowSeason = flowCopyContext.season;
    root.dataset.flowTime = flowCopyContext.time;
  } else {
    delete root.dataset.flowSeason;
    delete root.dataset.flowTime;
  }
}

function snapshotFlowContext(date = new Date()) {
  flowCopyContext = createFlowCopyContext(date);
  flowEffectProfile = createFlowEffectProfile(flowCopyContext);
  applyFlowEffectProfile();
  return flowCopyContext;
}

function pickContextCopy(values, salt = '') {
  if (!Array.isArray(values) || values.length === 0) return '';
  const seed = `${flowCopyContext?.dateKey || 'base'}:${salt}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  return values[hash % values.length] || '';
}

function getTransitionCopy(emotion) {
  const base = CONTENT[emotion]?.transition || ['', ''];
  const contextual = flowCopyContext?.transitionTime !== 'daytime' && typeof HARUMIND_FLOW_COPY !== 'undefined'
    ? HARUMIND_FLOW_COPY.transitionLine2Packages?.[flowCopyContext.season]?.[flowCopyContext.transitionTime]?.[emotion]
      || HARUMIND_FLOW_COPY.seasons?.[flowCopyContext.season]?.transitionLine2?.[emotion]
    : null;
  return [base[0], pickContextCopy(contextual, `transition:${emotion}`) || base[1]];
}

function getFlowStepData(step, emotion = selected) {
  const semantics = step === 1
    ? FLOW_STEP_SEMANTICS[1][emotion] || { react: 'silent', effect: 'silence' }
    : FLOW_STEP_SEMANTICS[step] || { react: 'silent', effect: 'silence' };
  let text = step === 1 ? FLOW_STEP1[emotion] || '' : FLOW_COMMON[step] || '';
  if (step === 1 && flowCopyContext && typeof HARUMIND_FLOW_COPY !== 'undefined') {
    const variants = HARUMIND_FLOW_COPY.flow1Variants?.[emotion];
    text = pickContextCopy(variants, `flow1:${emotion}`) || text;
  }
  if (step === 2 && flowCopyContext && typeof HARUMIND_FLOW_COPY !== 'undefined') {
    const timeCopy = HARUMIND_FLOW_COPY.times?.[flowCopyContext.time];
    const contextual = timeCopy?.step2ByEmotion?.[emotion] || timeCopy?.step2;
    text = pickContextCopy(contextual, `step2:${emotion}`) || text;
  }
  return { text, react: semantics.react, effect: semantics.effect };
}

const FLOW_DURATION = {
  1: 3500,
  2: 3500,
  3: 4000,
  '3-pause': 4000
};

const reducedMotionQuery = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

function prefersReducedMotion() {
  return !!(reducedMotionQuery && reducedMotionQuery.matches);
}

  let selected = null;

  const EMOTION_DESC = {
    피곤함: '몸도 마음도 지쳤을 때',
    불안함: '마음이 가라앉지 않을 때',
    공허함: '아무것도 느껴지지 않을 때',
    쓸쓸함: '혼자인 느낌이 들 때',
    복잡함: '생각이 정리되지 않을 때',
    괜찮음: '무난했지만 닫고 싶은 날'
  };

  function renderGrid() {
    const grid = document.getElementById('emotion-grid');
    Object.entries(CONTENT).forEach(([name, data]) => {
      const card = document.createElement('div');
      card.className = 'e-card';
      card.dataset.key = name;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', 'false');
      card.innerHTML = `
        <div class="e-dot" style="background:${data.color};--dot-color:${data.color};"></div>
        <div class="e-word">${name}</div>
        <div class="e-desc">${EMOTION_DESC[name] || ''}</div>
      `;
      card.addEventListener('click', () => selectEmotion(name, card));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectEmotion(name, card);
        }
      });
      grid.appendChild(card);
    });
  }

  const EMOTION_CLASSES = ['emotion-피곤함','emotion-불안함','emotion-공허함','emotion-쓸쓸함','emotion-복잡함','emotion-괜찮음'];

  function selectEmotion(name, card) {
    document.querySelectorAll('.e-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    selected = name;
    document.getElementById('confirm-btn').disabled = false;
    document.body.classList.remove(...EMOTION_CLASSES);
    document.body.classList.add('emotion-' + name);
    startAurora(name);
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) confirmBtn.textContent = CONFIRM_LABELS[name] || '오늘은 여기까지입니다';
  }

  const SOUND_STORAGE_KEY = 'harumind_sound_enabled';
  const EMOTION_TONE = {
    피곤함: 174,
    불안함: 196,
    공허함: 130,
    쓸쓸함: 164,
    복잡함: 220,
    괜찮음: 246
  };
  const TRANSITION_SPACE_PRESET = {
    피곤함: {
      duration: 3.9, gain: 0.054, highpass: 82, lowpassStart: 1450, lowpassEnd: 720,
      noise: 0.5, drift: 0.012, breathBase: 0.62, breathDepth: 0.14, breathRate: 0.52,
      panStart: -0.04, panEnd: 0.04
    },
    불안함: {
      duration: 3.7, gain: 0.049, highpass: 170, lowpassStart: 2450, lowpassEnd: 1320,
      noise: 0.48, drift: 0.007, breathBase: 0.56, breathDepth: 0.1, breathRate: 0.86,
      panStart: 0.06, panEnd: -0.02
    },
    공허함: {
      duration: 4.4, gain: 0.052, highpass: 64, lowpassStart: 1180, lowpassEnd: 520,
      noise: 0.36, drift: 0.014, breathBase: 0.44, breathDepth: 0.08, breathRate: 0.42,
      panStart: -0.1, panEnd: 0.1
    },
    쓸쓸함: {
      duration: 3.9, gain: 0.054, highpass: 104, lowpassStart: 1780, lowpassEnd: 880,
      noise: 0.48, drift: 0.011, breathBase: 0.58, breathDepth: 0.13, breathRate: 0.58,
      panStart: -0.08, panEnd: 0.02
    },
    복잡함: {
      duration: 3.8, gain: 0.053, highpass: 140, lowpassStart: 2850, lowpassEnd: 760,
      noise: 0.62, drift: 0.01, breathBase: 0.64, breathDepth: 0.18, breathRate: 0.72,
      panStart: 0.08, panEnd: -0.08
    },
    괜찮음: {
      duration: 3.2, gain: 0.047, highpass: 132, lowpassStart: 2100, lowpassEnd: 1260,
      noise: 0.42, drift: 0.006, breathBase: 0.54, breathDepth: 0.09, breathRate: 0.5,
      panStart: -0.02, panEnd: 0.02
    }
  };
  let audioCtx = null;
  let masterGain = null;
  let soundEnabled = false;
  const activeAudioSources = new Set();

  function trackAudioSource(source, nodes = []) {
    if (!source) return source;
    const record = { source, nodes };
    activeAudioSources.add(record);
    const cleanup = () => {
      activeAudioSources.delete(record);
      [source, ...nodes].forEach(node => {
        try { node.disconnect(); } catch (err) {}
      });
    };
    source.addEventListener('ended', cleanup, { once: true });
    return source;
  }

  function stopActiveAudio() {
    activeAudioSources.forEach(record => {
      try { record.source.stop(); } catch (err) {}
      [record.source, ...record.nodes].forEach(node => {
        try { node.disconnect(); } catch (err) {}
      });
    });
    activeAudioSources.clear();
  }

  function initAudio() {
    if (!soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtx) {
        audioCtx = new AudioCtor();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.48, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (err) {
      audioCtx = null;
      masterGain = null;
    }
  }

  function updateSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
      btn.textContent = soundEnabled ? '작은 소리 켜짐' : '작은 소리 켜기';
    }
    document.querySelectorAll('.sound-icon-toggle').forEach(icon => {
      icon.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
      icon.setAttribute('aria-label', soundEnabled ? '작은 소리 끄기' : '작은 소리 켜기');
    });
  }

  function setSoundEnabled(enabled, options = {}) {
    soundEnabled = !!enabled;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? 'true' : 'false');
    } catch (err) {}
    updateSoundToggle();
    if (soundEnabled) initAudio();
    else stopActiveAudio();
    if (soundEnabled && options.playTest) playSoundTestBloom();
  }

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled, { playTest: nextEnabled });
  }

  function loadSoundPreference() {
    try {
      soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
    } catch (err) {
      soundEnabled = false;
    }
    updateSoundToggle();
  }

  function getAudioNow() {
    if (!soundEnabled) return null;
    initAudio();
    if (!audioCtx || !masterGain) return null;
    return audioCtx.currentTime;
  }

  function playSoftTone(freq, duration, type = 'sine', volume = 0.025, when = 0, filterFreq = 900, attack = 0.028, panValue = 0) {
    const baseNow = getAudioNow();
    if (baseNow === null) return;
    try {
      const now = baseNow + when;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.985), now + Math.min(duration, 0.28));
      osc.detune.setValueAtTime(-4, now);
      osc.detune.linearRampToValueAtTime(2, now + Math.min(duration, 0.38));
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(160, filterFreq * 0.52), now + duration);
      filter.Q.setValueAtTime(0.55, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.setTargetAtTime(0.0001, now + attack, Math.max(0.08, duration * 0.35));
      osc.connect(filter);
      filter.connect(gain);
      if (pan) {
        pan.pan.setValueAtTime(panValue, now);
        gain.connect(pan);
        pan.connect(masterGain);
      } else {
        gain.connect(masterGain);
      }
      trackAudioSource(osc, [filter, gain, pan].filter(Boolean));
      osc.start(now);
      osc.stop(now + duration + 0.06);
    } catch (err) {}
  }

  function playAirNoise(duration = 0.45, volume = 0.012, filterFreq = 760, when = 0, panValue = 0) {
    const baseNow = getAudioNow();
    if (baseNow === null) return;
    try {
      const sampleRate = audioCtx.sampleRate;
      const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
      }
      const now = baseNow + when;
      const src = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      src.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(180, filterFreq * 0.46), now + duration);
      filter.Q.setValueAtTime(0.7, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.025);
      gain.gain.setTargetAtTime(0.0001, now + 0.04, Math.max(0.08, duration * 0.28));
      src.connect(filter);
      filter.connect(gain);
      if (pan) {
        pan.pan.setValueAtTime(panValue, now);
        gain.connect(pan);
        pan.connect(masterGain);
      } else {
        gain.connect(masterGain);
      }
      trackAudioSource(src, [filter, gain, pan].filter(Boolean));
      src.start(now);
      src.stop(now + duration + 0.03);
    } catch (err) {}
  }

  // 계절별 공간음 질감 변주 — 새 소리 아님, 기존 일회성 공간음의 필터만 미세 조정
  function getSeasonAudioMod() {
    const m = new Date().getMonth();
    if (m === 11 || m <= 1) return { hp: 1.18, lp: 1.12, noise: 0.92 }; // 겨울 — 차고 또렷(얇고 밝게)
    if (m >= 5 && m <= 7)   return { hp: 0.90, lp: 0.82, noise: 1.08 }; // 여름 — 눅눅하게(먹먹하게)
    return { hp: 1.0, lp: 1.0, noise: 1.0 };                            // 봄·가을 — 중립
  }

  function playTransitionSpaceSound(emotion, duration, when = 0, options = {}) {
    const baseNow = getAudioNow();
    if (baseNow === null) return;
    try {
      const preset = TRANSITION_SPACE_PRESET[emotion] || TRANSITION_SPACE_PRESET.괜찮음;
      const sm = getSeasonAudioMod(); // 계절 질감 변주 (아주 약하게)
      const nMul = preset.noise * sm.noise;
      const tail = options.tail || 0;
      const coreDuration = duration || preset.duration || 3.8;
      const soundDuration = coreDuration + tail;
      const now = baseNow + when;
      const sampleRate = audioCtx.sampleRate;
      const frameCount = Math.max(1, Math.floor(sampleRate * soundDuration));
      const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      let drift = 0;
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const progress = i / frameCount;
        const settle = emotion === '복잡함' ? 1 - progress * 0.38 : 1;
        drift = drift * 0.992 + (Math.random() * 2 - 1) * preset.drift;
        const breath = preset.breathBase + Math.sin(t * Math.PI * preset.breathRate) * preset.breathDepth;
        data[i] = (Math.random() * 2 - 1) * nMul * breath * settle + drift;
      }

      const src = audioCtx.createBufferSource();
      const highpass = audioCtx.createBiquadFilter();
      const lowpass = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

      src.buffer = buffer;
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(preset.highpass * sm.hp, now);
      highpass.Q.setValueAtTime(0.55, now);
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(preset.lowpassStart * sm.lp, now);
      lowpass.frequency.exponentialRampToValueAtTime(preset.lowpassEnd * sm.lp, now + soundDuration);
      lowpass.Q.setValueAtTime(0.38, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(preset.gain, now + 0.65);
      gain.gain.setValueAtTime(preset.gain, now + Math.max(0.75, coreDuration - 1.0));
      if (tail > 0) {
        gain.gain.linearRampToValueAtTime(preset.gain * 0.34, now + coreDuration);
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, now + soundDuration);

      if (pan) {
        pan.pan.setValueAtTime(preset.panStart, now);
        pan.pan.linearRampToValueAtTime(preset.panEnd, now + soundDuration);
      }

      src.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      if (pan) {
        gain.connect(pan);
        pan.connect(masterGain);
      } else {
        gain.connect(masterGain);
      }
      trackAudioSource(src, [highpass, lowpass, gain, pan].filter(Boolean));
      src.start(now);
      src.stop(now + soundDuration + 0.05);
    } catch (err) {}
  }

  function playTinyChime(freq, when = 0, volume = 0.012, panValue = 0) {
    playSoftTone(freq, 0.34, 'sine', volume * 0.9, when, Math.min(freq * 2.6, 2200), 0.018, panValue);
    playSoftTone(freq * 2.01, 0.2, 'sine', volume * 0.26, when + 0.018, Math.min(freq * 3.3, 2800), 0.012, panValue * -0.5);
  }

  function playMobilePresence(freq = 1800, when = 0, volume = 0.012, panValue = 0) {
    playSoftTone(freq, 0.1, 'sine', volume * 0.62, when, 2200, 0.012, panValue);
  }

  function playSoundTestBloom() {
    playSoftTone(174, 0.62, 'sine', 0.064, 0, 900, 0.045, -0.08);
    playTinyChime(348, 0.06, 0.022, 0.1);
    playAirNoise(0.5, 0.012, 1100, 0.03, 0.04);
  }

  function playEmotionEnterSound(emotion) {
    const base = EMOTION_TONE[emotion] || 174;
    playSoftTone(base * 0.5, 1.1, 'sine', 0.04, 0, 640, 0.12, -0.08);
    playSoftTone(base, 0.9, 'sine', 0.064, 0.04, 980, 0.09, 0.08);
    playTinyChime(Math.min(base * 1.8, 540), 0.18, 0.014, 0.12);
    playAirNoise(0.82, 0.011, 1050, 0.04, 0);
  }

  function playStepCompleteSound(step) {
    if (step === 1) {
      playSoftTone(164, 0.64, 'sine', 0.066, 0, 860, 0.05, -0.1);
      playTinyChime(328, 0.06, 0.018, 0.12);
      playAirNoise(0.44, 0.011, 1020, 0.03, 0.05);
    } else if (step === 2) {
      playSoftTone(196, 0.68, 'sine', 0.064, 0, 980, 0.052, 0.08);
      playTinyChime(392, 0.07, 0.02, -0.12);
      playAirNoise(0.56, 0.012, 1120, 0.03, -0.04);
    } else if (step === 4) {
      playSoftTone(146, 0.8, 'sine', 0.056, 0, 760, 0.06, -0.04);
      playSoftTone(292, 0.58, 'sine', 0.03, 0.06, 980, 0.05, 0.1);
      playAirNoise(0.52, 0.01, 940, 0.035, 0);
    }
  }

  function playOkayRewardSound() {
    playSoftTone(196, 1.24, 'sine', 0.074, 0, 960, 0.1, -0.06);
    playSoftTone(247, 1.1, 'sine', 0.05, 0.07, 1080, 0.1, 0.08);
    playSoftTone(330, 0.94, 'sine', 0.03, 0.16, 1280, 0.08, 0);
    playTinyChime(392, 0.24, 0.017, -0.12);
    playAirNoise(0.96, 0.011, 1080, 0.08, 0);
  }

  function playCompleteCloseSound() {
    playSoftTone(130, 0.94, 'sine', 0.064, 0, 760, 0.07, 0);
    playSoftTone(260, 0.7, 'sine', 0.03, 0.06, 980, 0.06, -0.1);
    playAirNoise(0.74, 0.01, 900, 0.04, 0);
  }

  let flowTimer = null;
  let flowTextTimer = null;
  let flowTextFadeTimer = null;
  let holdRevealTimer = null;
  let stepAdvanceTimer = null;
  let completeEnterTimer = null;
  let completeExtrasTimer = null;
  let completeRestartTimer = null;
  let completeExtrasDueAt = null;
  let completeRestartDueAt = null;
  let lifecycleResumeAction = null;
  let transitionRunToken = 0;
  let transitionVisualToken = 0;
  let currentStep = 0;
  let completedSteps = 0;
  const effectAnimationFrames = new Set();
  const effectTimeouts = new Set();
  const effectElements = new Set();

  function requestEffectFrame(callback) {
    const id = requestAnimationFrame(timestamp => {
      effectAnimationFrames.delete(id);
      callback(timestamp);
    });
    effectAnimationFrames.add(id);
    return id;
  }

  function scheduleEffectTimeout(callback, delay) {
    const id = setTimeout(() => {
      effectTimeouts.delete(id);
      callback();
    }, delay);
    effectTimeouts.add(id);
    return id;
  }

  function trackEffectElement(element) {
    if (element) effectElements.add(element);
    return element;
  }

  function clearFlowEffects() {
    effectAnimationFrames.forEach(id => cancelAnimationFrame(id));
    effectAnimationFrames.clear();
    effectTimeouts.forEach(id => clearTimeout(id));
    effectTimeouts.clear();
    effectElements.forEach(element => element.remove());
    effectElements.clear();
    if (cFXAnim) cancelAnimationFrame(cFXAnim);
    cFXAnim = null;
    if (cFX && cFXCtx) {
      cFXCtx.clearRect(0, 0, cFX.width, cFX.height);
      cFX.classList.remove('visible');
    }
    const wash = document.getElementById('screen-wash');
    if (wash) wash.style.cssText = '';
    const react = document.getElementById('screen-react');
    if (react) {
      react.style.background = '';
      react.style.filter = '';
      react.style.opacity = '';
      react.style.transition = '';
    }
  }

  function clearFlowTimers() {
    clearTimeout(flowTimer);
    clearTimeout(flowTextTimer);
    clearTimeout(flowTextFadeTimer);
    clearTimeout(holdRevealTimer);
    clearTimeout(stepAdvanceTimer);
    clearTimeout(completeEnterTimer);
    clearTimeout(completeExtrasTimer);
    clearTimeout(completeRestartTimer);
    flowTimer = null;
    flowTextTimer = null;
    flowTextFadeTimer = null;
    holdRevealTimer = null;
    stepAdvanceTimer = null;
    completeEnterTimer = null;
    completeExtrasTimer = null;
    completeRestartTimer = null;
    completeExtrasDueAt = null;
    completeRestartDueAt = null;
  }

  function resetFlowCompletion() {
    completedSteps = 0;
    document.documentElement.style.setProperty('--flow-progress', 0);
    document.documentElement.style.setProperty('--hold-progress', 0);
    delete document.body.dataset.flowProgress;
    updateFlowTrace(0);
    const rewardEl = document.getElementById('step-reward');
    if (rewardEl) {
      rewardEl.classList.remove('visible');
      rewardEl.textContent = '';
    }
  }

  function updateFlowTrace(doneCount, options = {}) {
    const trace = document.getElementById('flow-trace');
    if (!trace) return;
    const progress = Math.max(0, Math.min(1, Math.min(doneCount, 3) / 3));
    trace.style.setProperty('--flow-trace-progress', progress);
    trace.classList.toggle('complete', !!options.complete);
  }

  function colorWithAlpha(color, alpha) {
    const m = String(color).match(/rgba?\(([^)]+)\)/);
    if (!m) return color;
    const parts = m[1].split(',').map(v => v.trim());
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
  }

  function resetTransitionVisual() {
    transitionVisualToken += 1;
    const wash = document.getElementById('screen-wash');
    if (!wash) return;
    wash.classList.remove('transition-enter', 'flash', 'fade');
    wash.style.cssText = '';
  }

  function playTransitionEntry(color) {
    const wash = document.getElementById('screen-wash');
    if (!wash) return;
    resetTransitionVisual();
    if (prefersReducedMotion()) {
      return;
    }
    const visualToken = transitionVisualToken;
    wash.style.background = `radial-gradient(circle at 50% 48%, ${colorWithAlpha(color, 0.18)} 0%, ${colorWithAlpha(color, 0.08)} 34%, rgba(0,0,0,0) 72%)`;
    wash.style.transform = 'scale(0.72)';
    wash.style.transition = 'opacity 0.85s cubic-bezier(.22,1,.36,1), transform 1.1s cubic-bezier(.22,1,.36,1)';
    wash.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (visualToken !== transitionVisualToken) return;
        wash.classList.add('transition-enter');
        wash.style.opacity = '1';
        wash.style.transform = 'scale(1)';
        setTimeout(() => {
          if (visualToken !== transitionVisualToken) return;
          wash.style.opacity = '0';
          wash.style.transform = 'scale(1.08)';
        }, 900);
        setTimeout(() => {
          if (visualToken !== transitionVisualToken) return;
          wash.classList.remove('transition-enter');
          wash.style.background = '';
          wash.style.transform = '';
          wash.style.transition = '';
          wash.style.opacity = '';
        }, 1600);
      });
    });
  }

  function startTransition(options = {}) {
    if (!selected) return;
    if (!options.preserveContext || !flowCopyContext) snapshotFlowContext();
    clearFlowEffects();
    const runToken = ++transitionRunToken;
    resetFlowCompletion();
    showScreen('transition');
    const data = CONTENT[selected];
    playTransitionEntry(data.color);
    playEmotionEnterSound(selected);
    const line1 = document.getElementById('transition-line1');
    const line2 = document.getElementById('transition-line2');
    const announcer = document.getElementById('transition-announcer');
    const transitionCopy = getTransitionCopy(selected);
    line1.textContent = transitionCopy[0];
    line2.textContent = transitionCopy[1];
    if (announcer) announcer.textContent = '';

    // 감정별 클래스 초기화
    line1.className = 'transition-text';
    line2.className = 'transition-text transition-line2';

    // 감정별 진입 클래스 적용
    if (selected === '복잡함') {
      line1.classList.add('transition-enter-복잡함-1');
      line2.classList.add('transition-enter-복잡함-2');
    } else {
      const cls = 'transition-enter-' + selected;
      line1.classList.add(cls);
      line2.classList.add(cls);
    }

    // Aurora 진입 시 밝아짐 (공통)
    if (auroraCanvas && auroraCtx && !prefersReducedMotion()) {
      const duration = 650;
      let started = null;
      const burst = timestamp => {
        if (runToken !== transitionRunToken || prefersReducedMotion()) return;
        if (started === null) started = timestamp;
        const progress = Math.min(1, (timestamp - started) / duration);
        const a = 0.12 * (progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7);
        auroraCtx.fillStyle = 'rgba(255,255,255,' + a + ')';
        auroraCtx.fillRect(0, 0, auroraCanvas.width, auroraCanvas.height);
        if (progress < 1) requestEffectFrame(burst);
      };
      requestEffectFrame(burst);
    }

    const line2Delay = selected === '공허함' ? 2000 : selected === '피곤함' ? 1600 : 1200;
    const flowDelay  = selected === '공허함' ? 4000 : 3200;

    // 힌트 텍스트
    const hint = document.getElementById('transition-hint');
    if (hint) { hint.classList.remove('visible'); }

    const breath = document.getElementById('transition-breath');
    if (breath) breath.classList.remove('visible');

    flowTimer = setTimeout(() => {
      line1.classList.add('visible');
      if (announcer) announcer.textContent = transitionCopy[0];
      if (breath) {
        breath.classList.add('visible');
        line1.classList.add('space-open');
        line2.classList.add('space-open');
        playTransitionSpaceSound(selected, (line2Delay + flowDelay) / 1000, 0, { tail: 0.85 });
      }

      flowTimer = setTimeout(() => {
        line2.classList.add('visible');
        if (announcer) announcer.textContent = transitionCopy[1];

        // 힌트 텍스트 등장
        if (hint) hint.classList.add('visible');

        flowTimer = setTimeout(() => {
          if (breath) breath.classList.remove('visible');
          line1.classList.remove('space-open');
          line2.classList.remove('space-open');
          if (hint) hint.classList.remove('visible');
          startFlow();
        }, flowDelay);
      }, line2Delay);
    }, 400);
  }

  function startFlow() {
    showScreen('flow');
    runFlowStep(1);
  }

  function runFlowStep(step) {
    clearTimeout(flowTimer);
    clearTimeout(flowTextTimer);
    clearTimeout(flowTextFadeTimer);
    clearTimeout(holdRevealTimer);
    currentStep = step;
    hideHoldBtn();
    const _closeBtn = document.getElementById('hold-btn');
    if (_closeBtn) _closeBtn.classList.toggle('closing', step === 4); // 4단계는 닫는 제스처
    document.documentElement.style.setProperty('--hold-progress', 0);
    updateFlowTrace(completedSteps);

    const textEl = document.getElementById('flow-text');
    textEl.classList.remove('visible', 'rewarded');
    const rewardEl = document.getElementById('step-reward');
    if (rewardEl) rewardEl.classList.remove('visible');
    const blankDelay = (step === 1) ? 0 : 300;

    flowTextTimer = setTimeout(() => {
      textEl.classList.remove('step-3', 'step-4');
      textEl.textContent = '';
      const { text } = getFlowStepData(step);
      if (step === 3) textEl.classList.add('step-3');
      if (step === 4) textEl.classList.add('step-4');
      textEl.textContent = text;
      const fadeDelay = (step === 3) ? 200 : (step === 4) ? 500 : 80;
      flowTextFadeTimer = setTimeout(() => {
        textEl.classList.add('visible');
        const revealDelay = step === 1 ? 480 : 0;
        holdRevealTimer = setTimeout(() => {
          holdRevealTimer = null;
          const flowScreen = document.getElementById('s-flow');
          if (currentStep === step && flowScreen?.classList.contains('active')) showHoldBtn();
        }, revealDelay);
      }, fadeDelay);
    }, blankDelay);



    // 모든 단계 Hold to Calm으로만 넘어감 — 자동 타이머 없음
    setTimeout(() => updateHoldLabel(), 100);
  }

  function applyStepCompletion(step) {
    completedSteps = Math.max(completedSteps, step);
    document.documentElement.style.setProperty('--flow-progress', completedSteps / 4);
    document.body.dataset.flowProgress = String(completedSteps);
    updateFlowTrace(Math.min(completedSteps, 3));
    if (completedSteps >= 4) {
      scheduleEffectTimeout(() => {
        if (completedSteps >= 4) updateFlowTrace(3, { complete: true });
      }, 420);
    }
  }

  const STEP_REWARD_TEXT = {
    1: '하나 내려놓았습니다',
    2: '조금 가벼워졌습니다',
    3: '충분합니다',
    4: ''
  };

  function showStepReward(step) {
    const el = document.getElementById('step-reward');
    if (!el) return;

    const text = STEP_REWARD_TEXT[step] || '';
    el.classList.remove('visible');
    el.textContent = text;

    if (!text) return;

    requestEffectFrame(() => {
      requestEffectFrame(() => {
        el.classList.add('visible');
      });
    });

    scheduleEffectTimeout(() => {
      el.classList.remove('visible');
    }, step === 3 ? 1800 : 1300);
  }

  function emphasizeOkayReward() {
    const textEl = document.getElementById('flow-text');
    if (!textEl) return;
    textEl.classList.add('rewarded');
    scheduleEffectTimeout(() => {
      textEl.classList.remove('rewarded');
    }, 900);
  }

  function exitFlow() {
    clearFlowTimers();
    clearFlowEffects();
    stopActiveAudio();
    transitionRunToken += 1;
    resetTransitionVisual();
    lifecycleResumeAction = null;
    currentStep = 0;
    resetFlowCompletion();
    document.getElementById('transition-line1').classList.remove('visible');
    document.getElementById('transition-line2').classList.remove('visible');
    document.getElementById('transition-line1').classList.remove('space-open');
    document.getElementById('transition-line2').classList.remove('space-open');
    const announcer = document.getElementById('transition-announcer');
    if (announcer) announcer.textContent = '';
    if (!selected) { document.body.classList.remove(...EMOTION_CLASSES); stopAurora(); resetSettled(); }
    stopScreenReact();
    resetSettled();
    hideHoldBtn();
    const _breath = document.getElementById('transition-breath');
    const _hint = document.getElementById('transition-hint');
    if (_breath) _breath.classList.remove('visible');
    if (_hint) _hint.classList.remove('visible');
    clearFlowEffects();
    const selectedCard = selected
      ? document.querySelector(`.e-card[data-key="${selected}"]`)
      : null;
    showScreen('emotion', selectedCard);
  }

  function scheduleCompleteReveal(extrasDelay = 1800, restartDelay = 4000) {
    const extras = document.getElementById('complete-extras');
    const restartBtn = document.getElementById('complete-restart');
    const now = performance.now();
    completeExtrasDueAt = now + extrasDelay;
    completeRestartDueAt = now + restartDelay;
    completeExtrasTimer = setTimeout(() => {
      completeExtrasTimer = null;
      completeExtrasDueAt = null;
      extras.classList.add('visible');
    }, extrasDelay);
    completeRestartTimer = setTimeout(() => {
      completeRestartTimer = null;
      completeRestartDueAt = null;
      restartBtn.classList.add('visible');
    }, restartDelay);
  }

  function goComplete() {
    clearFlowTimers();
    lifecycleResumeAction = null;
    hideHoldBtn();
    clearFlowEffects();
    playCompleteCloseSound();
    showScreen('complete');

    const completeScreen = document.getElementById('s-complete');
    completeScreen.classList.remove('visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => completeScreen.classList.add('visible'));
    });

    document.getElementById('complete-emotion').textContent = CONTENT[selected].completeEmotion;
    // complete-moon 색상은 감정별 CSS 클래스로 처리

    playCompleteFX(selected);
    const fallbackQuote = '오늘을 다 이해하지 못해도 괜찮습니다.';
    const quote = (typeof getTodayQuote === 'function') ? getTodayQuote(selected) : fallbackQuote;
    const safeQuote = (typeof quote === 'string' && quote.trim()) ? quote : fallbackQuote;
    const quoteEl = document.getElementById('complete-quote');
    quoteEl.innerHTML = safeQuote.replace(/\n/g, '<br>');
    // 시간대 약연동 — 깊은 밤일수록 quote가 조금 더 차갑고 낮게 가라앉음 (거의 의식 못 할 정도)
    const qr = Math.round(234 - ambientNight * 18);
    const qg = Math.round(230 - ambientNight * 10);
    const qb = Math.round(222 + ambientNight * 8);
    const qa = (0.66 + ambientNight * 0.06).toFixed(3);
    quoteEl.style.color = 'rgba(' + qr + ',' + qg + ',' + qb + ',' + qa + ')';

    const extras = document.getElementById('complete-extras');
    const restartBtn = document.getElementById('complete-restart');
    restartBtn.classList.remove('visible');
    extras.classList.remove('visible');
    extras.style.display = 'flex';
    // 글귀의 1.6초 fade-in이 끝난 뒤 0.6초간 여운을 둔다.
    scheduleCompleteReveal();
  }

  function restart() {
    const lastColor = selected ? CONTENT[selected].color : null;
    clearFlowTimers();
    clearFlowEffects();
    stopActiveAudio();
    lifecycleResumeAction = null;
    resetFlowCompletion();
    document.getElementById('s-complete').classList.remove('visible');
    document.getElementById('complete-restart').classList.remove('visible');
    const extras = document.getElementById('complete-extras');
    extras.classList.remove('visible');
    extras.style.display = 'none';
    hideHoldBtn();
    stopScreenReact();
    resetSettled();
    clearFlowEffects();
    if (cFX) { cFX.classList.remove('visible'); }
    if (cFXAnim) { cancelAnimationFrame(cFXAnim); }
    if (auroraCanvas) {
      auroraCanvas.style.transition = '';
      auroraCanvas.style.opacity = '0';
    }
    stopAurora();
    selected = null;
    document.querySelectorAll('.e-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    document.getElementById('confirm-btn').disabled = true;
    document.body.classList.remove(...EMOTION_CLASSES);
    document.body.style.background = '';
    showScreen('emotion');
    window.scrollTo(0,0);

    if (lastColor && !prefersReducedMotion()) {
      const echoEl = document.getElementById('echo-emoji');
      echoEl.style.cssText = 'display:inline-block;width:14px;height:14px;border-radius:50%;background:' + lastColor + ';';
      echoEl.classList.remove('visible', 'fadeout');
      setTimeout(() => {
        echoEl.classList.add('visible');
        setTimeout(() => {
          echoEl.classList.add('fadeout');
          echoEl.classList.remove('visible');
          setTimeout(() => {
            echoEl.style.cssText = '';
            echoEl.classList.remove('fadeout');
          }, 1500);
        }, 2000);
      }, 500);
    }
  }

  function showScreen(id, focusTarget = null) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const nextScreen = document.getElementById('s-' + id);
    nextScreen.classList.add('active');
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      if (!nextScreen.classList.contains('active')) return;
      const target = focusTarget && focusTarget.isConnected ? focusTarget : nextScreen;
      try { target.focus({ preventScroll: true }); }
      catch (err) { target.focus(); }
    });
  }

  function resumeFlowStep(step) {
    showScreen('flow');
    runFlowStep(step);
  }

  function suspendForBackground() {
    stopActiveAudio();
    if (lifecycleResumeAction) return;
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;

    if (activeScreen.id === 's-transition') {
      lifecycleResumeAction = { type: 'transition' };
      transitionRunToken += 1;
      resetTransitionVisual();
      clearFlowTimers();
      clearFlowEffects();
      return;
    }

    if (activeScreen.id === 's-complete') {
      const extras = document.getElementById('complete-extras');
      const restartBtn = document.getElementById('complete-restart');
      const now = performance.now();
      lifecycleResumeAction = {
        type: 'complete-resume',
        extrasVisible: extras.classList.contains('visible'),
        restartVisible: restartBtn.classList.contains('visible'),
        extrasRemaining: completeExtrasDueAt === null ? 0 : Math.max(0, completeExtrasDueAt - now),
        restartRemaining: completeRestartDueAt === null ? 0 : Math.max(0, completeRestartDueAt - now)
      };
      clearFlowTimers();
      clearFlowEffects();
      return;
    }

    if (activeScreen.id !== 's-flow' || currentStep === 0) return;
    const stepWasCompleted = completedSteps >= currentStep;
    lifecycleResumeAction = stepWasCompleted
      ? { type: currentStep >= 4 ? 'complete-enter' : 'flow', step: currentStep + 1 }
      : { type: 'flow', step: currentStep };
    clearFlowTimers();
    hideHoldBtn();
    clearFlowEffects();
  }

  function resumeFromBackground() {
    const action = lifecycleResumeAction;
    if (!action) return;
    lifecycleResumeAction = null;
    if (action.type === 'transition') {
      startTransition({ preserveContext: true });
    } else if (action.type === 'complete-enter') {
      goComplete();
    } else if (action.type === 'complete-resume') {
      const completeScreen = document.getElementById('s-complete');
      const extras = document.getElementById('complete-extras');
      const restartBtn = document.getElementById('complete-restart');
      showScreen('complete');
      completeScreen.classList.add('visible');
      extras.style.display = 'flex';
      extras.classList.toggle('visible', action.extrasVisible);
      restartBtn.classList.toggle('visible', action.restartVisible);
      if (!action.extrasVisible || !action.restartVisible) {
        scheduleCompleteReveal(
          action.extrasVisible ? 0 : action.extrasRemaining,
          action.restartVisible ? 0 : action.restartRemaining
        );
        if (action.extrasVisible) {
          clearTimeout(completeExtrasTimer);
          completeExtrasTimer = null;
          completeExtrasDueAt = null;
          extras.classList.add('visible');
        }
      }
    } else if (action.type === 'flow') {
      resumeFlowStep(action.step);
    }
  }

  function initPageLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspendForBackground();
      else resumeFromBackground();
    });
    window.addEventListener('pagehide', suspendForBackground);
    window.addEventListener('pageshow', () => {
      if (!document.hidden) resumeFromBackground();
    });
  }

  // 화면 탭으로 넘기는 기능 제거 — Hold to Calm으로 대체
  // s-flow 클릭은 exit/end 버튼만 처리



  // ===== 누르는 동안 화면 반응 — 게이지 연동 =====

  // 누적 상태 관리
  let settledDark = 0;    // 어두움 누적값 (0~1)
  let settledBright = 0;  // 밝음 누적값 (0~1)
  let settledGray = 0;    // 채도 누적값 (0~1)

  function applySettled() {
    const el = document.getElementById('screen-settled');
    if (!el) return;
    if (settledBright > 0) {
      el.style.background = `rgba(255,255,255,${settledBright})`;
      el.style.filter = '';
    } else if (settledGray > 0) {
      el.style.background = 'transparent';
      el.style.filter = `grayscale(${settledGray}) brightness(${1 - settledGray * 0.3})`;
    } else {
      el.style.background = `rgba(0,0,0,${settledDark})`;
      el.style.filter = '';
    }
  }

  function addSettled(type) {
    // 타입 전환 시 이전 값 리셋 — 어색한 혼합 방지
    const isDark  = type === 'dark' || type === 'top' || type === 'edge';
    const isBright = type === 'bright';
    const isGray   = type === 'gray';

    if (isDark) {
      if (settledBright > 0 || settledGray > 0) { settledBright = 0; settledGray = 0; }
      settledDark = Math.min(settledDark + contextIntensity(type === 'edge' ? 0.08 : 0.12), 0.45);
    } else if (isBright) {
      if (settledDark > 0 || settledGray > 0) { settledDark = 0; settledGray = 0; }
      settledBright = Math.min(settledBright + contextIntensity(0.05), 0.18);
    } else if (isGray) {
      if (settledDark > 0 || settledBright > 0) { settledDark = 0; settledBright = 0; }
      settledGray = Math.min(settledGray + contextIntensity(0.2), 0.7);
    }
    applySettled();
  }

  function resetSettled() {
    settledDark = 0; settledBright = 0; settledGray = 0;
    const el = document.getElementById('screen-settled');
    if (el) {
      el.style.transition = 'background 0.6s ease, filter 0.6s ease';
      el.style.background = '';
      el.style.filter = '';
      scheduleEffectTimeout(() => { if (el) el.style.transition = ''; }, 700);
    }
  }

  // 단계 의미별 화면 진행 설정
  // type: 'dark'=어두워짐 'bright'=밝아짐 'gray'=채도빠짐
  //       'edge'=가장자리번짐 'top'=위에서내려옴 'silent'=없음
  function getCurrentReactType() {
    return getFlowStepData(currentStep).react;
  }

  function updateScreenReact(pct) {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const type = getCurrentReactType();
    const t = pct / 100;

    if (type === 'silent') {
      el.style.opacity = '0';
      return;
    }

    el.style.opacity = '1';

    if (type === 'dark') {
      const a = contextIntensity(t * 0.52);
      el.style.background = `rgba(0,0,0,${a})`;
      el.style.filter = '';
    } else if (type === 'bright') {
      const a = contextIntensity(t * 0.18);
      el.style.background = `rgba(255,255,255,${a})`;
      el.style.filter = '';
    } else if (type === 'gray') {
      const g = contextIntensity(t * 0.85);
      el.style.background = 'transparent';
      el.style.filter = `grayscale(${g}) brightness(${1 - t * 0.28})`;
    } else if (type === 'edge') {
      const a = contextIntensity(t * 0.42);
      el.style.background = `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 30%, rgba(196,150,110,${a}) 100%)`;
      el.style.filter = '';
    } else if (type === 'top') {
      const a = contextIntensity(t * 0.45);
      el.style.background = `linear-gradient(180deg, rgba(0,0,0,${a}) 0%, rgba(0,0,0,0) 70%)`;
      el.style.filter = '';
    }
  }



  function stopScreenReact() {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const duration = contextDuration(350);
    el.style.transition = `background ${duration}ms ease, filter ${duration}ms ease`;
    el.style.background = '';
    el.style.filter = '';
    scheduleEffectTimeout(() => { el.style.transition = ''; }, duration + 50);
  }


  function completeScreenImpact() {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const type = getCurrentReactType();
    if (type === 'silent') return;

    if (type === 'dark' || type === 'top') {
      el.style.background = type === 'top'
        ? `linear-gradient(180deg, rgba(0,0,0,${contextIntensity(0.65)}) 0%, rgba(0,0,0,0) 70%)`
        : `rgba(0,0,0,${contextIntensity(0.65)})`;
    } else if (type === 'bright') {
      el.style.background = `rgba(255,255,255,${contextIntensity(0.26)})`;
    } else if (type === 'gray') {
      el.style.filter = 'grayscale(1) brightness(0.65)';
    } else if (type === 'edge') {
      el.style.background = `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 20%, rgba(196,150,110,${contextIntensity(0.58)}) 100%)`;
    }

    addSettled(type);
  }

  // ===== AURORA 배경 =====
  const CONFIRM_LABELS = {
    피곤함: '오늘 하루, 여기서 내려놓겠습니다',
    불안함: '오늘은 여기서 멈추겠습니다',
    공허함: '오늘은 그냥 이대로 두겠습니다',
    쓸쓸함: '오늘 하루, 그대로 마감합니다',
    복잡함: '정리하지 않아도 됩니다. 마감합니다',
    괜찮음: '오늘은 여기까지입니다 🌙'
  };

  const AURORA_COLORS = {
    피곤함: [[26,31,46],[18,24,40]],
    불안함: [[26,21,40],[20,16,36]],
    공허함: [[18,18,18],[10,10,10]],
    쓸쓸함: [[32,22,18],[20,14,12]],
    복잡함: [[15,30,34],[10,18,22]],
    괜찮음: [[22,26,44],[16,20,36]]
  };

  let auroraCanvas, auroraCtx, auroraAnim, auroraEmotion = null;
  let auroraT = 0;
  let auroraLastTimestamp = null;

  function initAurora() {
    auroraCanvas = document.getElementById('aurora');
    if (!auroraCanvas) return;
    auroraCtx = auroraCanvas.getContext('2d');
    resizeAurora();
    window.addEventListener('resize', resizeAurora);
  }

  function resizeAurora() {
    if (!auroraCanvas) return;
    auroraCanvas.width = window.innerWidth;
    auroraCanvas.height = window.innerHeight;
  }

  function startAurora(emotion) {
    if (!auroraCanvas) return;
    if (prefersReducedMotion()) {
      if (auroraAnim) cancelAnimationFrame(auroraAnim);
      auroraAnim = null;
      auroraEmotion = null;
      auroraCanvas.classList.remove('visible');
      return;
    }
    auroraEmotion = emotion;
    auroraCanvas.style.transition = 'opacity 1.2s ease';
    auroraCanvas.style.opacity = '';
    auroraCanvas.classList.add('visible');
    if (auroraAnim) cancelAnimationFrame(auroraAnim);
    auroraLastTimestamp = null;
    auroraAnim = requestAnimationFrame(drawAurora);
  }

  function stopAurora() {
    if (auroraCanvas) auroraCanvas.classList.remove('visible');
    if (auroraAnim) cancelAnimationFrame(auroraAnim);
    auroraEmotion = null;
    auroraLastTimestamp = null;
  }

  function drawAurora(timestamp) {
    if (!auroraEmotion || prefersReducedMotion()) return;
    const colors = AURORA_COLORS[auroraEmotion] || AURORA_COLORS['괜찮음'];
    const w = auroraCanvas.width, h = auroraCanvas.height;
    const ctx = auroraCtx;
    const delta = auroraLastTimestamp === null ? 1000 / 60 : Math.min(50, timestamp - auroraLastTimestamp);
    auroraLastTimestamp = timestamp;
    auroraT += 0.003 * (delta / (1000 / 60));

    ctx.clearRect(0, 0, w, h);

    // 베이스 배경
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, `rgb(${colors[0].join(',')})`);
    bg.addColorStop(1, `rgb(${colors[1].join(',')})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 오로라 레이어 1
    const x1 = w * (0.3 + Math.sin(auroraT * 0.7) * 0.2);
    const y1 = h * (0.2 + Math.cos(auroraT * 0.5) * 0.1);
    const r1 = w * (0.6 + Math.sin(auroraT * 0.3) * 0.1);
    const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
    const c0 = colors[0];
    g1.addColorStop(0, `rgba(${Math.min(c0[0]+20,255)},${Math.min(c0[1]+15,255)},${Math.min(c0[2]+30,255)},0.35)`);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // 오로라 레이어 2
    const x2 = w * (0.7 + Math.cos(auroraT * 0.6) * 0.2);
    const y2 = h * (0.4 + Math.sin(auroraT * 0.4) * 0.15);
    const r2 = w * (0.5 + Math.cos(auroraT * 0.4) * 0.1);
    const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
    g2.addColorStop(0, `rgba(${Math.min(c0[0]+10,255)},${Math.min(c0[1]+25,255)},${Math.min(c0[2]+20,255)},0.25)`);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    auroraAnim = requestAnimationFrame(drawAurora);
  }

  // ===== HOLD TO CALM =====
  const HOLD_MAP = {
    피곤함: { 1: 1100, 2: 1400, 3: 1800, 4: 1300 },
    불안함: { 1: 1300, 2: 1700, 3: 2400, 4: 1300 },
    공허함: { 1: 1600, 2: 2100, 3: 2800, 4: 1300 },
    쓸쓸함: { 1: 1300, 2: 1800, 3: 2400, 4: 1300 },
    복잡함: { 1: 1400, 2: 1700, 3: 2200, 4: 1300 },
    괜찮음: { 1: 900, 2: 1100, 3: 1400, 4: 1000 }
  };
  function getHoldDuration() {
    const map = HOLD_MAP[selected] || HOLD_MAP['피곤함'];
    return map[currentStep] || 1600;
  }
  const HOLD_CANCEL_BUFFER_MS = 800;
  let holdActive = false, holdRAF = null, holdStartTime = null;
  let holdInputReady = false;
  let holdElapsed = 0, activePointerId = null;
  let holdCancelTimer = null, holdBuffered = false;
  let holdResumeUsed = false;

  function releaseHoldPointer(btn) {
    if (!btn || typeof activePointerId !== 'number' || !btn.hasPointerCapture) return;
    try {
      if (btn.hasPointerCapture(activePointerId)) btn.releasePointerCapture(activePointerId);
    } catch (err) {}
  }

  function resetHoldInteraction(btn = document.getElementById('hold-btn')) {
    holdActive = false;
    holdBuffered = false;
    holdStartTime = null;
    holdElapsed = 0;
    holdResumeUsed = false;
    if (holdRAF) cancelAnimationFrame(holdRAF);
    holdRAF = null;
    if (holdCancelTimer) clearTimeout(holdCancelTimer);
    holdCancelTimer = null;
    releaseHoldPointer(btn);
    activePointerId = null;
    if (btn) {
      btn.classList.remove('holding', 'paused', 'completed');
      btn.style.setProperty('--bar-pct', 0);
    }
    document.documentElement.style.setProperty('--hold-progress', 0);
    stopScreenReact();
  }

  function initHold() {
    const btn = document.getElementById('hold-btn');
    if (!btn) return;

    function beginHold(inputId) {
      if (currentStep === 0 || holdActive || !holdInputReady) return;
      const resumeBufferedHold = !!(holdBuffered && holdCancelTimer);
      if (holdCancelTimer) clearTimeout(holdCancelTimer);
      holdCancelTimer = null;
      holdBuffered = false;
      if (resumeBufferedHold) holdResumeUsed = true;
      holdActive = true;
      activePointerId = inputId;
      holdStartTime = performance.now() - (resumeBufferedHold ? holdElapsed : 0);
      if (!resumeBufferedHold) {
        holdElapsed = 0;
        document.documentElement.style.setProperty('--hold-progress', 0);
      }
      if (typeof inputId === 'number') {
        try { btn.setPointerCapture(inputId); } catch (err) {}
      }
      btn.classList.remove('paused', 'completed');
      btn.classList.add('holding');
      animateBar();
    }

    function onPointerStart(e) {
      e.preventDefault();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      beginHold(e.pointerId);
    }

    function onKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;
      beginHold('keyboard');
    }

    function animateBar() {
      if (!holdActive) return;
      holdElapsed = performance.now() - holdStartTime;
      const pct = Math.min(holdElapsed / getHoldDuration() * 100, 100);
      btn.style.setProperty('--bar-pct', pct);
      document.documentElement.style.setProperty('--hold-progress', pct / 100);
      updateScreenReact(pct);
      if (pct >= 100) {
        onComplete();
        return;
      }
      holdRAF = requestAnimationFrame(animateBar);
    }

    function onComplete() {
      holdInputReady = false;
      btn.setAttribute('aria-disabled', 'true');
      holdActive = false;
      cancelAnimationFrame(holdRAF);
      holdRAF = null;
      if (holdCancelTimer) clearTimeout(holdCancelTimer);
      holdCancelTimer = null;
      holdBuffered = false;
      holdResumeUsed = false;
      releaseHoldPointer(btn);
      activePointerId = null;
      btn.classList.remove('paused');
      btn.classList.add('completed');
      btn.style.setProperty('--bar-pct', 100);
      document.documentElement.style.setProperty('--hold-progress', 1);
      clearTimeout(flowTimer);
      const stepAtComplete = currentStep;

      clearFlowEffects();
      completeScreenImpact();
      applyStepCompletion(stepAtComplete);
      showStepReward(stepAtComplete);
      playStepReward(stepAtComplete);
      if (stepAtComplete === 3) {
        playOkayRewardSound();
        emphasizeOkayReward();
      } else {
        playStepCompleteSound(stepAtComplete);
      }

      // 마지막 단계는 0.75초 동안 완료 반응을 정리한 뒤,
      // 별도의 0.35초 정적 구간을 거쳐 완료 화면으로 전환한다.
      const nextDelay = stepAtComplete === 3 ? 1800 : stepAtComplete >= 4 ? 750 : 1300;

      stepAdvanceTimer = setTimeout(() => {
        stepAdvanceTimer = null;
        stopScreenReact();
        btn.classList.remove('holding', 'paused', 'completed');
        btn.style.setProperty('--bar-pct', 0);
        document.documentElement.style.setProperty('--hold-progress', 0);
        holdStartTime = null;
        holdElapsed = 0;
        if (stepAtComplete >= 4) {
          completeEnterTimer = setTimeout(() => {
            completeEnterTimer = null;
            goComplete();
          }, 350);
        } else {
          runFlowStep(stepAtComplete + 1);
        }
      }, nextDelay);
    }

    function pauseForResume(inputId) {
      if (!holdActive || inputId !== activePointerId) return;
      if (holdResumeUsed) {
        resetHoldInteraction(btn);
        return;
      }
      holdActive = false;
      cancelAnimationFrame(holdRAF);
      holdRAF = null;
      holdElapsed = Math.min(performance.now() - holdStartTime, getHoldDuration());
      holdBuffered = true;
      releaseHoldPointer(btn);
      activePointerId = null;
      btn.classList.remove('holding');
      btn.classList.add('paused');
      holdCancelTimer = setTimeout(() => resetHoldInteraction(btn), HOLD_CANCEL_BUFFER_MS);
    }

    function onPointerEnd(e) {
      e.preventDefault();
      pauseForResume(e.pointerId);
    }

    function onKeyUp(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (activePointerId !== 'keyboard') return;
      e.preventDefault();
      pauseForResume('keyboard');
    }

    btn.addEventListener('pointerdown', onPointerStart);
    btn.addEventListener('pointerup', onPointerEnd);
    btn.addEventListener('pointercancel', onPointerEnd);
    btn.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  const HOLD_LABELS = {
    1: '손을 가볍게 올려두세요',
    2: '조금 더 머물러요',
    3: '충분히 머물러도 됩니다',
    4: '이제 오늘을 닫습니다'
  };

  function showHoldBtn() {
    const wrap = document.getElementById('hold-wrap');
    if (wrap) wrap.classList.add('visible');
    const btn = document.getElementById('hold-btn');
    holdInputReady = true;
    if (btn) btn.setAttribute('aria-disabled', 'false');
    updateHoldLabel();
  }

  function updateHoldLabel() {
    const label = document.querySelector('.hold-btn-label');
    if (label) label.textContent = HOLD_LABELS[currentStep] || HOLD_LABELS[1];
  }

  function hideHoldBtn() {
    holdInputReady = false;
    const wrap = document.getElementById('hold-wrap');
    if (wrap) wrap.classList.remove('visible');
    const btn = document.getElementById('hold-btn');
    if (btn) {
      btn.classList.remove('closing');
      btn.setAttribute('aria-disabled', 'true');
    }
    resetHoldInteraction(btn);
  }

  // ===== 시간대/계절 분위기 (위젯·숫자 없이 공기로만) =====
  let ambientNight = 0; // 0(낮)~1(깊은 밤) — 완료 quote 톤에 아주 약하게 연동
  function applyAmbient() {
    const el = document.getElementById('ambient');
    if (!el) return;
    const now = new Date();
    const hf = now.getHours() + now.getMinutes() / 60; // 분 단위까지 — 경계에서 급변 방지
    const m = now.getMonth(); // 0=1월

    // 계절 색온도 — 감정 색을 해치지 않는 선에서 아주 옅게
    let tint, season, tintA;
    if (m === 11 || m <= 1)      { tint = 'rgba(120,150,205,'; season = 'winter'; tintA = 0.11; }  // 겨울 — 차갑게
    else if (m >= 5 && m <= 7)   { tint = 'rgba(205,170,120,'; season = 'summer'; tintA = 0.11; }  // 여름 — 따뜻하게
    else                          { tint = 'rgba(150,150,175,'; season = 'mid';    tintA = 0.065; } // 봄·가을 — 중립

    // 시간대 깊이 — 새벽 3시 최대 ~ 오후 3시 최소로 부드럽게 보간 (계단식 X)
    const nightness = (Math.cos((hf - 3) / 24 * Math.PI * 2) + 1) / 2; // 0~1
    ambientNight = nightness;
    const darkA = +(nightness * 0.14).toFixed(3);              // 더 은은하게
    const topA  = +(tintA * (0.8 + nightness * 0.2)).toFixed(3); // 밤일수록 아주 살짝만 더

    el.dataset.season = season;
    el.style.background =
      'radial-gradient(ellipse at 50% 8%, ' + tint + topA + ') 0%, rgba(0,0,0,0) 56%),' +
      'linear-gradient(rgba(0,0,0,' + darkA + '), rgba(0,0,0,' + darkA + '))';
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  }

  // 여름 한정 정적 헤이즈 (밤 습기 공기감) — 무애니메이션, 감정색 가드 재사용
  function applySeasonHaze() {
    const el = document.getElementById('season-haze');
    if (!el) return;
    const m = new Date().getMonth();
    const isSummer = (m >= 5 && m <= 7); // 6~8월
    if (!isSummer) { el.style.background = ''; return; } // 다른 계절은 적용 안 함
    const k = 0.7 + ambientNight * 0.3; // 밤일수록 아주 살짝만 더
    const a1 = (0.11 * k).toFixed(3);
    const a2 = (0.07 * k).toFixed(3);
    el.style.background =
      'radial-gradient(ellipse at 50% 64%, rgba(208,184,148,' + a1 + ') 0%, rgba(0,0,0,0) 60%),' +
      'radial-gradient(ellipse at 50% 30%, rgba(196,178,150,' + a2 + ') 0%, rgba(0,0,0,0) 70%)';
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  }

  function initCompleteMoonTap() {
    const moonEl = document.getElementById('complete-moon');
    if (!moonEl) return;
    moonEl.addEventListener('click', () => {
      if (prefersReducedMotion()) return;
      moonEl.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1)';
      moonEl.style.transform = 'scale(1.08)';
      setTimeout(() => { moonEl.style.transform = 'scale(1)'; }, 320);
    });
  }

  function syncReducedMotion() {
    if (prefersReducedMotion()) {
      clearFlowEffects();
      if (auroraAnim) cancelAnimationFrame(auroraAnim);
      auroraAnim = null;
      auroraEmotion = null;
      if (auroraCanvas) auroraCanvas.classList.remove('visible');
      if (cFXAnim) cancelAnimationFrame(cFXAnim);
      cFXAnim = null;
      if (cFX && cFXCtx) {
        cFXCtx.clearRect(0, 0, cFX.width, cFX.height);
        cFX.classList.remove('visible');
      }
    } else if (selected && !document.getElementById('s-complete').classList.contains('active')) {
      startAurora(selected);
    }
  }

  function initReducedMotion() {
    if (!reducedMotionQuery) return;
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', syncReducedMotion);
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(syncReducedMotion);
    }
    syncReducedMotion();
  }

  document.addEventListener('DOMContentLoaded', function() {
    applyFlowEffectProfile();
    loadSoundPreference();
    initAurora();
    initHold();
    applyAmbient();
    applySeasonHaze();
    initCompleteMoonTap();
    initReducedMotion();
    initPageLifecycle();
  });

  // ===== 단계 의미별 연출 시스템 =====
  // 힘을 풉니다  → Aurora 어두워짐 (긴장이 내려가는)
  // 숨을 내쉽니다 → 화면 부드러운 수축 (내쉼)
  // 비워둡니다   → 완전한 정지 (비움)
  // 여기 있습니다 → 파문 하나 퍼졌다 사라짐 (존재감)
  // 내려놓습니다  → 빛이 아래로 흘러내림
  // 그대로입니다  → 아무 연출 없음 (침묵이 보상)
  // 그대로 둡니다 → 파문이 퍼졌다 잔잔히 사라짐
  // 정리하지 않아도 됩니다 → 흩어진 채 그냥 있음 (선이 머뭄)
  // 괜찮습니다   → 화면 아주 살짝 밝아졌다 원래로
  // 오늘은 여기까지입니다 → Aurora 천천히 꺼짐

  const FLOW_EFFECT_HANDLERS = {
    relax: fxRelax,
    breathe: fxBreathe,
    empty: fxEmpty,
    presence: fxPresence,
    letGo: fxLetGo,
    stay: fxStay,
    silence: fxSilence,
    settle: fxSettle,
    okay: fxOkay,
    close: fxClose
  };

  function playStepReward(step) {
    if (prefersReducedMotion()) return;
    const fn = FLOW_EFFECT_HANDLERS[getFlowStepData(step).effect];
    if (fn) fn();
  }

  // ===== 연출 함수들 =====

  // 힘을 풉니다 — Aurora 한 톤 어두워짐
  function fxRelax() {
    if (!auroraCanvas || !auroraCtx) return;
    const target = contextIntensity(0.25);
    const duration = contextDuration(280);
    let started = null;
    const darken = timestamp => {
      if (started === null) started = timestamp;
      const progress = Math.min(1, (timestamp - started) / duration);
      const alpha = target * progress;
      auroraCtx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
      auroraCtx.fillRect(0, 0, auroraCanvas.width, auroraCanvas.height);
      if (progress < 1) requestEffectFrame(darken);
    };
    requestEffectFrame(darken);
  }

  // 숨을 내쉽니다 — 파문 하나, 숨 내쉬듯 느리게
  function fxBreathe() {
    const overlay = document.getElementById('ripple-overlay');
    if (!overlay) return;
    const c = trackEffectElement(document.createElement('div'));
    c.className = 'ripple-circle';
    const duration = contextDuration(2000, true);
    c.style.cssText = `width:60px;height:60px;border:1px solid rgba(140,100,180,${contextIntensity(0.5)});animation-duration:${duration}ms;`;
    overlay.appendChild(c);
    scheduleEffectTimeout(() => { effectElements.delete(c); c.remove(); }, duration + 100);
  }

  // 비워둡니다 — 완전한 정지, 0.8초 아무것도 없음
  function fxEmpty() {
    // 아무것도 하지 않음 — 정지가 연출
    // Aurora만 계속 흐름
  }

  // 여기 있습니다 — 작은 파문 하나
  function fxPresence() {
    const overlay = document.getElementById('ripple-overlay');
    if (!overlay) return;
    const c = trackEffectElement(document.createElement('div'));
    c.className = 'ripple-circle';
    const duration = contextDuration(1600, true);
    c.style.cssText = `width:40px;height:40px;border:1px solid rgba(196,150,110,${contextIntensity(0.6)});animation-duration:${duration}ms;`;
    overlay.appendChild(c);
    scheduleEffectTimeout(() => { effectElements.delete(c); c.remove(); }, duration + 100);
  }

  // 내려놓습니다 — 빛이 아래로 흘러내림
  function fxLetGo() {
    const wash = document.getElementById('screen-wash');
    if (!wash) return;
    const enterDuration = contextDuration(300);
    const exitDuration = contextDuration(1200, true);
    wash.style.cssText = `background:linear-gradient(180deg,rgba(60,160,160,${contextIntensity(0.08)}) 0%,rgba(0,0,0,0) 100%);transition:opacity ${enterDuration}ms ease-in;`;
    wash.style.opacity = '1';
    scheduleEffectTimeout(() => { wash.style.transition = `opacity ${exitDuration}ms ease-out`; wash.style.opacity = '0'; }, enterDuration);
    scheduleEffectTimeout(() => { wash.style.cssText = ''; }, enterDuration + exitDuration + 100);
  }

  // 그대로입니다 — 침묵 (아무 연출 없음)
  function fxSilence() {
    // 의도적으로 비움 — 침묵이 보상
  }

  // 그대로 둡니다 — 파문 퍼졌다 잔잔히
  function fxSettle() {
    const overlay = document.getElementById('ripple-overlay');
    if (!overlay) return;
    const c = trackEffectElement(document.createElement('div'));
    c.className = 'ripple-circle';
    const duration = contextDuration(1800, true);
    c.style.cssText = `width:50px;height:50px;border:1px solid rgba(196,168,130,${contextIntensity(0.45)});animation-duration:${duration}ms;`;
    overlay.appendChild(c);
    scheduleEffectTimeout(() => { effectElements.delete(c); c.remove(); }, duration + 100);
  }

  // 정리하지 않아도 됩니다 — 선들이 흩어진 채 머뭄
  function fxStay() {
    if (!cFX) initCompleteFX();
    if (!cFX) return;
    cFX.classList.add('visible');
    const w=cFX.width, h=cFX.height, ctx=cFXCtx;
    const ls = Array.from({length:5}, () => ({
      x1:w*0.2+Math.random()*w*0.6, y1:h*0.2+Math.random()*h*0.6,
      x2:w*0.2+Math.random()*w*0.6, y2:h*0.2+Math.random()*h*0.6,
      a: contextIntensity(0.25)
    }));
    const fadeStart = contextDuration(1000);
    const duration = contextDuration(2333, true);
    let started = null;
    const d=timestamp=>{
      if (started === null) started = timestamp;
      const elapsed = Math.min(duration, timestamp - started);
      ctx.clearRect(0,0,w,h);
      ls.forEach(l=>{
        const fade = elapsed > fadeStart
          ? Math.max(0, l.a * (1 - (elapsed - fadeStart) / Math.max(1, duration - fadeStart)))
          : l.a;
        ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2);
        ctx.strokeStyle='rgba(60,160,160,'+fade+')'; ctx.lineWidth=1; ctx.stroke();
      });
      if (elapsed < duration) cFXAnim=requestEffectFrame(d);
      else { ctx.clearRect(0,0,w,h); cFX.classList.remove('visible'); }
    };
    cFXAnim=requestEffectFrame(d);
  }

  // 괜찮습니다 — 살짝 밝아졌다 원래로
  function fxOkay() {
    if (!auroraCanvas || !auroraCtx) return;
    const duration = contextDuration(440, true);
    const peakAt = 1 / 3;
    let started = null;
    const glow = timestamp => {
      if (started === null) started = timestamp;
      const progress = Math.min(1, (timestamp - started) / duration);
      const envelope = progress < peakAt
        ? progress / peakAt
        : 1 - (progress - peakAt) / (1 - peakAt);
      const alpha = contextIntensity(0.07) * Math.max(0, envelope);
      auroraCtx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      auroraCtx.fillRect(0, 0, auroraCanvas.width, auroraCanvas.height);
      if (progress < 1) requestEffectFrame(glow);
    };
    requestEffectFrame(glow);
  }

  // 오늘은 여기까지입니다 — Aurora 천천히 꺼지며 완료로
  function fxClose() {
    if (!auroraCanvas) return;
    const duration = contextDuration(600, true);
    auroraCanvas.style.transition = `opacity ${duration}ms ease-out`;
    auroraCanvas.style.opacity = '0';
    scheduleEffectTimeout(() => {
      if (auroraAnim) cancelAnimationFrame(auroraAnim);
    }, duration + 100);
  }

  // ===== 최종 완료 연출 =====
  let cFX, cFXCtx, cFXAnim;
  function resizeCompleteFX() {
    if (!cFX) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (cFX.width === width && cFX.height === height) return;
    if (cFXAnim) {
      cancelAnimationFrame(cFXAnim);
      effectAnimationFrames.delete(cFXAnim);
      cFXAnim = null;
      cFX.classList.remove('visible');
    }
    cFX.width = width;
    cFX.height = height;
  }

  function initCompleteFX() {
    cFX = document.getElementById('complete-fx');
    if (!cFX) return;
    cFXCtx = cFX.getContext('2d');
    resizeCompleteFX();
    window.addEventListener('resize', resizeCompleteFX);
  }

  function playCompleteFX(emotion) {
    if (prefersReducedMotion()) return;
    if (!cFX) initCompleteFX();
    if (!cFX) return;
    resizeCompleteFX();
    if (cFXAnim) cancelAnimationFrame(cFXAnim);
    cFXCtx.clearRect(0, 0, cFX.width, cFX.height);
    cFX.classList.add('visible');
    const fns = {
      피곤함: fxFall, 불안함: fxWave, 공허함: fxDot,
      쓸쓸함: fxScatter, 복잡함: fxLines, 괜찮음: fxGold
    };
    (fns[emotion] || fxGold)();
    scheduleEffectTimeout(() => {
      cFX.classList.remove('visible');
      if (cFXAnim) cancelAnimationFrame(cFXAnim);
      cFXAnim = null;
    }, contextDuration(3000, true));
  }

  function getCompleteEffectDuration() {
    return contextDuration(3000, true);
  }

  function getCompleteEnvelope(elapsed, duration) {
    const formationDuration = duration / 3;
    if (elapsed < formationDuration) return elapsed / formationDuration;
    return Math.max(0, 1 - (elapsed - formationDuration) / Math.max(1, duration - formationDuration));
  }

  function getCompleteAlpha(baseAlpha, envelope) {
    return Math.min(0.52, contextIntensity(baseAlpha) * envelope);
  }

  function fxFall() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx;
    const duration=getCompleteEffectDuration();
    const ps=Array.from({length:18},()=>({x:w*0.12+Math.random()*w*0.76,y:h*0.16+Math.random()*h*0.38,vy:(13.2+Math.random()*28.8)/flowEffectProfile.motion,a:0.24+Math.random()*0.16,r:1+Math.random()*1.2}));
    let started=null; const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration);ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration);ps.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y+p.vy*(elapsed/1000),p.r,0,Math.PI*2);ctx.fillStyle='rgba(100,120,180,'+getCompleteAlpha(p.a,envelope)+')';ctx.fill();});if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }
  function fxWave() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx,cx=w/2,cy=h/2,duration=getCompleteEffectDuration();let started=null;
    const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration);ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration),base=24+(elapsed/1000)*43.2/flowEffectProfile.motion;[base,base-34].filter(r=>r>0).forEach((r,index)=>{const a=getCompleteAlpha(index===0?0.3:0.2,envelope);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(140,100,180,'+a+')';ctx.lineWidth=1;ctx.stroke();});if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }
  function fxDot() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx,duration=getCompleteEffectDuration();let started=null;
    const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration);ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration),a=getCompleteAlpha(0.36,envelope);const halo=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,34);halo.addColorStop(0,'rgba(220,220,230,'+(a*0.2)+')');halo.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=halo;ctx.fillRect(w/2-34,h/2-34,68,68);ctx.beginPath();ctx.arc(w/2,h/2,2.4,0,Math.PI*2);ctx.fillStyle='rgba(220,220,230,'+a+')';ctx.fill();if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }
  function fxScatter() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx;
    const duration=getCompleteEffectDuration();
    const ps=Array.from({length:12},()=>{const ang=Math.random()*Math.PI*2,dist=28+Math.random()*82;return{x:w/2+Math.cos(ang)*dist,y:h/2+Math.sin(ang)*dist*0.62,vx:(Math.random()-0.5)*7.2/flowEffectProfile.motion,vy:(-2.4-Math.random()*6)/flowEffectProfile.motion,a:0.24+Math.random()*0.14,r:1+Math.random()*1.1};});
    let started=null; const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration),seconds=elapsed/1000;ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration);ps.forEach(p=>{ctx.beginPath();ctx.arc(p.x+p.vx*seconds,p.y+p.vy*seconds,p.r,0,Math.PI*2);ctx.fillStyle='rgba(196,150,110,'+getCompleteAlpha(p.a,envelope)+')';ctx.fill();});if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }
  function fxLines() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx;
    const duration=getCompleteEffectDuration();
    const ls=Array.from({length:6},()=>({x1:w*0.2+Math.random()*w*0.6,y1:h*0.26+Math.random()*h*0.48,x2:w*0.2+Math.random()*w*0.6,y2:h*0.26+Math.random()*h*0.48,a:0.22+Math.random()*0.14}));
    let started=null; const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration);ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration);ls.forEach(l=>{ctx.beginPath();ctx.moveTo(l.x1,l.y1);ctx.lineTo(l.x2,l.y2);ctx.strokeStyle='rgba(60,160,160,'+getCompleteAlpha(l.a,envelope)+')';ctx.lineWidth=0.8;ctx.stroke();});if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }
  function fxGold() {
    const w=cFX.width,h=cFX.height,ctx=cFXCtx,duration=getCompleteEffectDuration();let started=null;
    const d=(now)=>{if(started===null)started=now;const elapsed=Math.min(now-started,duration);ctx.clearRect(0,0,w,h);const envelope=getCompleteEnvelope(elapsed,duration),a=getCompleteAlpha(0.1,envelope);const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.48);g.addColorStop(0,'rgba(196,168,80,'+a+')');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);if(elapsed<duration)cFXAnim=requestEffectFrame(d);}; cFXAnim=requestEffectFrame(d);
  }

    renderGrid();
