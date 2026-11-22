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
| Python (Pillow) | 보조 스크립트 전용 (`scripts/extract_*.py`: 크로마키 영상에서 배경 제거한 프레임 추출) |

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
- **인트로(책 표지)**: `BookIntro.tsx`. 회색 로고(`RICORI1_2sw_clean.png`)를 마우스로 문지르면 아래의 색깔 로고(`RICORI1_2.png`)가 드러납니다. 회색 로고만 종이와 곱하기(`mix-blend-mode: multiply`, `.book-intro__logo`)로 섞어 종이에 찍힌 것처럼 보이게 합니다. 색깔 로고는 원래 색 그대로(곱하지도, 필터도 없음) 베일 위 층(`.book-intro__logo--color`)에 처음부터 통째로 깔려 있고, 그 위를 같은 종이 그림 + 베일 빛을 그린 캔버스(`.book-intro__ricori-cover`)가 덮습니다(입체 필터를 넣어 봤지만 색이 탁해져서 뺌). 문지르면 같은 지우개 모양으로 회색 로고와 종이 덮개를 지워 색깔 로고가 드러납니다. **문지를 때 바뀌는 캔버스에 무거운 필터(입체 효과)를 걸거나, 지우개 자국마다 큰 그림을 다시 그리면 심하게 버벅입니다** — 그래서 문지를 때는 가벼운 모양 지우기만 합니다. `_clean`은 회색 로고 가장자리를 1~2px 넓힌 파일로, 색깔 로고의 가장자리가 연두색 선으로 비치지 않게 합니다(원본 `RICORI1_2sw.png`는 그대로 둠). 지우개는 동그라미가 아니라 울퉁불퉁한 모양 + 가장자리 부스러기(`introConfig.ts`의 `INTRO_SCRATCH`: `brushRadiusPx`, `roughness`, `crumbs`). 그림을 바꾸면 `INTRO_ASSET_VERSION`을 올립니다. 문지를 때 "슥삭슥삭" 소리는 코드로 만듭니다(`src/lib/scratchSound.ts`, 음원 파일 없음): 마우스가 빠를수록 크고, 멈추면 바로 사라지며, 방향에 따라 소리 색이 살짝 달라집니다. 수치는 `introConfig.ts`의 `INTRO_SCRATCH_SOUND`(`volume`, 최대 크기가 되는 속도 `fullSpeedPxPerMs`, 소리 색 `toneHz`, 방향 차이 `directionTone`). 타이틀을 80% 이상 문지르면 lusion.co 인트로처럼 초록 타이틀이 점점 빠르게 줌인되고, 글자 안으로 1장 화면이 보이다가 화면을 다 덮으면 인트로가 끝납니다(`INTRO_ZOOM`: 시작 기준 `revealedRatio`, 시간 `durationMs`, 최대 배율 `maxScale`, 줌 중심 `origin` = 글자 안에서 가장 두툼한 곳, 글자가 창으로 바뀌는 구간 `windowFrom`/`windowTo`). 종이(`.book-intro__bg`)에 타이틀 모양 구멍 마스크를 뚫어 아래의 1장이 보이게 합니다. 1장(`SceneStage`)은 인트로 뒤에서 처음부터 준비합니다(산 흐림·종이 질감 굽기, 3D 화면 — 몇 초간 화면이 멈춤). 그동안 인트로는 가만히 있고, 준비가 끝나 화면이 다시 매끄러워지면(`warm`, `smoothFrames`) 마리모가 나타나 움직이기 시작합니다. 움직이는 것이 없으면 멈춤이 보이지 않기 때문입니다. 그래서 다 문지른 뒤 1초(`delayMs`) 만에 바로 줌을 시작할 수 있습니다. 스크롤 걷기는 인트로가 끝날 때까지 막습니다. 종이의 구멍 마스크는 처음부터 걸어 두고 구멍만 화면 바로 밖(-400px)에 두었다가 옮깁니다(줌 시작 때 마스크를 새로 걸면 종이가 한두 프레임 번쩍 사라짐. 너무 멀리(-100000px) 두면 위치가 무시되어 작은 구멍이 화면에 보임). Enter/스페이스는 예전처럼 서서히 사라지며 넘어갑니다.
- **마우스 커서**: 사이트 전체에서 기본 화살표 대신 초록 별(`public/intro/cursor.png`)이 마우스를 따라다니고, 휠을 돌릴 때마다 돌아갑니다(위로 돌리면 반대로, 부드럽게 멈춤). 화면에는 작게 줄인 `cursor.webp`(128px)를 씁니다 — PNG를 바꾸면 webp도 다시 만들고 `INTRO_ASSET_VERSION`을 올립니다. 기본 커서는 `html.custom-cursor-on`(globals.css)으로 숨기고, 터치 화면에서는 켜지 않습니다. 코드는 `src/components/CustomCursor.tsx`(`layout.tsx`에 들어 있음), 수치는 `src/constants/cursorConfig.ts`의 `CUSTOM_CURSOR`(크기 `sizePx`, 휠 1px당 회전 `degPerWheelPx`, 한 번에 최대 회전 `maxStepDeg`, 멈추는 부드러움 `ease`).
- **장 넘기기** (1→2장, 2→3장): 오른쪽 아래에 종이 귀퉁이가 안쪽으로 접힌 표시(`PageTurnCue`, SVG로 그림)가 나타나면 아래로 스크롤(휠·위로 쓸기·↓키, 클릭도 가능)해서 넘깁니다. 지금 장면이 오른쪽 아래 모서리부터 책장처럼 접혀 넘어가고, 빈 종이 여러 장이 촤라라락 이어서 넘어간 뒤 다음 장 표지가 나옵니다. 넘어가는 장면은 `PageFlipLeaf`로 감싸고, 종이·접힌 면은 `PageFlipOverlay`(scene2/)가 그립니다. 속도·종이 장수·모서리 높이 등은 `src/constants/pageTurnConfig.ts`의 `PAGE_TURN`. 접힌 면 그림자에 `filter: drop-shadow`를 쓰면 화면이 멈칫해서, 같은 모양을 살짝 옮긴 반투명 층으로 대신합니다. 넘길 때 소리는 음원 파일 없이 코드로 만듭니다(`src/lib/pageFlipSound.ts`, Web Audio): 장면 페이지가 넘어갈 때 "스윽" + 약한 바스락, 빈 종이 한 장마다 "사락"(부드러운 쓸림 + 작은 바스락 `crackles`개, 종이 넘어가는 시간에 맞춤), 마지막에 작게 "툭". 브라우저는 클릭·키 입력·터치 전에는 소리를 막아서(스크롤은 해당 안 됨), 첫 클릭 때 소리를 켜 둡니다(`armPageFlipSound`, SceneStage). 크기·켜고 끄기는 `pageTurnConfig.ts`의 `PAGE_TURN_SOUND`(`volume`, `enabled`).
- **2장 첫 스크롤 (2-1 → 2-2)**: 스크롤 한 번이면 자동 재생이 시작됩니다. 먼저 나리(Nari)와 함께 날아오는 새가 바로 나타나고(`nariSec` 1.4초, 처음에 빠르고 끝에 부드럽게), 이어서 산 색 바뀜 → 초록이 작아짐 → 포자 작아짐이 `restSec` 7초 동안 진행됩니다. 수치는 `src/constants/chapter2SubscenePlayback.ts`의 `CHAPTER2_SUBSCENE_PLAYBACK_TIMING`. (예전엔 11.5초짜리 곡선 하나라서 나리가 처음 2초 동안 거의 안 보이고 4.5초에야 다 나타났음.) 나리는 그림(`nari.png`) 대신 영상으로 나옵니다: 등장할 때 `nari1`(흰 바탕에서 서서히 나타나 한 바퀴 돌고 섬, 3초, 한 번)을 재생한 뒤 `nari2`(망토가 살랑이는 1.2초)를 계속 반복합니다. 영상이 스스로 서서히 나타나므로, 나리는 순서가 오면 바로 불투명하게 둡니다(`chapter2ScrollMotion.ts`의 `getChapter2PropScrollOpacity`). 크기·위치는 예전 `nari.png`와 같은 틀(455×600)에 맞춰 두었으므로 2-3·2-4의 움직임과 편집 패널은 그대로 씁니다. 설정은 `src/constants/chapter2PropClips.ts`의 `CHAPTER2_NARI_CLIP`, 재생은 `Chapter2PropLayer.tsx`의 `PropClipCanvas`(다른 2장 소품도 `clip`만 붙이면 같은 방식으로 재생됨).
- 커밋 메시지는 `grun_MMDD/s3 설명` 형식을 써 왔습니다 (예: `grun_1110/s3 zeigen`). 2026-11부터는 `v2_grunMMDD/...`도 사용.

