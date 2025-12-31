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
│   ├── ui-toast.js     # 완료 토스트/폭죽 효과
│   ├── style.css       # 스타일시트
│   └── assets/
│       └── audio/
│           └── bgm.mp3 # 배경음악
├── og.png              # Open Graph 이미지
├── robots.txt          # 검색엔진 설정
└── CNAME               # GitHub Pages 도메인 설정

파일 역할
config.js: 게임 설정값 중앙 관리
이모지 목록, 난이도 맵, 점수 규칙, localStorage 키
game.js: 게임 핵심 로직
카드 생성(시드 기반), 클릭 처리, 매칭 판정, 콤보 점수, 게임 완료 처리
storage.js: 데이터 저장
localStorage 안전 처리, 일일 기록 저장/불러오기
ui-core.js: UI 공통 기능
메시지 표시, 통계 렌더링, 효과음 재생, 완료 상태 UI
ui-settings.js: 설정 패널
모바일/PC 반응형 토글
ui-extras.js: 추가 기능
BGM(이어듣기), 잠깐보기, 방법보기 모달
ui-toast.js: 완료 알림
토스트 팝업, 폭죽 애니메이션

