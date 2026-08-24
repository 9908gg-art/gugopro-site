/** Zero-regression verification: confirms protected sources are unmodified and present in production output. */
import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const protectedPaths = ["tools", "contact.html", "privacy.html", "terms.html", "en"];
const outputChecks = ["tools/converter-hub.html", "tools/ai/english-speaking-tutor.html", "contact.html", "privacy.html", "terms.html", "en/index.html"];

try {
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...protectedPaths], { cwd: root, stdio: "ignore" });
} catch {
  throw new Error("Protected legacy source files were modified. Packaging aborted.");
}
for (const file of outputChecks) await access(resolve(root, "dist/public", file));
console.log(`Legacy regression check passed: ${outputChecks.length} deployed paths available`);
