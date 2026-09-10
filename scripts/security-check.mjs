// Controlli statici prima del build: segreti nel client, service role nel runtime, pattern pericolosi.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const root = process.cwd(); const problems = [];
function walk(dir, out = []) { for (const n of readdirSync(dir)) { if (["node_modules", ".next", ".git"].includes(n)) continue; const p = path.join(dir, n); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; }
const files = walk(root).filter(f => /\.(ts|tsx|mjs|js|sql|md|json|yml|yaml)$/.test(f) && !f.includes("/scripts/security-check.mjs"));
for (const f of files) {
  const s = readFileSync(f, "utf8"); const rel = path.relative(root, f);
  if (/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/.test(s)) problems.push(`${rel}: sembra contenere un JWT (chiave Supabase?)`);
  if (/sb_secret_|service_role.*=\s*['"][A-Za-z0-9]/.test(s)) problems.push(`${rel}: possibile service role key hardcoded`);
  if (/^(app|src)\//.test(rel) && /SUPABASE_SERVICE_ROLE_KEY/.test(s)) problems.push(`${rel}: la service role non deve comparire nel runtime web`);
  if (/\.tsx$/.test(rel) && /dangerouslySetInnerHTML/.test(s)) problems.push(`${rel}: dangerouslySetInnerHTML`);
  if (/^(app|src)\//.test(rel) && /"use client"/.test(s) && /SOSTENIAMO_FIELD_ENCRYPTION_KEY/.test(s)) problems.push(`${rel}: chiave di cifratura in un componente client`);
}
if (files.some(f => /\.env(\.local|\.production)?$/.test(f))) problems.push("file .env presente nell'albero: verificare che sia in .gitignore");
if (problems.length) { console.error("Security scan: problemi trovati\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`Security scan OK (${files.length} file analizzati)`);
