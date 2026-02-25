// ─── Cast Proxy — HTTP server that pipes YouTube audio to Chromecast ───

import http from 'http';
import https from 'https';
import os from 'os';

let server = null;
let currentStreamUrl = null;
let proxyPort = 0;

export function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export function startProxy(streamUrl) {
  return new Promise((resolve, reject) => {
    if (server) {
      currentStreamUrl = streamUrl;
      resolve(getProxyUrl());
      return;
    }

    currentStreamUrl = streamUrl;

    server = http.createServer((req, res) => {
      if (req.url !== '/stream' || !currentStreamUrl) {
        res.writeHead(404);
        res.end();
        return;
      }

      const parsed = new URL(currentStreamUrl);
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      // Forward Range header for seeking
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const proxyReq = https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers
        },
        (proxyRes) => {
          const responseHeaders = {
            'Content-Type': proxyRes.headers['content-type'] || 'audio/webm',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*'
          };

          if (proxyRes.headers['content-length']) {
            responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
          }
          if (proxyRes.headers['content-range']) {
            responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
          }

          res.writeHead(proxyRes.statusCode, responseHeaders);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('[castProxy] upstream error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502);
          res.end();
        }
      });

      req.on('close', () => proxyReq.destroy());
    });

    server.listen(0, '0.0.0.0', () => {
      proxyPort = server.address().port;
      console.log(`[castProxy] listening on 0.0.0.0:${proxyPort}`);
      resolve(getProxyUrl());
    });

    server.on('error', (err) => {
      console.error('[castProxy] server error:', err);
      reject(err);
    });
  });
}

export function stopProxy() {
  if (server) {
    server.close();
    server = null;
    proxyPort = 0;
    currentStreamUrl = null;
    console.log('[castProxy] stopped');
  }
}

export function updateStreamUrl(newUrl) {
  currentStreamUrl = newUrl;
}

export function getProxyUrl() {
  if (!server) return null;
  return `http://${getLocalIP()}:${proxyPort}/stream`;
}