### 움직이는 에셋 (영상 → 프레임)

- 디자이너가 크로마키(초록/파랑/분홍 배경) mp4를 주면, 스크립트로 배경을 지운 프레임(PNG/WebP)을 만들어 `public/`에 넣고 코드에서 반복 재생합니다.
- **원본 mp4는 git에 넣지 않습니다** (`.gitignore`에 `*.mp4`). 프로젝트 바깥 `../source_videos/` (= `das_grun/source_videos/`)에 보관하고, 스크립트가 거기서 읽습니다 (`GRUN_VIDEO_DIR` 환경 변수로 위치 변경 가능).
  - `scripts/extract_ricori.py`: `ricori_walk.mp4` → 1장 초록이 걷기 (`character/ricori_walk/`)
  - `scripts/extract_ampel.py`: `ampel_mitte.mp4` → 신호등 빨간불 → 초록불 (`landmark/ampel_mitte/`, 73장, 24fps). 이 영상은 크로마키가 아니라 **흰 배경**이라 흰색과의 거리로 지우고(바깥과 이어진 흰색만), 반투명 부분은 흰색을 빼서 빛 번짐이 남게 합니다. 첫 그림을 `ampel_b` 실루엣에 자동으로 맞추고(`register`), 화면에서 작게 보여서 절반 크기(`OUT_SCALE` 0.5)로 저장합니다.
  - `scripts/extract_pore.py`: `pore.mp4` → 1장 spore 3종 (`landmark/pore/`)
  - `scripts/extract_worm.py`: 애벌레 3개 영상 → `landmark/worm_sw/`(회색 반복, `worme_sw.mp4`), `worm_mitte/`(변신, 한 번 재생, `worme_mitte.mp4`), `worm_g/`(초록 반복, `worme_g.mp4`). 아이와 같은 방식이며 기준 좌표는 "worm box"(604x700), 위치는 `sceneConfig.ts`의 `WORM_CLIPS`. 분홍 볼이 배경색과 비슷해서, 바깥 배경과 이어진 분홍만 투명하게 만듭니다(`outside_only`). 애벌레가 변신하기 전에는 초록이가 애벌레가 앉은 바위 왼쪽(`getGrunWormBarrierX` → `getGrunLandmarkStandX`)에서 멈추고, 변신이 끝나야 다시 앞으로 갈 수 있습니다. 애벌레가 화면에 들어오면 카메라가 천천히 애벌레를 화면 가운데로 옮기고(초록이도 화면 안에 유지), 애벌레가 변신을 마치면 초록이가 스스로 아이 앞까지 걸어가고(`handleWormRevealComplete`) 카메라도 이어서 아이를 화면 가운데로 옮깁니다(초록이는 아이 앞 `getGrunKindBarrierX`에서 멈춤). 아이도 변신한 뒤 화면을 누르면 초록이가 앞으로 가고 카메라는 다시 초록이를 따라갑니다(`kindCameraReleased`). 아이가 애벌레보다 먼저 초록색이 되면 아이 쪽 카메라는 건너뜁니다. 수치는 `sceneConfig.ts`의 `WORM_CAMERA`(`focusRatio` 애벌레, `kindFocusRatio` 아이).
  - `scripts/extract_tableau.py`: 1장 마지막 장면(tableau)의 움직이는 캐릭터들. `ricori_v.mp4` → 초록이(`character/ricori_v/`, 예전 `grun_v`), `ai1.mp4` → 만세 하는 아이(`character/ai1/`, 예전 `kinder2`), `ai2.mp4` → 머리카락이 날리는 여자아이(`character/ai2/`, 예전 `kinder3`), `ai3.mp4` → 손을 뻗는 아이 + 강아지(`character/ai3/`, 예전 `kinder1` + `hund`, 강아지가 영상 안에 같이 있어 `hund` 항목은 삭제). 옷의 반짝이처럼 아주 작은 변화도 살리려면 `change_threshold`를 낮춤. 아래쪽으로 넘치면 `pad_bottom` → `bottom`을 `bottomShift`만큼 내림. 손그림이라 같은 그림이 여러 프레임 반복되므로 서로 다른 그림만 저장하고, 각 그림이 보이는 시간은 `scene2Config.ts`의 `RICORI_V_CLIP` / `AI1_CLIP` / `AI2_CLIP` / `AI3_CLIP`의 `holdMs`. 예전 그림과 같은 위치·크기에 맞추고(`scale`/`offset`), 움직임이 넘치는 만큼 좌우(`pad_x`)·위(`pad_top`)만 넓힘 — 위를 넓히면 `SCENE2_ITEMS`의 `height`도 그 비율(`heightScale`)만큼 키움. 배경은 "자홍색 정도"(min(R,B) - G)로 지움: 압축 때문에 검은 선·머리 잎 사이에 섞인 분홍까지 지워지고, 초록이 섞인 볼·피부의 분홍은 남음. 영상마다 배경 분홍의 진하기가 달라 `solid`/`clear` 값을 따로 둠. 새 캐릭터는 `CLIPS`에 한 항목 추가 → `SCENE2_ITEMS`에 `clip` 연결(`NextScene.tsx`의 `TableauClipCanvas`가 재생).
  - `scripts/extract_nari.py`: 2장 나리 `nari1.mp4`(등장, 24fps 73장) → `scene2/charactor/nari1/`, `nari2.mp4`(반복, 60fps를 30fps로 37장) → `nari2/`. **흰 배경**이라 신호등처럼 바깥과 이어진 흰색만 지웁니다. `nari1`은 흰색에서 서서히 나타나는데 그대로 지우면 연한 얼굴에 구멍이 나서, 장마다 섞인 흰색 비율을 재서 흰색을 빼고 그 비율을 투명도로 씁니다(`fix_fade_in`; 아주 연한 앞 장면들은 조금 뒤 장면 그림을 빌려 씀, `SOLID_FADE`). 배경 흰색은 아주 고른 252~253(차이 5 이하)이고 나리의 피부·원피스는 크림색(약 225, 차이 25 이상)이라, 흰색을 지우는 기준을 좁게 잡았습니다(`CLEAR` 6 ~ `SOLID` 18). 기준이 넓으면(예전 8~40) 머리 꽃 사이로 배경과 닿는 이마가 몇몇 장면에서만 반쯤 지워져 나리가 깜빡였고, 윤곽 틈을 막아 채우는 방식은 머리 꽃 사이 흰 배경까지 남겨서 쓰지 않습니다(스크립트 실행 약 4분). 프레임을 다시 만들면 `CHAPTER2_ASSET_VERSION`을 올립니다. `nari1` 마지막 장면을 `nari.png`에, `nari2` 첫 장면을 `nari1` 마지막 장면에 자동으로 맞춥니다(겹침 99%). 출력된 `x`/`y`/`width`/`height`·장수·시간을 `chapter2PropClips.ts`의 `CHAPTER2_NARI_CLIP`에 넣습니다.
  - `scripts/extract_gelb.py`: 2장 노랑 소품(`scene2/gelb objekt/`). `nabi1.mp4` → `nabi1/`(예전 `g_nabi2.png` 나비), `nabi3.mp4` → `nabi3/`(예전 `g_nabi3.png`), `vogel.mp4` → `vogel/`(예전 `g_vogel.png` 새). 모두 계속 반복합니다. `g_nabi1.png` 나비는 삭제했습니다. **파란 배경**이라 "파란 정도"(B − max(R, G); 배경 약 165~217, 그림은 하늘색 날개 점까지 20~40 이하)로 지우고, 가장자리의 파란 물듦은 빼 줍니다(`SPILL_KEEP`). 각 영상에서 예전 그림과 가장 잘 겹치는 장면으로 위치·크기를 맞춥니다(겹침 98~99%). `nabi3`는 영상 안에서도 날아다녀서 그림 틀이 큽니다. 출력값은 `chapter2PropClips.ts`의 `CHAPTER2_GELB_CLIPS`에 넣습니다. 나비는 영상 속 날갯짓이 있어서, 예전에 코드로 넣던 가짜 날갯짓(세로 늘었다 줄기)은 뺐습니다(`Chapter2FloatingNabis.tsx`). 재생은 공통 부품 `Chapter2ClipCanvas.tsx`가 맡습니다(나리·나비·새 모두). 영상으로 저장되면 채도는 그대로인데 진한 색·검은 선이 살짝 회색빛으로 떠서 탁해 보이므로, 모든 2장 영상에 색 보정 필터를 겁니다(`chapter2PropClips.ts`의 `CHAPTER2_CLIP_COLOR`: `saturate` 1.2, `contrast` 1.08, `brightness`; 영상마다 따로 바꾸려면 그 영상 설정에 `color`). 값만 바꾸고 새로고침하면 되고, 프레임을 다시 뽑을 필요는 없습니다.
  - `scripts/extract_kind.py`: 아이 3개 영상 → `character/kind_sw/`(회색 반복, `kind1_sw.mp4`), `kind_mitte/`(빙글 돌며 변신, 한 번 재생, `kind_mitte2.mp4` — 1440x1440·24fps라 이 영상만 `scale`·`step`을 따로 두고 첫·마지막 그림을 예전 kind_mitte에 맞춤), `kind_g/`(초록 반복, `kind_g.mp4`). 세 영상은 실루엣을 맞춰 같은 좌표("kid box", 509x678)에 배치하고 위치는 `sceneConfig.ts`의 `KIND_CLIPS`. 화면 부품은 `WebGLWorld.tsx`의 `TransformSprite` (클릭 → 변신 재생 → 끝나면 reveal 완료 알림 → 초록 반복). 아이는 회색일 때 언제든 클릭 가능(`KindHitTarget` active = kindPhase "b"). 변신 전에는 초록이가 아이 앞 `KIND_BLOCK_DISTANCE_PX`(150, 1080p 기준) 안으로 못 들어감 (`getGrunKindBarrierX`, `SceneStage.tsx`의 `getGrunLimitX`).
