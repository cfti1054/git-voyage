# git-voyage

GitHub 커밋잔디를 3D 도시로 만들고, 종이비행기로 하늘을 활공하는 웹 앱입니다.

한 칸이 건물 하나입니다. 기여가 많을수록 빌딩이 높아지고 초록이 진해지며, 0커밋 칸은 공원입니다. 최근 1년 잔디를 53×7 격자로 그립니다.

## 실행

Node.js 20+ 

```bash
npm install
copy .env.example .env.local
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 데모 도시가 열립니다.

실제 GitHub 아이디를 쓰려면 [토큰](https://github.com/settings/tokens)을 만들어 `.env.local`의 `GITHUB_TOKEN`에 넣고 서버를 재실행한 뒤, 화면에서 username을 입력합니다. Fine-grained는 Profile 읽기(`read:user`)면 됩니다. 토큰은 서버에서만 사용합니다.

## 조작

- `W` `A` `S` `D` 또는 방향키: 상승·선회·하강
- `Shift`: 가속
- 3D 화면을 클릭한 뒤 조작합니다

TypeScript, Next.js, React Three Fiber, GitHub GraphQL API.
