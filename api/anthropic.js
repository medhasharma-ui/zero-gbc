export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("ENV KEYS:", Object.keys(process.env).filter(k => k.includes("ANTHROPIC") || k.includes("API")));
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured", envKeys: Object.keys(process.env).slice(0, 20) });
  }

  try {
    const body = req.body;

    // Force streaming — keeps the connection alive, avoids timeout
    body.stream = true;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    // Pipe the SSE stream straight through to the client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await response.body.pipeTo(new WritableStream({
      write(chunk) { res.write(chunk); },
      close() { res.end(); },
    }));
  } catch (error) {
    return res.status(500).json({ error: "Failed to call Anthropic API: " + error.message });
  }
}
