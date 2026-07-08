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

const FLOW_COMMON = {
  1: "그대로 둡니다",
  2: "마음이 머뭅니다",
  3: "오늘은 여기까지입니다"
};

const FLOW_STEP_SEMANTICS = {
  1: { react: 'settle' },
  2: { react: 'dwell' },
  3: { react: 'dark' }
};

const FLOW_ENTER_FADE_MS = 200;
const FLOW_VISUAL_CONFIG = {
  settleStart: 0.12,
  settleMotionEnd: 0.3,
  settledMotion: 0.12,
  auroraEase: 0.045,
  settleOverlay: 0.14,
  dwellOverlay: 0.18
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
  const quoteTime = hour >= 6 && hour <= 11 ? 'morning'
    : hour >= 12 && hour <= 17 ? 'daytime' : 'night';
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return { season, time, transitionTime, quoteTime, dateKey };
}

let flowCopyContext = null;

function clampContextMod(value) {
  return Math.min(1.15, Math.max(0.85, value));
}

function createFlowEffectProfile(context = flowCopyContext) {
  const base = { intensity: 1, motion: 1, trail: 1 };
  if (!context || typeof HARUMIND_FLOW_COPY === 'undefined') return base;
  const season = HARUMIND_FLOW_COPY.seasons?.[context.season]?.effect || {};
  const time = HARUMIND_FLOW_COPY.times?.[context.time]?.effect || {};
  return {
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

function getFlowStepData(step) {
  const semantics = FLOW_STEP_SEMANTICS[step] || { react: 'silent' };
  return { text: FLOW_COMMON[step] || '', react: semantics.react };
}

function getFlowStageCopy(step) {
  const stageKey = step === 1 ? 'stay' : step === 2 ? 'confirm' : 'close';
  const fallback = {
    stay: {
      label: '',
    },
    confirm: {
      label: '',
    },
    close: {
      label: '',
    }
  };
  const copy = typeof HARUMIND_FLOW_COPY !== 'undefined'
    ? HARUMIND_FLOW_COPY.flowStages?.[stageKey] || fallback[stageKey]
    : fallback[stageKey];
  return {
    label: copy?.label || ''
  };
}

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

  const EMOTION_ROOMS = {
    피곤함: { name: '꺼지지 않은 스탠드의 방', copy: '불은 남아 있고, 몸은 먼저 내려앉아 있습니다.', scene: 'tired', image: 'assets/rooms/tired_floor_lamp.webp', available: true },
    공허함: { name: '꺼진 TV의 방', copy: '소리가 멈춘 자리에, 잠시 머뭅니다.', scene: 'empty', image: 'assets/rooms/empty_tv.webp', available: true },
    쓸쓸함: { name: '혼자 남은 식탁의 방', copy: '빈자리가 말없이 곁에 있습니다.', scene: 'lonely', image: 'assets/rooms/lonely_table.webp', available: true }
  };
  const EMOTION_GRID_ORDER = ['피곤함', '쓸쓸함', '공허함', '불안함', '복잡함', '괜찮음'];

  function getAvailableRoom(emotion = selected) {
    const room = EMOTION_ROOMS[emotion];
    return room?.available ? room : null;
  }

  function renderGrid() {
    const grid = document.getElementById('emotion-grid');
    EMOTION_GRID_ORDER.forEach((name) => {
      const data = CONTENT[name];
      if (!data) return;
      const description = EMOTION_DESC[name] || '';
      const room = EMOTION_ROOMS[name];
      const roomName = room?.available ? room.name : '';
      const card = document.createElement('div');
      card.className = 'e-card';
      card.dataset.key = name;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', 'false');
      card.setAttribute('aria-label', [name, description, roomName].filter(Boolean).join(', '));
      card.innerHTML = `
        <div class="e-dot" style="background:${data.color};--dot-color:${data.color};"></div>
        <div class="e-word">${name}</div>
        <div class="e-copy">
          <div class="e-desc">${description}</div>
          <div class="e-room-name${roomName ? ' visible' : ''}" aria-hidden="true">${roomName}</div>
        </div>
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
  const ENTRY_SOUND_GAIN_SCALE = {
    피곤함: { roomSpace: 1, emotion: 1, transitionSpace: 1 },
    불안함: { emotion: 0.8, transitionSpace: 0.85 },
    공허함: { roomSpace: 1 },
    쓸쓸함: { roomSpace: 0.88 },
    복잡함: { emotion: 0.8, transitionSpace: 0.85 },
    괜찮음: { emotion: 1, transitionSpace: 1 }
  };
  let audioCtx = null;
  let masterGain = null;
  let soundEnabled = false;
  let activeHoldSound = null;
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

  function disconnectHoldRoom(space) {
    if (!space) return;
    [space.input, space.dry, space.delay, space.feedback, space.wetFilter, space.wet, space.pan]
      .filter(Boolean)
      .forEach(node => {
        try { node.disconnect(); } catch (err) {}
      });
  }

  function stopActiveAudio() {
    disconnectHoldRoom(activeHoldSound?.room);
    activeAudioSources.forEach(record => {
      try { record.source.stop(); } catch (err) {}
      record.nodes.forEach(node => {
        if (typeof node.stop === 'function') {
          try { node.stop(); } catch (err) {}
        }
      });
      [record.source, ...record.nodes].forEach(node => {
        try { node.disconnect(); } catch (err) {}
      });
    });
    activeAudioSources.clear();
    activeHoldSound = null;
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
      const gainScale = options.gainScale || 1;
      const peakGain = preset.gain * gainScale;
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
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.65);
      gain.gain.setValueAtTime(peakGain, now + Math.max(0.75, coreDuration - 1.0));
      if (tail > 0) {
        gain.gain.linearRampToValueAtTime(peakGain * 0.34, now + coreDuration);
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

  function playEmotionEnterSound(emotion, gainScale = 1) {
    const base = EMOTION_TONE[emotion] || 174;
    playSoftTone(base * 0.5, 1.1, 'sine', 0.04 * gainScale, 0, 640, 0.12, -0.08);
    playSoftTone(base, 0.9, 'sine', 0.064 * gainScale, 0.04, 980, 0.09, 0.08);
    playTinyChime(Math.min(base * 1.8, 540), 0.18, 0.014 * gainScale, 0.12);
    playAirNoise(0.82, 0.011 * gainScale, 1050, 0.04, 0);
  }

  function playConfirmSound() {
    playSoftTone(164, 0.32, 'sine', 0.034, 0, 620, 0.025, 0);
  }

  function playCloseSound() {
    playAirNoise(0.1, 0.012, 1450, 0, -0.03);
    playSoftTone(112, 0.16, 'triangle', 0.034, 0.018, 520, 0.008, 0.02);
  }

  const HOLD_SOUND_MIX = {
    noiseGain: 2.35,
    toneGain: 1.14,
    completeGain: 1.68
  };

  const HOLD_ROOM_SPACE = {
    피곤함: { delay: 0.058, feedback: 0.16, wet: 0.27, tone: 0.76, presence: 0.38, pan: -0.025 },
    불안함: { delay: 0.041, feedback: 0.12, wet: 0.2, tone: 0.7, presence: 0.43, pan: 0.026 },
    공허함: { delay: 0.074, feedback: 0.19, wet: 0.34, tone: 0.66, presence: 0.44, pan: 0 },
    쓸쓸함: { delay: 0.066, feedback: 0.17, wet: 0.3, tone: 0.68, presence: 0.4, pan: -0.018 },
    복잡함: { delay: 0.047, feedback: 0.14, wet: 0.24, tone: 0.72, presence: 0.45, pan: 0.022 },
    괜찮음: { delay: 0.052, feedback: 0.13, wet: 0.22, tone: 0.7, presence: 0.34, pan: 0 }
  };

  const HOLD_SOUND_PROFILES = {
    피곤함: {
      1: { noise: { gainStart: 0.0065, gainEnd: 0.008, freqStart: 650, freqEnd: 470, q: 0.42 } },
      2: {
        noise: { gainStart: 0.0055, gainEnd: 0.0078, freqStart: 600, freqEnd: 450, q: 0.46 },
        tone: { gainStart: 0.0012, gainEnd: 0.0042, freqStart: 132, freqEnd: 124, filterFreq: 430 }
      },
      3: {
        noise: { gainStart: 0.0075, gainEnd: 0.002, freqStart: 520, freqEnd: 310, q: 0.42 },
        tone: { gainStart: 0.0032, gainEnd: 0.00045, freqStart: 108, freqEnd: 82, filterFreq: 410 }
      },
      complete: { 2: { freq: 128, duration: 0.3, gain: 0.019, filterFreq: 460, attack: 0.04 } }
    },
    불안함: {
      1: { noise: { gainStart: 0.0058, gainEnd: 0.0085, freqStart: 920, freqEnd: 690, qStart: 0.82, qEnd: 0.5 } },
      2: {
        noise: { gainStart: 0.005, gainEnd: 0.008, freqStart: 780, freqEnd: 620, qStart: 0.74, qEnd: 0.5 },
        tone: { gainStart: 0.0012, gainEnd: 0.0043, freqStart: 174, freqEnd: 164, detuneStart: -6, detuneEnd: -1, filterFreq: 650 }
      },
      3: {
        noise: { gainStart: 0.0078, gainEnd: 0.0021, freqStart: 680, freqEnd: 420, qStart: 0.64, qEnd: 0.46 },
        tone: { gainStart: 0.0033, gainEnd: 0.0005, freqStart: 138, freqEnd: 104, filterFreq: 520 }
      },
      complete: { 2: { freq: 156, duration: 0.28, gain: 0.019, filterFreq: 620, attack: 0.035 } }
    },
    공허함: {
      1: { noise: { gainStart: 0.006, gainEnd: 0.011, freqStart: 780, freqEnd: 610, q: 0.48 } },
      2: {
        noise: { gainStart: 0.0055, gainEnd: 0.0085, freqStart: 690, freqEnd: 560, q: 0.56 },
        tone: { gainStart: 0.0014, gainEnd: 0.0048, freqStart: 142, freqEnd: 158 }
      },
      3: {
        noise: { gainStart: 0.008, gainEnd: 0.0022, freqStart: 620, freqEnd: 390, q: 0.5 },
        tone: { gainStart: 0.0036, gainEnd: 0.0005, freqStart: 122, freqEnd: 94 }
      },
      complete: { 2: { freq: 146, duration: 0.3, gain: 0.021, filterFreq: 520, attack: 0.035 } }
    },
    쓸쓸함: {
      1: { noise: { gainStart: 0.006, gainEnd: 0.0095, freqStart: 860, freqEnd: 680, q: 0.55 } },
      2: {
        noise: { gainStart: 0.0055, gainEnd: 0.0082, freqStart: 740, freqEnd: 610, q: 0.54 },
        tone: { gainStart: 0.0013, gainEnd: 0.0045, freqStart: 150, freqEnd: 146, filterFreq: 540 }
      },
      3: {
        noise: { gainStart: 0.0077, gainEnd: 0.002, freqStart: 600, freqEnd: 380, q: 0.5 },
        tone: { gainStart: 0.0034, gainEnd: 0.00045, freqStart: 118, freqEnd: 90, filterFreq: 470 }
      },
      complete: { 2: { freq: 142, duration: 0.3, gain: 0.02, filterFreq: 520, attack: 0.038 } }
    },
    복잡함: {
      1: { noise: { gainStart: 0.0058, gainEnd: 0.009, freqStart: 900, freqEnd: 720, qStart: 0.72, qEnd: 0.55 } },
      2: {
        noise: { gainStart: 0.0048, gainEnd: 0.0075, freqStart: 780, freqEnd: 650, q: 0.58 },
        tones: [
          { gainStart: 0.0009, gainEnd: 0.0025, freqStart: 151, freqEnd: 154, pan: -0.035, filterFreq: 590 },
          { gainStart: 0.0008, gainEnd: 0.0022, freqStart: 176, freqEnd: 170, pan: 0.035, filterFreq: 640 }
        ]
      },
      3: {
        noise: { gainStart: 0.0075, gainEnd: 0.002, freqStart: 640, freqEnd: 400, q: 0.52 },
        tones: [
          { gainStart: 0.0025, gainEnd: 0.00035, freqStart: 128, freqEnd: 101, pan: -0.025, filterFreq: 500 },
          { gainStart: 0.0021, gainEnd: 0.0003, freqStart: 147, freqEnd: 108, pan: 0.025, filterFreq: 530 }
        ]
      },
      complete: { 2: { freq: 150, duration: 0.28, gain: 0.018, filterFreq: 560, attack: 0.035 } }
    },
    괜찮음: {
      1: { noise: { gainStart: 0.005, gainEnd: 0.0075, freqStart: 670, freqEnd: 560, q: 0.44 } },
      2: {
        noise: { gainStart: 0.0048, gainEnd: 0.0068, freqStart: 620, freqEnd: 520, q: 0.45 },
        tone: { gainStart: 0.0011, gainEnd: 0.0037, freqStart: 174, freqEnd: 170, filterFreq: 600 }
      },
      3: {
        noise: { gainStart: 0.0065, gainEnd: 0.0018, freqStart: 520, freqEnd: 360, q: 0.42 },
        tone: { gainStart: 0.0028, gainEnd: 0.0004, freqStart: 112, freqEnd: 88, filterFreq: 450 }
      },
      complete: { 2: { freq: 168, duration: 0.24, gain: 0.017, filterFreq: 600, attack: 0.03 } }
    }
  };

  function holdSoundValue(start, end, progress) {
    return start + (end - start) * Math.max(0, Math.min(1, progress));
  }

  function getHoldRoomPreset(emotion = selected) {
    return HOLD_ROOM_SPACE[emotion] || HOLD_ROOM_SPACE.괜찮음;
  }

  function createHoldRoomSpace(emotion, step, now) {
    const preset = getHoldRoomPreset(emotion);
    const input = audioCtx.createGain();
    const dry = audioCtx.createGain();
    const delay = audioCtx.createDelay(0.12);
    const feedback = audioCtx.createGain();
    const wetFilter = audioCtx.createBiquadFilter();
    const wet = audioCtx.createGain();
    const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

    input.gain.setValueAtTime(1, now);
    dry.gain.setValueAtTime(step === 3 ? 0.86 : 0.92, now);
    delay.delayTime.setValueAtTime(preset.delay, now);
    feedback.gain.setValueAtTime(preset.feedback, now);
    wetFilter.type = 'lowpass';
    wetFilter.frequency.setValueAtTime(step === 1 ? 1280 : step === 2 ? 1460 : 980, now);
    wetFilter.Q.setValueAtTime(0.32, now);
    wet.gain.setValueAtTime(preset.wet, now);

    input.connect(dry);
    dry.connect(masterGain);
    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetFilter);
    wetFilter.connect(wet);
    if (pan) {
      pan.pan.setValueAtTime(preset.pan, now);
      wet.connect(pan);
      pan.connect(masterGain);
    } else {
      wet.connect(masterGain);
    }

    return { input, dry, delay, feedback, wetFilter, wet, pan, preset };
  }

  function createHoldNoiseVoice(profile, now, progress, destination, roomPreset = getHoldRoomPreset()) {
    const sampleRate = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * 1.2)), sampleRate);
    const data = buffer.getChannelData(0);
    let drift = 0;
    let body = 0;
    for (let i = 0; i < data.length; i += 1) {
      drift = drift * 0.994 + (Math.random() * 2 - 1) * 0.0055;
      body = body * 0.985 + (Math.random() * 2 - 1) * 0.0025;
      data[i] = (Math.random() * 2 - 1) * 0.34 + drift + body * 1.8;
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const ceiling = audioCtx.createBiquadFilter();
    const bodyGain = audioCtx.createGain();
    const presenceFilter = audioCtx.createBiquadFilter();
    const presenceGain = audioCtx.createGain();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(holdSoundValue(profile.qStart ?? profile.q, profile.qEnd ?? profile.q, progress), now);
    filter.frequency.setValueAtTime(holdSoundValue(profile.freqStart, profile.freqEnd, progress), now);
    ceiling.type = 'lowpass';
    ceiling.frequency.setValueAtTime(holdSoundValue(
      profile.ceilingStart ?? profile.freqStart * 2.55,
      profile.ceilingEnd ?? profile.freqEnd * 2.2,
      progress
    ), now);
    ceiling.Q.setValueAtTime(0.34, now);
    bodyGain.gain.setValueAtTime(0.88, now);
    presenceFilter.type = 'bandpass';
    presenceFilter.frequency.setValueAtTime(holdSoundValue(
      profile.presenceStart ?? Math.max(1080, profile.freqStart * 1.88),
      profile.presenceEnd ?? Math.max(920, profile.freqEnd * 2.05),
      progress
    ), now);
    presenceFilter.Q.setValueAtTime(profile.presenceQ ?? 0.38, now);
    presenceGain.gain.setValueAtTime((profile.presenceGain ?? roomPreset.presence) * (0.9 + progress * 0.28), now);
    const targetGain = holdSoundValue(profile.gainStart, profile.gainEnd, progress) * HOLD_SOUND_MIX.noiseGain;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.12);
    source.connect(filter);
    filter.connect(ceiling);
    ceiling.connect(bodyGain);
    bodyGain.connect(gain);
    source.connect(presenceFilter);
    presenceFilter.connect(presenceGain);
    presenceGain.connect(gain);
    gain.connect(destination || masterGain);
    trackAudioSource(source, [filter, ceiling, bodyGain, presenceFilter, presenceGain, gain].filter(Boolean));
    source.start(now);
    return { role: 'noise', source, filter, ceiling, presenceFilter, presenceGain, gain, profile };
  }

  function createHoldToneVoice(profile, now, progress, destination, roomPreset = getHoldRoomPreset()) {
    const source = audioCtx.createOscillator();
    const harmonic = audioCtx.createOscillator();
    const harmonicGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    const pan = profile.pan !== undefined && audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    const baseFreq = holdSoundValue(profile.freqStart, profile.freqEnd, progress);
    const harmonicRatio = profile.harmonicRatio || 2.01;
    source.type = profile.type || 'triangle';
    harmonic.type = 'sine';
    source.frequency.setValueAtTime(baseFreq, now);
    harmonic.frequency.setValueAtTime(baseFreq * harmonicRatio, now);
    source.detune.setValueAtTime(holdSoundValue(profile.detuneStart ?? -3, profile.detuneEnd ?? -3, progress), now);
    harmonic.detune.setValueAtTime(holdSoundValue(profile.detuneStart ?? -3, profile.detuneEnd ?? -3, progress) + 4, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile.filterFreq || 480, now);
    filter.Q.setValueAtTime(profile.q || 0.48, now);
    harmonicGain.gain.setValueAtTime(profile.harmonicGain ?? 0.18, now);
    const targetGain = holdSoundValue(profile.gainStart, profile.gainEnd, progress) * HOLD_SOUND_MIX.toneGain * roomPreset.tone;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.14);
    source.connect(filter);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gain);
    if (pan) {
      pan.pan.setValueAtTime(profile.pan, now);
      gain.connect(pan);
      pan.connect(destination || masterGain);
    } else {
      gain.connect(destination || masterGain);
    }
    trackAudioSource(source, [harmonic, harmonicGain, filter, gain, pan].filter(Boolean));
    source.start(now);
    harmonic.start(now);
    return { role: 'tone', source, sources: [source, harmonic], filter, harmonicGain, gain, profile };
  }

  function startHoldSound(emotion = selected, step = currentStep, progress = 0) {
    const emotionProfile = HOLD_SOUND_PROFILES[emotion];
    if (!emotionProfile?.[step]) return;
    const now = getAudioNow();
    if (now === null) return;
    stopHoldSound(0.04);
    const profile = emotionProfile[step];
    const room = createHoldRoomSpace(emotion, step, now);
    const voices = [createHoldNoiseVoice(profile.noise, now, progress, room.input, room.preset)];
    if (profile.tone) voices.push(createHoldToneVoice(profile.tone, now, progress, room.input, room.preset));
    (profile.tones || []).forEach(tone => voices.push(createHoldToneVoice(tone, now, progress, room.input, room.preset)));
    activeHoldSound = { emotion, step, voices, room, attackUntil: now + 0.14 };
  }

  function updateHoldSound(progress) {
    if (!activeHoldSound || !audioCtx || !soundEnabled) return;
    const now = audioCtx.currentTime;
    activeHoldSound.voices.forEach(voice => {
      const profile = voice.profile;
      if (now >= activeHoldSound.attackUntil) {
        voice.gain.gain.cancelScheduledValues(now);
        const mixGain = voice.role === 'noise' ? HOLD_SOUND_MIX.noiseGain : HOLD_SOUND_MIX.toneGain;
        voice.gain.gain.setValueAtTime(holdSoundValue(profile.gainStart, profile.gainEnd, progress) * mixGain, now);
      }
      if (voice.role === 'noise') {
        voice.filter.frequency.cancelScheduledValues(now);
        voice.filter.frequency.setValueAtTime(holdSoundValue(profile.freqStart, profile.freqEnd, progress), now);
        voice.filter.Q.cancelScheduledValues(now);
        voice.filter.Q.setValueAtTime(holdSoundValue(profile.qStart ?? profile.q, profile.qEnd ?? profile.q, progress), now);
        if (voice.ceiling) {
          voice.ceiling.frequency.cancelScheduledValues(now);
          voice.ceiling.frequency.setValueAtTime(holdSoundValue(
            profile.ceilingStart ?? profile.freqStart * 2.55,
            profile.ceilingEnd ?? profile.freqEnd * 2.2,
            progress
          ), now);
        }
        if (voice.presenceFilter) {
          voice.presenceFilter.frequency.cancelScheduledValues(now);
          voice.presenceFilter.frequency.setValueAtTime(holdSoundValue(
            profile.presenceStart ?? Math.max(1080, profile.freqStart * 1.88),
            profile.presenceEnd ?? Math.max(920, profile.freqEnd * 2.05),
            progress
          ), now);
        }
        if (voice.presenceGain) {
          voice.presenceGain.gain.cancelScheduledValues(now);
          const roomPresence = getHoldRoomPreset(activeHoldSound.emotion).presence;
          voice.presenceGain.gain.setValueAtTime((profile.presenceGain ?? roomPresence) * (0.9 + progress * 0.28), now);
        }
      } else {
        const baseFreq = holdSoundValue(profile.freqStart, profile.freqEnd, progress);
        const harmonicRatio = profile.harmonicRatio || 2.01;
        voice.source.frequency.cancelScheduledValues(now);
        voice.source.frequency.setValueAtTime(baseFreq, now);
        voice.source.detune.cancelScheduledValues(now);
        voice.source.detune.setValueAtTime(holdSoundValue(profile.detuneStart ?? -3, profile.detuneEnd ?? -3, progress), now);
        if (voice.sources?.[1]) {
          voice.sources[1].frequency.cancelScheduledValues(now);
          voice.sources[1].frequency.setValueAtTime(baseFreq * harmonicRatio, now);
          voice.sources[1].detune.cancelScheduledValues(now);
          voice.sources[1].detune.setValueAtTime(holdSoundValue(profile.detuneStart ?? -3, profile.detuneEnd ?? -3, progress) + 4, now);
        }
      }
    });
    if (activeHoldSound.room) {
      const room = activeHoldSound.room;
      const step = activeHoldSound.step;
      room.wetFilter.frequency.cancelScheduledValues(now);
      room.wetFilter.frequency.setValueAtTime(step === 1
        ? 1280 - progress * 140
        : step === 2
          ? 1360 + progress * 160
          : 980 - progress * 260, now);
      room.wet.gain.cancelScheduledValues(now);
      room.wet.gain.setValueAtTime(room.preset.wet * (step === 3 ? 1 - progress * 0.28 : 0.92 + progress * 0.08), now);
    }
  }

  function stopHoldSound(fadeSeconds = 0.16) {
    const state = activeHoldSound;
    activeHoldSound = null;
    if (!state) return;
    const now = audioCtx?.currentTime;
    state.voices.forEach(voice => {
      if (now !== undefined) {
        try {
          const currentGain = Math.max(0.0001, voice.gain.gain.value);
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setValueAtTime(currentGain, now);
          voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
          (voice.sources || [voice.source]).forEach(source => source.stop(now + fadeSeconds + 0.03));
          return;
        } catch (err) {}
      }
      (voice.sources || [voice.source]).forEach(source => {
        try { source.stop(); } catch (err) {}
      });
    });
    if (state.room && now !== undefined) {
      try {
        state.room.input.gain.cancelScheduledValues(now);
        state.room.input.gain.setValueAtTime(Math.max(0.0001, state.room.input.gain.value), now);
        state.room.input.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
      } catch (err) {}
      setTimeout(() => {
        disconnectHoldRoom(state.room);
      }, Math.ceil((fadeSeconds + 0.05) * 1000));
    }
  }

  function pauseHoldSound() {
    stopHoldSound(0.16);
  }

  function playHoldCompletionSound(completion) {
    const gain = completion.gain * HOLD_SOUND_MIX.completeGain;
    playSoftTone(
      completion.freq, completion.duration * 1.08, 'triangle', gain, 0,
      completion.filterFreq, completion.attack, -0.02
    );
    playSoftTone(
      completion.freq * 1.505, completion.duration * 0.72, 'sine', gain * 0.18, 0.026,
      Math.min(completion.filterFreq * 1.45, 980), completion.attack * 0.72, 0.025
    );
    playAirNoise(0.34, gain * 0.32, completion.filterFreq * 1.68, 0.018, 0.015);
  }

  function playHoldCloseTail(emotion) {
    const closeTail = {
      피곤함: { freq: 92, air: 560, gain: 0.022, pan: -0.02 },
      불안함: { freq: 108, air: 820, gain: 0.019, pan: 0.018 },
      공허함: { freq: 86, air: 660, gain: 0.023, pan: 0 },
      쓸쓸함: { freq: 94, air: 760, gain: 0.021, pan: -0.015 },
      복잡함: { freq: 102, air: 740, gain: 0.019, pan: 0.02 },
      괜찮음: { freq: 98, air: 600, gain: 0.018, pan: 0 }
    }[emotion] || { freq: 94, air: 640, gain: 0.019, pan: 0 };
    playAirNoise(0.3, closeTail.gain * 0.62, closeTail.air, 0, closeTail.pan);
    playSoftTone(closeTail.freq, 0.22, 'triangle', closeTail.gain * 1.08, 0.035, closeTail.air * 0.72, 0.018, closeTail.pan * -0.5);
  }

  function completeHoldSound(step) {
    const emotionProfile = HOLD_SOUND_PROFILES[selected];
    if (!emotionProfile) return false;
    stopHoldSound(step >= 3 ? 0.28 : 0.14);
    if (step >= 3) {
      playHoldCloseTail(selected);
      return true;
    }
    const completion = emotionProfile.complete?.[step];
    if (completion) {
      playHoldCompletionSound(completion);
    }
    return true;
  }

  let flowTimer = null;
  let flowTextTimer = null;
  let flowTextFadeTimer = null;
  let holdRevealTimer = null;
  let roomTimer = null;
  let roomTitleTimer = null;
  let roomCopyTimer = null;
  let roomExitTimer = null;
  let roomImageLoadToken = 0;
  let activeRoomImagePreload = null;
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

  function clearFlowEffects(options = {}) {
    effectAnimationFrames.forEach(id => cancelAnimationFrame(id));
    effectAnimationFrames.clear();
    effectTimeouts.forEach(id => clearTimeout(id));
    effectTimeouts.clear();
    if (cFXAnim) cancelAnimationFrame(cFXAnim);
    cFXAnim = null;
    if (cFX && cFXCtx) {
      cFXCtx.clearRect(0, 0, cFX.width, cFX.height);
      cFX.classList.remove('visible');
    }
    const wash = document.getElementById('screen-wash');
    if (wash) wash.style.cssText = '';
    if (!options.preserveFlowState) {
      clearFlowVisualState();
      const react = document.getElementById('screen-react');
      if (react) {
        react.classList.remove('closing-dim');
        react.style.background = '';
        react.style.filter = '';
        react.style.opacity = '';
        react.style.transition = '';
      }
    }
  }

  function clearFlowTimers() {
    clearTimeout(flowTimer);
    clearTimeout(flowTextTimer);
    clearTimeout(flowTextFadeTimer);
    clearTimeout(holdRevealTimer);
    clearTimeout(roomTimer);
    clearTimeout(roomTitleTimer);
    clearTimeout(roomCopyTimer);
    clearTimeout(roomExitTimer);
    clearTimeout(stepAdvanceTimer);
    clearTimeout(completeEnterTimer);
    clearTimeout(completeExtrasTimer);
    clearTimeout(completeRestartTimer);
    flowTimer = null;
    flowTextTimer = null;
    flowTextFadeTimer = null;
    holdRevealTimer = null;
    roomTimer = null;
    roomTitleTimer = null;
    roomCopyTimer = null;
    roomExitTimer = null;
    stepAdvanceTimer = null;
    completeEnterTimer = null;
    completeExtrasTimer = null;
    completeRestartTimer = null;
    completeExtrasDueAt = null;
    completeRestartDueAt = null;
  }

  function resetFlowCompletion() {
    completedSteps = 0;
    document.documentElement.style.setProperty('--hold-progress', 0);
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
    requestEffectFrame(() => {
      requestEffectFrame(() => {
        if (visualToken !== transitionVisualToken) return;
        wash.classList.add('transition-enter');
        wash.style.opacity = '1';
        wash.style.transform = 'scale(1)';
        scheduleEffectTimeout(() => {
          if (visualToken !== transitionVisualToken) return;
          wash.style.opacity = '0';
          wash.style.transform = 'scale(1.08)';
        }, 900);
        scheduleEffectTimeout(() => {
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
    if (getAvailableRoom()) {
      const roomGainScale = ENTRY_SOUND_GAIN_SCALE[selected]?.roomSpace || 1;
      playTransitionSpaceSound(selected, 1.8, 0, { tail: 0.3, gainScale: roomGainScale });
      startRoom();
      return;
    }
    showScreen('transition');
    const data = CONTENT[selected];
    playTransitionEntry(data.color);
    playEmotionEnterSound(selected, ENTRY_SOUND_GAIN_SCALE[selected]?.emotion || 1);
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

    const line2Delay = selected === '피곤함' ? 1600 : 1200;
    const flowDelay  = 3200;

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
        playTransitionSpaceSound(selected, (line2Delay + flowDelay) / 1000, 0, {
          tail: 0.85,
          gainScale: ENTRY_SOUND_GAIN_SCALE[selected]?.transitionSpace || 1
        });
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

  const ROOM_DURATION_MS = 4600;

  function resetRoomVisual() {
    const roomScreen = document.getElementById('s-room');
    const roomImage = document.getElementById('room-image');
    if (roomScreen) roomScreen.classList.remove('room-visible', 'room-copy-visible', 'room-leaving');
    roomImageLoadToken += 1;
    if (activeRoomImagePreload) {
      activeRoomImagePreload.onload = null;
      activeRoomImagePreload.onerror = null;
      activeRoomImagePreload = null;
    }
    if (roomImage) {
      roomImage.removeAttribute('src');
      roomImage.removeAttribute('srcset');
    }
    document.body.classList.remove(
      'room-active', 'room-scene-visible', 'room-step-1', 'room-step-2', 'room-step-3',
      'room-scene-empty', 'room-scene-lonely', 'room-scene-tired',
      'room-image-loading', 'room-image-loaded', 'room-image-failed'
    );
  }

  function preloadRoomImage(room) {
    const imagePath = room?.image;
    const roomImage = document.getElementById('room-image');
    if (!imagePath || !roomImage) return;

    const token = ++roomImageLoadToken;
    document.body.classList.add('room-image-loading');
    const preload = new Image();
    activeRoomImagePreload = preload;
    preload.onload = () => {
      if (token !== roomImageLoadToken || getAvailableRoom()?.image !== imagePath) return;
      activeRoomImagePreload = null;
      roomImage.src = imagePath;
      document.body.classList.remove('room-image-loading', 'room-image-failed');
      requestAnimationFrame(() => {
        if (token === roomImageLoadToken && getAvailableRoom()?.image === imagePath) {
          document.body.classList.add('room-image-loaded');
        }
      });
    };
    preload.onerror = () => {
      if (token !== roomImageLoadToken || getAvailableRoom()?.image !== imagePath) return;
      activeRoomImagePreload = null;
      document.body.classList.remove('room-image-loading', 'room-image-loaded');
      document.body.classList.add('room-image-failed');
    };
    preload.src = imagePath;
  }

  function setRoomFlowStep(step = 0) {
    document.body.classList.remove('room-step-1', 'room-step-2', 'room-step-3');
    if (getAvailableRoom() && document.body.classList.contains('room-active') && step >= 1 && step <= 3) {
      document.body.classList.add(`room-step-${step}`);
    }
  }

  function showRoomScene() {
    const room = getAvailableRoom();
    if (!room) return;
    document.body.classList.add('room-active');
    document.body.classList.add(`room-scene-${room.scene}`);
    preloadRoomImage(room);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (getAvailableRoom()) document.body.classList.add('room-scene-visible');
      });
    });
  }

  function startRoom() {
    clearTimeout(roomTimer);
    clearTimeout(roomTitleTimer);
    clearTimeout(roomCopyTimer);
    clearTimeout(roomExitTimer);
    resetRoomVisual();
    showScreen('room');
    showRoomScene();
    const roomScreen = document.getElementById('s-room');
    const room = getAvailableRoom();
    document.getElementById('room-name').textContent = room?.name || '';
    document.getElementById('room-copy').textContent = room?.copy || '';
    roomTitleTimer = setTimeout(() => {
      roomTitleTimer = null;
      if (roomScreen?.classList.contains('active')) roomScreen.classList.add('room-visible');
    }, 700);
    roomCopyTimer = setTimeout(() => {
      roomCopyTimer = null;
      if (roomScreen?.classList.contains('active')) roomScreen.classList.add('room-copy-visible');
    }, 1500);
    roomExitTimer = setTimeout(() => {
      roomExitTimer = null;
      if (roomScreen?.classList.contains('active')) roomScreen.classList.add('room-leaving');
    }, 4000);
    roomTimer = setTimeout(() => {
      roomTimer = null;
      roomScreen?.classList.remove('room-visible', 'room-copy-visible', 'room-leaving');
      startFlow();
    }, ROOM_DURATION_MS);
  }

  function startFlow() {
    if (getAvailableRoom() && !document.body.classList.contains('room-active')) showRoomScene();
    showScreen('flow');
    runFlowStep(1);
  }

  function runFlowStep(step) {
    clearTimeout(flowTimer);
    clearTimeout(flowTextTimer);
    clearTimeout(flowTextFadeTimer);
    clearTimeout(holdRevealTimer);
    currentStep = step;
    setRoomFlowStep(step);
    hideHoldBtn({ preserveFlowState: step > 1 });
    const _closeBtn = document.getElementById('hold-btn');
    if (_closeBtn) {
      _closeBtn.classList.toggle('staying', step === 1);
      _closeBtn.classList.toggle('closing', step === 3);
    }
    prepareFlowVisualStep(step);
    document.documentElement.style.setProperty('--hold-progress', 0);

    const textEl = document.getElementById('flow-text');
    const stageEl = document.getElementById('flow-stage');
    textEl.classList.remove('visible');
    if (stageEl) {
      stageEl.classList.remove('visible', 'step-stay', 'step-confirm', 'step-close');
      const stageCopy = getFlowStageCopy(step);
      stageEl.textContent = stageCopy.label || '';
      if (step === 1) stageEl.classList.add('step-stay');
      if (step === 2) stageEl.classList.add('step-confirm');
      if (step === 3) stageEl.classList.add('step-close');
      requestAnimationFrame(() => stageEl.classList.add('visible'));
    }
    const blankDelay = (step === 1) ? 0 : 300;

    flowTextTimer = setTimeout(() => {
      textEl.classList.remove('step-stay', 'step-confirm', 'step-close');
      textEl.textContent = '';
      const { text } = getFlowStepData(step);
      if (step === 1) textEl.classList.add('step-stay');
      if (step === 2) textEl.classList.add('step-confirm');
      if (step === 3) textEl.classList.add('step-close');
      textEl.textContent = text;
      const fadeDelay = FLOW_ENTER_FADE_MS;
      flowTextFadeTimer = setTimeout(() => {
        textEl.classList.add('visible');
        holdRevealTimer = setTimeout(() => {
          holdRevealTimer = null;
          const flowScreen = document.getElementById('s-flow');
          if (currentStep === step && flowScreen?.classList.contains('active')) showHoldBtn();
        }, step === 1 ? 480 : 0);
      }, fadeDelay);
    }, blankDelay);

    // Hold 단계는 자동으로 넘어가지 않고 사용자의 입력으로만 진행한다.
    setTimeout(() => updateHoldLabel(), 100);
  }

  function applyStepCompletion(step) {
    completedSteps = Math.max(completedSteps, step);
  }

  function exitFlow() {
    clearFlowTimers();
    clearFlowEffects();
    stopActiveAudio();
    transitionRunToken += 1;
    resetTransitionVisual();
    lifecycleResumeAction = null;
    resetRoomVisual();
    restoreHoldFocusOnReveal = false;
    currentStep = 0;
    resetFlowCompletion();
    document.getElementById('transition-line1').classList.remove('visible');
    document.getElementById('transition-line2').classList.remove('visible');
    document.getElementById('transition-line1').classList.remove('space-open');
    document.getElementById('transition-line2').classList.remove('space-open');
    const stageEl = document.getElementById('flow-stage');
    if (stageEl) {
      stageEl.classList.remove('visible', 'step-stay', 'step-confirm', 'step-close');
      stageEl.textContent = '';
    }
    const announcer = document.getElementById('transition-announcer');
    if (announcer) announcer.textContent = '';
    if (!selected) { document.body.classList.remove(...EMOTION_CLASSES); stopAurora(); }
    stopScreenReact();
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
      setRestartAvailability(restartBtn, true);
    }, restartDelay);
  }

  function setRestartAvailability(button, available) {
    if (!button) return;
    button.disabled = !available;
    button.setAttribute('aria-hidden', available ? 'false' : 'true');
  }

  function goComplete() {
    clearFlowTimers();
    lifecycleResumeAction = null;
    resetRoomVisual();
    hideHoldBtn();
    clearFlowEffects();
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
    const quote = (typeof getTodayQuote === 'function') ? getTodayQuote(selected, flowCopyContext) : fallbackQuote;
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
    setRestartAvailability(restartBtn, false);
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
    resetRoomVisual();
    restoreHoldFocusOnReveal = false;
    resetFlowCompletion();
    document.getElementById('s-complete').classList.remove('visible');
    document.getElementById('complete-restart').classList.remove('visible');
    setRestartAvailability(document.getElementById('complete-restart'), false);
    const extras = document.getElementById('complete-extras');
    extras.classList.remove('visible');
    extras.style.display = 'none';
    hideHoldBtn();
    stopScreenReact();
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

    if (activeScreen.id === 's-room') {
      lifecycleResumeAction = { type: 'room' };
      clearFlowTimers();
      clearFlowEffects();
      resetRoomVisual();
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
      ? { type: currentStep >= 3 ? 'complete-enter' : 'flow', step: currentStep + 1 }
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
    } else if (action.type === 'room') {
      startRoom();
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
      setRestartAvailability(restartBtn, action.restartVisible);
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



  // ===== Hold 단계별 화면 상태 =====

  const FLOW_REACT_CLASSES = ['flow-settling', 'flow-settled', 'dwell-forming', 'dwell-held'];

  function setFlowVisualState(state = '', progress = 0) {
    const el = document.getElementById('screen-react');
    if (!el) return;
    FLOW_REACT_CLASSES.forEach(className => {
      if (className !== state) el.classList.remove(className);
    });
    if (state && !el.classList.contains(state)) el.classList.add(state);
    const settleProgress = state.startsWith('flow-settl')
      ? progress
      : state === 'dwell-forming' ? 1 - progress : 0;
    const dwellProgress = state.startsWith('dwell-') ? progress : 0;
    const textPresence = state.startsWith('dwell-')
        ? currentStep === 3 ? dwellProgress * 0.04 : 0.018 + dwellProgress * 0.022
        : 0;
    el.style.setProperty('--settle-progress', settleProgress);
    el.style.setProperty('--dwell-progress', dwellProgress);
    el.style.setProperty('--settle-alpha', settleProgress * FLOW_VISUAL_CONFIG.settleOverlay);
    el.style.setProperty('--dwell-alpha', dwellProgress * FLOW_VISUAL_CONFIG.dwellOverlay);
    el.style.opacity = state ? '1' : '';
    const flowScreen = document.getElementById('s-flow');
    if (flowScreen) flowScreen.style.setProperty('--text-presence', textPresence);
  }

  function clearFlowVisualState() {
    setFlowVisualState();
    setAuroraMotionTarget(1);
  }

  function prepareFlowVisualStep(step) {
    const react = document.getElementById('screen-react');
    if (react) {
      react.style.background = '';
      react.style.filter = '';
    }
    if (step === 1) {
      setFlowVisualState();
      setAuroraMotionTarget(1);
    } else if (step === 2) {
      setFlowVisualState('flow-settled', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    } else if (step === 3) {
      setFlowVisualState('dwell-held', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    }
  }

  function completeFlowVisualStep(step) {
    if (step === 1) {
      setFlowVisualState('flow-settled', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    } else if (step === 2) {
      setFlowVisualState('dwell-held', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    }
  }

  function restoreIncompleteFlowVisual() {
    if (currentStep === 1) {
      setFlowVisualState();
      setAuroraMotionTarget(1);
    } else if (currentStep === 2) {
      setFlowVisualState('flow-settled', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    } else if (currentStep === 3) {
      setFlowVisualState('dwell-held', 1);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
    }
  }

  function getCurrentReactType() {
    return getFlowStepData(currentStep).react;
  }

  function updateScreenReact(pct) {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const type = getCurrentReactType();
    const t = pct / 100;

    if (type === 'settle') {
      const settleEase = 1 - Math.pow(1 - t, 2);
      const settleProgress = FLOW_VISUAL_CONFIG.settleStart
        + settleEase * (1 - FLOW_VISUAL_CONFIG.settleStart);
      setFlowVisualState('flow-settling', settleProgress);
      setAuroraMotionTarget(1 - settleProgress * (1 - FLOW_VISUAL_CONFIG.settleMotionEnd));
      return;
    }

    if (type === 'dwell') {
      const dwellEase = t * t * (3 - 2 * t);
      setFlowVisualState('dwell-forming', dwellEase);
      setAuroraMotionTarget(FLOW_VISUAL_CONFIG.settledMotion);
      return;
    }

    setFlowVisualState('dwell-held', 1 - t);
    el.style.opacity = '1';

    if (type === 'dark') {
      const a = contextIntensity(t * 0.52);
      el.style.background = `rgba(0,0,0,${a})`;
      el.style.filter = '';
    }
  }



  function stopScreenReact(options = {}) {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const duration = contextDuration(350);
    el.style.transition = `background ${duration}ms ease, filter ${duration}ms ease`;
    el.style.background = '';
    el.style.filter = '';
    scheduleEffectTimeout(() => { el.style.transition = ''; }, duration + 50);
    if (options.restoreStepState !== false) restoreIncompleteFlowVisual();
  }


  function completeScreenImpact() {
    const el = document.getElementById('screen-react');
    if (!el) return;
    const type = getCurrentReactType();
    if (type === 'settle' || type === 'dwell') {
      completeFlowVisualStep(currentStep);
      return;
    }

    if (type === 'dark') el.style.background = `rgba(0,0,0,${contextIntensity(0.65)})`;
  }

  function startClosingDim() {
    const el = document.getElementById('screen-react');
    if (el) el.classList.add('closing-dim');
  }

  // ===== AURORA 배경 =====
  const CONFIRM_LABELS = {
    피곤함: '오늘 하루, 여기서 내려놓겠습니다',
    불안함: '오늘은 여기서 멈추겠습니다',
    공허함: '오늘은 그냥 이대로 두겠습니다',
    쓸쓸함: '오늘 하루, 그대로 마감합니다',
    복잡함: '정리하지 않아도 됩니다. 마감합니다',
    괜찮음: '오늘은 여기까지입니다'
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
  let auroraMotionScale = 1;
  let auroraMotionTarget = 1;

  function setAuroraMotionTarget(value, immediate = false) {
    auroraMotionTarget = Math.min(1, Math.max(FLOW_VISUAL_CONFIG.settledMotion, value));
    if (immediate) auroraMotionScale = auroraMotionTarget;
  }

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
    const ease = 1 - Math.pow(1 - FLOW_VISUAL_CONFIG.auroraEase, delta / (1000 / 60));
    auroraMotionScale += (auroraMotionTarget - auroraMotionScale) * ease;
    auroraT += 0.003 * auroraMotionScale * (delta / (1000 / 60));

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
    피곤함: { 1: 1500, 2: 3000, 3: 1400 },
    불안함: { 1: 1600, 2: 3400, 3: 1500 },
    공허함: { 1: 1800, 2: 4000, 3: 1700 },
    쓸쓸함: { 1: 1600, 2: 3600, 3: 1500 },
    복잡함: { 1: 1600, 2: 3400, 3: 1500 },
    괜찮음: { 1: 1300, 2: 2700, 3: 1300 }
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
  let restoreHoldFocusOnReveal = false;

  function releaseHoldPointer(btn) {
    if (!btn || typeof activePointerId !== 'number' || !btn.hasPointerCapture) return;
    try {
      if (btn.hasPointerCapture(activePointerId)) btn.releasePointerCapture(activePointerId);
    } catch (err) {}
  }

  function resetHoldInteraction(btn = document.getElementById('hold-btn'), options = {}) {
    stopHoldSound(0.12);
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
    updateHoldLabel();
    const stageEl = document.getElementById('flow-stage');
    if (stageEl) stageEl.classList.remove('holding');
    document.documentElement.style.setProperty('--hold-progress', 0);
    if (!options.preserveFlowState) stopScreenReact();
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
      setHoldLabel('그대로 머뭅니다');
      startHoldSound(selected, currentStep, Math.min(1, holdElapsed / getHoldDuration()));
      const stageEl = document.getElementById('flow-stage');
      if (stageEl) stageEl.classList.add('holding');
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
      updateHoldSound(pct / 100);
      if (pct >= 100) {
        onComplete();
        return;
      }
      holdRAF = requestAnimationFrame(animateBar);
    }

    function onComplete() {
      const completedWithKeyboard = activePointerId === 'keyboard';
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
      setHoldLabel('그대로 머뭅니다');
      btn.style.setProperty('--bar-pct', 100);
      document.documentElement.style.setProperty('--hold-progress', 1);
      const stageEl = document.getElementById('flow-stage');
      if (stageEl) stageEl.classList.remove('holding');
      clearTimeout(flowTimer);
      const stepAtComplete = currentStep;
      restoreHoldFocusOnReveal = completedWithKeyboard && stepAtComplete < 3;

      clearFlowEffects({ preserveFlowState: true });
      completeScreenImpact();
      if (stepAtComplete >= 3) startClosingDim();
      applyStepCompletion(stepAtComplete);
      const reactiveSoundHandled = completeHoldSound(stepAtComplete);
      if (stepAtComplete === 2) {
        if (!reactiveSoundHandled) playConfirmSound();
      } else if (stepAtComplete >= 3) {
        if (!reactiveSoundHandled) playCloseSound();
        if (!prefersReducedMotion()) fxClose();
      }

      // 마지막 단계는 0.75초 동안 완료 반응을 정리한 뒤,
      // 별도의 0.35초 정적 구간을 거쳐 완료 화면으로 전환한다.
      const nextDelay = stepAtComplete >= 3 ? 750 : stepAtComplete === 2 ? 2000 : 1300;

      stepAdvanceTimer = setTimeout(() => {
        stepAdvanceTimer = null;
        btn.classList.remove('holding', 'paused', 'completed');
        btn.style.setProperty('--bar-pct', 0);
        document.documentElement.style.setProperty('--hold-progress', 0);
        holdStartTime = null;
        holdElapsed = 0;
        if (stepAtComplete >= 3) {
          stopScreenReact({ restoreStepState: false });
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
      pauseHoldSound();
      updateHoldLabel();
      const stageEl = document.getElementById('flow-stage');
      if (stageEl) stageEl.classList.remove('holding');
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
    1: '손을 가볍게 둡니다',
    2: '손을 가볍게 둡니다',
    3: '이제 오늘을 닫습니다'
  };

  function showHoldBtn() {
    const wrap = document.getElementById('hold-wrap');
    if (wrap) wrap.classList.add('visible');
    const btn = document.getElementById('hold-btn');
    holdInputReady = true;
    if (btn) btn.setAttribute('aria-disabled', 'false');
    updateHoldLabel();
    if (btn && restoreHoldFocusOnReveal) {
      restoreHoldFocusOnReveal = false;
      requestAnimationFrame(() => {
        if (!holdInputReady || !btn.isConnected) return;
        try { btn.focus({ preventScroll: true }); }
        catch (err) { btn.focus(); }
      });
    }
  }

  function updateHoldLabel() {
    setHoldLabel(HOLD_LABELS[currentStep] || HOLD_LABELS[1]);
  }

  function setHoldLabel(text) {
    const label = document.querySelector('.hold-btn-label');
    const btn = document.getElementById('hold-btn');
    if (btn) {
      const ariaLabel = text === '그대로 머뭅니다'
        ? '누르는 중, 그대로 머뭅니다'
        : text === '이제 오늘을 닫습니다' ? '길게 눌러 오늘 닫기' : '길게 눌러 머무르기';
      btn.setAttribute('aria-label', ariaLabel);
    }
    if (!label || label.textContent === text) return;
    label.classList.remove('label-changing');
    label.textContent = text;
    requestAnimationFrame(() => label.classList.add('label-changing'));
  }

  function hideHoldBtn(options = {}) {
    holdInputReady = false;
    const wrap = document.getElementById('hold-wrap');
    if (wrap) wrap.classList.remove('visible');
    const btn = document.getElementById('hold-btn');
    if (btn) {
      btn.classList.remove('staying', 'closing');
      btn.setAttribute('aria-disabled', 'true');
    }
    resetHoldInteraction(btn, options);
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
      clearFlowEffects({ preserveFlowState: true });
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

  // 마감 Hold 완료 시 Aurora를 천천히 끈다.
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
