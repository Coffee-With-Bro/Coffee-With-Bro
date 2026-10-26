import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "milk_with_bro");
const distDir = path.join(frontendDir, "dist");
const serverDistDir = path.join(distDir, "server");

const ROUTES = 
[
  "/",
  "/about",
  "/team",
  "/resources",
  "/legal",
  "/privacy",
  "/thank-you",
  "/404",
];

async function main()
{
  execSync("npm run build", 
  { 
    cwd: frontendDir, 
    stdio: "inherit" 
  });

  execSync("npx vite build --ssr src/entry-server.tsx --outDir dist/server", 
  {
    cwd: frontendDir,
    stdio: "inherit",
  });

  const templatePath = path.join(distDir, "index.html");
  const template = fs.readFileSync(templatePath, "utf-8");

  const serverEntryPath = path.join(serverDistDir, "entry-server.js");
  const serverEntryUrl = pathToFileURL(serverEntryPath).href;
  const { render } = await import(serverEntryUrl);

  for (const route of ROUTES)
  {
    const is404 = route === "/404";
    const { html, metadata } = render(is404 ? null : route);

    let pageHtml = template;

    if (pageHtml.includes("<!--ssr-outlet-->"))
    {
      pageHtml = pageHtml.replace("<!--ssr-outlet-->", html);
    }
    else if (pageHtml.includes('<div id="root"></div>'))
    {
      pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
    }
    else
    {
      pageHtml = pageHtml.replace(/<div id="root">.*?<\/div>/s, `<div id="root">${html}</div>`);
    }

    pageHtml = pageHtml.replace(
      /<title>.*?<\/title>/,
      `<title>${metadata.title}</title>`,
    );

    pageHtml = pageHtml.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/,
      `<meta name="description" content="${metadata.description}" />`,
    );

    const canonicalUrl = `https://coffeewithbro.local${route === "/" ? "/" : route}`;
    pageHtml = pageHtml.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    );

    pageHtml = pageHtml.replace(
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${metadata.title}" />`,
    );
    pageHtml = pageHtml.replace(
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${metadata.description}" />`,
    );
    pageHtml = pageHtml.replace(
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    );

    pageHtml = pageHtml.replace(
      /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/,
      `<meta property="og:image" content="https://coffeewithbro.local/og-image.webp" />\n    <meta property="og:image:secure_url" content="https://coffeewithbro.local/og-image.webp" />`,
    );

    if (is404)
    {
      pageHtml = pageHtml.replace(
        /<meta\s+name="robots"\s+content=".*?"\s*\/?>/,
        `<meta name="robots" content="noindex, nofollow" />`,
      );
    }

    let outFile;
    if (route === "/")
    {
      outFile = path.join(distDir, "index.html");
    }
    else if (is404)
    {
      outFile = path.join(distDir, "404.html");
    }
    else
    {
      const routeDir = path.join(distDir, route.slice(1));
      fs.mkdirSync(routeDir, 
      { 
        recursive: true 
      });
      outFile = path.join(routeDir, "index.html");
    }

    fs.writeFileSync(outFile, pageHtml, "utf-8");
  }

  const publicDir = path.join(frontendDir, "public");
  const filesToCopy = 
  [
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "llms-full.txt",
    "og-image.webp",
    "og-image.png",
    "favicon.svg",
    "favicon.png",
    "apple-touch-icon.png",
  ];

  for (const file of filesToCopy)
  {
    const src = path.join(publicDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src))
    {
      fs.copyFileSync(src, dest);
    }
  }
}

main().catch((err) => 
{
  process.exit(1);
});
