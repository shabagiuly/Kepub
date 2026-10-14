import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Raw body parser for file uploads up to 100MB
  app.use('/api/dropbox/upload', express.raw({ type: '*/*', limit: '100mb' }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Proxy endpoint for verifying Dropbox account
  app.post('/api/dropbox/account', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ error_summary: 'Missing Authorization header' });
      }

      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.text();
      res.status(response.status).header('Content-Type', 'application/json').send(data);
    } catch (err: unknown) {
      console.error('Dropbox account proxy error:', err);
      const message = err instanceof Error ? err.message : 'Dropbox account error';
      res.status(500).json({ error_summary: message });
    }
  });

  // Proxy endpoint for OAuth token exchange and refresh
  app.post('/api/dropbox/token', async (req, res) => {
    try {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(req.body as Record<string, string>).toString(),
      });

      const data = await response.text();
      res.status(response.status).header('Content-Type', 'application/json').send(data);
    } catch (err: unknown) {
      console.error('Dropbox token proxy error:', err);
      const message = err instanceof Error ? err.message : 'Token exchange error';
      res.status(500).json({ error_summary: message });
    }
  });


  // Proxy endpoint for metadata inspection (used to detect existing Kobo folders)
  app.post('/api/dropbox/metadata', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ error_summary: 'Missing Authorization header' });
      }

      const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.text();
      res.status(response.status).header('Content-Type', 'application/json').send(data);
    } catch (err: unknown) {
      console.error('Dropbox metadata proxy error:', err);
      const message = err instanceof Error ? err.message : 'Metadata error';
      res.status(500).json({ error_summary: message });
    }
  });

  // Proxy endpoint for creating folder if it does not exist
  app.post('/api/dropbox/create_folder', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ error_summary: 'Missing Authorization header' });
      }

      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.text();
      res.status(response.status).header('Content-Type', 'application/json').send(data);
    } catch (err: unknown) {
      console.error('Dropbox create_folder proxy error:', err);
      const message = err instanceof Error ? err.message : 'Folder creation error';
      res.status(500).json({ error_summary: message });
    }
  });

  // Proxy endpoint for Dropbox upload (avoids browser CORS restrictions on content.dropboxapi.com)
  app.post('/api/dropbox/upload', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const dropboxArg = req.headers['dropbox-api-arg'] as string;

      if (!authHeader) {
        return res.status(401).json({ error_summary: 'Token d\'accès manquant (Authorization header)' });
      }

      if (!dropboxArg) {
        return res.status(400).json({ error_summary: 'Paramètre de fichier manquant (Dropbox-API-Arg)' });
      }

      // Forward request to Dropbox content API from server (no CORS issues)
      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Dropbox-API-Arg': dropboxArg,
          'Content-Type': 'application/octet-stream',
        },
        body: req.body,
      });

      const data = await response.text();
      if (!response.ok) {
        console.warn(`Dropbox upload returned status ${response.status}:`, data);
      }
      res.status(response.status).header('Content-Type', 'application/json').send(data);
    } catch (err: unknown) {
      console.error('Dropbox upload proxy error:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la communication avec Dropbox';
      res.status(500).json({ error_summary: message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
