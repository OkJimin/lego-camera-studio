# 레고 카메라 스튜디오

CG 합성용 카메라 무빙 매칭 프리비즈 웹 애플리케이션.

실사 촬영 세트를 대신할 더미 블록(레고)을 자유롭게 배치하고, 실제 촬영에서 카메라가 움직인 경로를
화면에 화살표로 그리거나 폰을 자이로 센서로 직접 움직여 재현함으로써, 이후 CG 합성 작업의 카메라
레퍼런스로 활용하는 툴입니다. 자세한 배경과 기능 명세는 팀 기획서(`레고_카메라_스튜디오_기획서.pdf`)를
참고하세요.

## 기술 스택

| 영역 | 내용 |
| --- | --- |
| 프론트엔드 | React + TypeScript (Vite) |
| 3D 렌더링 | Three.js (react-three-fiber, drei) |
| 상태 관리 | Zustand |
| 인증 / 백엔드 | Firebase (Auth, Firestore, Realtime Database, Storage) |
| 영상 녹화 | MediaRecorder API + canvas.captureStream() |
| QR 코드 생성 | qrcode |
| 모바일 센서 | DeviceOrientationEvent |
| 배포 | Vite 빌드 → Vercel / Netlify |

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/OkJimin/lego-camera-studio.git
cd lego-camera-studio
```

### 2. 의존성 설치

```bash
npm install
```

> `@react-three/fiber`가 최신 React 버전과 peer dependency 충돌을 일으킬 수 있어 설치가 안 되면
> `npm install --legacy-peer-deps`로 시도해주세요.

### 3. 환경 변수 설정

`.env.example`을 복사해 `.env` 파일을 만들고, Firebase 콘솔(프로젝트: `lego-camera-studio-e7095`)의
프로젝트 설정 > 일반 탭에서 SDK 설정값을 채워주세요. 저장소 관리자에게 값을 요청해도 됩니다.

```bash
cp .env.example .env
```

`.env`는 git에 커밋되지 않습니다(개인 로컬 설정용).

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:5173`에서 확인할 수 있습니다.

### 기타 명령어

```bash
npm run build    # 프로덕션 빌드
npm run lint     # oxlint 실행
npm run preview  # 빌드 결과 미리보기
```

## 협업 워크플로우 (브랜치 / PR)

이 저장소는 `master`를 배포 기준 브랜치로 두고, 모든 작업은 별도 브랜치에서 진행한 뒤 Pull Request로
병합합니다. `master`에 직접 push하지 않습니다.

### 1. 저장소에 처음 참여하는 경우

1. 저장소 관리자(OkJimin)에게 GitHub 아이디를 알려주고 Collaborator로 초대받기
2. 초대 이메일 또는 GitHub 알림에서 초대 수락
3. 위 "시작하기" 단계대로 클론 및 로컬 세팅

### 2. 작업 시작 — 브랜치 만들기

`master`를 최신 상태로 받은 뒤, 작업 내용을 나타내는 이름으로 브랜치를 만듭니다.

```bash
git checkout master
git pull origin master
git checkout -b <브랜치 이름>
```

브랜치 이름 예시 (기획서의 Phase 단위 기준):

- `phase-2-asset-library` (에셋 라이브러리 / 드래그 앤 드롭)
- `phase-5-camera-path-drawing` (경로 드로잉 카메라 무빙)
- `fix-login-button-style` (버그 수정)

### 3. 작업하고 커밋하기

```bash
git add <변경한 파일>
git commit -m "설명이 담긴 커밋 메시지"
```

### 4. 브랜치 push 및 PR 생성

```bash
git push -u origin <브랜치 이름>
```

push 후 GitHub 저장소 페이지에서 "Compare & pull request" 버튼을 눌러 PR을 생성하거나,
GitHub CLI가 설치되어 있다면:

```bash
gh pr create --base master --title "제목" --body "변경 내용 설명"
```

### 5. 리뷰 및 병합

- 최소 1명 이상의 리뷰를 받은 뒤 병합하는 것을 권장합니다.
- 병합 방식은 Squash and merge를 기본으로 합니다.
- 병합 후 로컬/원격 브랜치는 정리해도 됩니다.

```bash
git checkout master
git pull origin master
git branch -d <브랜치 이름>
```

## 폴더 구조

```
src/
  components/   UI 컴포넌트
  store/        Zustand 상태 관리 (인증 등)
  lib/          Firebase 등 외부 서비스 초기화
```
