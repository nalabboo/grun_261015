@AGENTS.md

# CLAUDE.md

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참고하는 안내서입니다.

## 작업 방식 (사용자 관련)

- 사용자는 **디자이너**입니다. 설명은 **한국어로, 쉽게** 해 주세요. 전문 용어를 쓸 때는 짧게 풀어서 설명합니다.
- 이 프로젝트는 원래 Cursor에서 작업했습니다. `.cursorrules` / `.cursor/rules` 규칙 파일은 없었습니다 (2026-11-13 확인).
- 코드 주석은 대부분 영어이고, 화면에 보이는 문구(예: 챕터 제목)는 한국어입니다. 이미지 폴더·파일 이름은 독일어가 많습니다 (berg=산, himmel=하늘, kind=아이, vogel=새, grün=초록 등).

## 프로젝트 소개

"Grun"이라는 캐릭터가 등장하는 **챕터형 인터랙티브 그림책 웹사이트**입니다. 손그림 이미지(PNG/WebP)를 레이어로 쌓고, 스크롤·클릭·마우스 움직임에 따라 장면이 움직이거나 색이 채워집니다.

- **1장 (scene1)**: 가로로 긴 파노라마를 스크롤하며 Grun이 걸어갑니다. 벌레·이끼·아이를 클릭하면 흑백 그림이 초록(컬러)으로 번지며 드러납니다(reveal).
- **2장 (scene2)**: 산(berg) 레이어와 떠다니는 마리모·나비·거품·새가 있는 장면. 하위 장면 2-1 ~ 2-4로 나뉘어 진행됩니다.
- **3장 (scene3)**: 우주와 "색이 없는 소호 행성". 3D 유리 행성과 외계인이 나오고, 행성 안(inside) 장면으로 들어갑니다.

페이지는 하나뿐이며(`src/app/page.tsx` → `SceneStage`), `SceneStage`가 지금 몇 장인지 상태로 관리하며 장면을 바꿔 보여줍니다.

## 사용 기술

| 기술 | 역할 |
|---|---|
| **Next.js 16** (App Router) | 웹사이트 뼈대. ⚠️ 최신 버전이라 예전 방식과 다를 수 있으니 `node_modules/next/dist/docs/`를 먼저 확인 |
| **React 19** | 화면 구성 요소(컴포넌트) |
| **TypeScript** | 타입이 있는 자바스크립트 |
| **Three.js** + **React Three Fiber** + **drei** | 3D/WebGL 그래픽 (1장 레이어 월드, 3장 행성·별 등) |
| **Tailwind CSS 4** | 스타일. 대부분의 스타일은 `src/app/globals.css`에 있음 |
| **ESLint** | 코드 검사 |
| Python (Pillow) | 보조 스크립트 전용 (`scripts/extract_grun_walk.py`: GIF에서 걷기 프레임 추출) |

패키지 관리자는 **yarn** 입니다 (`yarn.lock` 있음).

## 실행 방법

```bash
yarn install     # 처음 한 번: 필요한 라이브러리 설치
yarn dev         # 개발 서버 실행 → http://localhost:3000
yarn build       # 배포용으로 빌드 (오류 확인용으로도 사용)
yarn start       # 빌드한 결과를 실행
yarn lint        # 코드 검사
```

테스트 코드는 없습니다. 변경 후에는 `yarn lint`, `yarn build`로 확인하고 브라우저에서 직접 봅니다.

- 2026-11-13 기준 `yarn lint`는 기존 코드에서 오류 68개를 냅니다 (전부 React 규칙 `set-state-in-effect`, `refs` 계열). 빌드와 동작에는 영향이 없으니, 새로 만든 오류만 없는지 확인하면 됩니다. `yarn build`는 통과합니다.

### 특정 챕터부터 보기

- 주소 뒤에 붙이기: `?chapter=1`, `?chapter=2`, `?chapter=3` (배포판에서도 동작)
- 3장 세부 단계: `?chapter=3&ch3=intro` / `ch3=play`(우주) / `ch3=inside`(행성 안)
- `yarn dev`는 기본으로 1장에서 시작합니다 (`package.json`의 `NEXT_PUBLIC_DEV_CHAPTER=1`).

