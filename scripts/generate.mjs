import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_URL = "https://ninesense-store.jp/shop/pages/kami";
const url = (process.argv[2] && !process.argv[2].startsWith("-"))
  ? process.argv[2]
  : DEFAULT_URL;

const outDir = path.join(rootDir, "output");

function normalizeWhitespace(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = normalizeWhitespace(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function pickFirst(list, fallback = "") {
  for (const v of list) {
    const t = normalizeWhitespace(v);
    if (t) return t;
  }
  return fallback;
}

async function fetchHtml(targetUrl) {
  const res = await fetch(targetUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "lp-auto-generator/0.1 (+https://vercel.com)",
      "accept": "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

function extractFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  const title = normalizeWhitespace(
    $('meta[property="og:title"]').attr("content") ||
    $("title").text()
  );
  const description = normalizeWhitespace(
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    ""
  );

  const h1Candidates = [
    $("h1").first().text(),
    $('*[class*="hero"] h1').first().text(),
    $('*[id*="hero"] h1').first().text()
  ];

  const h2All = uniq($("h2").toArray().map((n) => $(n).text()));
  const pAll = uniq(
    $("p")
      .toArray()
      .map((n) => $(n).text())
      .map(normalizeWhitespace)
      .filter((t) => t.length >= 14 && t.length <= 220)
  );

  const liAll = uniq(
    $("li")
      .toArray()
      .map((n) => $(n).text())
      .map(normalizeWhitespace)
      .filter((t) => t.length >= 6 && t.length <= 120)
  );

  const ctaLinks = uniq(
    $("a")
      .toArray()
      .map((a) => ({
        href: $(a).attr("href"),
        text: normalizeWhitespace($(a).text())
      }))
      .filter((a) => a.href && !a.href.startsWith("#"))
      .map((a) => ({
        href: new URL(a.href, sourceUrl).toString(),
        text: a.text || "リンクを開く"
      }))
      // 購入・定期・カートっぽいもの優先
      .sort((a, b) => scoreLink(b) - scoreLink(a))
      .slice(0, 6)
  );

  function scoreLink(a) {
    const s = `${a.text} ${a.href}`.toLowerCase();
    let score = 0;
    if (s.includes("purchase") || s.includes("cart") || s.includes("buy")) score += 3;
    if (s.includes("定期") || s.includes("subscription")) score += 3;
    if (s.includes("product") || s.includes("/products")) score += 2;
    if (s.includes("shop")) score += 1;
    return score;
  }

  const phone = pickFirst([
    $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/, ""),
    (html.match(/\b0\d{1,4}-\d{1,4}-\d{3,4}\b/) || [])[0],
    (html.match(/\b0\d{9,10}\b/) || [])[0]
  ], "");

  const heroTitle = pickFirst(
    [pickFirst(h1Candidates, ""), title],
    "自然と静けさを、日常に。"
  );

  const heroSubtitle = pickFirst(
    [description, h2All[0], pAll[0]],
    "日本の自然。ミニマルで、神聖な余白。"
  );

  const heroBullets = uniq(
    [
      ...liAll.filter((t) => /シリカ|還元|デトックス|自然|国産|無添加|ソマチッド|ミネラル/.test(t)),
      ...h2All.filter((t) => t.length <= 36),
      ...pAll.filter((t) => t.length <= 60)
    ]
  ).slice(0, 6);

  const conceptBody = uniq(
    [
      description,
      ...pAll.slice(0, 6)
    ]
  ).filter(Boolean).slice(0, 4);

  const storyBody = uniq(
    [
      ...pAll.filter((t) => /国産|自然栽培|世界特許|量子|技術|検査|第三者/.test(t)),
      ...pAll.slice(0, 10)
    ]
  ).slice(0, 6);

  const productFeatures = uniq(
    [
      ...liAll,
      ...pAll.filter((t) => /mg|g|含有|相当|使い方|目安|1日|回/.test(t))
    ]
  ).slice(0, 8);

  const primaryCta =
    ctaLinks.find((l) => /purchase|cart|buy|products|定期|shop/i.test(`${l.text} ${l.href}`)) ||
    ctaLinks[0] ||
    { href: sourceUrl, text: "公式ページを見る" };

  return {
    meta: {
      sourceUrl,
      generatedAt: new Date().toISOString()
    },
    brand: {
      tone: ["日本", "自然", "神聖", "ミニマル", "高級感"]
    },
    sections: {
      hero: {
        eyebrow: "量子の静けさ、身体の深部へ。",
        title: heroTitle,
        subtitle: heroSubtitle,
        bullets: heroBullets
      },
      concept: {
        title: "Concept",
        lead: "余白のある設計。必要なものだけを、丁寧に。",
        body: conceptBody
      },
      story: {
        title: "Story",
        lead: "日本の素材と、技術の積み重ね。",
        body: storyBody
      },
      product: {
        title: "Product",
        lead: "毎日を、静かに整える。",
        features: productFeatures,
        notes: uniq([
          "本生成物はWebページから抽出した情報を要約・再構成しています。最新・正確な情報は必ず公式ページをご確認ください。",
          phone ? `お電話でのご注文: ${phone}` : ""
        ]).filter(Boolean)
      },
      cta: {
        title: "CTA",
        lead: "まずは今日から、少量で継続。",
        primary: {
          label: primaryCta.text || "購入はこちら",
          href: primaryCta.href
        },
        secondary: ctaLinks
          .filter((l) => l.href !== primaryCta.href)
          .slice(0, 3)
      }
    }
  };
}

function renderIndexHtml(content) {
  const safe = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const { hero, concept, story, product, cta } = content.sections;
  const pageTitle = safe(`${hero.title} | LP`);
  const desc = safe(hero.subtitle || concept.lead || "");

  const list = (items) =>
    (items || []).map((t) => `<li>${safe(t)}</li>`).join("");

  const paras = (items) =>
    (items || []).map((t) => `<p>${safe(t)}</p>`).join("\n");

  const links = (items) =>
    (items || [])
      .map((l) => `<a class="btn btn--ghost" href="${safe(l.href)}" target="_blank" rel="noreferrer">${safe(l.text)}</a>`)
      .join("\n");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${desc}" />
    <title>${pageTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="grain" aria-hidden="true"></div>
    <header class="topbar">
      <a class="topbar__brand" href="#top" aria-label="Top">LP</a>
      <nav class="topbar__nav" aria-label="Sections">
        <a href="#concept">Concept</a>
        <a href="#story">Story</a>
        <a href="#product">Product</a>
        <a href="#cta">CTA</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="container hero__inner">
          <p class="eyebrow" data-reveal>${safe(hero.eyebrow || "")}</p>
          <h1 class="hero__title" data-reveal>${safe(hero.title)}</h1>
          <p class="hero__subtitle" data-reveal>${safe(hero.subtitle)}</p>
          <ul class="hero__bullets" data-reveal>
            ${list(hero.bullets)}
          </ul>
          <div class="hero__actions" data-reveal>
            <a class="btn" href="#cta">はじめる</a>
            <a class="btn btn--ghost" href="${safe(content.meta.sourceUrl)}" target="_blank" rel="noreferrer">公式ページ</a>
          </div>
          <p class="hero__fineprint" data-reveal>生成元: <a href="${safe(content.meta.sourceUrl)}" target="_blank" rel="noreferrer">${safe(content.meta.sourceUrl)}</a></p>
        </div>
      </section>

      <section id="concept" class="section">
        <div class="container">
          <div class="section__head" data-reveal>
            <h2>${safe(concept.title)}</h2>
            <p class="lead">${safe(concept.lead)}</p>
          </div>
          <div class="prose" data-reveal>
            ${paras(concept.body)}
          </div>
        </div>
      </section>

      <section id="story" class="section section--tint">
        <div class="container">
          <div class="section__head" data-reveal>
            <h2>${safe(story.title)}</h2>
            <p class="lead">${safe(story.lead)}</p>
          </div>
          <div class="prose" data-reveal>
            ${paras(story.body)}
          </div>
        </div>
      </section>

      <section id="product" class="section">
        <div class="container">
          <div class="section__head" data-reveal>
            <h2>${safe(product.title)}</h2>
            <p class="lead">${safe(product.lead)}</p>
          </div>
          <div class="grid">
            <div class="card" data-reveal>
              <h3>Features</h3>
              <ul class="list">
                ${list(product.features)}
              </ul>
            </div>
            <div class="card card--soft" data-reveal>
              <h3>Notes</h3>
              <ul class="list list--muted">
                ${list(product.notes)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" class="section section--deep">
        <div class="container cta">
          <div class="cta__copy" data-reveal>
            <h2>${safe(cta.title)}</h2>
            <p class="lead">${safe(cta.lead)}</p>
            <p class="muted">静かに、確かに。必要なものだけを。</p>
          </div>
          <div class="cta__actions" data-reveal>
            <a class="btn btn--on-dark" href="${safe(cta.primary.href)}" target="_blank" rel="noreferrer">${safe(cta.primary.label)}</a>
            <div class="cta__secondary">
              ${links(cta.secondary)}
            </div>
          </div>
        </div>
        <div class="container footer" data-reveal>
          <p class="muted small">
            This page is auto-generated. Please verify details on the official site.
          </p>
        </div>
      </section>
    </main>

    <script type="module" src="./script.js"></script>
  </body>
</html>`;
}

function renderCss() {
  return `:root{
  --bg:#fbfaf7;
  --paper:#ffffff;
  --ink:#101010;
  --muted:rgba(16,16,16,.62);
  --hair:rgba(16,16,16,.12);
  --tint:#f4f2ed;
  --deep:#0f0f0f;
  --deep2:#151515;
  --onDeep:#f7f5f0;
  --accent:#1a1a1a;
  --radius:18px;
  --shadow: 0 20px 60px rgba(0,0,0,.10);
  --container: 1040px;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  color:var(--ink);
  background:var(--bg);
  font-family:"Noto Sans JP", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  letter-spacing:.01em;
}
a{color:inherit}
.container{max-width:var(--container); margin:0 auto; padding:0 24px}

.grain{
  position:fixed; inset:0;
  pointer-events:none;
  opacity:.10;
  mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
  background-size:240px 240px;
}

.topbar{
  position:sticky; top:0; z-index:20;
  backdrop-filter:saturate(140%) blur(14px);
  background:rgba(251,250,247,.70);
  border-bottom:1px solid var(--hair);
  display:flex; justify-content:space-between; align-items:center;
  padding:14px 24px;
}
.topbar__brand{
  text-decoration:none;
  font-weight:500;
  letter-spacing:.12em;
  text-transform:uppercase;
  font-size:12px;
}
.topbar__nav{display:flex; gap:18px; font-size:12px; color:var(--muted)}
.topbar__nav a{text-decoration:none}
.topbar__nav a:hover{color:var(--ink)}

.hero{
  padding:84px 0 56px;
}
.hero__inner{display:grid; gap:18px}
.eyebrow{
  margin:0;
  font-size:12px;
  letter-spacing:.18em;
  color:var(--muted);
  text-transform:uppercase;
}
.hero__title{
  margin:0;
  font-size: clamp(34px, 4.2vw, 54px);
  line-height:1.06;
  letter-spacing:.02em;
  font-weight:400;
}
.hero__subtitle{
  margin:0;
  max-width:56ch;
  font-size:16px;
  line-height:1.8;
  color:var(--muted);
}
.hero__bullets{
  list-style:none;
  margin:10px 0 0;
  padding:0;
  display:grid;
  gap:10px;
  max-width:72ch;
}
.hero__bullets li{
  padding:12px 14px;
  border:1px solid var(--hair);
  border-radius:14px;
  background:rgba(255,255,255,.62);
}
.hero__actions{display:flex; gap:12px; margin-top:6px; flex-wrap:wrap}
.hero__fineprint{margin:10px 0 0; font-size:12px; color:var(--muted)}
.hero__fineprint a{color:var(--muted)}

.section{padding:72px 0}
.section--tint{background:var(--tint); border-top:1px solid var(--hair); border-bottom:1px solid var(--hair)}
.section--deep{background:linear-gradient(180deg, var(--deep), var(--deep2)); color:var(--onDeep)}

.section__head{display:grid; gap:10px; margin-bottom:22px}
.section__head h2{
  margin:0;
  font-weight:400;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-size:14px;
  color:var(--muted);
}
.section--deep .section__head h2{color:rgba(247,245,240,.72)}
.lead{
  margin:0;
  font-size:22px;
  line-height:1.55;
  letter-spacing:.01em;
}
.prose{
  max-width:72ch;
  color:var(--muted);
  line-height:1.9;
  font-size:15px;
}
.section--deep .prose{color:rgba(247,245,240,.74)}
.prose p{margin:0 0 14px}

.grid{
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
}
@media (min-width:860px){
  .grid{grid-template-columns:1.2fr .8fr; gap:18px}
}

.card{
  background:var(--paper);
  border:1px solid var(--hair);
  border-radius:var(--radius);
  padding:18px;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
}
.card--soft{background:rgba(255,255,255,.7)}
.card h3{
  margin:0 0 12px;
  font-weight:500;
  letter-spacing:.06em;
  text-transform:uppercase;
  font-size:12px;
  color:var(--muted);
}
.list{
  list-style:none;
  margin:0;
  padding:0;
  display:grid;
  gap:10px;
}
.list li{
  padding:12px 14px;
  border-radius:14px;
  border:1px solid var(--hair);
  background:rgba(251,250,247,.55);
}
.list--muted li{color:var(--muted)}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:11px 16px;
  border-radius:999px;
  border:1px solid var(--accent);
  background:var(--accent);
  color:var(--bg);
  text-decoration:none;
  font-size:13px;
  letter-spacing:.06em;
}
.btn:hover{transform:translateY(-1px)}
.btn--ghost{
  background:transparent;
  color:var(--ink);
  border-color:var(--hair);
}
.section--deep .btn--ghost{color:var(--onDeep); border-color:rgba(247,245,240,.22)}
.btn--on-dark{
  background:var(--onDeep);
  color:var(--deep);
  border-color:rgba(247,245,240,.0);
}

.cta{
  display:grid;
  gap:22px;
  padding:72px 0 18px;
}
@media (min-width:860px){
  .cta{grid-template-columns:1.2fr .8fr; align-items:end}
}
.cta__actions{display:grid; gap:12px; justify-items:start}
.cta__secondary{display:flex; gap:10px; flex-wrap:wrap}
.muted{color:rgba(247,245,240,.72)}
.small{font-size:12px; line-height:1.8}
.footer{padding:18px 0 76px}

[data-reveal]{
  opacity:0;
  transform: translateY(10px);
  transition: opacity .7s ease, transform .7s ease;
}
[data-reveal].is-in{
  opacity:1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce){
  *{scroll-behavior:auto !important}
  [data-reveal]{opacity:1; transform:none; transition:none}
  .btn:hover{transform:none}
}`;
}

function renderJs() {
  return `const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReduced) {
  const els = Array.from(document.querySelectorAll("[data-reveal]"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  for (const el of els) io.observe(el);
} else {
  for (const el of document.querySelectorAll("[data-reveal]")) el.classList.add("is-in");
}

// Smooth anchor scrolling (basic, no deps)
for (const a of document.querySelectorAll('a[href^="#"]')) {
  a.addEventListener("click", (ev) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    ev.preventDefault();
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  });
}`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const html = await fetchHtml(url);
  const content = extractFromHtml(html, url);

  await writeFile(path.join(outDir, "content.json"), JSON.stringify(content, null, 2), "utf8");
  await writeFile(path.join(outDir, "index.html"), renderIndexHtml(content), "utf8");
  await writeFile(path.join(outDir, "style.css"), renderCss(), "utf8");
  await writeFile(path.join(outDir, "script.js"), renderJs(), "utf8");

  process.stdout.write(`Generated to ${outDir}\nSource: ${url}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

