// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use("/api/dropbox/upload", express.raw({ type: "*/*", limit: "100mb" }));
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/dropbox/account", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ error_summary: "Missing Authorization header" });
      }
      const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        }
      });
      const data = await response.text();
      res.status(response.status).header("Content-Type", "application/json").send(data);
    } catch (err) {
      console.error("Dropbox account proxy error:", err);
      const message = err instanceof Error ? err.message : "Proxy connection error";
      res.status(500).json({ error_summary: message });
    }
  });
  app.post("/api/dropbox/metadata", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ error_summary: "Missing Authorization header" });
      }
      const response = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.text();
      res.status(response.status).header("Content-Type", "application/json").send(data);
    } catch (err) {
      console.error("Dropbox metadata proxy error:", err);
      const message = err instanceof Error ? err.message : "Metadata error";
      res.status(500).json({ error_summary: message });
    }
  });
  app.post("/api/dropbox/create_folder", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ error_summary: "Missing Authorization header" });
      }
      const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.text();
      res.status(response.status).header("Content-Type", "application/json").send(data);
    } catch (err) {
      console.error("Dropbox create_folder proxy error:", err);
      const message = err instanceof Error ? err.message : "Folder creation error";
      res.status(500).json({ error_summary: message });
    }
  });
  app.post("/api/dropbox/upload", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const dropboxArg = req.headers["dropbox-api-arg"];
      if (!authHeader) {
        return res.status(401).json({ error_summary: "Token d'acc\xE8s manquant (Authorization header)" });
      }
      if (!dropboxArg) {
        return res.status(400).json({ error_summary: "Param\xE8tre de fichier manquant (Dropbox-API-Arg)" });
      }
      const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Dropbox-API-Arg": dropboxArg,
          "Content-Type": "application/octet-stream"
        },
        body: req.body
      });
      const data = await response.text();
      if (!response.ok) {
        console.warn(`Dropbox upload returned status ${response.status}:`, data);
      }
      res.status(response.status).header("Content-Type", "application/json").send(data);
    } catch (err) {
      console.error("Dropbox upload proxy error:", err);
      const message = err instanceof Error ? err.message : "Erreur lors de la communication avec Dropbox";
      res.status(500).json({ error_summary: message });
    }
  });
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
