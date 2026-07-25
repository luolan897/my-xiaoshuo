import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const demoSource = new URL("../", import.meta.url);
const publicSource = new URL("../../src/public/", import.meta.url);
const output = new URL("../dist/", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(publicSource, output, { recursive: true });
await cp(new URL("data.js", demoSource), new URL("data.js", output));
await cp(new URL("mock-api.js", demoSource), new URL("mock-api.js", output));

const vditorSource = new URL("../node_modules/vditor/dist/", import.meta.url);
await cp(vditorSource, new URL("vendor/vditor/dist/", output), { recursive: true });

const indexPath = new URL("index.html", output);
const index = await readFile(indexPath, "utf8");
const injectedIndex = index.replace(
  /<script type="module" src="\/app\.js\?v=[^"]+"><\/script>/u,
  (appScript) => `<script type="module" src="/mock-api.js"></script>\n    ${appScript}`
);
if (injectedIndex === index) throw new Error("Production app entry script was not found.");
await writeFile(indexPath, injectedIndex);

console.log("Static demo build complete with production UI assets.");
