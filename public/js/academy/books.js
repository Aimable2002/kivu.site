/**
 * books.js
 * Two independent sources running in parallel:
 * - Supabase: admin-uploaded books
 * - Gutendex: Project Gutenberg books via Express proxy
 *
 * Whoever finishes first renders immediately.
 * The other appends when ready.
 * Empty state only shows when BOTH are done and BOTH returned nothing.
 */

import { supabase } from '../supabase.js';

let _supabaseDone    = false;
let _gutendexDone    = false;
let _allBooks        = [];
let _activeCategory  = 'All';
let _searchQuery     = '';
let _gutendexPage    = 1;
let _gutendexHasMore = true;
let _gutendexLoading = false;

// Book registry — keyed by id, avoids passing large objects through HTML attributes
const _registry = new Map();

const FORMAT_BADGE = {
    pdf:  { label: 'PDF',  cls: 'bg-red-100 text-red-700 border-red-200'        },
    epub: { label: 'EPUB', cls: 'bg-blue-100 text-blue-700 border-blue-200'     },
    text: { label: 'TXT',  cls: 'bg-green-100 text-green-700 border-green-200'  },
    txt:  { label: 'TXT',  cls: 'bg-green-100 text-green-700 border-green-200'  },
    zip:  { label: 'ZIP',  cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    html: { label: 'HTML', cls: 'bg-purple-100 text-purple-700 border-purple-200'},
};

function pickFormat(formats) {
    // Priority: zip (full HTML+images) → epub → plain text
    const priority = [
        'application/octet-stream',
        'application/epub+zip',
        'text/plain; charset=utf-8',
        'text/plain; charset=us-ascii',
        'text/plain',
    ];
    for (const mime of priority) {
        if (formats[mime]) {
            return {
                url:    formats[mime],
                format: mime.includes('octet') ? 'zip'
                       : mime.includes('epub')  ? 'epub'
                       : 'txt',
            };
        }
    }
    return null;
}

// ── INIT ──────────────────────────────────────────────────────────
export function loadBooks() {
    _supabaseDone    = false;
    _gutendexDone    = false;
    _allBooks        = [];
    _gutendexPage    = 1;
    _gutendexHasMore = true;
    _activeCategory  = 'All';
    _searchQuery     = '';

    renderSkeleton();

    // Both fire at the same time — neither waits for the other
    fetchSupabase().then(books => {
        _supabaseDone = true;
        mergeAndRender(books);
    });

    fetchGutendexPage(1).then(({ books, hasMore }) => {
        _gutendexDone    = true;
        _gutendexHasMore = hasMore;
        _gutendexPage    = 2;
        mergeAndRender(books);
        showLoadMoreBtn(hasMore);
    }).catch(() => {
        _gutendexDone    = true;
        _gutendexHasMore = false;
        checkBothDone();
    });
}

// ── MERGE AND RENDER ──────────────────────────────────────────────
// Called by each source independently when it finishes
function mergeAndRender(newBooks) {
    const existingIds = new Set(_allBooks.map(b => b.id));
    const fresh       = newBooks.filter(b => !existingIds.has(b.id));
    if (fresh.length) {
        _allBooks = [..._allBooks, ...fresh];
        fresh.forEach(b => _registry.set(b.id, b));
        buildCategoryBar(_allBooks);
        applyFilters();
    }
    checkBothDone();
}

// Only show empty state when both sources are done and nothing came back
function checkBothDone() {
    if (_supabaseDone && _gutendexDone && !_allBooks.length) {
        document.getElementById('books-list').innerHTML = `
        <div class="text-center py-10">
            <p class="text-2xl mb-2">📚</p>
            <p class="text-gray-400 text-sm font-bold">No books available</p>
        </div>`;
    }
}

// ── FETCH SUPABASE ────────────────────────────────────────────────
async function fetchSupabase(search = '') {
    let query = supabase
        .from('books')
        .select('id, title, description, category, language, format, file_size_label, r2_url, download_count')
        .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) { console.error('[Books Supabase]', error.message); return []; }
    return (data || []).map(b => ({ ...b, source: 'supabase' }));
}

