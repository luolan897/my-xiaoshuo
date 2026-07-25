import { cp, mkdir, rm } from "node:fs/promises";

const source = new URL("../", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const assets = ["index.html", "styles.css", "app.js", "data.js", "og.png"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const asset of assets) {
  await cp(new URL(asset, source), new URL(asset, output));
}
console.log("Static demo build complete.");
