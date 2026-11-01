const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);
const BROLL_DIR = path.join(PUBLIC_DIR, 'assets', 'broll');
try { fs.mkdirSync(BROLL_DIR, { recursive: true }); } catch (e) {}

function stripHtml(s) {
    return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchJson(url, headers) {
    const res = await fetch(url, { headers: headers || { 'User-Agent': 'AINewsStudio/1.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    return res.json();
}

async function getHeadlines() {
    const feeds = [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
    ];
    const items = [];
    for (const rss of feeds) {
        try {
            const d = await fetchJson('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss));
            (d.items || []).slice(0, 8).forEach((it) => {
                const title = stripHtml(it.title);
                if (!title) return;
                const desc = stripHtml(it.description || it.content || '').slice(0, 420);
                items.push({ title, desc, link: it.link || '' });
            });
        } catch (e) {
            console.warn('rss fail', rss, e.message);
        }
    }
    return items;
}

function searchWords(title) {
    const stop = /^(this|that|with|from|after|were|have|been|they|their|about|into|over|than|will|more|what|when|your|said|says)$/i;
    return String(title || '')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.test(w))
        .slice(0, 5)
        .join(' ');
}

async function findCommonsVideo(query) {
    const q = (query || 'world news crowd') + ' filetype:video';
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch='
        + encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|mime|size&formatversion=2';
    const j = await fetchJson(u);
    const pages = (j.query && j.query.pages) || [];
    for (let i = 0; i < pages.length; i++) {
        const ii = (pages[i].imageinfo && pages[i].imageinfo[0]) || {};
        if (!ii.url || !ii.size || ii.size > 28 * 1024 * 1024) continue;
        if (!/webm|mp4/i.test(ii.mime || '')) continue;
        return { url: ii.url, title: pages[i].title, mime: ii.mime, size: ii.size };
    }
    return null;
}

async function downloadVideo(fileUrl, destPath) {
    const res = await fetch(fileUrl, { headers: { 'User-Agent': 'AINewsStudio/1.0' } });
    if (!res.ok) throw new Error('download ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
    return buf.length;
}

async function buildTrendingBroll() {
    const headlines = await getHeadlines();
    const top = headlines[0] || { title: 'World news tonight', desc: 'A round-up of global headlines.' };
    const queries = [
        searchWords(top.title),
        'protest crowd filetype:video',
        'city street news filetype:video',
        'parliament crowd filetype:video'
    ].filter(Boolean);

    let found = null;
    for (let i = 0; i < queries.length; i++) {
        try {
            found = await findCommonsVideo(queries[i].replace(' filetype:video', ''));
            if (found) break;
        } catch (e) {
            console.warn('commons', e.message);
        }
    }
    if (!found) {
        return {
            ok: false,
            error: 'No news video found',
            story: {
                title: top.title,
                script: 'Good evening. ' + top.title + '. ' + (top.desc || '')
            }
        };
    }

    const ext = /mp4/i.test(found.mime) ? '.mp4' : '.webm';
    const fname = 'broll_' + Date.now() + ext;
    const dest = path.join(BROLL_DIR, fname);
    await downloadVideo(found.url, dest);

    const extras = [];
    for (let i = 1; i < Math.min(3, headlines.length); i++) {
        extras.push({
            title: headlines[i].title,
            script: 'Good evening. ' + headlines[i].title + '. ' + (headlines[i].desc || '')
        });
    }

    return {
        ok: true,
        story: {
            title: top.title,
            category: 'Live World Desk',
            script: 'Good evening. ' + top.title + '. ' + (top.desc || 'Details are still coming in from our world desk.')
        },
        video: {
            name: top.title.slice(0, 42),
            src: '/assets/broll/' + fname
        },
        extras: extras
    };
}

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

    if (urlPath === '/api/trending-broll') {
        buildTrendingBroll().then((payload) => {
            send(res, payload.ok ? 200 : 502, JSON.stringify(payload), 'application/json; charset=utf-8');
        }).catch((err) => {
            console.error('trending-broll', err);
            send(res, 500, JSON.stringify({ ok: false, error: String(err.message || err) }), 'application/json; charset=utf-8');
        });
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
            'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css')
                ? 'no-store, no-cache, must-revalidate'
                : 'public, max-age=60'
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
