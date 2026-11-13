// Builds the vertical (1080x1920) HyperFrames project from the landscape master and renders the ads.
//   node build.mjs            -> regenerate hf-vertical/index.html only
//   node build.mjs render     -> also render ad-en.mp4, ad-lv.mp4, ad-en-vertical.mp4, ad-lv-vertical.mp4 + posters
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "hf", "index.html"), "utf8");
const v = src
  .replace('<html lang="en"', '<html lang="en" class="v"')
  .replace('content="width=1920, height=1080"', 'content="width=1080, height=1920"')
  .replace('data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"');
if (v === src) throw new Error("vertical transform did not apply");
mkdirSync(join(here, "hf-vertical"), { recursive: true });
writeFileSync(join(here, "hf-vertical", "index.html"), v);
for (const f of ["hyperframes.json", "package.json"]) copyFileSync(join(here, "hf", f), join(here, "hf-vertical", f));
writeFileSync(join(here, "hf-vertical", "meta.json"), JSON.stringify({ id: "ai-recap-ad-vertical", name: "AI Recap ad (vertical)" }, null, 2));
console.log("hf-vertical/index.html written");

if (process.argv[2] === "render") {
  const run = (args, cwd) => execFileSync("npx", ["--yes", "hyperframes@0.9.34", ...args], { cwd, stdio: "inherit", shell: true });
  for (const [dir, suffix] of [["hf", ""], ["hf-vertical", "-vertical"]]) {
    for (const lang of ["en", "lv"]) {
      const vars = join(here, `vars-${lang}.json`);
      writeFileSync(vars, JSON.stringify({ lang }));
      run(["render", "-o", `"${join(here, `ad-${lang}${suffix}.mp4`)}"`, "--variables-file", `"${vars}"`, "--quiet"], join(here, dir));
    }
  }
}
