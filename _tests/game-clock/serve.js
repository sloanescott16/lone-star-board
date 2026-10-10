// Static server for the worktree root, for local checks. bun _tests/game-clock/serve.js
const root = require("path").join(__dirname, "../..");
Bun.serve({ port: 8716, fetch(req) { let p = new URL(req.url).pathname; if (p.endsWith("/")) p += "index.html"; return new Response(Bun.file(root + p)); } });
console.log("http://localhost:8716/");
