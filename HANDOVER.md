# 인수인계: 레고 카메라 스튜디오

## 1. 프로젝트가 하는 일

레고 블록으로 실제 장면을 미리 구성하고, 카메라 구도와 움직임을 3D로 설계한 뒤, 그 설계를 **가이드**로 삼아 실제 촬영(또는 AI 영상 생성)에 쓰는 도구입니다.

최종 목표 흐름:
1. 데스크톱에서 레고 블록을 배치하고 카메라 경로를 녹화해 **프로젝트로 저장**합니다.
2. 폰의 **촬영 라이브러리**(`?mode=shoot`)에서 같은 구글 계정으로 로그인해 프로젝트를 고릅니다.
3. 폰 카메라 화면 위에 레고 씬을 **반투명 가이드**로 겹쳐 보여주고, 가이드 경로에 맞춰 촬영합니다.
4. 촬영 영상을 AI video2video 등에 입력해 같은 구도와 움직임을 유지합니다.

## 2. 지금 상태 한눈에 보기

| 항목 | 상태 |
|---|---|
| 데스크톱 레고 편집 (블록 배치, 기즈모, 되돌리기) | 완료 |
| 카메라 경로 녹화/재생, 자동 경로 생성 | 완료 |
| 조명, 렌즈, 화면 비율(포맷) 설정 | 완료 |
| 움직임 속도 설정 (이동/줌/틸트/패닝/오브젝트) | 완료 |
| 구글 로그인, 프로젝트 저장/불러오기 (Firestore) | 완료 (저장 항목 보강 완료, 실기기 확인은 미완) |
| 폰 연결 (QR, 가로 모드 뷰파인더, 자이로 + 조이스틱) | 완료 |
| 촬영 페이지 (QR 세션 방식, 반투명 가이드, 녹화) | 완료, 실기기 화질/정렬 확인 필요 |
| 촬영 라이브러리 (`?mode=shoot`, 폰 로그인 후 프로젝트 선택) | 코드 완료, **실기기 테스트 전** |
| AI 입력용 깊이/윤곽 패스 내보내기 | 미착수 |
| 카메라 포즈 자동 기록 (ARKit/ARCore/WebXR) | 미착수 (아이디어 단계) |
| 실제 호스팅 (고정 HTTPS 주소) | 미착수 (지금은 임시 터널) |

## 3. 브랜치와 커밋 상태 (먼저 읽어주세요)

- `master`: 기본 브랜치. 팀 규칙상 PR은 1명 이상 리뷰 후 **squash merge**.
- `demo/camera-preview`: 데모 기능 전체가 쌓인 브랜치. 커밋 `c1dc21f`까지 원격(`origin`)에 push되어 있고, **PR #1은 아직 열려 있습니다** (`gh pr merge`는 자동으로 막혀서 사람이 직접 머지해야 함). 머지 전에 PR 상태를 먼저 확인하세요.
- `experiment/guide-video-test`: 현재 작업 브랜치. **아직 커밋되지 않은 변경이 있습니다.**
  - 수정됨: `src/App.tsx`, `src/App.css`, `src/demo/PhonePairingPanel.tsx`, `src/demo/phoneSession.ts`, `src/demo/useProjectStore.ts`, `src/demo/useWorkflowStore.ts`, `src/store/authStore.ts`
  - 새 파일: `src/demo/CaptureWorkspace.tsx`, `src/demo/CaptureGuide.tsx`, `src/demo/ShootLibrary.tsx`, `src/demo/guidePath.ts`
  - 할 일: 기능을 점검한 뒤 적절한 단위로 커밋하고, 브랜치를 올리고 PR을 여세요. 커밋 메시지에는 "왜"를 적어주세요.

## 4. 개발 환경 세팅

### 4-1. 설치
1. Node.js LTS, Git 설치.
2. 프로젝트를 **짧은 경로**에 받으세요 (예: `C:\dev\lego-camera-studio`). OneDrive나 바탕화면 안에서 빌드하면 네이티브 빌드가 깨지는 문제가 실제로 있었습니다.
   ```
   git clone https://github.com/OkJimin/lego-camera-studio.git C:\dev\lego-camera-studio
   cd C:\dev\lego-camera-studio
   git checkout experiment/guide-video-test   # 또는 필요한 브랜치
   npm install
   ```

