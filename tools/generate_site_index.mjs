import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const qwenNote =
  "<p class=\"note\"><strong>Note:</strong> <code>qwen3.6</code> started with <code>qwen3.6-27b</code>, got stuck while starting the server and running Chrome MCP, then switched to <code>qwen3.6-plus</code>.</p>";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function getProjectsFromEnv() {
  const raw = process.env.PROJECTS ?? "";
  return raw
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderCard(projectName) {
  const safeName = escapeHtml(projectName);
  const note = projectName === "qwen3.6" ? qwenNote : "";
  return `
<article class="card">
  <a href="${safeName}/index.html"><img src="site-assets/screenshots/${safeName}.png" alt="${safeName} gameplay screenshot" loading="lazy" /></a>
  <div class="card-body">
    <h2><a href="${safeName}/index.html">${safeName}</a></h2>
    <p class="meta">Live gameplay screenshot.</p>
    ${note}
  </div>
</article>`;
}

function renderPage(projects) {
  const cards = projects.map(renderCard).join("\n");
  const templatePath = resolve("templates/site-index.html");
  const template = readFileSync(templatePath, "utf8");
  return template.replace("{{CARDS}}", cards);
}

const projects = getProjectsFromEnv();
if (projects.length === 0) {
  throw new Error("No projects passed in PROJECTS environment variable.");
}

const outputPath = resolve("site/index.html");
writeFileSync(outputPath, renderPage(projects), "utf8");
