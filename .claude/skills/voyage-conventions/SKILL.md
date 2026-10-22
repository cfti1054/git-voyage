---
name: voyage-conventions
description: git-voyage 프로젝트의 도메인 규칙을 정리한다. 3D 도시 스케일, 언어별 건축 양식 매핑, glb 모델 로딩, API 응답과 캐시 규칙, 커밋 메시지 형식을 다룬다. 이 프로젝트의 코드를 읽거나 고치거나 검증할 때, 또는 건물·공원·API·캐시 관련 판단이 필요할 때 반드시 참조한다.
---

# git-voyage 도메인 규칙

이 스킬은 `scene-dev`, `data-dev`, `qa-reviewer`가 공통으로 따르는 규칙을 모은다. 규칙의 근거는 README와 실제 코드에 있으므로, 충돌하면 코드를 기준으로 판단하고 이 문서를 갱신하도록 보고한다.

## 1. 도시 구조와 스케일

- 한 칸은 하루다. 각 연도는 53열 × 7행 격자다.
- 여러 연도는 깊이(Z) 방향으로 이어진다.
- 3D 월드의 1단위는 약 1m다. 종이비행기는 길이 약 1.35m다.
- 상수는 `src/lib/city.ts`에 있다.

| 상수 | 값 | 의미 |
| --- | --- | --- |
| `CITY_MODEL_SCALE` | 7.5 | glb 모델 확대 배율 |
| `CELL_SIZE` | 34 | 칸 간격. 건물 폭 24 + 도로 약 10 |
| `BUILDING_FOOTPRINT` | 24 | 건물 한 동의 폭 |
| `MIN_HEIGHT` / `MAX_HEIGHT` | 15 / 180 | 건물 높이 범위 |
| `PARK_HEIGHT` | 1 | 0기여 칸(공원)의 높이 |
| `GRID_COLUMNS` / `ROWS_PER_YEAR` | 53 / 7 | 연도별 격자 크기 |

스케일 상수를 바꾸면 건물 간 충돌 상자와 비행 경계도 함께 맞춰야 한다. 변경 후 QA가 이 연결을 확인해야 한다.

## 2. 언어별 건축 양식

날짜별 언어는 그날 커밋한 공개 저장소의 `primaryLanguage` 중 커밋 수가 가장 많은 값이다.

| 언어 | 테마 값 (`BuildingTheme`) | 양식 |
| --- | --- | --- |
| Python | `european` | 유럽풍 |
| Java | `joseon` | 조선풍 |
| HTML / CSS | `japanese` | 일본풍 |
| 그 외, 언어 없음 | `modern` | 현대식 |

매핑 함수는 `themeFromLanguage`다. 새 언어를 추가하면 이 표와 README 표를 함께 고친다.

## 3. 건물 높이와 색

- 유럽·조선·일본풍은 기여 수에서 높이를 계산하고(`heightFromCount`), `MIN_HEIGHT`와 `MAX_HEIGHT` 사이로 제한한다.
- 현대식은 잔디 단계(1~4)에 맞는 glb를 고르고, 높이는 glb 실측값 표 `MODERN_BUILDING_HEIGHTS`(city.ts)를 쓴다. 세트마다 단계 기준에서 ±15 m 다르며(최대 190 m), 단계별 범위가 겹치지 않아야 한다. glb를 바꾸면 이 표도 함께 고친다. 이 값이 비행 충돌 높이다.
- 현대식 세트는 `(열 % 2) * 2 + (전체 행 % 2)`와 단계별 순열 `LEVEL_SET_ORDER`로 고른다. 주변 8칸에 같은 glb가 놓이지 않는 것을 보장하므로 해시나 랜덤으로 바꾸지 않는다. 칸마다 90° 단위 회전을 준다.
- 기여가 0인 날은 건물이 아니라 공원 모델(`park.glb`, `park2.glb` 중 해시로 선택)로 표현한다.

## 4. glb 모델

| 파일 | 용도 |
| --- | --- |
| `public/models/buildings/park.glb`, `park2.glb` | 0기여 칸 공원 (라운드 소프트 로우폴리) |
| `public/models/buildings/modern_building_{세트}_{단계}Level_Demo.glb` | 현대식 건물 4세트 × 잔디 단계 1~4 (16개). 원본 단위로 ×7.5 균일 스케일, 원점 바닥 중앙 |
| `public/models/buildings/Modern_HighRise_4Level_Demo.glb`, `Modern_HighRise_3Level_Demo.glb` | 현재 코드에서 로드하지 않는 미사용 파일. 쓰기 전까지 참조하지 않는다 |

- 로드 경로는 `src/lib/city.ts`의 `modernBuildingUrl`, `parkUrl`이다. 경로를 바꾸면 이 표도 함께 고친다.
- glb는 `asset-dev`가 Blender MCP로 만든다. 새 파일은 기존 파일을 덮어쓰지 않도록 새 이름으로 둔다.
- 모델은 `public/models/`에 둬야 배포 환경에서 보인다. 커밋과 푸시가 필요하다.
- 로딩에 실패하면 기본 박스로 대체한다. 앱 전체가 멈추지 않아야 한다.
- 매 프레임에서 지오메트리나 머티리얼을 새로 만들지 않는다.

## 5. 비행과 충돌

- 종이비행기는 `PaperPlane.tsx`에서 조작한다. 조작은 데스크톱(W A S D, 방향키, Shift, 마우스)과 터치(조이스틱, 드래그, 가속·추적 버튼)를 모두 지원해야 한다.
- 3초 무조작이면 자동 비행이 시작된다.
- 수동·자동 비행 모두 도시 경계와 건물 충돌 상자 안에서만 움직인다.
- 충돌 장애물은 `FlightObstacleMap`에 `flightObstacleKey(column, row)` 키로 등록한다.

## 6. API 규칙

| 경로 | 파라미터 | 캐시 키 |
| --- | --- | --- |
| `GET /api/contributions` | `username`, `fromYear`, `toYear`, `demo=1` | `username:fromYear:toYear` (소문자) |
| `GET /api/commits` | `username`, `date` | `username:date` (소문자) |

- 두 라우트 모두 `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`을 보낸다.
- 서버 메모리 캐시의 유효 기간은 1시간이다.
- 커밋 조회는 사용자가 **커밋 내용 보기**를 눌렀을 때만 호출한다.
- 잔디 `contributionCount`에는 PR·이슈·리뷰가 포함되므로, 기여가 있어도 검색 가능한 공개 커밋이 없을 수 있다. 빈 결과는 오류가 아니다.
- 연도 범위는 최대 10년이다.
- `GITHUB_TOKEN`은 서버 전용 환경 변수다. `.env.local`에 두고 Git에 올리지 않는다.

## 7. 커밋 메시지 형식

최근 커밋을 따른다.

```
feat: YYYY-MM-DD / 한국어 설명
```

예: `feat: 2026-09-22 / 현대식 건물 Modern_HighRise 4단 glb 데모 적용`

## 8. 검증 명령

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run dev   # 데모 확인: http://localhost:3000, demo=1 파라미터 사용
```

PowerShell에서 `npm.ps1`이 차단되면 `npm.cmd`를 쓴다.