### 개발용 스위치 (환경 변수, 개발 모드에서만 동작)

| 변수 | 효과 |
|---|---|
| `NEXT_PUBLIC_DEV_CHAPTER=1\|2\|3` | 시작 챕터 |
| `NEXT_PUBLIC_DEV_CH3=intro\|play\|inside` | 3장 시작 단계 |
| `NEXT_PUBLIC_DEV_LAYER_EDIT=1` | 1장 레이어 위치 편집 도구 켜기 |
| `NEXT_PUBLIC_DEV_CHAPTER2_EDIT=0` | 2장 소품 편집 패널 끄기 (기본은 켜짐) |
| `NEXT_PUBLIC_DEV_CHAPTER2_RULER=1` | 2장 레이아웃 눈금자 표시 |
| `NEXT_PUBLIC_DEV_CHAPTER2_START_23=1` / `..._START_23_HOLD=1` | 2장 2-3 장면부터 시작 |
| `NEXT_PUBLIC_CHAPTER2_RAW_BERG=0` | 2장 산 이미지에 블러·종이질감 처리 적용 (기본은 빠른 원본 사용) |

## 폴더 구조

```
src/
  app/                  페이지 진입점 (layout.tsx, page.tsx, globals.css)
  components/
    SceneStage.tsx      ★ 전체 흐름 관리자: 챕터 전환, 스크롤, Grun 이동, 클릭 처리
    GrunCharacter.tsx, *HitTarget.tsx, LayerEditorPanel.tsx   1장 캐릭터·클릭 영역·편집 도구
    canvas/             1장 WebGL 월드 (레이어 렌더링, 색이 번지는 reveal 셰이더)
    scene2/             2장 컴포넌트 (산 레이어, 마리모, 나비, 새, 장면 전환 효과 등)
    scene3/             3장 컴포넌트 (우주, 유리 행성, 외계인, 행성 내부)
                        └ *Editor.tsx = 개발용 조정 패널
  constants/            ★ 위치·크기·타이밍·애니메이션 숫자 설정
    sceneConfig.ts, scene2Config.ts → 1장
    chapter2*.ts → 2장 / scene3Config.ts, chapter3*.ts → 3장
  lib/                  이미지 블러·종이 질감 굽기, 에셋 미리 불러오기, 걷기 애니메이션
public/
  scene1/ scene2/ scene3/   챕터별 이미지 (scene1/_unused = 지금 안 쓰는 이미지)
scripts/                보조 Python 스크립트
```

## 작업할 때 알아둘 점

- **디자인 수치 조정은 대부분 `src/constants/` 파일**에서 합니다. 위치·크기·속도를 바꿀 때는 컴포넌트보다 먼저 이곳을 찾아보세요.
- **이미지를 교체하면 버전 문자열을 올려야** 브라우저 캐시 때문에 옛 이미지가 보이지 않습니다:
  - 1장: `src/constants/sceneConfig.ts`의 `ASSET_VERSION`
  - 2장: `src/constants/chapter2Config.ts`의 `CHAPTER2_ASSET_VERSION`
  - 3장: `src/constants/scene3Config.ts`의 `CHAPTER3_ASSET_VERSION`
  - 이미지 주소는 직접 쓰지 말고 `chapter3AssetUrl(...)` 같은 헬퍼 함수를 사용합니다 (폴더 이름에 공백이 있어도 안전).
- 코드에서 `@/`는 `src/` 폴더를 뜻합니다 (예: `@/components/SceneStage`).
- 화면 기준 높이(`SCENE_REFERENCE_HEIGHT`)에 맞춰 크기가 비례 조정되므로, 픽셀 값을 바꿀 때 이 기준을 염두에 둡니다.
- 3D/브라우저 전용 코드는 파일 맨 위에 `"use client"`가 필요합니다.
- 커밋 메시지는 `grun_MMDD/s3 설명` 형식을 써 왔습니다 (예: `grun_1110/s3 zeigen`).
