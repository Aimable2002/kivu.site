/**
 * Kivu News — news.js
 * - Fetches from /api/news (Express proxy → NewsData.io)
 * - No window.location.href — article detail shown/hidden inline
 * - No Supabase — NewsData.io is the only data source
 * - AI Summary via Grok API (xAI)
 * - Listen via browser Web Speech API
 */

let _currentCategory = 'top';
let _nextPage        = null;
let _currentArticle  = null;
let _speaking        = false;

// Article cache keyed by article_id — populated on every fetch
const _cache = new Map();

// ── HELPERS ───────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

const CAT_COLOR = {
    business:   'text-blue-600',
    technology: 'text-purple-600',
    sports:     'text-green-600',
    top:        'text-red-600',
    rwanda:     'text-yellow-600',
};

const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const safeId   = id => String(id).replace(/['"\\<>]/g, '');

// ── FETCH ─────────────────────────────────────────────────────────
async function fetchNews(category, page = null) {
    let url = `/api/news?category=${category}`;
    if (page) url += `&page=${encodeURIComponent(page)}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch news');
    (data.articles || []).forEach(a => _cache.set(a.article_id, a));
    return data;
}

// ── LOAD CATEGORY (called by tab buttons) ─────────────────────────
export async function loadCategory(category) {
    _currentCategory = category;
    _nextPage        = null;

    document.querySelectorAll('.news-tab-btn').forEach(btn => {
        const on = btn.dataset.cat === category;
        btn.className = on
            ? 'news-tab-btn text-white border-b-2 border-white pb-1 shrink-0 transition text-sm font-bold'
            : 'news-tab-btn text-blue-300 hover:text-white shrink-0 transition text-sm font-bold';
    });

    const feed = document.getElementById('news-feed');
    feed.innerHTML = [1,2,3].map(() => `
    <div class="bg-white rounded-xl p-3 flex gap-3 animate-pulse">
        <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            <div class="h-3 bg-gray-100 rounded w-2/3"></div>
        </div>
        <div class="w-24 h-20 bg-gray-200 rounded-lg shrink-0"></div>
    </div>`).join('');

    try {
        const { articles, nextPage } = await fetchNews(category);
        _nextPage = nextPage;
        renderCards(articles, false);
    } catch (err) {
        feed.innerHTML = `
        <div class="text-center py-10">
            <p class="text-gray-400 text-sm">Could not load news.</p>
            <p class="text-gray-300 text-xs mt-1">Check your connection and try again.</p>
        </div>`;
        console.error('[News]', err);
    }
}

// ── RENDER ────────────────────────────────────────────────────────
function renderCards(articles, append) {
    const feed    = document.getElementById('news-feed');
    const moreBtn = document.getElementById('news-load-more');

    if (!articles.length && !append) {
        feed.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No articles found.</p>`;
        moreBtn?.classList.add('hidden');
        return;
    }

    const html = articles.map((a, i) => i === 0 && !append ? heroCard(a) : compactCard(a)).join('');
    if (append) feed.insertAdjacentHTML('beforeend', html);
    else        feed.innerHTML = html;

    moreBtn?.classList.toggle('hidden', !_nextPage);
}

function heroCard(a) {
    const id = safeId(a.article_id);
    return `
    <div onclick="window._openArticle('${id}')"
         class="bg-white rounded-xl shadow-sm border-l-4 border-red-600 overflow-hidden cursor-pointer active:bg-gray-50 transition">
        <div class="h-48 w-full bg-gray-200 relative news-img">
            ${a.image_url ? `<img src="${a.image_url}" loading="lazy" class="w-full h-full object-cover" onerror="this.parentElement.style.display='none'">` : ''}
            <div class="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded shadow uppercase animate-pulse">Breaking</div>
        </div>
        <div class="p-4">
            <h3 class="font-bold text-gray-900 text-lg leading-tight mb-2">${a.title || ''}</h3>
            <p class="text-xs text-gray-500 line-clamp-2 mb-3">${a.description || ''}</p>
            <div class="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                <span>${a.source_name || ''} • ${timeAgo(a.pubDate)}</span>
                <i class="fas fa-bookmark text-gray-300 text-sm"></i>
            </div>
        </div>
    </div>`;
}

function compactCard(a) {
    const id    = safeId(a.article_id);
    const color = CAT_COLOR[a.category] || 'text-blue-600';
    return `
    <div onclick="window._openArticle('${id}')"
         class="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex gap-3 cursor-pointer active:bg-gray-50 transition">
        <div class="flex-1 flex flex-col justify-between min-w-0">
            <div>
                <span class="text-[9px] font-bold ${color} uppercase">${capFirst(a.category || '')}</span>
                <h4 class="font-bold text-gray-900 text-sm leading-snug mt-1 mb-1 line-clamp-2">${a.title || ''}</h4>
            </div>
            <div class="text-[10px] text-gray-400 font-bold truncate">${a.source_name || ''} • ${timeAgo(a.pubDate)}</div>
        </div>
        ${a.image_url ? `
        <div class="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden shrink-0 news-img">
            <img src="${a.image_url}" loading="lazy" class="w-full h-full object-cover" onerror="this.parentElement.classList.add('hidden')">
        </div>` : ''}
    </div>`;
}

// ── OPEN / CLOSE ARTICLE ──────────────────────────────────────────
export function openArticle(articleId) {
    const a = _cache.get(articleId);
    if (!a) return;
    _currentArticle = a;

    const imgWrap = document.getElementById('article-modal-img-wrap');
    const img     = document.getElementById('article-modal-img');
    if (a.image_url) { imgWrap.classList.remove('hidden'); img.src = a.image_url; }
    else               imgWrap.classList.add('hidden');

    document.getElementById('article-modal-category').textContent = capFirst(a.category || '');
    document.getElementById('article-modal-time').textContent     = timeAgo(a.pubDate);
    document.getElementById('article-modal-title').textContent    = a.title || '';

    const body = a.content || a.description || 'Full article not available.';
    document.getElementById('article-modal-body').innerHTML =
        body.split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('');

    const summaryEl = document.getElementById('article-ai-summary');
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';

    document.getElementById('article-listen-btn').innerHTML = '<i class="fas fa-volume-up"></i> Listen';
    _speaking = false;
    window.speechSynthesis?.cancel();

    document.getElementById('article-modal').classList.remove('hidden');
}

export function closeArticle() {
    document.getElementById('article-modal').classList.add('hidden');
    window.speechSynthesis?.cancel();
    _speaking = false;
}

// ── LOAD MORE ─────────────────────────────────────────────────────
export async function loadMore() {
    if (!_nextPage) return;
    const btn = document.getElementById('news-load-more');
    btn.textContent = 'Loading...';
    btn.disabled    = true;
    try {
        const { articles, nextPage } = await fetchNews(_currentCategory, _nextPage);
        _nextPage = nextPage;
        renderCards(articles, true);
    } catch (err) {
        console.error('[News loadMore]', err);
    } finally {
        btn.textContent = 'Load more';
        btn.disabled    = false;
    }
}

// ── AI SUMMARY (Grok / xAI) ───────────────────────────────────────
export async function getAISummary() {
    if (!_currentArticle) return;
    const btn       = document.getElementById('article-ai-btn');
    const summaryEl = document.getElementById('article-ai-summary');
    btn.innerHTML   = '<i class="fas fa-spinner fa-spin"></i> Summarizing...';
    btn.disabled    = true;

    // this on free tier show text only for paid account so u will need to get a paid account for news
    const text = _currentArticle.content || _currentArticle.description || _currentArticle.title;
    console.log(' text :', text)

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${window.GROK_API_KEY}`,
            },
            body: JSON.stringify({
                model:      'openai/gpt-oss-120b',
                max_tokens: 200,
                messages: [
                    { role: 'system', content: 'You are a news summarizer. Return exactly 3 sentences in plain text. No bullet points. No markdown.' },
                    { role: 'user',   content: `Summarize this article:\n\n${text}` }
                ]
            })
        });
        const data    = await res.json();
        console.log(' data : ', data)
        const summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
        summaryEl.innerHTML = `
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mt-3">
            <p class="text-[10px] font-bold text-indigo-500 uppercase mb-1"><i class="fas fa-magic mr-1"></i>AI Summary</p>
            <p class="text-xs text-gray-700 leading-relaxed">${summary}</p>
        </div>`;
        summaryEl.classList.remove('hidden');
    } catch (err) {
        summaryEl.innerHTML = `<p class="text-xs text-red-400 mt-2 text-center">AI summary unavailable.</p>`;
        summaryEl.classList.remove('hidden');
        console.error('[Grok]', err);
    } finally {
        btn.innerHTML = '<i class="fas fa-magic text-indigo-500"></i> AI Summary';
        btn.disabled  = false;
    }
}

// ── LISTEN ────────────────────────────────────────────────────────
export function toggleListen() {
    if (!_currentArticle) return;
    const btn = document.getElementById('article-listen-btn');
    if (_speaking) {
        window.speechSynthesis.cancel();
        _speaking     = false;
        btn.innerHTML = '<i class="fas fa-volume-up"></i> Listen';
        return;
    }
    const u   = new SpeechSynthesisUtterance(`${_currentArticle.title}. ${_currentArticle.description || ''}`);
    u.lang    = 'en-US';
    u.rate    = 0.9;
    u.onend   = () => { _speaking = false; btn.innerHTML = '<i class="fas fa-volume-up"></i> Listen'; };
    window.speechSynthesis.speak(u);
    _speaking     = true;
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';
}

// ── INIT ──────────────────────────────────────────────────────────
export function initNews() {
    loadCategory('top');
}