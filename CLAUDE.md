# CLAUDE.md

## 하네스: git-voyage 개발

**목표:** GitHub 커밋 잔디를 3D 도시로 만드는 git-voyage의 기능 추가·버그 수정·검증을 설계, 구현, 검증 단계로 나눠 일관되게 처리한다.

**호출 조건:** 기능 요청, 버그 수정, 3D 도시·종이비행기·건물 렌더링 변경, GitHub 데이터 조회·API 라우트·캐시 변경, Blender로 건물·공원 glb 모델 제작 요청이 들어오면 `voyage-dev` 스킬을 사용한다. 다시 실행, 재검증, 보완, 이전 결과 개선 요청에도 같은 스킬을 사용한다. 단순 질문에는 직접 답해도 된다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
| --- | --- | --- | --- |
| 2026-10-19 | Harness v2로 처음 구성 | 전체 | - |
| 2026-10-19 | 프로젝트 상태 점검 후 `asset-dev` 에이전트 추가 (Blender MCP 연동), glb 검증·미사용 파일 표기, `_workspace/` gitignore 추가 | `.claude/agents/asset-dev.md`, `voyage-dev`, `voyage-conventions`, `qa-reviewer`, `.gitignore`, `CLAUDE.md` | Blender 연동 후 glb 제작 담당이 없었고, `Modern_HighRise_3Level_Demo.glb`가 코드에서 쓰이지 않음 |
