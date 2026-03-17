import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function normalizeWhitespace(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mustUrl(raw) {
  const s = normalizeWhitespace(raw);
  if (!s) throw new Error("URL is required. Example: npm run publish -- https://example.com");
  // eslint-disable-next-line no-new
  new URL(s);
  return s;
}

function runGit(args, { stdio = "inherit" } = {}) {
  return execFileSync("git", args, { cwd: rootDir, stdio });
}

function runNode(args, { stdio = "inherit" } = {}) {
  return execFileSync(process.execPath, args, { cwd: rootDir, stdio });
}

function hasStagedChanges() {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet"], { cwd: rootDir, stdio: "ignore" });
    return false;
  } catch {
    return true;
  }
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const urlArg = args.find((a) => a && !a.startsWith("-"));
  const url = mustUrl(urlArg);

  // Ensure we are inside a git repo
  runGit(["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });

  // Generate output locally for preview/verification (output/ is gitignored)
  runNode([path.join("scripts", "generate.mjs"), url]);

  // Persist URL for Vercel build (tracked)
  const sitePath = path.join(rootDir, "site.json");
  const site = {
    url,
    updatedAt: new Date().toISOString()
  };
  await writeFile(sitePath, JSON.stringify(site, null, 2) + "\n", "utf8");

  // Commit + push
  runGit(["add", "site.json"]);

  if (!hasStagedChanges()) {
    process.stdout.write("Nothing to commit (site.json unchanged).\n");
    return;
  }

  const msg = `Publish: ${url} @ ${nowStamp()}`;
  runGit(["commit", "-m", msg]);
  if (dryRun) {
    runGit(["push", "--dry-run"]);
    process.stdout.write("Dry-run completed. No remote updates were made.\n");
    return;
  }
  runGit(["push"]);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