- **용량 주의**: 1장은 첫 화면 전에 그림을 전부 미리 불러옵니다(`src/lib/preloadSceneAssets.ts`). 새 그림·프레임은 PNG 대신 **WebP(quality 90)**로 넣습니다 (PNG 대비 약 1/6). 2026-11-14에 1장 그림을 WebP로 바꿔 약 42MB → 10MB로 줄였습니다.
- **초록이 걷기는 스크롤로**: 아래로 스크롤(휠·트랙패드, 위로 쓸기, ↓ → 스페이스 PageDown)하면 초록이가 앞으로 걷고, 스크롤을 멈추면 곧 멈춥니다. 위로 스크롤하면 남은 걸음을 줄여 빨리 멈춥니다(뒤로 걷지는 않음). 배경 클릭으로는 걷지 않습니다(애벌레·아이·이끼·신호등 클릭은 그대로). 코드는 `SceneStage.tsx`의 `pushWalkForward`, 수치는 `sceneConfig.ts`의 `SCROLL_WALK`(스크롤 1px당 걷는 거리 `gain`, 최대로 앞서 갈 거리 `maxLeadCycles` 등).
- **소리**: 소리 파일은 `public/scene1/sound/`. **웹에는 mp3만 넣습니다** (wav는 10배 이상 커서 로딩이 느림). 원본 wav는 프로젝트 바깥 `../source_sounds/`에 보관하고, ffmpeg(imageio-ffmpeg 것)로 변환합니다: 음악 192kbps, 효과음·새소리 128kbps. 2026-11-21에 wav 약 90MB → mp3 약 8.5MB로 줄임. 모든 소리는 Web Audio 한 개(`src/lib/audioContext.ts`)를 같이 쓰고 마스터 출력(`getAudioOutput`)으로 내보냅니다(새 소리도 `ctx.destination` 대신 이걸로 연결). 브라우저 규칙상 첫 클릭·키·터치(인트로 문지르기 포함, **스크롤은 해당 안 됨**) 뒤에만 납니다(`armAudio`). 사파리 대응: 소리 장치(AudioContext)는 첫 클릭·키·터치 **그 순간**에만 만들고(`unlockAudio`, 미리 만들면 사파리가 안 켜 줌), 그 자리에서 아주 짧은 무음을 한 번 재생해 엽니다. 인트로는 문지를 때 pointerdown을 막아(preventDefault) 사파리에서 click이 안 생기므로 pointerup·mouseup·keyup에서도 엽니다. 사파리 자동 테스트는 사파리 설정 → 개발자 → "원격 자동화 허용"이 켜져 있어야 가능. 1장 왼쪽 아래 스피커 버튼(`SoundToggle.tsx`, `.sound-toggle`): 소리가 막혀 있으면 "소리 켜기"가 깜빡이고 누르면 켜짐, 그 뒤로는 음소거/켜기. **2장 배경음악**: `public/scene2/sound/#2_bgm_4.mp3`를 2장이 넘어가는 종이 아래로 나타날 때부터 서서히 키우며 반복하고, 3장으로 넘길 때 서서히 줄입니다(1장 배경음악과 같은 `BgmLoop`, 수치는 `chapter2Config.ts`의 `SCENE2_BGM`, 켜고 끄는 조건은 `SceneStage.tsx`의 `chapter2MusicOn`). **1장 바람 소리**: `wind.mp3`(4분짜리 `wind.wav` 42MB를 18dB 키워 128kbps mp3 3.8MB로 변환, ffmpeg는 imageio-ffmpeg 것 사용)를 인트로부터(첫 클릭·문지르기 순간) 3초 동안 서서히 키우며 시작해 1장 마지막 장면까지 반복하고, 장이 넘어가면 서서히 줄입니다. 파일 앞뒤가 1초씩 작아지므로 반복할 때 끝 3초를 다음 반복과 겹쳐(크로스페이드) 틈이 없게 합니다(`src/lib/ambientLoop.ts`의 `AmbientLoop`). 수치는 `sceneConfig.ts`의 `SCENE1_AMBIENT`(`volume`, `fadeInMs`, `fadeOutMs`, `crossfadeMs`), 켜고 끄는 조건은 `SceneStage.tsx`의 `windOn`. **초록이 맨발 발소리**: 코드로 만든 소리(`src/lib/footstepSound.ts`: 발뒤꿈치·앞꿈치의 낮은 "툭툭" + 풀이 스치는 "사각" + 풀잎 바스락). 걷기 한 바퀴(35장)에서 발이 닿는 그림(19·34번)에 맞추되, 그대로면 간격이 0.75/1초로 절뚝여서 18·0.5번으로 고르게 맞춤(`GRUN_FOOTSTEPS.stepFrames`). 멈추며 느려질 때는 소리도 작아집니다. 크기·켜고 끄기는 `sceneConfig.ts`의 `GRUN_FOOTSTEPS`(`volume`, `enabled`). 걷기 영상을 바꾸면 `stepFrames`도 다시 맞춰야 합니다.
- **스크롤 표시**: 1장 화면 오른쪽에 얇은 반투명 막대와 작은 갈색 알약 모양 표시(`ScrollProgress.tsx`, `.scroll-progress`). 초록이가 출발점에서 신호등 앞까지 걸어간 만큼 아래로 내려가고, 인트로가 끝나면 나타납니다. 수치는 `sceneConfig.ts`의 `SCROLL_PROGRESS`(막대 높이 `trackHeightVh`, 알약 높이 `thumbHeightPx`, 따라가는 부드러움 `ease`), 밤하늘처럼 어두울 땐 흰색, 하늘이 하얗게 밝아지면 짙은 회색(`darkInk`)으로 바뀝니다(하늘 밝기 `getBackgroundWhiteProgress`를 따름; `mix-blend-mode: difference`는 파란 하늘 위에서 주황색이 돼서 쓰지 않음). 모양은 globals.css.
- **초록이가 멈추는 방식**: 멈출 곳(누른 곳, 애벌레·아이 앞 등)이 가까워지면 마지막 걷기 한 바퀴(맞지 않을 때만 두 바퀴) 동안 점점 느려지다가 `frame_00`(`GRUN_WALK.stopFrames`)에서 섭니다. 서 있을 때도 이 그림입니다. 한 바퀴에 한 번뿐이라 멈추기까지 조금 걸리고, 아주 가까이 누르면 누른 곳을 살짝 지나서 설 수 있습니다(애벌레·아이 앞 막힌 곳은 넘지 않음). 걸음 길이를 조금 늘이거나 줄여 맞추고, 다리 움직임과 위치가 같이 느려져서 발이 미끄러지지 않습니다. 수치는 `sceneConfig.ts`의 `GRUN_STOP`(마지막 속도 `endRate`, 걸음 줄이기·늘이기 한도 `minStretch`/`maxStretch`), 코드는 `SceneStage.tsx`의 `walkToward` / `advanceStop`.
- **밤하늘 배경**: `himmel/hinter_test3.webp` 한 장을 별·berg4 뒤에 깔아요(`WebGLWorld.tsx`의 `HimmelBackdrop`). 반복하면 양 끝이 안 맞아 이음매가 생겨서, **반복하지 않고** 1장 내내 카메라가 보여 주는 너비(화면 너비 + 최대 스크롤 × `parallax`)를 덮을 만큼만 키우고 위아래 가운데 기준으로 조금 잘라요. 그림을 가로로 더 길게(약 3:1, 예: 3240×1080) 그리면 키우지 않아도 돼서 더 선명해요. 수치는 `sceneConfig.ts`의 `HIMMEL_BACKDROP`.
- **초록 마법 배경** (`berg/hinter_grun_magie1.png` 종이 + `hinter_grun_magie.png` 초록 물감): 하늘이 하얗게 밝아지는 만큼 종이와 초록 물감 그림 전체가 배경으로 서서히 나타납니다(`WebGLWorld.tsx`의 `MagieBackdrop`, 산 레이어 뒤, 밤하늘 배경처럼 한 장을 카메라가 보는 너비만큼 키워 깔고 아주 천천히 움직임). 원본 PNG(7000×5000, 25~29MB)는 너무 커서 작게 만든 `hinter_grun_magie1.webp`(종이)와, 두 그림의 차이로 물감만 뽑아 투명 배경으로 만든 `hinter_grun_magie_paint.webp`를 겹쳐 씁니다 — PNG를 바꾸면 둘 다 다시 만들어야 합니다(물감을 잘라 낸 위치는 `paintCrop`). 수치는 `sceneConfig.ts`의 `MAGIE_BACKDROP`(움직임 `parallax`, `opacity`).
- **하늘이 하얗게 밝아지는 시점**: 카메라가 애벌레로 움직이기 시작하기 전에 다 밝아지도록 계산합니다(`getSkyWhiteStartScroll`: 애벌레 카메라 시작 지점 − 밝아지는 길이 `WORM_BACKGROUND_FADE_SPAN_RATIO` − 여유 `WORM_BACKGROUND_DONE_BEFORE_FOCUS_RATIO`). 화면 배경색에는 1.8초 전환 효과(globals.css `.scene-stage`)가 있어 실제 화면이 늦게 밝아지므로, 여유에 그 시간만큼을 포함합니다. 달이 지는 시점·별이 사라지는 시점도 이 값을 따라갑니다.
- **별하늘** (1장 시작의 까만 하늘): `himmel/stern_s1·s3·s4`(WebP로 변환해 사용, 원본 PNG는 그대로 둠)로 가장 먼 산(berg4) 뒤에 별을 뿌립니다. 먼 별·중간 별·가까운 별 3겹이라 멀수록 작고 흐리고 카메라를 덜 따라 움직여(berg4의 parallax 0.07보다 느림) 공간감이 납니다. 별마다 다른 박자로 반짝이고 아주 천천히 돌며, 애벌레 근처에서 하늘이 하얗게 밝아질 때 같이 사라집니다. 매번 같은 배치가 나오도록 정해진 난수(`seed`)를 씁니다. 수치는 `sceneConfig.ts`의 `STAR_SKY`(겹마다 `parallax`·`perScreen` 개수·`sizePx`·`opacity`·높이 범위 `y`), 코드는 `WebGLWorld.tsx`의 `StarSky`.
- **달**: `himmel/mond.webp`(원본 `mond.png`)를 별과 같이 berg4 뒤 밤하늘에 띄웁니다(`WebGLWorld.tsx`의 `MoonSky`). 셰이더로 그림을 매끈한 원으로 자르고, 표면 무늬를 공처럼 감싸고, 왼쪽 위에서 빛을 받는 음영·가장자리 어둡게·주변 달빛 번짐을 넣어 입체감을 줍니다. 앞으로 걸어갈수록(스크롤에 맞춰, 시간 아님) 달이 포물선을 그리며 움직이고(공전: 살짝 떠올랐다가 왼쪽 아래로) 표면이 돌다가(자전) 산 뒤로 집니다. 하늘이 하얗게 밝아지기 전에 다 집니다. 그림은 한쪽 면뿐이라 뒷면은 앞면을 거울처럼 이어 붙입니다(셰이더 변수 이름에 GLSL 예약어 `flat` 등은 쓰면 안 됨). 시작 위치·크기는 `sceneConfig.ts`의 `MOON_SKY`(`sizePx` = 달 지름, 1080p 기준), 경로·회전은 `MOON_ORBIT`(끝 위치 `end`, 포물선 높이 `arcHeight`, 회전 수 `spinTurns`, 지는 시점 `setAt`), 생김새는 `MOON_LOOK`(빛 방향 `light`, 밝기 `shadow`/`lit`, 가장자리 `limbDarkening`, 둥근 정도 `roundness`, 번짐 `glow*`).
- 신호등(ampel)은 공중에 떠서 천천히 흔들리고, 클릭하면 `ampel_mitte` 영상(신호등이 한 바퀴 돌며 빨간불 → 초록불)을 한 번 재생한 뒤 0.38초 동안 `ampel_g`로 부드럽게 넘어갑니다(영상 마지막 그림이 `ampel_g`와 조금 달라서). 이때 마지막 그림은 불투명하게 둔 채 그 위에 `ampel_g`만 서서히 나타나게 합니다. 둘을 동시에 반투명하게 바꾸면 배경이 비쳐 번쩍입니다. 애벌레·아이처럼, 아이를 지나 신호등이 화면에 들어오면 카메라가 신호등을 화면 가운데로 옮기고, 초록이는 신호등 앞(`getGrunAmpelBarrierX`, `AMPEL_BLOCK_DISTANCE_PX` 150)에서 멈춥니다. 아이가 변신을 마치면 초록이가 스스로 신호등 앞까지 걸어갑니다(`handleKindRevealComplete`). 신호등 영상이 끝나 초록불이 되면(`onAmpelSwitchComplete` → `ampelGreen`) 초록이가 스스로 계속 걸어가고, 카메라는 그 자리에 멈춰 초록이가 화면 오른쪽 밖으로 걸어 나갑니다. 몸이 화면 밖으로 30% 나가면 초록이 쪽에서 하얀 빛이 퍼져 화면 전체가 하얗게 되고(`lightInMs` 1.4초, 초록이가 완전히 나가기 전), 하얀 화면 아래에서 1장 화면을 통째로 마지막 장면(tableau)으로 바꾼 뒤 빛이 걷힙니다(`lightOutMs` 1.3초). 1장 그림이 사라지는 것과 다음 장면이 나타나는 것이 겹치지 않게 하려는 것입니다. 단계는 chapter1Phase "exit", 빛은 `.scene1-light`(globals.css), 수치는 `sceneConfig.ts`의 `SCENE1_EXIT`. 부품은 `WebGLWorld.tsx`의 `AmpelSprite`, 클릭 영역은 `AmpelHitTarget`, 수치는 `sceneConfig.ts`의 `AMPEL_FLOAT`(떠다니기) / `AMPEL_MITTE_CLIP`(영상 위치·길이) / `AMPEL_SWITCH`(마지막 넘어가는 시간). 마지막 장면(tableau)의 그림들은 모두 한꺼번에 나타납니다(`scene2Config.ts`의 `SCENE2_ITEMS`에서 `delayMs` 0). 배경과 잔디는 효과 없이 서서히 나타나고(`fade`), 아이들(`appear`)·초록이(`hero`)는 각자의 등장 효과만 있습니다.
- `worme_mitte.mp4`는 뒤집기 전에 애벌레가 잠깐 작아지는데, 스크립트의 `steady_size`가 그 장면들을 원래 크기로 되돌립니다.
- 아이·애벌레는 같은 부품 `TransformSprite`(`WebGLWorld.tsx`)로 그립니다: 회색 반복(sw) → 클릭 → 변신 한 번(mitte) → 초록 반복(g). 영상마다 크로마 배경색 톤이 다를 수 있어 스크립트에서 영상별로 배경색·키 값을 따로 둡니다.
- 스크립트 실행에 필요: `pip install imageio-ffmpeg numpy pillow scipy` (시스템에 ffmpeg 없음, imageio-ffmpeg가 포함)
- 영상을 바꾸면 스크립트 재실행 → 출력된 프레임 수·크기가 바뀌었으면 `sceneConfig.ts`의 해당 설정(`GRUN_WALK`, `SPORE_CLIPS`, `WORM_CLIPS`, `KIND_CLIPS`)도 수정 → `ASSET_VERSION` 올리기.
