/**
 * Kivu SPA Router
 *
 * How it works:
 * 1. Every URL maps to an HTML file (for the body/styles) and a JS entry file
 * 2. On navigate: fetch HTML, inject body+styles into #app, import the JS entry
 * 3. history.pushState + popstate handle URL bar and back/forward
 * 4. window.__router.navigate(path) is called by all JS modules instead of location.href
 */

const app     = document.getElementById('app');
const titleEl = document.querySelector('title');

// Map each route to its HTML file and JS entry file
// HTML  = provides the body markup and styles
// entry = the page logic (previously the inline <script type="module">)
const ROUTES = {
    '/':                   { html: '/',                   entry: null },
    '/food':               { html: '/food',               entry: '/js/food/page-feed.js' },
    '/food/restaurant':    { html: '/food/restaurant',    entry: '/js/food/page-restaurant.js' },
    '/food/merchant':      { html: '/food/merchant',      entry: null },
    '/food/admin':         { html: '/food/admin',         entry: '/js/food/page-admin.js' },
    '/saloon':             { html: '/saloon',             entry: '/js/saloon/page-feed.js' },
    '/saloon/detail':      { html: '/saloon/detail',      entry: '/js/saloon/page-detail.js' },
    '/saloon/merchant':    { html: '/saloon/merchant',    entry: null },
    '/saloon/admin':       { html: '/saloon/admin',       entry: null },
    '/wellness':           { html: '/wellness',           entry: '/js/wellness/page-feed.js' },
    '/wellness/detail':    { html: '/wellness/detail',    entry: '/js/wellness/page-detail.js' },
    '/wellness/merchant':  { html: '/wellness/merchant',  entry: null },
    '/wellness/admin':     { html: '/wellness/admin',     entry: null },
    '/funeral':            { html: '/funeral',            entry: '/js/funeral/page-feed.js' },
    '/funeral/detail':     { html: '/funeral/detail',     entry: '/js/funeral/page-detail.js' },
    '/funeral/merchant':   { html: '/funeral/merchant',   entry: null },
    '/funeral/admin':      { html: '/funeral/admin',      entry: null },
    '/academy':            { html: '/academy',            entry: '/js/academy/page-feed.js' },
    '/academy/admin':      { html: '/academy/admin',      entry: '/js/academy/page-admin.js' },
};

// Pages where body content depends on sessionStorage — never cache these
const NO_CACHE = new Set([
    '/food/restaurant', '/saloon/detail', '/wellness/detail', '/funeral/detail'
]);

const _htmlCache = new Map();

async function fetchHTML(path) {
    if (!NO_CACHE.has(path) && _htmlCache.has(path)) return _htmlCache.get(path);
    const res = await fetch(path, { headers: { 'X-SPA': '1' } });
    if (!res.ok) throw new Error(`${res.status} fetching ${path}`);
    const html = await res.text();
    if (!NO_CACHE.has(path)) _htmlCache.set(path, html);
    return html;
}

function parseHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Strip all script tags from body — entry file handles logic separately
    doc.querySelectorAll('script').forEach(s => s.remove());
    return {
        title:  doc.querySelector('title')?.textContent || 'Kivu',
        styles: [...doc.querySelectorAll('style')].map(s => s.outerHTML).join(''),
        body:   doc.body.innerHTML,
    };
}

// Track the currently loaded entry module so we don't double-import
let _currentEntry = null;

async function render(path, pushState = true) {
    const route = ROUTES[path] || ROUTES['/'];

    // Show loading
    app.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
                    height:100%;flex-direction:column;gap:12px">
            <div style="width:32px;height:32px;border:3px solid #e5e7eb;
                        border-top-color:#111827;border-radius:50%;
                        animation:_kspin .7s linear infinite"></div>
            <p style="font-size:11px;color:#9ca3af;font-weight:700">Loading...</p>
            <style>@keyframes _kspin{to{transform:rotate(360deg)}}</style>
        </div>`;

    try {
        const html   = await fetchHTML(route.html);
        const parsed = parseHTML(html);

        // Update title
        if (titleEl) titleEl.textContent = parsed.title;

        // Swap styles
        document.querySelectorAll('style[data-spa]').forEach(s => s.remove());
        if (parsed.styles) {
            const tmp = document.createElement('div');
            tmp.innerHTML = parsed.styles;
            tmp.querySelectorAll('style').forEach(s => {
                s.setAttribute('data-spa', '1');
                document.head.appendChild(s);
            });
        }

        // Inject body
        app.innerHTML = parsed.body;

        // Push state before importing entry so window.location is correct
        // (all absolute imports like '/js/wellness/feed.js' resolve against it)
        if (pushState) history.pushState({ path }, '', path);

        // Import the page entry JS — real URL, no blobs
        if (route.entry && route.entry !== _currentEntry) {
            // Add cache-bust for detail pages so the module re-executes each visit
            const url = NO_CACHE.has(path)
                ? `${route.entry}?t=${Date.now()}`
                : route.entry;
            await import(url);
            if (!NO_CACHE.has(path)) _currentEntry = route.entry;
        } else if (route.entry && NO_CACHE.has(path)) {
            // Detail pages must always re-run even if same entry
            await import(`${route.entry}?t=${Date.now()}`);
        }

        // For pages with plain <script> blocks (merchant/admin map pickers etc)
        // those are self-contained in the HTML — re-inject them
        const rawDoc = new DOMParser().parseFromString(html, 'text/html');
        const plainScripts = [...rawDoc.querySelectorAll('script')]
            .filter(s => !s.src && !s.type && s.textContent.trim());
        for (const ps of plainScripts) {
            const s = document.createElement('script');
            s.textContent = ps.textContent;
            document.body.appendChild(s);
        }

        app.scrollTop = 0;

    } catch (err) {
        console.error('[Router]', err);
        app.innerHTML = `
            <div style="padding:32px;text-align:center">
                <p style="font-size:24px;margin-bottom:12px">⚠️</p>
                <p style="font-weight:700;color:#111827">Could not load page</p>
                <p style="font-size:11px;color:#9ca3af;margin-top:4px">${err.message}</p>
                <button onclick="window.__router.navigate('/')"
                        style="margin-top:16px;background:#111827;color:#fff;border:none;
                               border-radius:12px;padding:10px 24px;font-weight:700;
                               font-size:13px;cursor:pointer">← Home</button>
            </div>`;
    }
}

// Browser back / forward
window.addEventListener('popstate', (e) => {
    render(e.state?.path || '/', false);
});

// Intercept all internal <a href> clicks
document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !ROUTES[href]) return; // not a known SPA route — let browser handle
    e.preventDefault();
    navigate(href);
});

function navigate(path) {
    render(path, true);
}

window.__router = { navigate };

// Boot
const init = location.pathname;
history.replaceState({ path: init }, '', init);
render(init, false);