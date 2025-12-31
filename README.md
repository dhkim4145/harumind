# 하루마음 (Harumind) - 감성 힐링 카드 게임

> **v1.37** | 하루 5분, 마음의 평온을 찾아가는 따뜻한 인지 자극 게임

[![Version](https://img.shields.io/badge/version-1.37-blue.svg)](https://github.com/yourusername/harumind)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ 프로젝트 소개

**하루마음**은 누구나 편하게 즐길 수 있는 감성 힐링 카드 게임입니다. 비슷한 이모지들을 찾아 짝을 맞추는 과정에서 집중력과 기억력을 자연스럽게 자극하며, 따뜻한 메시지와 부드러운 애니메이션으로 마음의 평온을 찾아갑니다.

### 🎯 핵심 컨셉

- **감성 힐링**: 따뜻한 문구와 부드러운 인터랙션으로 마음의 여유를 제공
- **인지 자극**: 집중력과 기억력을 자연스럽게 향상시키는 게임 메커니즘
- **접근성**: 모바일과 PC 모두에서 최적화된 반응형 디자인
- **최적화**: 4개 파일로 구성된 깔끔하고 효율적인 구조

---

## 🏗️ 프로젝트 구조

본 프로젝트는 **바이브 코딩(Vibe Coding)** 철학에 따라 **단 4개의 핵심 파일**로 최적화되어 있습니다:

```
memory/
├── index.html      # 게임 UI 구조 및 메타데이터
├── style.css       # Glassmorphism 기반 감성 디자인
├── config.js       # 게임 설정값 및 데이터 (v1.37)
└── main.js         # 모든 게임 로직 통합 (State/Storage/UI/Logic)
```

### 📦 파일별 역할

#### `index.html`
- 게임 UI 구조 및 접근성 메타데이터
- Open Graph 및 SEO 최적화
- 모달 및 결과 화면 구조

#### `style.css`
- **Glassmorphism** 기반 감성 디자인 시스템
- 반응형 레이아웃 (모바일/PC 최적화)
- 부드러운 애니메이션 및 전환 효과
- 하트 가루, 숫자 팝업 등 인터랙션 효과

#### `config.js`
- 게임 설정값 중앙 관리
- 이모지 리스트 (9쌍, 18개)
- 난이도 맵 (2x2, 3x2, 4x3, 4x4)
- 콤보 점수 계산 로직
- 로컬 저장소 키 관리

#### `main.js`
모든 게임 로직이 **4개 구역**으로 체계적으로 구성:

```javascript
// [State] - 게임 상태 변수
// [Storage] - localStorage 저장/불러오기
// [UI/Effects] - UI 공통, 설정, 효과음, 토스트, 폭죽, BGM 등
// [Logic] - 게임 로직 (카드 생성/클릭/매칭/콤보/기록 저장)
```

---

## 🎮 주요 기능

### 🎨 감성 힐링 디자인
- **Glassmorphism UI**: 반투명 블러 효과로 세련된 시각적 경험
- **따뜻한 메시지**: "숨어있는 짝꿍들을 하나씩 깨워볼까요? ✨"
- **부드러운 애니메이션**: 페이드 인/아웃, 숫자 팝업, 하트 가루 효과

### 🎯 게임 메커니즘
- **4단계 난이도**: 쉬움(2x2) → 보통(3x2) → 어려움(4x3) → 매우 어려움(4x4)
- **콤보 시스템**: 연속 매칭 시 보너스 점수 급증 (최대 127점)
- **일일 기록**: 오늘의 게임 횟수 및 최고 점수 추적

### 🎵 멀티미디어
- **효과음**: 매칭 성공/실패 시 부드러운 비프음
- **배경음악**: 이어듣기 기능 지원 (재생 위치 자동 저장)
- **시각 효과**: 하트 가루, 폭죽, 카드 애니메이션

### 📱 모바일 최적화
- **터치 친화적**: 최소 44px 터치 영역, 충분한 간격
- **반응형 레이아웃**: 2열 그리드로 깔끔한 버튼 배치
- **스크롤 간섭 방지**: `touch-action: pan-y` 적용

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
- **쉬움 (2x2)**: 2쌍, 4장
- **보통 (3x2)**: 3쌍, 6장
- **어려움 (4x3)**: 6쌍, 12장
- **매우 어려움 (4x4)**: 8쌍, 16장

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

### v1.37 (현재)
- ✨ 감성 힐링 컨셉으로 전면 리뉴얼
- 🎨 Glassmorphism 디자인 시스템 적용
- 💝 하트 가루 효과 및 숫자 애니메이션 추가
- 📱 모바일 레이아웃 최적화 (2열 그리드)
- 🎯 4x4 난이도 추가 (8쌍)
- 💬 따뜻한 메시지 시스템 도입
- 🎵 BGM 이어듣기 기능 개선

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
- **이메일**: contact@harumind.kr

---

<div align="center">

**하루 5분, 마음의 평온을 찾아가는 여정에 함께해주세요** ✨

Made with 💛 by Harumind Team

</div>
