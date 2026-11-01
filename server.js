const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);
const BROLL_DIR = path.join(PUBLIC_DIR, 'assets', 'broll');
try { fs.mkdirSync(BROLL_DIR, { recursive: true }); } catch (e) {}

const UA = {
    'User-Agent': 'NEWSStudio/1.0 (https://github.com/Manoj-548/NEWS; educational news desk)',
    'Accept': 'application/json'
};

function stripHtml(s) {
    return String(s || '').replace(/<[^>]*>/g, ' ').replace(/<!\[CDATA\[|\]\]>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchJson(url, headers) {
    const res = await fetch(url, { headers: headers || UA, signal: AbortSignal.timeout(18000) });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    return res.json();
}

async function fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] }, signal: AbortSignal.timeout(18000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
}

function itemsFromRssXml(xml) {
    const items = [];
    const blocks = String(xml || '').split(/<item[\s>]/i).slice(1);
    for (const b of blocks.slice(0, 8)) {
        const title = stripHtml((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
        const desc = stripHtml((b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '');
        if (title) items.push({ title, desc: desc.slice(0, 480), link: '' });
    }
    return items;
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
                const desc = stripHtml(it.description || it.content || '').slice(0, 480);
                items.push({ title, desc, link: it.link || '' });
            });
        } catch (e) {
            console.warn('rss2json fail', e.message);
            try {
                const xml = await fetchText(rss);
                items.push.apply(items, itemsFromRssXml(xml));
            } catch (e2) {
                console.warn('rss xml fail', rss, e2.message);
            }
        }
    }
    return items;
}

function searchWords(title) {
    const stop = /^(this|that|with|from|after|were|have|been|they|their|about|into|over|than|will|more|what|when|your|said|says|good|evening)$/i;
    return String(title || '')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.test(w))
        .slice(0, 5)
        .join(' ');
}

function buildScript(item) {
    const title = stripHtml(item.title || 'World news tonight');
    const desc = stripHtml(item.desc || '').slice(0, 420);
    let script = 'Good evening. Our world desk lead story: ' + title + '.';
    if (desc && desc.toLowerCase() !== title.toLowerCase()) script += ' ' + desc;
    if (!/[.!?]$/.test(script)) script += '.';
    script += ' We stay with this story from the world desk.';
    return script;
}

const LANG_MT = {
    hi: 'hi', ta: 'ta', te: 'te', bn: 'bn', mr: 'mr', gu: 'gu',
    kn: 'kn', ml: 'ml', pa: 'pa', ur: 'ur', es: 'es', fr: 'fr',
    de: 'de', zh: 'zh-CN', ja: 'ja', ar: 'ar', ru: 'ru', ko: 'ko',
    pt: 'pt', it: 'it'
};

async function translateScript(text, langTag) {
    const code = String(langTag || 'en').split('-')[0].toLowerCase();
    if (!code || code === 'en' || !LANG_MT[code]) {
        return { text, lang: langTag || 'en-IN', translated: false };
    }
    const chunks = [];
    let rest = String(text || '');
    while (rest.length) {
        chunks.push(rest.slice(0, 420));
        rest = rest.slice(420);
    }
    const out = [];
    for (const c of chunks) {
        try {
            const u = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(c) + '&langpair=en|' + LANG_MT[code];
            const j = await fetchJson(u);
            const t = j && j.responseData && j.responseData.translatedText;
            if (!t || /^MYMEMORY/i.test(t) || t === c) {
                return { text, lang: 'en-IN', translated: false };
            }
            out.push(t);
        } catch (e) {
            console.warn('translate', e.message);
            return { text, lang: 'en-IN', translated: false };
        }
    }
    return { text: out.join(' '), lang: langTag, translated: true };
}

async function commonsSearch(query) {
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=12&format=json&srsearch='
        + encodeURIComponent((query || 'crowd') + ' filetype:video');
    const j = await fetchJson(u);
    return ((j.query && j.query.search) || []).map((x) => x.title);
}

async function commonsVideoInfo(titles) {
    if (!titles.length) return [];
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=videoinfo&viprop=derivatives|mime|size|url|mediatype&titles='
        + encodeURIComponent(titles.slice(0, 8).join('|'));
    const j = await fetchJson(u);
    return (j.query && j.query.pages) || [];
}

