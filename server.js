const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const BASE_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Content-Security-Policy': "frame-ancestors *",
    'X-Content-Type-Options': 'nosniff'
};

function send(res, status, content, contentType, extraHeaders) {
    const headers = Object.assign({
        'Content-Type': contentType || 'text/plain; charset=utf-8'
    }, BASE_HEADERS, extraHeaders || {});
    res.writeHead(status, headers);
    res.end(content);
}

const server = http.createServer((req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    console.log(`${method} ${req.url}`);

    if (method === 'OPTIONS') {
        send(res, 204, '');
        return;
    }

    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/health') {
        send(res, 200, JSON.stringify({ ok: true, service: 'ai-news-studio' }), 'application/json; charset=utf-8');
        return;
    }

    const reqUrl = urlPath === '/' ? '/index.html' : urlPath;
    let filePath = path.normalize(path.join(PUBLIC_DIR, reqUrl));
    if (!filePath.startsWith(PUBLIC_DIR)) {
        send(res, 403, '403 Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) && reqUrl.startsWith('/assets/')) {
        const publicAsset = path.normalize(path.join(PUBLIC_DIR, 'public', reqUrl));
        if (publicAsset.startsWith(path.join(PUBLIC_DIR, 'public')) && fs.existsSync(publicAsset)) {
            filePath = publicAsset;
        }
    }

    fs.stat(filePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            send(res, 404, '<h1>404 Not Found</h1>', 'text/html; charset=utf-8');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const extra = {
            'Cache-Control': ext === '.html' ? 'no-store, no-cache, must-revalidate' : 'public, max-age=60'
        };

        if (method === 'HEAD') {
            res.writeHead(200, Object.assign({
                'Content-Type': contentType,
                'Content-Length': stats.size
            }, BASE_HEADERS, extra));
            res.end();
            return;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                send(res, 500, `Server Error: ${err.code}`);
                return;
            }
            send(res, 200, content, contentType, extra);
        });
    });
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`AI Male News Broadcaster Studio running at http://localhost:${PORT}`);
    console.log(`Listening on ${HOST}:${PORT}`);
});
