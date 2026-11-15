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
- **장 넘기기** (1→2장, 2→3장): 오른쪽 아래에 종이 모서리가 말려 올라간 표시(`PageTurnCue`, SVG로 그림)가 나타나면 아래로 스크롤(휠·위로 쓸기·↓키, 클릭도 가능)해서 넘깁니다. 지금 장면이 오른쪽 아래 모서리부터 책장처럼 접혀 넘어가고, 빈 종이 여러 장이 촤라라락 이어서 넘어간 뒤 다음 장 표지가 나옵니다. 넘어가는 장면은 `PageFlipLeaf`로 감싸고, 종이·접힌 면은 `PageFlipOverlay`(scene2/)가 그립니다. 속도·종이 장수·모서리 높이 등은 `src/constants/pageTurnConfig.ts`의 `PAGE_TURN`. 접힌 면 그림자에 `filter: drop-shadow`를 쓰면 화면이 멈칫해서, 같은 모양을 살짝 옮긴 반투명 층으로 대신합니다.
- 커밋 메시지는 `grun_MMDD/s3 설명` 형식을 써 왔습니다 (예: `grun_1110/s3 zeigen`). 2026-11부터는 `v2_grunMMDD/...`도 사용.

### 움직이는 에셋 (영상 → 프레임)

- 디자이너가 크로마키(초록/파랑/분홍 배경) mp4를 주면, 스크립트로 배경을 지운 프레임(PNG/WebP)을 만들어 `public/`에 넣고 코드에서 반복 재생합니다.
- **원본 mp4는 git에 넣지 않습니다** (`.gitignore`에 `*.mp4`). 프로젝트 바깥 `../source_videos/` (= `das_grun/source_videos/`)에 보관하고, 스크립트가 거기서 읽습니다 (`GRUN_VIDEO_DIR` 환경 변수로 위치 변경 가능).
  - `scripts/extract_ricori.py`: `ricori_walk.mp4` → 1장 초록이 걷기 (`character/ricori_walk/`)
  - `scripts/extract_pore.py`: `pore.mp4` → 1장 spore 3종 (`landmark/pore/`)
  - `scripts/extract_worm.py`: 애벌레 3개 영상 → `landmark/worm_sw/`(회색 반복, `worme_sw.mp4`), `worm_mitte/`(변신, 한 번 재생, `worme_mitte.mp4`), `worm_g/`(초록 반복, `worme_g.mp4`). 아이와 같은 방식이며 기준 좌표는 "worm box"(604x700), 위치는 `sceneConfig.ts`의 `WORM_CLIPS`. 분홍 볼이 배경색과 비슷해서, 바깥 배경과 이어진 분홍만 투명하게 만듭니다(`outside_only`). 애벌레가 변신하기 전에는 초록이가 바위 앞(`getGrunWormBarrierX`)에서 멈추고, 변신이 끝나야 다시 앞으로 갈 수 있습니다.
  - `scripts/extract_tableau.py`: 1장 마지막 장면(tableau)의 움직이는 캐릭터들. `ricori_v.mp4` → 초록이(`character/ricori_v/`, 예전 `grun_v`), `ai1.mp4` → 만세 하는 아이(`character/ai1/`, 예전 `kinder2`), `ai2.mp4` → 머리카락이 날리는 여자아이(`character/ai2/`, 예전 `kinder3`), `ai3.mp4` → 손을 뻗는 아이 + 강아지(`character/ai3/`, 예전 `kinder1` + `hund`, 강아지가 영상 안에 같이 있어 `hund` 항목은 삭제). 옷의 반짝이처럼 아주 작은 변화도 살리려면 `change_threshold`를 낮춤. 아래쪽으로 넘치면 `pad_bottom` → `bottom`을 `bottomShift`만큼 내림. 손그림이라 같은 그림이 여러 프레임 반복되므로 서로 다른 그림만 저장하고, 각 그림이 보이는 시간은 `scene2Config.ts`의 `RICORI_V_CLIP` / `AI1_CLIP` / `AI2_CLIP` / `AI3_CLIP`의 `holdMs`. 예전 그림과 같은 위치·크기에 맞추고(`scale`/`offset`), 움직임이 넘치는 만큼 좌우(`pad_x`)·위(`pad_top`)만 넓힘 — 위를 넓히면 `SCENE2_ITEMS`의 `height`도 그 비율(`heightScale`)만큼 키움. 배경은 "자홍색 정도"(min(R,B) - G)로 지움: 압축 때문에 검은 선·머리 잎 사이에 섞인 분홍까지 지워지고, 초록이 섞인 볼·피부의 분홍은 남음. 영상마다 배경 분홍의 진하기가 달라 `solid`/`clear` 값을 따로 둠. 새 캐릭터는 `CLIPS`에 한 항목 추가 → `SCENE2_ITEMS`에 `clip` 연결(`NextScene.tsx`의 `TableauClipCanvas`가 재생).
  - `scripts/extract_kind.py`: 아이 3개 영상 → `character/kind_sw/`(회색 반복, `kind1_sw.mp4`), `kind_mitte/`(변신, 한 번 재생, `kind_mitte.mp4`), `kind_g/`(초록 반복, `kind_g.mp4`). 세 영상은 실루엣을 맞춰 같은 좌표("kid box", 509x678)에 배치하고 위치는 `sceneConfig.ts`의 `KIND_CLIPS`. 화면 부품은 `WebGLWorld.tsx`의 `TransformSprite` (클릭 → 변신 재생 → 끝나면 reveal 완료 알림 → 초록 반복). 아이는 회색일 때 언제든 클릭 가능(`KindHitTarget` active = kindPhase "b"). 변신 전에는 초록이가 아이 앞 `KIND_BLOCK_DISTANCE_PX`(150, 1080p 기준) 안으로 못 들어감 (`getGrunKindBarrierX`, `SceneStage.tsx`의 `getGrunLimitX`).