function pickDerivative(page) {
    const vi = (page.videoinfo && page.videoinfo[0]) || {};
    const ders = vi.derivatives || [];
    const prefer = ['360p.vp9.webm', '240p.vp9.webm', '480p.vp9.webm', '360p.webm', '240p.webm'];
    for (let i = 0; i < prefer.length; i++) {
        const d = ders.find((x) => x.transcodekey === prefer[i] && x.src);
        if (d) return { url: d.src, mime: 'video/webm', title: page.title, width: d.width, height: d.height };
    }
    const webm = ders.find((x) => /webm/i.test(x.type || '') && x.src);
    if (webm) return { url: webm.src, mime: 'video/webm', title: page.title };
    if (vi.url && vi.size && vi.size < 12 * 1024 * 1024 && /webm|mp4/i.test(vi.mime || '')) {
        return { url: vi.url, mime: vi.mime, title: page.title };
    }
    return null;
}

async function findCommonsVideo(query) {
    const titles = await commonsSearch(query);
    if (!titles.length) return null;
    const pages = await commonsVideoInfo(titles);
    for (let i = 0; i < pages.length; i++) {
        const hit = pickDerivative(pages[i]);
        if (hit) return hit;
    }
    return null;
}

async function findNasaVideo(query) {
    try {
        const j = await fetchJson('https://images-api.nasa.gov/search?media_type=video&q=' + encodeURIComponent(query || 'earth city'));
        const items = (j.collection && j.collection.items) || [];
        for (let i = 0; i < Math.min(5, items.length); i++) {
            const href = items[i].href;
            if (!href) continue;
            try {
                const col = await fetchJson(String(href).replace('http://', 'https://'));
                const files = Array.isArray(col) ? col : [];
                const mp4 = files.find((u) => /~mobile\.mp4/i.test(u))
                    || files.find((u) => /~medium\.mp4/i.test(u))
                    || files.find((u) => /\.mp4$/i.test(u) && !/orig/i.test(u));
                if (mp4) return { url: String(mp4).replace('http://', 'https://'), mime: 'video/mp4', title: 'NASA broll' };
            } catch (e) {}
        }
    } catch (e) {
        console.warn('nasa', e.message);
    }
    return null;
}

const FALLBACK_CLIPS = [
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a6/What_Happened_on_Twenty_Third_Street_New_York_City_%281901%29_-_yt.webm/What_Happened_on_Twenty_Third_Street_New_York_City_%281901%29_-_yt.webm.240p.vp9.webm',
    'https://images-assets.nasa.gov/video/GSFC_20161116_Climate_m12426_Change/GSFC_20161116_Climate_m12426_Change~mobile.mp4'
];

