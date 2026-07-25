import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";

const port = Number(process.env.PORT ?? 4173);
const demoRoot = new URL("../", import.meta.url).pathname;
const publicRoot = new URL("../../src/public/", import.meta.url).pathname;
const vditorRoot = new URL("../node_modules/vditor/dist/", import.meta.url).pathname;
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
  const isDemoAsset = relativePath === "data.js" || relativePath === "mock-api.js";
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
    if (relativePath === "index.html") {
      body = Buffer.from(body.toString("utf8").replace(
        /<script type="module" src="\/app\.js\?v=[^"]+"><\/script>/u,
        (appScript) => `<script type="module" src="/mock-api.js"></script>\n    ${appScript}`
      ));
    }
    response.writeHead(200, { "content-type": contentTypes[extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Demo server running at http://127.0.0.1:${port}`);
});
