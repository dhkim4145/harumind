# 하루마음 (Harumind) - 감성 힐링 게임 플랫폼

> **v1.52** | 하루 5분, 마음의 평온을 찾아가는 **다중 게임 플랫폼**

[![Version](https://img.shields.io/badge/version-1.51-blue.svg)](https://github.com/yourusername/harumind)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ 프로젝트 소개

**하루마음**은 감성 힐링 경험을 제공하는 **멀티게임 플랫폼**입니다. 여러 게임을 통해 집중력과 기억력을 자연스럽게 자극하며, 따뜻한 메시지와 부드러운 애니메이션으로 마음의 평온을 찾아갑니다.

### 🎯 핵심 컨셉

- **감성 힐링**: 따뜻한 문구와 부드러운 인터랙션으로 마음의 여유를 제공
- **인지 자극**: 집중력과 기억력을 자연스럽게 향상시키는 게임 메커니즘
- **멀티게임 플랫폼**: 여러 게임을 한 곳에서 접근 (메인 페이지 게임 선택 UI)
- **통합 시스템**: core.js 중앙 엔진으로 모든 게임이 동일한 사운드·테마·설정 공유
- **접근성**: 모바일과 PC 모두에서 최적화된 반응형 디자인

---

## �️ 시스템 아키텍처

### 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                   메인 페이지 (index.html)                     │
│              게임 선택 UI + 브랜딩 + 소개                      │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─────────────────────────┬──────────────────────────┐
           │                         │                          │
    ┌──────▼──────┐          ┌───────▼──────┐          ┌────────▼──────┐
    │ 🧩 Memory   │          │ ✍️  Word     │          │ 🔢 Sequence   │
    │ Game        │          │ Game         │          │ (Coming Soon) │
    └──────┬──────┘          └───────┬──────┘          └────────┘
           │                         │
           └─────────────┬───────────┘
                         │
            ┌────────────▼────────────┐
            │   core.js (중앙 엔진)     │
            │                        │
            │  ✓ 사운드 관리           │
            │  ✓ 테마 관리            │
            │  ✓ 설정 동기화          │
            │  ✓ localStorage 관리    │
            └────────────┬────────────┘
                         │
         ┌───────────────┴─────────────────┐
         │                                 │
    ┌────▼───────┐               ┌────────▼────┐
    │ Web Audio   │               │ HTML5 Audio │
    │ (SFX)       │               │ (BGM)       │
    └─────────────┘               └─────────────┘
```

### 핵심 구성요소

#### 1️⃣ **메인 페이지 (index.html)**
- **역할**: 게임 선택 및 브랜딩
- **특징**:
  - 게임 카드 UI (진행 중/예정 중)
  - core.js 자동 로드
  - Glassmorphism 디자인
  - 반응형 레이아웃

#### 2️⃣ **core.js - 중앙 사운드·테마 엔진** ⭐
**모든 게임이 공유하는 통합 엔진**

| 기능 | 설명 |
|------|------|
| **playSfx(type)** | 효과음 재생 ('click', 'success') |
| **ensureBgm()** | 배경음 시작 |
| **stopBgm()** | 배경음 정지 |
| **toggleSfx()** | 효과음 ON/OFF + localStorage 동기화 |
| **toggleBgm()** | 배경음 ON/OFF + localStorage 동기화 |
| **applyTheme(theme)** | 테마 변경 |
| **updateSfxUi()** | SFX 버튼 동기화 |
| **updateBgmUi()** | BGM 버튼 동기화 |
| **bindUI()** | 모든 버튼 자동 연결 |

**기술 특징:**
```javascript
class HaruCore {
    // AudioContext 관리
    audioCtx          // Web Audio API (효과음 생성)
    bgmAudio          // HTML5 Audio (배경음 재생)
    
    // 상태 관리
    isSfxOn           // 효과음 ON/OFF 상태
    isBgmOn           // 배경음 ON/OFF 상태
    currentTheme      // 현재 테마
    
    // localStorage 키
    'sfxOn'           // 효과음 상태 저장
    'bgmOn'           // 배경음 상태 저장
    'theme'           // 선택 테마 저장
}
```

**장점:**
- ✅ 모든 게임이 동일한 사운드 품질 보장
- ✅ 페이지 이동 시 음성 간섭 없음
- ✅ 사용자 설정 자동 복원
- ✅ 코드 중복 제거

#### 3️⃣ **게임 폴더 구조**

각 게임은 **독립적 폴더** + **core.js 의존**:

```javascript
// game/main.js
core.playSfx('click')      // 버튼 클릭 시
core.playSfx('success')    // 정답 맞혔을 때
core.ensureBgm()           // BGM 시작
core.isSfxOn / core.isBgmOn // 상태 확인
```

**파일별 책임:**
- `game.html`: UI 구조 + 스타일 (CSS)
- `main.js`: 게임 로직만 (Config/State/Logic)
- `data.js` (선택): 게임 데이터 (단어 데이터 등)
- `assets/audio/`: 배경음 MP3 파일

---

## �🏗️ 프로젝트 구조

본 프로젝트는 **다중 게임 플랫폼**으로 진화했으며, **core.js 중앙 엔진**을 통해 모든 게임이 통합된 사운드, 테마, 설정을 공유합니다.

```
harumind/                  # 프로젝트 루트
├── index.html             # ⭐ 메인 페이지 (게임 선택 UI)
├── core.js                # ⭐ 중앙 사운드·테마 엔진 (모든 게임 공용)
├── README.md              # 프로젝트 문서
├── CNAME                  # 도메인 설정 (harumind.kr)
├── robots.txt             # SEO 설정
├── site.webmanifest       # 앱 메타데이터
│
├── memory/                # 🧩 같은 그림 찾기 게임
│   ├── memory.html        # ✓ UI 구조 + 스타일
│   ├── main.js            # ✓ 게임 로직
│   ├── site.webmanifest   # 앱 메타데이터
│   └── assets/audio/      # 배경음 MP3 파일
│       ├── piano1.mp3
│       ├── piano2.mp3
│       ├── piano3.mp3
│       ├── acoustic1.mp3
│       ├── acoustic2.mp3
│       ├── acoustic3.mp3
│       └── bgm.mp3
│
└── word/                  # ✍️ 단어 조합하기 게임
    ├── word.html          # ✓ UI 구조 + 스타일
    ├── main.js            # ✓ 게임 로직
    ├── data.js            # ✓ 단어 데이터베이스
    └── site.webmanifest   # 앱 메타데이터
```

### 📊 구현 현황

| 게임 | 상태 | 설명 |
|------|------|------|
| 🧩 같은 그림 찾기 | ✅ 완성 | 카드 매칭, 난이도 3단계, 콤보·점수 시스템 |
| ✍️ 단어 조합하기 | ✅ 완성 | 글자 조합, 출석일 추적, 어려움 난이도 |
| 🔢 숫자 순서터치 | 🔄 예정중 | 집중력·순발력 게임 (계획 중) |

---

### 📡 데이터 흐름 및 상태 관리

#### 사운드 흐름

```
사용자 인터랙션 (버튼 클릭, 게임 진행)
         ↓
game/main.js → core.playSfx('click' 또는 'success')
         ↓
core.js 확인 → core.isSfxOn 상태 확인
         ↓
효과음 ON → Web Audio API (Oscillator) 사운드 생성 → 스피커
효과음 OFF → 아무것도 재생하지 않음
```

#### 배경음 흐름

```
사용자가 BGM 토글 버튼 클릭
         ↓
core.toggleBgm() 실행
         ↓
core.isBgmOn 상태 변경
core.bgmAudio 객체 (HTML5 Audio) 제어
localStorage 'bgmOn' 업데이트
updateBgmUi() → 버튼 아이콘 변경
         ↓
BGM ON → <audio>.play() → MP3 재생
BGM OFF → <audio>.pause() → 정지
```

#### 설정 동기화

```
사용자 설정 변경
    ↓
core.toggleSfx() / core.toggleBgm() / core.applyTheme()
    ↓
상태 변수 업데이트
    ↓
localStorage에 저장
    ↓
UI 자동 동기화 (updateSfxUi/updateBgmUi)
    ↓
페이지 새로고침 후에도 설정 복원 ✓
```

---

## 🔄 데이터 흐름 최적화 (v1.52)

### 이전 구조의 문제점

❌ **분산된 사운드 엔진**
- 각 게임마다 독립적인 audioCtx, tone 함수 존재
- 페이지 이동 시 이전 게임의 AudioContext가 메모리에 남음
- 게임마다 다른 품질의 사운드

❌ **설정 불일치**
- 각 게임이 bgmOn, isSfxOn 상태를 따로 관리
- 한 게임에서 설정 변경 → 다른 게임에서는 미반영
- localStorage 동기화 불완전

### 현재 구조의 해결책

✅ **core.js 중앙 통합 엔진**
```javascript
// 모든 게임이 단일 AudioContext 공유
core.audioCtx       // 한 번만 생성, 모든 게임이 재사용
core.bgmAudio       // 중앙 관리

// 모든 게임이 동일 사운드 사용
core.playSfx('click')      // 일관된 효과음
core.playSfx('success')    // 일관된 성공음
```

✅ **통합 상태 관리**
```javascript
// 글로벌 상태 (localStorage 동기화)
core.isSfxOn    // 모든 게임에서 확인
core.isBgmOn    // 모든 게임에서 확인
core.currentTheme

// 한 게임에서 변경 → 모든 게임 반영
core.toggleSfx()   // 즉시 localStorage 저장
core.updateSfxUi() // 모든 버튼 동기화
```

### 결과

| 항목 | 이전 | 현재 |
|------|------|------|
| AudioContext 개수 | 게임당 1개 | 전체 1개 |
| 메모리 누수 | ❌ 있음 | ✅ 없음 |
| 사운드 일관성 | ❌ 불균일 | ✅ 완벽 |
| 설정 동기화 | ❌ 불완전 | ✅ 즉시 반영 |
| 코드 중복 | ❌ 높음 | ✅ 낮음 |
| 새 게임 추가 | ❌ 복잡 | ✅ 간단 |

---

## 🎮 주요 기능

### 🎨 감성 힐링 디자인
- **Glassmorphism UI**: 반투명 블러 효과로 세련된 시각적 경험
- **따뜻한 메시지**: "숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨"
- **부드러운 애니메이션**: 페이드 인/아웃, 숫자 팝업, 하트 가루 효과


### 🔊 통합 사운드 시스템 (v1.52+)
- **중앙 사운드 엔진**: core.js의 `playSfx(type)` 함수로 모든 게임이 동일한 사운드 사용
  - `'click'`: 짧고 경쾌한 비프음 (효과음 ON일 때 자동 재생)
  - `'success'`: 도-미-솔-도 아르페지오 (정답 시 팡팡 터짐)
- **배경음악(BGM)**: MP3 기반 이어듣기
  - 6개 곡 중 랜덤 재생 (piano, acoustic, bgm)
  - 재생 위치 자동 저장
  - BGM 토글 버튼으로 ON/OFF 제어
- **독립적 제어**: 효과음/배경음 별도 버튼으로 독립 관리
- **상태 동기화**: localStorage에 sfxOn, bgmOn 저장

### 🎯 게임 메커니즘
- **3단계 난이도**: 쉬움(3x2) → 보통(4x3) → 어려움(4x4)
- **콤보 시스템**: 연속 매칭 시 보너스 점수 급증 (최대 127점)
- **일일 기록**: 오늘의 게임 횟수 및 최고 점수 추적

### 📱 모바일 최적화
- **터치 친화적**: 최소 44px 터치 영역, 충분한 간격
- **반응형 레이아웃**: 2열 그리드로 깔끔한 버튼 배치
- **스크롤 간섭 방지**: `touch-action: pan-y` 적용

### 🎮 멀티게임 플랫폼 (v1.52+)
- **🧩 같은 그림 찾기**: 기억력과 관찰력을 키우는 카드 매칭 게임
- **✍️ 단어 조합하기**: 흩어진 글자를 조합하여 단어를 완성하는 게임
- **🔢 숫자 순서터치** (예정중): 집중력과 순발력을 단련하는 게임

---

## 🚀 시작하기

### 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/yourusername/harumind.git
cd harumind
```

2. 로컬 서버 실행 (선택사항)
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000
```

3. 브라우저에서 접속
```
http://localhost:8000/memory/
```

### 배포

GitHub Pages를 통해 자동 배포됩니다:
- 메인 브랜치의 `memory/` 디렉토리가 게임 루트로 설정됨
- 커밋 시 자동으로 배포 반영

---

## 🎨 디자인 시스템

### 컬러 팔레트
```css
--bg: #0b1020          /* 어두운 배경 */
--text: #e8ecff        /* 밝은 텍스트 */
--muted: #b9c2ff       /* 보조 텍스트 */
--accent: #6ee7b7      /* 강조 색상 (민트) */
```

### Glassmorphism
- `backdrop-filter: blur(8px)`
- `background: rgba(255,255,255,.04)`
- `border: 1px solid rgba(255,255,255,.08)`
- 보라빛 그림자 효과

### 타이포그래피
- 시스템 폰트 스택 (San Francisco, Segoe UI, Noto Sans KR)
- 반응형 폰트 크기 (모바일/PC 자동 조정)

---

## 📊 게임 규칙

### 점수 시스템
- **기본 점수**: 10점
- **콤보 보너스**: 2차 곡선으로 증가
  - 2콤보: 15점 (+5)
  - 3콤보: 22점 (+7)
  - 4콤보: 31점 (+9)
  - 5콤보: 42점 (+11)
  - 최대: 127점 (10콤보 이상)

### 난이도별 카드 수
- **쉬움 (3x2)**: 3쌍, 6장
- **보통 (4x3)**: 6쌍, 12장
- **어려움 (4x4)**: 8쌍, 16장

---

## 🛠️ 기술 스택

- **HTML5**: 시맨틱 마크업, 접근성 고려
- **CSS3**: Flexbox, Grid, Custom Properties, Animations
- **Vanilla JavaScript**: 의존성 없는 순수 JavaScript
- **localStorage**: 게임 기록 및 설정 저장

### 브라우저 지원
- Chrome/Edge (최신 2개 버전)
- Safari (최신 2개 버전)
- Firefox (최신 2개 버전)
- 모바일 브라우저 (iOS Safari, Chrome Mobile)

---

## 📝 변경 이력

### v1.52 (현재) - 중앙 사운드 엔진 통합 및 멀티게임 플랫폼 구축
- 🔊 **core.js 중앙 사운드 엔진** 완성:
  - `playSfx(type)` 함수로 타입 기반 효과음 관리 ('click', 'success')
  - 모든 게임이 동일한 고품질 사운드 사용
  - AudioContext suspended 상태 자동 복구
- 🎵 **배경음(BGM) 통합 관리**:
  - `ensureBgm()`, `stopBgm()` 함수로 중앙 관리
  - MP3 파일 기반 배경음악 재생
  - 재생 위치 자동 저장 (localStorage)
- 🎮 **독립적 사운드 제어**:
  - `toggleSfx()`: 효과음 ON/OFF (토글 시 피드백음 재생)
  - `toggleBgm()`: 배경음 ON/OFF (토글 시 피드백음 재생)
  - 각 게임에서 core.playSfx() 호출로 단순화
- 🎯 **word/main.js & memory/main.js 정리**:
  - 로컬 audioCtx, tone 함수 완전 제거
  - bgmOn, bgmAudio 상태 관리 제거 (core에서 일원화)
  - 모든 사운드 로직을 core.js로 위임
  - 각 게임은 `core.playSfx('click')`, `core.playSfx('success')` 호출만 사용
- 🏠 **멀티게임 플랫폼 구축**:
  - index.html 게임 선택 UI 추가
  - memory/, word/ 폴더로 게임별 독립 관리
  - coming-soon 스타일로 숫자 게임 예정 표시
- ✅ **페이지 이동 시 음성 간섭 제거**: core에서 bgmAudio 상태 관리로 일관성 확보

### v1.51 - 난이도별 점수 정규화 및 마음 지수 시스템
- 📊 마음 지수(Score Normalization) 시스템 도입: 난이도별 기준 만점으로 점수 정규화
  - 쉬움: MaxScore 40 | 보통: 120 | 어려움: 200
  - 계산식: (내 점수 / MaxScore) * 100 (최대 100점, 정수 반올림)
- 🎨 통합 등급 판정 및 배경색 연동 (1.5초 transition):
  - 90점 이상: 💎 + #E3F2FD (하늘색)
  - 70점 이상: ✨ + #F3E5F5 (보라색)
  - 40점 이상: 🌿 + #E8F5E9 (초록색)
  - 40점 미만: ☁️ + #F5F5F5 (회색)
- 💬 공유 문구 최적화: '기록' → '마음 지수'로 변경, 구분선 유지
- 🔄 복구 로직: 게임 재시작 시 배경색 부드럽게 원래대로 복구
- ✨ 완성도 정점 달성: 감성과 기능의 완벽한 조화

### v1.49 - 기기별 공유 문구 줄바꿈 최적화 및 난이도별 점수 로직
- 📱 모바일 최적화: 긴 구분선을 짧은 선(── 🌿 ──)으로 변경하여 줄바꿈 방지
- 🎯 난이도별 점수 기준 적용: 쉬움/보통/어려움 모드별 차등 라벨 시스템
  - 쉬움: 💎 35점+ | ✨ 25점+ | 🌿 15점+ | ☁️ 그 미만
  - 보통: 💎 100점+ | ✨ 70점+ | 🌿 40점+ | ☁️ 그 미만
  - 어려움: 💎 100점+ | ✨ 80점+ | 🌿 50점+ | ☁️ 그 미만
- 🎨 텍스트 여백 개선: 가독성을 위한 적절한 빈 줄 추가
- ✅ 모든 기기에서 안전한 레이아웃 보장

### v1.48 - 감성 라벨 시스템 및 스토리형 공유 UI
- 💎 점수대별 마음 상태 라벨 시스템 도입 (4단계 감성 표현)
- ✉️ 스토리형 공유 텍스트: 한 편의 마음 편지 형식으로 재구성
- 🌿 감성적인 공유 메시지: "당신에게도 이 평온함을 보낼게요"
- 🎨 디자인 개선: 박스 테두리 제거, 여백과 선(───)만 사용
- 💬 토스트 메시지 변경: "오늘의 마음을 복사했습니다. 🌿"
- 📝 공유 문구 레이아웃: 마음 라벨 → 설명 → 기록 정보 → 감성 마무리

### v1.46 - 최종 밸런스 완성
- 🎴 2D 회전 효과: scaleX() 기반 카드 뒤집기 애니메이션 (0.2초)
- ✨ 회전 느낌 구현: 카드가 가로로 줄어들었다 펴지는 효과
- 💬 공유 기능 개선: 박스 형태의 예쁜 텍스트 형식으로 복사
- 📱 카카오톡 공유 최적화: OG 태그 보강으로 소셜 공유 품질 향상
- ⚡ 성능 최적화 유지: 비동기 로직 및 GPU 가속 그대로 적용
- 🎯 손맛과 시각 효과의 완벽한 균형 달성

### v1.45 - 성능과 손맛의 균형
- 🎯 가벼운 손맛 추가: 카드 클릭 시 0.15초 scale(1.05) 효과
- ✨ 카드 뒤집기 페이드 효과: opacity 0.5→1 빠른 전환으로 자연스러움
- ⏱️ 미세 지연 조정: 두 번째 카드 확인 시간 100ms 제공
- ⚡ 성능 유지: GPU 가속 활용한 가벼운 애니메이션만 적용
- 🎨 쾌적함과 반응성의 완벽한 균형 달성

### v1.43 - 성능 최적화 버전
- ⚡ 클릭 반응 속도 대폭 개선: 두 번째 카드 클릭 시 즉각적인 UI 업데이트
- 🚀 비동기 처리 적용: 매칭 판정을 requestAnimationFrame으로 분리
- 🎯 Bounce 애니메이션 제거로 CPU 부하 감소
- 💪 하드웨어 가속 강제: will-change, backface-visibility, translateZ(0) 적용
- 🔧 불필요한 transition 제거 및 리플로우 최소화
- 📱 모바일 성능 최적화 (GPU 가속 활용)

### v1.42
- ⚡ 2D 최적화: 3D 카드 애니메이션 제거로 모바일 성능 향상
- 🎯 매칭 시 짧은 Bounce 효과 추가 (0.2초 타격감)
- 💌 공유 문구 비주얼 업그레이드 (구조화된 예쁜 형식, 반짝임 지수 포함)
- 🗑️ 불필요한 3D CSS 클래스 제거로 코드 경량화
- 📱 모바일 사용성 개선 (즉각적인 카드 반응)

### v1.41
- 🎴 3D 카드 뒤집기 애니메이션 구현 (rotateY를 활용한 실제 카드 뒤집기 효과)
- 💌 결과 공유 기능 추가 (클립보드 복사 및 친구 공유)
- ✨ 카드 뒤집기 애니메이션 중 클릭 오류 방지 로직 개선
- 🎨 카드 앞면/뒷면 부드러운 전환 효과 (0.6초 cubic-bezier 애니메이션)
- 📋 공유 완료 토스트 메시지 추가

### v1.40
- 🔥 실시간 콤보 피드백 애니메이션 추가 (2콤보 이상 시 화면에 표시)
- 🎨 테마 선택 기능 추가 (기본/따뜻한, 다크/밤하늘, 숲속/그린 3가지 테마)
- 💾 테마 설정 localStorage 저장 및 자동 복원
- ✨ 콤보 수에 따른 동적 텍스트 크기 및 색상 변화
- 🌈 테마 전환 시 부드러운 색상 전환 효과

### v1.39
- 👑 신기록 강조 UI 추가 (점수/시간 신기록 시 반짝이는 뱃지 표시)
- 🎉 축하 효과음 추가 (게임 완료 시 경쾌한 fanfare 사운드)
- 🎊 이모지 파편 폭죽 효과와 함께 축하 효과음 연동
- 📊 최고 점수 및 최단 시간 기록 추적 시스템 개선
- ✨ 신기록 뱃지에 Glow 애니메이션 효과 적용

### v1.38
- 🎯 난이도 체계 3단계로 재편성 (쉬움/보통/어려움)
- 📱 viewport 최적화 완료
- 🎨 favicon.ico 적용 완료
- ✨ 감성 힐링 컨셉으로 전면 리뉴얼
- 🎨 Glassmorphism 디자인 시스템 적용
- 💝 하트 가루 효과 및 숫자 애니메이션 추가
- 📱 모바일 레이아웃 최적화 (2열 그리드)
- 💬 따뜻한 메시지 시스템 도입
- 🎵 BGM 이어듣기 기능 개선

### v1.37
- 🎯 4x4 난이도 추가 (8쌍)

### v1.36
- 초기 버전

---

## 🤝 기여하기

프로젝트 개선을 위한 제안과 기여를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

## 💌 연락처

- **웹사이트**: [harumind.kr](https://harumind.kr)
- **이메일**:

---

<div align="center">

**하루 5분, 마음의 평온을 찾아가는 여정에 함께해주세요** ✨

Made with 💛 by Harumind Team

</div>

