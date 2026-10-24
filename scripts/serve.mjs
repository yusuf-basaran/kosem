import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json",
};
const security = JSON.parse(await readFile("vercel.json", "utf8")).headers[0]
  .headers;
http
  .createServer(async (req, res) => {
    try {
      let file = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (file === "/") file = "/index.html";
      if (/^\/@[a-z0-9-]+\/?$/.test(file)) file = "/blog.html";
      else if (/^\/@[a-z0-9-]+\/[^/]+\/?$/.test(file)) file = "/yazi.html";
      const full = path.resolve(root, "." + file);
      if (
        !full.startsWith(root + path.sep) ||
        /(^|\/)(node_modules|tests|scripts|\.git|artifacts)(\/|$)/.test(file) ||
        ![".html", ".css", ".js", ".svg", ".jpg", ".png", ".webp"].includes(
          path.extname(full),
        )
      )
        throw Error();
      const data = await readFile(full);
      security.forEach((h) => res.setHeader(h.key, h.value));
      res.writeHead(200, {
        "Content-Type": mime[path.extname(full)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Sayfa bulunamadı.");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Köşem: http://localhost:${port}`),
  );
