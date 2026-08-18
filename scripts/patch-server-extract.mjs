import fs from "fs";

const p = new URL("../server.js", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const startMarker = "// Helper: Smart OCR Buffer & Financial Text Parsing Engine (Tier 2)";
const endMarker = "// 4. Chat Link Code Generator & Simulator";
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0) {
  console.error("markers not found", { start, end });
  process.exit(1);
}

const replacement = `// Extract / health / rates — shared with Vercel serverless (api/_lib/extractCore.js)
app.post("/api/extract-receipt", async (req, res) => {
  sendResult(res, await handleExtractReceipt(req.body || {}));
});

app.get("/api/exchange-rates", async (req, res) => {
  sendResult(res, await handleExchangeRates(req.query || {}));
});

app.post("/api/extract-batch", async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or empty items array" });
    }
    const results = items.map((item) => ({ fileName: item.fileName, status: "queued" }));
    return res.json({
      success: true,
      count: results.length,
      results,
      notice: "Batch extract is queued for sequential processing."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/extract-voice", async (req, res) => {
  sendResult(res, await handleExtractVoice(req.body || {}));
});

app.post("/api/extract-income-doc", async (req, res) => {
  sendResult(res, await handleExtractIncomeDoc(req.body || {}));
});

app.post("/api/extract-income-voice", async (req, res) => {
  sendResult(res, await handleExtractIncomeVoice(req.body || {}));
});

`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log("ok: replaced", end - start, "chars with", replacement.length);