// ── FETCH GUTENDEX PAGE ───────────────────────────────────────────
async function fetchGutendexPage(page = 1, search = '') {
    let url = `/api/gutenberg?languages=en&page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res  = await fetch(url);
    const data = await res.json();

    const hasMore = !!data.next;
    const books   = (data.results || []).map(b => {
        const picked = pickFormat(b.formats || {});
        if (!picked?.url) return null;
        return {
            id:              `gut_${b.id}`,
            title:           b.title,
            description:     b.authors?.[0]?.name ? `By ${b.authors[0].name}` : '',
            category:        'Others',
            cover_url:       b.formats?.['image/jpeg'] || null,
            language:        (b.languages?.[0] || 'en').toUpperCase(),
            format:          picked.format,
            file_size_label: `${(b.download_count || 0).toLocaleString()} downloads`,
            r2_url:          picked.url,
            source:          'gutendex',
        };
    }).filter(Boolean);

    return { books, hasMore };
}

// ── LOAD MORE (button) ────────────────────────────────────────────
export async function loadMoreBooks() {
    if (_gutendexLoading || !_gutendexHasMore) return;
    _gutendexLoading = true;
    showLoadMoreBtn(true);

    try {
        const { books, hasMore } = await fetchGutendexPage(_gutendexPage, _searchQuery);
        _gutendexHasMore = hasMore;
        _gutendexPage++;
        mergeAndRender(books);
        showLoadMoreBtn(hasMore);
    } catch (err) {
        console.error('[Gutendex loadMore]', err);
        showLoadMoreBtn(false);
    } finally {
        _gutendexLoading = false;
    }
}

function showLoadMoreBtn(show) {
    let btn = document.getElementById('books-load-more');
    if (!btn) {
        btn           = document.createElement('button');
        btn.id        = 'books-load-more';
        btn.className = 'w-full bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm active:scale-95 transition mt-2';
        btn.onclick   = () => window._loadMoreBooks();
        document.getElementById('books-list').insertAdjacentElement('afterend', btn);
    }
    btn.textContent = _gutendexLoading ? 'Loading...' : 'Load more books';
    btn.disabled    = _gutendexLoading;
    btn.classList.toggle('hidden', !show);
}

// ── CATEGORY BAR ─────────────────────────────────────────────────
function buildCategoryBar(books) {
    const bar = document.querySelector('.bg-white.px-3.py-2\\.5');
    if (!bar) return;
    const cats = ['All', ...new Set(books.map(b => b.category).filter(Boolean))];
    bar.innerHTML = cats.map(cat => `
    <button data-cat="${cat}" onclick="window._filterCat(this)"
            class="cat-btn shrink-0 ${cat === _activeCategory
                ? 'bg-slate-800 text-white'
                : 'bg-gray-100 border border-gray-200 text-gray-700'
            } px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
        ${cat}
    </button>`).join('');
}

// ── FILTER ────────────────────────────────────────────────────────
export function filterByCategory(cat) {
    _activeCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        const active = btn.dataset.cat === cat;
        btn.className = `cat-btn shrink-0 ${active
            ? 'bg-slate-800 text-white'
            : 'bg-gray-100 border border-gray-200 text-gray-700'
        } px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap`;
    });
    applyFilters();
}

// ── SEARCH ────────────────────────────────────────────────────────
export function searchBooks(query) {
    _searchQuery    = query.trim().toLowerCase();
    _supabaseDone   = false;
    _gutendexDone   = false;
    _allBooks       = [];
    _gutendexPage   = 1;
    _gutendexHasMore= true;

    renderSkeleton();

    fetchSupabase(_searchQuery).then(books => {
        _supabaseDone = true;
        mergeAndRender(books);
    });

    fetchGutendexPage(1, _searchQuery).then(({ books, hasMore }) => {
        _gutendexDone    = true;
        _gutendexHasMore = hasMore;
        _gutendexPage    = 2;
        mergeAndRender(books);
        showLoadMoreBtn(hasMore);
    }).catch(() => {
        _gutendexDone    = true;
        _gutendexHasMore = false;
        checkBothDone();
    });
}

// ── APPLY FILTERS ─────────────────────────────────────────────────
function applyFilters() {
    let list = _allBooks;
    if (_activeCategory !== 'All') list = list.filter(b => b.category === _activeCategory);
    if (_searchQuery)               list = list.filter(b =>
        b.title.toLowerCase().includes(_searchQuery) ||
        (b.description || '').toLowerCase().includes(_searchQuery) ||
        (b.category    || '').toLowerCase().includes(_searchQuery)
    );
    renderBooks(list);
}

// ── COVER THUMBNAIL HELPER ───────────────────────────────────────
// Avoids nested template literal quote escaping issues
function coverThumb(url, large = false) {
    if (url) {
        const img = document.createElement('img');
        img.src     = url;
        img.loading = 'lazy';
        img.className = large
            ? 'w-full h-full object-cover rounded-lg'
            : 'w-full h-full object-cover';
        img.onerror = function() {
            this.parentElement.innerHTML = '<i class="fas fa-book-open text-4xl text-slate-300"></i>';
        };
        return img.outerHTML;
    }
    return '<i class="fas fa-book-open text-4xl text-slate-300"></i>';
}

// ── SKELETON ──────────────────────────────────────────────────────
function renderSkeleton() {
    document.getElementById('books-list').innerHTML = [1,2,3].map(() => `
    <div class="bg-white rounded-xl border border-gray-200 p-3 animate-pulse flex gap-3 mb-3">
        <div class="w-16 h-20 bg-gray-200 rounded shrink-0"></div>
        <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            <div class="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
    </div>`).join('');
}

// ── RENDER ────────────────────────────────────────────────────────
function renderBooks(books) {
    const el = document.getElementById('books-list');
    if (!books.length) return; // don't clear — checkBothDone handles empty state

    el.innerHTML = books.map(b => {
        const badge = FORMAT_BADGE[b.format] || FORMAT_BADGE.text;
        return `
        <div onclick="window._openBook('${b.id}')"
             class="bg-white rounded-xl border border-gray-200 p-3 flex gap-3 cursor-pointer active:bg-gray-50 transition hover:border-slate-400 shadow-sm mb-3">
            <div class="w-16 h-20 bg-slate-100 border border-slate-200 rounded-lg shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                ${coverThumb(b.cover_url)}
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                    <h4 class="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">${b.title}</h4>
                    <p class="text-[10px] text-gray-400 line-clamp-1">${b.category || ''}</p>
                    ${b.description ? `<p class="text-[10px] text-gray-400 italic line-clamp-1">${b.description}</p>` : ''}
                </div>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls}">${badge.label}</span>
                    ${b.file_size_label ? `<span class="text-[10px] text-gray-400 font-bold">${b.file_size_label}</span>` : ''}
                    <span class="text-[10px] text-gray-300 font-bold ml-auto">${b.language || ''}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── OPEN MODAL ────────────────────────────────────────────────────
