import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT ?? 4173);
const root = new URL("../", import.meta.url).pathname;
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
  const filePath = join(root, relativePath);
  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
    const body = await readFile(target);
    response.writeHead(200, { "content-type": contentTypes[extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Demo server running at http://127.0.0.1:${port}`);
});
