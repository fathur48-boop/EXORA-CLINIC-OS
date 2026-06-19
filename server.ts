/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API router: Secure API proxy for Groq completions
  app.post("/api/groq/chat", async (req, res) => {
    try {
      const apiKey = req.headers["x-groq-api-key"] || req.body.groqApiKey;
      const { messages, model = "llama3-8b-8192", temperature = 0.5 } = req.body;

      if (!apiKey) {
        return res.status(400).json({
          error: "Groq API Key tidak ditemukan. Harap masukkan Groq API Key Anda di menu Pengaturan Exora Clinic OS.",
        });
      }

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: "Messages array wajib dikirimkan.",
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
        console.error("Groq API error:", errText);
        return res.status(response.status).json({
          error: `Groq API Error: ${response.statusText}`,
          details: errText,
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Server API processing error:", error);
      return res.status(500).json({
        error: "Terjadi kesalahan internal server saat memproses analisis Groq AI.",
        details: error?.message || "Unknown error",
      });
    }
  });

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Exora Clinic OS Server",
    });
  });

  // Vite integration middleware (Dev vs Production)
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Exora Clinic OS server is live at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Exora Clinic OS server:", err);
});