### 4-2. Firebase 설정 (`.env`, 깃에 올리지 않음)
`.env.example`을 복사해서 `.env`를 만들고 7개 값을 채웁니다.
```
copy .env.example .env
```
필요한 키: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_DATABASE_URL`.
값은 팀장에게 따로 받거나 Firebase 콘솔 → 프로젝트 설정 → 웹 앱에서 복사합니다. **값을 채팅이나 깃에 올리지 마세요.**

값을 바꾼 뒤에는 개발 서버를 **재시작**해야 반영됩니다.

### 4-3. 개발 서버
```
npm run dev -- --host --port 5174
```
- `--host`: 같은 네트워크/터널에서 접근 가능하게 함.
- 포트를 5174로 고정하는 이유: 터널 명령이 `http://localhost:5174`를 가리키도록 맞춰두었기 때문입니다.
- 개발 서버가 자주 꺼졌습니다. 꺼져 있으면 `localhost:5174`가 응답하지 않으니 먼저 확인하세요.

### 4-4. 폰 테스트용 터널 (HTTPS 필수)
폰의 카메라(`getUserMedia`)와 구글 로그인은 **HTTPS에서만** 동작합니다. 같은 와이파이의 `http://192.168.x.x`로는 안 됩니다.
```
C:\Users\ojm10\Downloads\cloudflared-windows-amd64.exe tunnel --url http://localhost:5174
```
- 출력되는 `https://xxxx.trycloudflare.com` 주소가 폰에서 쓸 주소입니다.
- 터널을 끄고 다시 켜면 **주소가 바뀝니다.**
- 터널 창은 테스트하는 동안 닫지 마세요.
- 이 저장소의 `vite.config.ts`에 `allowedHosts: true`가 설정되어 있어서 터널 호스트로 접근해도 403이 나지 않습니다.

**매번 주소가 바뀌면 할 일:** Firebase 콘솔 → Authentication → 설정 → **승인된 도메인**에 새 호스트 이름을 추가해야 구글 로그인이 됩니다. 지속적으로 쓰려면 고정 호스팅(예: Firebase Hosting)에 올리는 것을 권장합니다.

## 5. 화면과 URL

| 주소 | 화면 | 설명 |
|---|---|---|
| `/` | 시작 화면 | "웹 워크스페이스" 또는 "폰으로 카메라 제어" 선택 |
| `/` (웹 워크스페이스) | `WebWorkspace` | 데스크톱 편집 + 카메라 녹화 |
| `/` (폰 세팅) | `PhoneWorkspace` | 데스크톱 편집 + 폰 연결 패널(QR 2개) |
| `?mode=phone&session=ID` | `MobileController` | 폰 뷰파인더 (자이로 + 조이스틱 + 줌 버튼) |
| `?mode=capture&session=ID` | `CaptureWorkspace` | QR 세션 기반 촬영 화면 |
| `?mode=shoot` | `ShootLibrary` | 구글 로그인 → 프로젝트 목록 → 촬영 (QR 불필요) |

`App.tsx`는 위 순서대로 URL을 확인해서 화면을 고릅니다. 라우터는 쓰지 않고 `useWorkflowStore`가 URL을 한 번 읽어 둡니다.

## 6. 코드 구조

### 6-1. 상태 관리 (Zustand)
| 스토어 | 역할 |
|---|---|
| `useBlockStore` | 배치된 블록 목록, 선택/기즈모 모드, 되돌리기 이력, 블록 움직임(`motion`) |
| `useCameraPathStore` | 녹화 상태, 키프레임, 시작/끝 자세(home/end), 재생 여부, 자동 경로 |
| `useCameraSettingsStore` | 화면 비율 인덱스(`formatIndex`), 렌즈 fov(`lensFov`) |
| `useLightingStore` | 조명 밝기, 주광 방향/높이, 색온도 |
| `useSpeedSettingsStore` | 이동/줌/틸트/패닝 속도, 오브젝트 왕복 시간 |
| `useProjectStore` | 프로젝트 저장/불러오기 (Firestore) |
| `useWorkflowStore` | 현재 화면 모드와 URL 파라미터 |
| `authStore` (`src/store/`) | 구글 로그인 상태 (`user`, `isLoading`) |

### 6-2. 매우 자주 쓰는 "비-React 공유 객체" 패턴
렌더링과 무관하게 매 프레임 읽고 쓰는 값은 React 상태가 아니라 모듈 레벨 객체로 둡니다. `useFrame` 안에서 직접 읽어요.
- `shotActionState` (`shotActions.ts`): 줌/틸트/패닝 버튼이 눌렸는지
- `liveCameraPose` (`liveCameraPose.ts`): 데스크톱 카메라 위치/회전/fov (매 프레임 갱신)
- `playbackClock` (`playbackClock.ts`): 재생 경과 시간과 길이 (카메라와 오브젝트 움직임이 같은 시계를 씀)
- `joystickState` (`joystickState.ts`): 폰 조이스틱 입력

