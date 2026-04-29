import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getProjectsFromEnv() {
  const raw = process.env.PROJECTS ?? "";
  return raw
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseDevNotes(projectName) {
  const notesPath = resolve(projectName, "DEV_NOTES.md");
  try {
    const notes = readFileSync(notesPath, "utf8").replace(/\r\n/g, "\n");
    const stackMatch = notes.match(/## Stack[ \t]*\n([\s\S]*?)(?:\n## |\n*$)/);
    const notesMatch = notes.match(/## Notes[ \t]*\n([\s\S]*?)(?:\n## |\n*$)/);
    const stack = stackMatch ? stackMatch[1].trim() : "";
    const summaryPoints = notesMatch
      ? notesMatch[1]
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("* ") || line.startsWith("- "))
          .map((line) => line.slice(2).trim())
          .filter(Boolean)
      : [];
    return { stack, summaryPoints };
  } catch {
    return { stack: "", summaryPoints: [] };
  }
}

function renderCard(projectName) {
  const safeName = escapeHtml(projectName);
  const { stack, summaryPoints } = parseDevNotes(projectName);
  const stackHtml = stack
    ? `<p class="note-stack"><strong>Stack:</strong> ${escapeHtml(stack)}</p>`
    : "";
  const pointsHtml =
    summaryPoints.length > 0
      ? `<ul class="note-list">${summaryPoints
          .map((point) => `<li>${escapeHtml(point)}</li>`)
          .join("")}</ul>`
      : "";
  const noteHtml =
    stackHtml || pointsHtml
      ? `<div class="note"><p class="note-title">From DEV_NOTES.md</p>${stackHtml}${pointsHtml}</div>`
      : "";
  return `
<article class="card">
  <a href="${safeName}/index.html"><img src="site-assets/screenshots/${safeName}.png" alt="${safeName} gameplay screenshot" loading="lazy" /></a>
  <div class="card-body">
    <h2><a href="${safeName}/index.html">${safeName}</a></h2>
    <p class="meta">Live gameplay screenshot.</p>
    ${noteHtml}
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