- **용량 주의**: 1장은 첫 화면 전에 그림을 전부 미리 불러옵니다(`src/lib/preloadSceneAssets.ts`). 새 그림·프레임은 PNG 대신 **WebP(quality 90)**로 넣습니다 (PNG 대비 약 1/6). 2026-11-14에 1장 그림을 WebP로 바꿔 약 42MB → 10MB로 줄였습니다.
- 신호등(ampel)은 공중에 떠서 천천히 흔들리고, 클릭하면 빨간불(`ampel_b`) → 초록불(`ampel_g`)로 부드럽게 바뀝니다. 부품은 `WebGLWorld.tsx`의 `AmpelSprite`, 클릭 영역은 `AmpelHitTarget`, 수치(떠다니는 폭·속도, 바뀌는 시간)는 `sceneConfig.ts`의 `AMPEL_FLOAT` / `AMPEL_SWITCH`.
- `worme_mitte.mp4`는 뒤집기 전에 애벌레가 잠깐 작아지는데, 스크립트의 `steady_size`가 그 장면들을 원래 크기로 되돌립니다.
- 아이·애벌레는 같은 부품 `TransformSprite`(`WebGLWorld.tsx`)로 그립니다: 회색 반복(sw) → 클릭 → 변신 한 번(mitte) → 초록 반복(g). 영상마다 크로마 배경색 톤이 다를 수 있어 스크립트에서 영상별로 배경색·키 값을 따로 둡니다.
- 스크립트 실행에 필요: `pip install imageio-ffmpeg numpy pillow scipy` (시스템에 ffmpeg 없음, imageio-ffmpeg가 포함)
- 영상을 바꾸면 스크립트 재실행 → 출력된 프레임 수·크기가 바뀌었으면 `sceneConfig.ts`의 해당 설정(`GRUN_WALK`, `SPORE_CLIPS`, `WORM_CLIPS`, `KIND_CLIPS`)도 수정 → `ASSET_VERSION` 올리기.
