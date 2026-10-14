// Order Gamma - Phase 1: AI document/photo requirement checker + text extractor.
// Runs fully locally via Ollama. Zero dependencies.  ollama pull qwen2.5vl:7b  then  node server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GAMMA_MODEL || "qwen2.5vl:7b";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MAX_BODY = 40 * 1024 * 1024;

// Optional .env file support (KEY=value lines)
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Returns { images: [base64], text: string } for the file.
function buildInput(file) {
  const { mediaType = "", data, name } = file;
  if (Array.isArray(file.images) && file.images.length) return { images: file.images, text: "" }; // PDF pages rendered by the browser
  if (IMAGE_TYPES.includes(mediaType)) return { images: [data], text: "" };
  if (mediaType.startsWith("text/") || /\.(txt|csv|md|json|xml)$/i.test(name || ""))
    return { images: [], text: `File "${name}":\n\n${Buffer.from(data, "base64").toString("utf8")}` };
  if (mediaType === "application/pdf")
    throw new Error("PDF is not supported with Ollama yet. Export the pages as images (PNG/JPG) and upload those.");
  throw new Error(`Unsupported file type: ${mediaType || "unknown"}. Use an image or a text file.`);
}

const SCHEMA = {
  type: "object",
  properties: {
    full_text: { type: "string" },
    document_type: { type: "string" },
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          found: { type: "boolean" },
          extracted_value: { type: "string" },
          confidence: { type: "number" },
          note: { type: "string" },
        },
        required: ["id", "found", "extracted_value", "confidence", "note"],
      },
    },
    summary: { type: "string" },
  },
  required: ["full_text", "document_type", "results", "summary"],
};

// ---- Optional Claude backend: used automatically when ANTHROPIC_API_KEY is set (supports PDFs too).
const USE_CLAUDE = !!process.env.ANTHROPIC_API_KEY && process.env.GAMMA_BACKEND !== "ollama";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

async function analyzeClaude({ file, rules }) {
  const { mediaType = "", data, name } = file;
  let block;
  if (IMAGE_TYPES.includes(mediaType)) block = { type: "image", source: { type: "base64", media_type: mediaType, data } };
  else if (mediaType === "application/pdf") block = { type: "document", source: { type: "base64", media_type: mediaType, data } };
  else if (mediaType.startsWith("text/") || /\.(txt|csv|md|json|xml)$/i.test(name || ""))
    block = { type: "text", text: `File "${name}":\n\n${Buffer.from(data, "base64").toString("utf8")}` };
  else throw new Error(`Unsupported file type: ${mediaType || "unknown"}.`);

  const ruleList = rules
    .map((r, i) => `${i + 1}. id="${r.id}" | name: ${r.name}${r.description ? ` | details: ${r.description}` : ""}`)
    .join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      tools: [{ name: "report", description: "Report requirement check results and extracted text.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "report" },
      messages: [{ role: "user", content: [block, { type: "text", text:
        "Inspect the attached file/photo. For EACH requirement, decide whether it contains it and extract the exact data as text. " +
        "Never invent data: if not clearly present, set found=false and extracted_value to an empty string. " +
        "Put all readable text in full_text. Use each id exactly as given. confidence is 0 to 1.\n\nRequirements:\n" + ruleList }] }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `Claude API error ${res.status}`);
  const out = json.content.find((b) => b.type === "tool_use")?.input;
  if (!out) throw new Error("Model returned no result.");
  out.results = Array.isArray(out.results) ? out.results : [];
  const passed = rules.every((r) => (out.results.find((o) => o.id === r.id) || {}).found);
  return { ...out, all_found: passed, passed };
}

// Plain http request: unlike fetch(), it has no 5-minute headers timeout, which local models on CPU can exceed.
function ollamaChat(payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(`${OLLAMA_URL}/api/chat`);
    const body = JSON.stringify(payload);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname, method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } },
      (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => {
          try { resolve({ status: r.statusCode, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); }
          catch { reject(new Error("Ollama returned an unreadable response.")); }
        });
      }
    );
    req.on("error", (e) => reject(new Error(`Cannot reach Ollama at ${OLLAMA_URL} (${e.code || e.message}). Is it running?`)));
    req.setTimeout(0);
    req.end(body);
  });
}

async function analyze({ file, rules }) {
  if (!file || !(file.data || (file.images && file.images.length))) throw new Error("No file provided.");
  if (!Array.isArray(rules) || !rules.length) throw new Error("Add at least one requirement in Setup Rules.");
  if (USE_CLAUDE) return analyzeClaude({ file, rules });
  const input = buildInput(file);

  const ruleList = rules
    .map((r, i) => `${i + 1}. id="${r.id}" | name: ${r.name}${r.description ? ` | details: ${r.description}` : ""}`)
    .join("\n");

  const prompt =
    "Inspect the attached file/photo. For EACH requirement below, decide whether it contains it and extract the exact data as text. " +
    "Never invent data: if a requirement is not clearly present, set found=false and extracted_value to an empty string. " +
    "Put all readable text in full_text. Use each requirement id exactly as given. confidence is 0 to 1.\n\nRequirements:\n" +
    ruleList + (input.text ? "\n\n" + input.text : "");

  const { status, json } = await ollamaChat({
    model: MODEL,
    stream: false,
    format: SCHEMA,
    options: { temperature: 0 },
    messages: [{ role: "user", content: prompt, ...(input.images.length ? { images: input.images } : {}) }],
  });
  if (status !== 200) throw new Error(json.error || `Ollama error ${status}`);
  let out;
  try { out = JSON.parse(json.message.content); } catch { throw new Error("Model returned invalid JSON. Try again or use a larger model."); }
  out.results = Array.isArray(out.results) ? out.results : [];
  const passed = rules.every((r) => (out.results.find((o) => o.id === r.id) || {}).found);
  return { ...out, all_found: passed, passed };
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

http
  .createServer(async (req, res) => {
    try {
      if (req.url === "/api/info") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ backend: USE_CLAUDE ? "claude" : "ollama" }));
      }
      if (req.method === "POST" && req.url === "/api/analyze") {
        let size = 0;
        const chunks = [];
        for await (const c of req) {
          size += c.length;
          if (size > MAX_BODY) throw new Error("File too large (max ~30MB).");
          chunks.push(c);
        }
        const result = await analyze(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(result));
      }
      const file = req.url === "/" ? "index.html" : path.basename(req.url.split("?")[0]);
      const full = path.join(__dirname, "public", file);
      if (!fs.existsSync(full)) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream" });
      fs.createReadStream(full).pipe(res);
    } catch (e) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  })
  .listen(PORT, () => console.log(`Order Gamma running at http://localhost:${PORT}  (${USE_CLAUDE ? "backend: Claude " + CLAUDE_MODEL : "backend: Ollama " + MODEL})`));