### 6-3. 파일 찾기
| 파일 | 내용 |
|---|---|
| `Scene.tsx` | 데스크톱 메인 3D 캔버스 (블록 + 카메라) |
| `CameraRig.tsx` | 데스크톱 카메라 로직: 녹화, 재생, 줌/틸트/패닝, 이동 |
| `Block.tsx` | 블록 하나 렌더링, 기즈모, 움직임(재생 모드/루프 모드) |
| `CameraMonitor.tsx` | 우하단 카메라 뷰포트 미리보기 |
| `PhoneViewfinder.tsx` | 폰 쪽 3D 뷰파인더 (자이로, 조이스틱, 렌즈/조명/속도 동기화) |
| `PhonePairingPanel.tsx` | 데스크톱의 폰 연결 패널 (QR 2개, 실시간 동기화 push) |
| `phoneSession.ts` | RTDB 세션 읽기/쓰기 함수 모음 |
| `guidePath.ts` | 카메라 경로 직렬화, 역직렬화, 보간 샘플러 |
| `CaptureWorkspace.tsx` | 촬영 화면 (`CaptureView`) + QR 세션용 래퍼 (`CaptureWorkspace`) |
| `CaptureGuide.tsx` | 촬영 화면 안의 가이드 씬 (카메라 경로 + 블록 움직임 재생) |
| `ShootLibrary.tsx` | 폰 촬영 라이브러리 (로그인, 목록, 선택) |
| `useProjectStore.ts` | 저장/불러오기, `fetchProjectForShoot` (촬영용) |
| `src/lib/firebase.ts` | Firebase 앱 초기화 (env 값 읽음) |
| `firestore.rules`, `database.rules.json`, `firebase.json` | 보안 규칙 |

## 7. 데이터 동기화 구조

### 7-1. 실시간 세션 (RTDB, `sessions/<세션ID>/...`)
데스크톱과 폰이 같은 세션을 보고, 데스크톱이 값을 밀어 넣으면 폰이 받는 구조입니다.

| 경로 | 보내는 쪽 | 받는 쪽 | 비고 |
|---|---|---|---|
| `blocks` | 데스크톱 | 폰, 촬영 | 150ms 간격으로 제한 |
| `homePosition` | 데스크톱 | 폰 | 데스크톱 카메라 위치를 150ms마다 보냄 (폰은 처음 한 번만 적용) |
| `cameraSettings` | 데스크톱 | 폰, 촬영 | `{fov, aspect}` |
| `lighting` | 데스크톱 | 폰 | 조명 설정 |
| `speedSettings` | 데스크톱 | 폰 | 속도 설정 |
| `cameraPath` | 데스크톱 | 촬영 | 녹화가 끝났을 때만 보냄 |
| `orientation`, `phoneConnected` | 폰 | 데스크톱 | 자이로 값과 연결 상태 |

보안 규칙: 세션 경로는 `auth != null`(익명 로그인 포함)일 때만 읽고 쓸 수 있습니다.

### 7-2. 프로젝트 저장 (Firestore, `projects/<문서ID>`)
주요 필드: `ownerId`, `name`, `blocks`, `cameraHome`, `cameraEnd`, `autoMoveDuration`, `cameraPath`, `lens` (`fov`, `formatIndex`), `speed`, `lighting`, `createdAt`, `updatedAt`.
- 규칙: 소유자(`ownerId`)만 읽고 쓸 수 있음.
- 주의: `cameraPath`는 키프레임이 많으면 문서가 커집니다 (Firestore 문서 한도 1MB). 1분 이상 긴 경로에서 문제가 생기면 점 개수를 줄이는 작업이 필요합니다.
- 주의: **이전에 저장한 프로젝트에는 `cameraPath`가 없습니다.** 경로를 녹화한 뒤 다시 저장해야 촬영 라이브러리에서 쓸 수 있어요.

### 7-3. 로그인
- 데스크톱: 팝업 방식 구글 로그인 (`signInWithPopup`). 저장 시점에 로그인 창이 뜹니다.
- 폰(터치 기기): 리다이렉트 방식 (`signInWithRedirect`). 로그인 후 페이지가 다시 열립니다.
- **익명 로그인은 폰 연결(세션)에만 씁니다.** `useProjectStore`의 `ensureSignedInUid`는 익명 계정을 로그인된 것으로 치지 않습니다. 이 부분을 건드릴 때 주의하세요 (익명 계정으로 저장되는 버그가 있었음).

## 8. 촬영 화면 동작

