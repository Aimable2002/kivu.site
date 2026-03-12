import { supabase } from '../supabase.js';

const PAGE_SIZE = 10;
const TAG_MAP = {
    women:      '👩 Women only',
    mixed:      '🧑 Mixed',
    couples:    '💑 Couples',
    homevisit:  '🏠 Home Visit',
    steam:      '♨️ Steam Room',
    jacuzzi:    '🛁 Jacuzzi',
    wifi:       '📶 Wi-Fi',
    parking:    '🚗 Parking'
};

export async function fetchCenters(page = 1, filters = {}) {
    const from  = (page - 1) * PAGE_SIZE;
    const to    = from + PAGE_SIZE - 1;
    let query   = supabase.from('wellness_with_rating').select('*').range(from, to);
    if (filters.open)         query = query.eq('is_open', true);
    if (filters.rating)       query = query.order('avg_rating', { ascending: false });
    if (filters.tags?.length) query = query.contains('tags', filters.tags);
    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data;
}

export async function renderFeed(page = 1, filters = {}) {
    const feed = document.getElementById('wellness-feed');
    if (!feed) return;
    if (page === 1) feed.innerHTML = skeletonCards(4);
    const data = await fetchCenters(page, filters);
    if (page === 1) feed.innerHTML = '';
    if (!data.length && page === 1) {
        feed.innerHTML = `<p class="text-center text-gray-400 text-sm py-16">No wellness centers found.</p>`;
        return;
    }
    const existing = JSON.parse(sessionStorage.getItem('kf_wellness') || '{}');
    data.forEach(w => { existing[w.id] = w; });
    sessionStorage.setItem('kf_wellness', JSON.stringify(existing));
    data.forEach(w => feed.insertAdjacentHTML('beforeend', buildCard(w)));
    renderPagination(page, data.length);
}

function buildCard(w) {
    console.log('w :', w)
    const vipBorder  = w.is_vip ? 'border-2 border-yellow-400 shadow-md' : 'border border-gray-100 shadow-sm';
    const vipBadge   = w.is_vip ? `<div class="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-md">⭐ Promoted</div>` : '';
    const statusBadge = w.is_open
        ? `<span class="flex items-center gap-1 text-[10px] font-bold text-green-600"><span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>Open</span>`
        : `<span class="flex items-center gap-1 text-[10px] font-bold text-red-400"><span class="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>Closed</span>`;
    const stars       = buildStars(w.avg_rating);
    const tags        = (w.tags || []).slice(0,3).map(t => TAG_MAP[t] ? `<span class="bg-gray-100 text-gray-500 text-[9px] px-2 py-0.5 rounded">${TAG_MAP[t]}</span>` : '').join('');
    const hours = Object.values(w.hours || {})[0];
    const bookingMap  = { walkin: '🚶 Walk-ins', appointment: '📅 Appt Only', both: '🚶 + 📅' };
    const bookingBadge = w.booking_type ? `<span class="bg-teal-50 text-teal-600 text-[9px] font-bold px-2 py-0.5 rounded">${bookingMap[w.booking_type] || ''}</span>` : '';
    return `
    <div class="bg-white rounded-2xl ${vipBorder} overflow-hidden cursor-pointer active:scale-[0.98] transition"
         onclick="window._openCenter('${w.id}')">
        <div class="h-36 relative bg-gray-200">
            <img src="${w.cover_image_url || ''}" loading="lazy" class="w-full h-full object-cover ${w.is_open ? '' : 'grayscale opacity-60'}" onerror="this.style.display='none'">
            ${vipBadge}
            <div class="absolute bottom-2 right-2 bg-white/90 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-lg shadow">${w.category}</div>
        </div>
        <div class="p-3">
            <div class="flex justify-between items-center mb-1">
                <h3 class="font-bold text-gray-900 text-sm">${w.name}</h3>
                ${statusBadge}
            </div>
            <div class="flex items-center gap-1 mb-2 text-[11px] text-amber-500 font-bold">
                ${stars}
                <span class="text-gray-500 font-normal ml-1">${w.avg_rating ?? ''} ${w.review_count && w.review_count != 0 ? w.review_count : 'New'}</span>
            </div>
            ${hours ? `<p class="text-[10px] text-gray-400 mb-1.5"><i class="fas fa-clock mr-1"></i>${hours}</p>` : ''}
            <div class="flex gap-1 flex-wrap items-center">${tags}${bookingBadge}</div>
        </div>
    </div>`;
}

export function openCenter(id) {
    sessionStorage.setItem('kf_wellness_id', id);
    window.location.href = '/wellness/detail';
}

function renderPagination(page, resultCount) {
    const el = document.getElementById('pagination');
    if (!el) return;
    const showPrev = page > 1, showNext = resultCount === PAGE_SIZE;
    if (!showPrev && !showNext) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="flex justify-center items-center gap-2 py-4">
        ${showPrev ? `<button onclick="window._changePage(${page-1})" class="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">← Prev</button>` : ''}
        <span class="px-3 py-2 text-xs text-gray-400 font-bold">Page ${page}</span>
        ${showNext ? `<button onclick="window._changePage(${page+1})" class="px-4 py-2 rounded-xl bg-teal text-white text-sm font-bold">Next →</button>` : ''}
    </div>`;
}

function buildStars(rating) {
    const r = parseFloat(rating) || 0; const full = Math.floor(r); const half = r % 1 >= 0.5;
    let h = '';
    for (let i = 0; i < full; i++) h += '<i class="fas fa-star"></i>';
    if (half) h += '<i class="fas fa-star-half-alt"></i>';
    return h;
}

function skeletonCards(n) {
    return Array(n).fill(`<div class="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"><div class="h-36 bg-gray-200"></div><div class="p-3 space-y-2"><div class="h-4 bg-gray-200 rounded w-3/4"></div><div class="h-3 bg-gray-100 rounded w-1/2"></div></div></div>`).join('');
}