import { supabase } from '../supabase.js';

const CATEGORY_ICONS = {
    'Mining & Geology': 'fa-gem',
    'Practical Skills': 'fa-solar-panel',
    'IT & Code':        'fa-shield-alt',
    'Local Laws':       'fa-balance-scale',
    'Languages':        'fa-language'
};

const FORMAT_COLORS = {
    epub: 'bg-green-50 border-green-200 text-green-700',
    pdf:  'bg-red-50 border-red-200 text-red-700',
    text: 'bg-blue-50 border-blue-200 text-blue-700'
};

let allBooks = [];

export async function loadBooks() {
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { console.error(error.message); return; }
    allBooks = data || [];
    renderBooks(allBooks);
}

export function filterByCategory(category) {
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.toggle('bg-slate-800', b.dataset.cat === category);
        b.classList.toggle('text-white',   b.dataset.cat === category);
        b.classList.toggle('bg-gray-100',  b.dataset.cat !== category);
        b.classList.toggle('text-gray-700', b.dataset.cat !== category);
    });
    const filtered = category === 'All' ? allBooks : allBooks.filter(b => b.category === category);
    renderBooks(filtered);
}

export function searchBooks(query) {
    const q = query.toLowerCase().trim();
    const filtered = q
        ? allBooks.filter(b => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
        : allBooks;
    renderBooks(filtered);
}

export function renderBooks(books) {
    const container = document.getElementById('books-list');
    if (!container) return;

    if (!books.length) {
        container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No books found.</p>`; return;
    }

    container.innerHTML = books.map(b => buildBookCard(b)).join('');
}

function buildBookCard(b) {
    const icon   = CATEGORY_ICONS[b.category] || 'fa-book';
    const fmt    = FORMAT_COLORS[b.format] || FORMAT_COLORS.text;
    const fmtLabel = b.format === 'text' ? 'TEXT-ONLY' : b.format.toUpperCase();

    return `
    <div onclick="window._openBook(${JSON.stringify(b).replace(/"/g,'&quot;')})"
         class="bg-white p-3 rounded-xl border border-gray-200 flex gap-3 cursor-pointer active:bg-gray-50">
        <div class="w-16 h-20 bg-slate-100 rounded shrink-0 flex items-center justify-center border border-slate-200">
            <i class="fas ${icon} text-slate-400 text-2xl"></i>
        </div>
        <div class="flex-1 flex flex-col justify-between py-1">
            <div>
                <h4 class="font-bold text-sm text-gray-900 leading-tight">${b.title}</h4>
                <p class="text-[10px] text-gray-500 mt-1">${b.category} · ${b.language}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="border ${fmt} px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">${fmtLabel}</span>
                <span class="text-slate-500 text-[10px] font-medium"><i class="fas fa-weight-hanging mr-1"></i>${b.file_size_label || '–'}</span>
            </div>
        </div>
        <div class="flex flex-col justify-center px-2 text-slate-300"><i class="fas fa-download"></i></div>
    </div>`;
}

export function openBookModal(book) {
    const modal = document.getElementById('book-modal');
    if (!modal) return;

    const icon    = CATEGORY_ICONS[book.category] || 'fa-book';
    const fmt     = FORMAT_COLORS[book.format] || FORMAT_COLORS.text;
    const fmtLbl  = book.format === 'text' ? 'TEXT-ONLY' : book.format.toUpperCase();

    document.getElementById('modal-book-icon').className    = `fas ${icon} text-4xl text-slate-300`;
    document.getElementById('modal-book-title').textContent = book.title;
    document.getElementById('modal-book-cat').textContent   = book.category;
    document.getElementById('modal-book-size').innerHTML    = `<i class="fas fa-hdd mr-1"></i>${book.file_size_label || '–'}`;
    document.getElementById('modal-book-desc').textContent  = book.description || 'No description available.';

    const badge = document.getElementById('modal-book-badge');
    badge.textContent = fmtLbl;
    badge.className   = `border ${fmt} px-2 py-1 rounded text-[10px] font-bold tracking-wide`;

    const dlBtn = document.getElementById('modal-download-btn');
    dlBtn.onclick = () => triggerDownload(book.r2_url, book.title, book.format);

    modal.classList.remove('hidden');
}

export function closeBookModal() {
    document.getElementById('book-modal')?.classList.add('hidden');
}

export function triggerDownload(url, title, format) {
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `${title}.${format}`;
    a.target     = '_blank';
    a.rel        = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    supabase.rpc('increment_download_count', { book_id: title }).catch(() => {});
}