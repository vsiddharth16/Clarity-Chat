import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { generateChatReply } from './src/server/geminiService.ts';

function chatApiPlugin(): Plugin {
  return {
    name: 'chat-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/chat')) {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Uint8Array);
          }
          const bodyStr = Buffer.concat(chunks).toString('utf-8');
          const data = JSON.parse(bodyStr || '{}');
          const messages = data.messages;
          const responseStyle = data.responseStyle || 'balanced';

          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Please provide at least one message.' }));
            return;
          }

          const reply = await generateChatReply(messages, responseStyle);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ reply }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error generating response';
          console.error('API /api/chat error:', message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), chatApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