- 후면 카메라를 `1920×1080`, `30fps` 이상적 값으로 요청합니다.
- 화면 가운데에 **카메라 프레임 비율 그대로** 영상과 가이드(three.js 캔버스, 투명 배경)를 겹칩니다. 비율은 실제 영상의 `videoWidth/videoHeight`에서 읽습니다.
- 가이드 투명도 슬라이더 (기본 50%).
- "촬영 시작" → 3초 카운트다운 → 녹화(`MediaRecorder`, 약 20Mbps)와 가이드 재생이 같은 순간에 시작.
- 가이드 경로가 끝나면 자동으로 멈추고 파일을 내려받습니다 (iOS 등에서 안 되면 화면의 "여기서 받기" 링크).
- 녹화되는 것은 **카메라 원본 영상**이고, 가이드는 화면에만 보입니다. 가이드가 영상에 섞이지 않습니다.

## 9. 알려진 문제와 한계

| 문제 | 설명 / 대응 |
|---|---|
| 촬영 화질 | 브라우저 녹화라 블랙매직 같은 전문 앱보다 낮습니다. 비트레이트와 해상도는 `CaptureWorkspace.tsx` 상단과 `getUserMedia` 옵션에서 조절. 4K는 발열과 파일 크기 문제가 있을 수 있음. |
| 가이드와 실제 장면 정렬 | 폰을 시작 자세에 맞추는 것이 사람 손이라 오차가 있습니다. 시작 자세 자동 보정은 아직 없음. |
| 블록 움직임 | 촬영 가이드에서는 녹화 경로 타임라인에 맞춰 움직입니다. 뷰파인더(라이브 보기)에서는 왕복 루프로 움직입니다. 두 방식이 다르니 헷갈리지 않게 주의. |
| iOS Safari | 카메라 설정 제어와 녹화 포맷에 제약이 많음. 안드로이드 크롬에서 먼저 확인하는 것을 권장. |
| 터널 주소 변경 | 실행할 때마다 바뀌고, 그때마다 Firebase 승인 도메인 추가가 필요합니다. |
| 디버깅 도구 | Playwright 등 자동 브라우저 테스트 환경은 아직 프로젝트에 없습니다. 폰 기능은 실기기로 직접 확인해야 합니다. |
| 과거 버그 (해결됨) | `crypto.randomUUID`는 HTTP(LAN)에서 동작하지 않아 `generateId()`로 교체함. 이 함수를 다시 `randomUUID`로 바꾸지 마세요. |

## 10. 다음에 할 일 (우선순위 제안)

1. **실기기 테스트 (안드로이드 크롬)**: 촬영 라이브러리 로그인 → 프로젝트 선택 → 촬영 → 파일 저장까지 전체 흐름 확인.
2. **현재 브랜치 정리**: 미커밋 변경을 나눠서 커밋하고 PR 열기 (`experiment/guide-video-test`).
3. **고정 호스팅 올리기**: 승인 도메인을 매번 바꾸지 않아도 되게 함.
4. **촬영 정렬 개선**: 시작 자세 맞춤 안내 (예: 실제 바닥 기준점에 맞추는 보정 화면).
5. **AI 입력용 패스 내보내기**: 같은 카메라 경로로 깊이/윤곽선 영상을 렌더링해 video2video의 가이드 입력으로 사용.
6. **긴 경로 대응**: 키프레임 간소화 (Firestore 1MB 한도 대비).

## 11. 작업할 때 주의할 점 (지금까지 실제로 겪은 것)

- 개발 서버는 **OneDrive 밖**(`C:\dev\...`)에서 실행하세요.
- 설정 파일(`vite.config.ts`, `.env`)을 바꾸면 서버를 재시작해야 합니다.
- `getUserMedia`와 구글 로그인은 HTTPS 전용입니다. 테스트 주소는 항상 `https://`.
- 데스크톱 저장은 구글 로그인 상태에서만 됩니다. 익명 세션만 있으면 저장이 안 됩니다.
- 여러 곳에서 같은 Zustand 스토어를 씁니다. 한 화면에서 바꾼 설정이 다른 화면에 영향을 줄 수 있으니 변경 전에 `grep`으로 사용처를 확인하세요.
- 폰에서 기기 방향이 바뀌면 뷰파인더 CSS가 가로 모드로 바뀝니다 (`App.css`의 `orientation: landscape` 블록).

## 12. 질문이 생기면

- 세션 이력과 결정 배경은 이 문서에 다 담지 못했습니다. 큰 방향(가이드 촬영 vs 사람이 맞추기, 라이브러리 방식 채택 등)은 PR 설명이나 팀 채널에 기록을 남겨두세요.
- 팀장: OkJimin (GitHub). Firebase 값과 승인 도메인 설정 권한은 팀장에게 확인하세요.
