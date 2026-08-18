/**
 * Tiny adapter: shared extractCore handlers → Vercel Node serverless response.
 */
export function createPostHandler(handlerFn) {
  return async function vercelHandler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
      const result = await handlerFn(req.body || {});
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error("API handler error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  };
}

export function createGetHandler(handlerFn) {
  return async function vercelHandler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
      const result = await handlerFn(req.query || {});
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error("API handler error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  };
}
