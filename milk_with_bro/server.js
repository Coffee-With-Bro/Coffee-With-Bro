import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Normalize path
  if (pathname.endsWith("/") && pathname !== "/") {
    pathname = pathname.slice(0, -1);
  }

  let filePath = path.join(distDir, pathname);

  // Check if directory -> try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // If file doesn't exist, check if a directory with index.html exists (e.g. /about -> dist/about/index.html)
  if (!fs.existsSync(filePath)) {
    const routeHtml = path.join(distDir, pathname.replace(/^\//, ""), "index.html");
    if (fs.existsSync(routeHtml)) {
      filePath = routeHtml;
    }
  }

  // If still not found, serve pre-rendered 404.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, "404.html");
    res.statusCode = 404;
  } else {
    res.statusCode = 200;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);

  // Cache headers for static assets
  if (pathname.startsWith("/assets/") || ext === ".png" || ext === ".webp" || ext === ".svg") {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n===============================================================`);
  console.log(`  ☕  Coffee With Bro — Production SSR / Static Server`);
  console.log(`  ➜  Server live at: \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
  console.log(`===============================================================\n`);
});
