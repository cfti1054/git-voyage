# git-voyage

GitHub 커밋잔디를 다년간의 3D 도시로 만들고, 종이비행기로 하늘을 활공하는 웹 앱입니다.

## 주요 기능

- GitHub 계정명과 연도 범위(최대 10년)로 공개 기여 조회
- 연도별 53×7 구역을 연결한 다년간 3D 도시
- 기여 수에 따른 건물 높이, 0기여 날짜는 `park.glb` 공원 모델
- 저장소 주 언어에 따른 저폴리곤 건축 양식
- 도시 규모감을 위한 대형 스케일(건물·격자·공원 모델 확대)
- 건물 충돌: 비행기가 건물을 통과하지 않고 벽면을 따라 이동
- 주변 건물 패널: 가까운 칸의 날짜·기여 수·언어 표시
- **커밋 내용 보기**: 해당 날짜의 공개 커밋 메시지·저장소·GitHub 링크 조회
- 종이비행기 비행, 마우스/터치 자유 시점, 3초 무조작 시 자동 비행
- 계정·기간별 API 응답 1시간 캐시

한 칸은 하루입니다. 각 연도는 53×7 구역이며, 선택한 여러 연도가 도시의 깊이(Z) 방향으로 이어집니다.

3D 월드의 1단위를 약 1m로 보고, 길이 약 1.35m인 종이비행기에 비해
건물 한 동은 폭 약 24m, 높이 15~180m로 표현합니다. 건물 사이에는
약 10m의 도로 공간을 두어 실제 도시 안을 비행하는 크기감을 만듭니다.

## 언어별 건축 양식

| 언어 | 건축 양식 |
|---|---|
| Python | 유럽풍 |
| Java | 조선풍 |
| HTML / CSS | 일본풍 |
| 그 외 | 현대식 |

날짜별 언어는 해당 날짜에 커밋한 공개 저장소의 `primaryLanguage` 중 커밋 수가 가장 많은 값입니다.

## 3D 에셋

Blender로 만든 glTF 모델은 `public/models/buildings/`에 둡니다.

| 파일 | 용도 |
|---|---|
| `park.glb` | 0기여(커밋 없음) 칸 공원 |

추가 건물·공원 모델도 같은 폴더에 넣고 코드에서 연동할 수 있습니다.

## API

| 경로 | 설명 |
|---|---|
| `GET /api/contributions` | 잔디·언어·도시 데이터 (`username`, `fromYear`, `toYear`, `demo=1`) |
| `GET /api/commits` | 특정 날짜 공개 커밋 목록 (`username`, `date`) |

커밋 조회는 화면에서 **커밋 내용 보기**를 눌렀을 때만 호출됩니다. 잔디의 `contributionCount`에는 PR·이슈·리뷰도 포함되므로, 기여가 있는 날이라도 검색 가능한 공개 커밋이 없을 수 있습니다.

## 로컬 실행

Node.js 20 이상.

```bash
npm install
copy .env.example .env.local
npm run dev
```

PowerShell에서 `npm.ps1`이 차단되면 `npm.cmd`를 사용합니다.

[http://localhost:3000](http://localhost:3000)에서 계정명·연도를 입력하거나 데모 도시를 선택합니다.

## GitHub 토큰

실제 계정 조회에는 서버용 [Personal Access Token](https://github.com/settings/tokens)이 필요합니다.

```env
GITHUB_TOKEN=발급한_서버용_토큰
```

`.env.local`에 넣고 개발 서버를 재시작합니다. 토큰은 서버에서만 사용하며 Git에 올리지 않습니다. 공개 서비스에는 비공개 저장소 권한 없는 전용 토큰을 권장합니다.

비공개 기여·비공개 저장소 언어는 공개 조회 결과에 포함되지 않습니다.

## Railway 배포

1. 저장소를 Railway 서비스에 연결
2. Variables에 `GITHUB_TOKEN` 등록
3. 재배포

`.env.local`은 Railway에 올라가지 않으므로 Variables를 사용합니다. `public/models/`의 glb 파일은 Git에 커밋·푸시해야 배포 환경에서도 보입니다.

## 조작

**데스크톱**

- `W` `A` `S` `D` / 방향키: 상승·선회·하강
- `Shift`: 가속
- 마우스 이동: 시점 회전
- `V`: 종이비행기 추적 시점
- 3초 무조작: 자동 비행

**터치**

- 왼쪽 조이스틱: 선회·상승·하강
- 오른쪽 드래그: 시점
- `가속` / `추적` 버튼

3D 화면을 클릭한 뒤 조작합니다. 건물 근처에 가면 오른쪽 **주변 건물** 패널이 열립니다.

수동·자동 비행 모두 도시 경계와 건물 충돌 상자 안에서만 이동합니다.

## 프로덕션 확인

```bash
npm run build
npm run start
```

## 기술 스택

TypeScript, Next.js (App Router), React Three Fiber, Three.js, GitHub GraphQL API, GitHub REST Commits Search API.