export function openBookModal(id) {
    const b = _registry.get(id);
    if (!b) return;
    const badge = FORMAT_BADGE[b.format] || FORMAT_BADGE.text;

    document.getElementById('modal-book-title').textContent = b.title;
    document.getElementById('modal-book-cat').textContent   = `${b.category || ''} · ${b.language || ''}`;
    document.getElementById('modal-book-desc').textContent  = b.description || 'No description available.';
    document.getElementById('modal-book-size').textContent  = b.file_size_label || '';

    const iconEl = document.getElementById('modal-book-icon');
    const iconWrap     = iconEl.parentElement;
    iconWrap.innerHTML = coverThumb(b.cover_url, true);

    const badgeEl       = document.getElementById('modal-book-badge');
    badgeEl.textContent = badge.label;
    badgeEl.className   = `px-2 py-1 rounded text-[10px] font-bold tracking-wide border ${badge.cls}`;

    document.getElementById('modal-download-btn').onclick = () => downloadBook(b);
    document.getElementById('book-modal').classList.remove('hidden');
}

export function closeBookModal() {
    document.getElementById('book-modal').classList.add('hidden');
}

// ── DOWNLOAD ──────────────────────────────────────────────────────
async function downloadBook(b) {
    const btn     = document.getElementById('modal-download-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    btn.disabled  = true;

    if (b.source === 'supabase') {
        // Supabase books — direct download, increment count
        supabase.from('books')
            .update({ download_count: (b.download_count || 0) + 1 })
            .eq('id', b.id);

        const a    = document.createElement('a');
        a.href     = b.r2_url;
        a.download = b.title.replace(/[^\w\s-]/g, '').trim() + '.' + b.format;
        a.target   = '_blank';
        a.rel      = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } else {
        // Gutendex books — route through Express proxy for correct filename
        const params = new URLSearchParams({
            url:    b.r2_url,
            title:  b.title,
            format: b.format,
        });
        const a    = document.createElement('a');
        a.href     = `/api/gutenberg/download?${params}`;
        a.download = b.title.replace(/[^\w\s-]/g, '').trim() + '.' + b.format;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Download File';
        btn.disabled  = false;
    }, 1500);
}