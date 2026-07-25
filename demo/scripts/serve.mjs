import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";
import { demoAssetVersion, readMainVersion, versionModuleSource, versionedDemoAdapterSource } from "./version.mjs";

const port = Number(process.env.PORT ?? 45678);
const demoRoot = new URL("../", import.meta.url).pathname;
const publicRoot = new URL("../../src/public/", import.meta.url).pathname;
const vditorRoot = new URL("../node_modules/vditor/dist/", import.meta.url).pathname;
const mainVersion = await readMainVersion();
const versionModule = versionModuleSource(mainVersion);
const adapterSource = await readFile(new URL("../mock-api.js", import.meta.url), "utf8");
const adapterVersion = demoAssetVersion(adapterSource, mainVersion);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host}`).pathname);
  const relativePath = pathname === "/" ? "index.html" : normalize(pathname).replace(/^\/+/, "");
  if (relativePath === "demo-version.js") {
    response.writeHead(200, { "cache-control": "no-store", "content-type": "text/javascript; charset=utf-8" });
    response.end(versionModule);
    return;
  }
  const isDemoAsset = relativePath === "data.js" || relativePath === "demo-auth.js" || relativePath === "mock-api.js" || relativePath.startsWith("demo-covers/");
  const isVditorAsset = relativePath.startsWith("vendor/vditor/dist/");
  const root = isDemoAsset ? demoRoot : isVditorAsset ? vditorRoot : publicRoot;
  const rootRelativePath = isVditorAsset ? relativePath.replace(/^vendor\/vditor\/dist\//, "") : relativePath;
  const filePath = resolve(root, rootRelativePath);
  if (!filePath.startsWith(resolve(root))) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? resolve(filePath, "index.html") : filePath;
    let body = await readFile(target);
    if (relativePath === "mock-api.js") {
      body = Buffer.from(versionedDemoAdapterSource(body.toString("utf8"), mainVersion));
    }
    if (relativePath === "index.html") {
      body = Buffer.from(body.toString("utf8").replace(
        /<script type="module" src="\/app\.js\?v=[^"]+"><\/script>/u,
        (appScript) => `<script type="module" src="/mock-api.js?v=${encodeURIComponent(adapterVersion)}"></script>\n    ${appScript}`
      ));
    }
    response.writeHead(200, { "cache-control": "no-store", "content-type": contentTypes[extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Demo server running at http://127.0.0.1:${port}`);
});
