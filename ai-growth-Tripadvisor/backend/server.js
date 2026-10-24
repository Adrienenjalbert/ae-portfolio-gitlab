#!/usr/bin/env node
/* =========================================================
   Persona Lab API
   Zero-dependency Node server (Node 18+). It serves:
   - the static case-study site (the folder above this one), and
   - a JSON API that owns the anchor data and runs the model.

   GET  /api/health      liveness and data version
   GET  /api/anchors     observed cells, market and segment metadata, limits
   POST /api/simulate    scenario in, full dashboard payload out

   Run:  node backend/server.js          (then open http://localhost:8787/persona-simulator.html)
   Env:  PORT (default 8787), HOST (default 127.0.0.1)
   ========================================================= */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const SITE_DIR = path.resolve(__dirname, "..");
const ANCHORS_PATH = path.join(SITE_DIR, "assets", "persona-anchors.json");
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY = 4 * 1024;

const PersonaModel = require(path.join(SITE_DIR, "assets", "persona-model.js"));
const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, "utf8"));
const model = PersonaModel.createModel(anchors);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, dataVersion: anchors.version, time: new Date().toISOString() });
  }

  if (pathname === "/api/anchors" && req.method === "GET") {
    return sendJson(res, 200, anchors);
  }

  if (pathname === "/api/simulate" && req.method === "POST") {
    let input;
    try {
      const raw = await readBody(req);
      input = raw ? JSON.parse(raw) : {};
    } catch (err) {
      return sendJson(res, err.status || 400, { error: err.status === 413 ? "Request body too large." : "Body must be JSON." });
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return sendJson(res, 400, { error: "Body must be a JSON object." });
    }
    const state = PersonaModel.normaliseState(anchors, input);
    return sendJson(res, 200, Object.assign({ state, dataVersion: anchors.version }, model.simulate(state)));
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, req.method === "GET" || req.method === "POST" ? 404 : 405, { error: "Not found." });
  }
  return false;
}

function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch (err) {
    res.writeHead(400); return res.end("Bad request");
  }
  if (rel === "/") rel = "/index.html";
  const segments = rel.split("/").filter(Boolean);
  // Never expose the server itself, its tests, or dotfiles.
  if (segments.some((s) => s.startsWith(".") || s === "backend" || s === "node_modules")) {
    res.writeHead(404); return res.end("Not found");
  }
  const file = path.resolve(SITE_DIR, "." + rel);
  if (!file.startsWith(SITE_DIR + path.sep)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405); return res.end("Method not allowed");
    }
    serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: "Something went wrong." });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log("Persona Lab API on http://" + HOST + ":" + PORT);
    console.log("  page:     http://" + HOST + ":" + PORT + "/persona-simulator.html");
    console.log("  data:     v" + anchors.version + " from " + path.relative(process.cwd(), ANCHORS_PATH));
  });
}

module.exports = { server, anchors };
