# Harumind

하루 5분 인지 자극을 위한 **같은 그림 찾기 게임** 프로젝트입니다.  
GitHub Pages로 배포되며, 모바일/PC 모두를 고려한 구조로 구성되어 있습니다.

---

## 📁 프로젝트 구조

```text
harumind/
├── index.html          # 메인 랜딩 페이지
├── memory/             # 게임 메인 디렉토리
│   ├── index.html      # 게임 페이지
│   ├── config.js       # 설정값 (이모지, 난이도, 점수 규칙)
│   ├── game.js         # 게임 로직 (카드 매칭, 점수 계산)
│   ├── storage.js      # localStorage 저장/불러오기
│   ├── ui-core.js      # UI 핵심 기능 (메시지, 통계, 효과음)
│   ├── ui-settings.js  # 설정 패널 토글
│   ├── ui-extras.js    # 추가 기능 (BGM, 잠깐보기, 방법보기)
│   ├── ui-toast.js     # 완료 토스트 / 폭죽 효과
│   ├── style.css       # 스타일시트
│   └── assets/
│       └── audio/
│           └── bgm.mp3 # 배경음악
├── og.png              # Open Graph 이미지
├── robots.txt          # 검색엔진 설정
└── CNAME               # GitHub Pages 도메인 설정
