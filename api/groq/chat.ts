export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Groq-Api-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan. Gunakan POST." });
  }

  try {
    const apiKey = req.headers["x-groq-api-key"] || req.body.groqApiKey || process.env.GROQ_API_KEY;
    const { messages, model = "llama-3.3-70b-versatile", temperature = 0.3 } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        error: "Groq API Key tidak ditemukan. Harap masukkan Groq API Key Anda di menu Pengaturan Exora Clinic OS.",
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Array messages wajib dikirimkan untuk analisis.",
      });
    }

    // External request to official Groq Endpoint
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_completion_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error on Vercel:", errText);
      return res.status(response.status).json({
        error: `Groq API Error: ${response.statusText}`,
        details: errText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Vercel Serverless Groq Error:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan internal server saat memproses analisis Groq AI di Vercel.",
      details: error?.message || "Unknown error",
    });
  }
}
