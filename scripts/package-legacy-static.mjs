/** Zero-regression packaging: copies protected static assets after Vite without touching their source files. */
import { access, cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "dist/public");
const legacyAssets = [
  "tools", "amazon", "amazon-us", "amazon-jp", "academy", "shop", "store", "en", "data", "css", "js",
  "contact.html", "privacy.html", "terms.html", "about.html", "disclaimer.html", "sitemap.xml", "robots.txt", "CNAME",
];

await mkdir(destination, { recursive: true });
for (const asset of legacyAssets) {
  const source = resolve(root, asset);
  try {
    await access(source);
    await cp(source, resolve(destination, asset), { recursive: true, force: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }
}
console.log(`Protected static assets packaged: ${legacyAssets.length} targets`);