async function downloadVideo(fileUrl, destPath) {
    const res = await fetch(fileUrl, {
        headers: { 'User-Agent': UA['User-Agent'] },
        signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) throw new Error('download ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) throw new Error('tiny file');
    if (buf.length > 22 * 1024 * 1024) throw new Error('too big');
    fs.writeFileSync(destPath, buf);
    return buf.length;
}

function bundledFallback() {
    const mp4 = path.join(PUBLIC_DIR, 'assets', 'fallback_broll.mp4');
    const webm = path.join(PUBLIC_DIR, 'assets', 'fallback_broll.webm');
    if (fs.existsSync(mp4)) return { name: 'World b-roll', src: '/assets/fallback_broll.mp4' };
    if (fs.existsSync(webm)) return { name: 'World b-roll', src: '/assets/fallback_broll.webm' };
    return null;
}

async function placeVideo(found) {
    if (!found || !found.url) return bundledFallback();
    const ext = /mp4/i.test(found.mime || found.url) ? '.mp4' : '.webm';
    const fname = 'broll_' + Date.now() + ext;
    const dest = path.join(BROLL_DIR, fname);
    try {
        await downloadVideo(found.url, dest);
        return { name: '', src: '/assets/broll/' + fname };
    } catch (e) {
        console.warn('dl', e.message);
        return bundledFallback() || { name: '', src: found.url, remote: true };
    }
}

async function buildTrendingBroll(langTag) {
    const headlines = await getHeadlines();
    const top = headlines[0] || { title: 'World news tonight', desc: 'A round-up of global headlines.' };
    const englishScript = buildScript(top);
    const spoken = await translateScript(englishScript, langTag);

    const queries = [
        searchWords(top.title),
        'protest crowd',
        'city street traffic',
        'news demonstration crowd',
        'parliament building'
    ].filter(Boolean);

    let found = null;
    for (let i = 0; i < queries.length; i++) {
        try {
            found = await findCommonsVideo(queries[i]);
            if (found) break;
        } catch (e) {
            console.warn('commons', e.message);
        }
    }
    if (!found) {
        try { found = await findNasaVideo(searchWords(top.title) || 'earth night city'); } catch (e) {}
    }
    if (!found) {
        found = { url: FALLBACK_CLIPS[0], mime: 'video/webm', title: 'city broll' };
    }

    const video = await placeVideo(found);
    if (video) video.name = String(top.title || 'World news').slice(0, 42);
    if (!video) {
        const fb = await placeVideo({ url: FALLBACK_CLIPS[1], mime: 'video/mp4' });
        if (fb) {
            fb.name = String(top.title || 'World news').slice(0, 42);
            return finish(true, top, spoken, englishScript, headlines, fb);
        }
    }

    return finish(!!video, top, spoken, englishScript, headlines, video);
}

function finish(ok, top, spoken, englishScript, headlines, video) {
    return {
        ok: ok,
        story: {
            title: top.title,
            category: 'Live World Desk',
            script: spoken.text,
            language: spoken.lang,
            translated: !!spoken.translated,
            englishScript: englishScript
        },
        video: video || null,
        extras: headlines.slice(1, 4).map((h) => ({ title: h.title, script: buildScript(h) }))
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

function sendFile(req, res, filePath, contentType, extra) {
    fs.stat(filePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            send(res, 404, '<h1>404 Not Found</h1>', 'text/html; charset=utf-8');
            return;
        }
        extra = Object.assign({
            'Cache-Control': (contentType.indexOf('javascript') >= 0 || contentType.indexOf('text/html') >= 0 || contentType.indexOf('text/css') >= 0)
                ? 'no-store, no-cache, must-revalidate'
                : 'public, max-age=60',
            'Accept-Ranges': 'bytes'
        }, extra || {});
        const range = req.headers.range;
        if (range && /^bytes=/.test(range)) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            let start = m[1] ? parseInt(m[1], 10) : 0;
            let end = m[2] ? parseInt(m[2], 10) : stats.size - 1;
            if (isNaN(start)) start = 0;
            if (isNaN(end) || end >= stats.size) end = stats.size - 1;
            if (start >= stats.size || start > end) {
                res.writeHead(416, Object.assign({
                    'Content-Range': 'bytes */' + stats.size
                }, BASE_HEADERS, extra));
                res.end();
                return;
            }
            const chunk = end - start + 1;
            res.writeHead(206, Object.assign({
                'Content-Type': contentType,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + stats.size,
                'Content-Length': chunk
            }, BASE_HEADERS, extra));
            if ((req.method || 'GET').toUpperCase() === 'HEAD') { res.end(); return; }
            fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
            return;
        }
        res.writeHead(200, Object.assign({
            'Content-Type': contentType,
            'Content-Length': stats.size
        }, BASE_HEADERS, extra));
        if ((req.method || 'GET').toUpperCase() === 'HEAD') { res.end(); return; }
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer((req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    console.log(`${method} ${req.url}`);

    if (method === 'OPTIONS') {
        send(res, 204, '');
        return;
    }

    let parsed;
    try { parsed = new URL(req.url || '/', 'http://127.0.0.1'); } catch (e) {
        send(res, 400, 'bad url');
        return;
    }
    const urlPath = decodeURIComponent(parsed.pathname || '/');

    if (urlPath === '/health') {
        send(res, 200, JSON.stringify({ ok: true, service: 'ai-news-studio' }), 'application/json; charset=utf-8');
        return;
    }

    if (urlPath === '/api/trending-broll') {
        const lang = parsed.searchParams.get('lang') || 'en-IN';
        buildTrendingBroll(lang).then((payload) => {
            send(res, 200, JSON.stringify(payload), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
        }).catch((err) => {
            console.error('trending-broll', err);
            send(res, 200, JSON.stringify({
                ok: false,
                error: String(err.message || err),
                story: {
                    title: 'World news tonight',
                    category: 'Live World Desk',
                    script: 'Good evening. This is the world desk. We are still gathering the latest headlines.',
                    language: 'en-IN'
                },
                video: null
            }), 'application/json; charset=utf-8');
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

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    sendFile(req, res, filePath, contentType);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`AI Male News Broadcaster Studio running at http://localhost:${PORT}`);
    console.log(`Listening on ${HOST}:${PORT}`);
});
