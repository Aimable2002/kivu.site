import { supabase } from '../supabase.js';

const PAGE_SIZE = 12;

const TAG_MAP = {
    '24h': '🕐 24h', transport: '🚗 Transport', homevisit: '🏠 Home Visit',
    parking: '🚗 Parking', wifi: '📶 Wi-Fi', insurance: '🛡️ Insurance',
    repatriation: '✈️ Repatriation', cremation: '🔥 Cremation'
};

export async function fetchProviders(page = 1, filters = {}) {
    const from = (page - 1) * PAGE_SIZE;
    let query = supabase
        .from('funeral_with_rating')
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

    if (filters.open)         query = query.eq('is_open', true);
    if (filters.rating)       query = query.order('avg_rating', { ascending: false });
    if (filters.tags?.length) query = query.contains('tags', filters.tags);
    if (filters.category)     query = query.eq('category', filters.category);
    if (filters.search)       query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);

    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data;
}

export async function renderFeed(page = 1, filters = {}) {
    const container = document.getElementById('funeral-feed');
    const pagination = document.getElementById('pagination');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-16 text-gray-300 text-sm animate-pulse">Loading...</div>`;

    const data = await fetchProviders(page, filters);

    if (!data.length) {
        container.innerHTML = `<div class="text-center py-16 text-gray-400">
            <p class="text-3xl mb-3">🕊️</p>
            <p class="font-bold text-sm">No providers found</p>
            <p class="text-xs mt-1 text-gray-300">Try adjusting your filters</p>
        </div>`;
        pagination.innerHTML = '';
        return;
    }

    // Cache for detail navigation
    const cache = {};
    data.forEach(p => { cache[p.id] = p; });
    sessionStorage.setItem('kf_funeral', JSON.stringify({ ...JSON.parse(sessionStorage.getItem('kf_funeral') || '{}'), ...cache }));

    container.innerHTML = data.map(p => buildCard(p)).join('');

    pagination.innerHTML = data.length === PAGE_SIZE
        ? `<div class="flex gap-3 py-4">
            ${page > 1 ? `<button onclick="window._changePage(${page-1})" class="flex-1 bg-gray-100 font-bold text-sm py-3 rounded-xl">← Prev</button>` : ''}
            <button onclick="window._changePage(${page+1})" class="flex-1 text-white font-bold text-sm py-3 rounded-xl" style="background:#374151">Next →</button>
           </div>`
        : '';
}

function buildCard(p) {
    const isVip    = p.is_vip;
    const vipBorder = isVip ? 'ring-2 ring-amber-300' : 'border border-gray-100';
    const vipBadge  = isVip ? `<div class="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">⭐ VIP</div>` : '';
    const statusBadge = p.is_open
        ? `<span class="text-[9px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">Open</span>`
        : `<span class="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-400">Closed</span>`;
    const stars = buildStars(p.avg_rating);
    const tags  = (p.tags || []).slice(0, 3).map(t => TAG_MAP[t] ? `<span class="bg-gray-100 text-gray-500 text-[9px] px-2 py-0.5 rounded">${TAG_MAP[t]}</span>` : '').join('');
    const hours = p.hours?.display || null;

    return `
    <div class="bg-white rounded-2xl ${vipBorder} overflow-hidden cursor-pointer active:scale-[0.98] transition"
         onclick="window._openProvider('${p.id}')">
        <div class="h-36 relative bg-gray-200">
            <img src="${p.cover_image_url || ''}" loading="lazy"
                 class="w-full h-full object-cover ${p.is_open ? '' : 'grayscale opacity-60'}"
                 onerror="this.style.display='none'">
            ${vipBadge}
            <div class="absolute bottom-2 right-2 bg-white/90 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-lg shadow">${p.category}</div>
        </div>
        <div class="p-3">
            <div class="flex justify-between items-center mb-1">
                <h3 class="font-bold text-gray-900 text-sm truncate pr-2">${p.name}</h3>
                ${statusBadge}
            </div>
            <div class="flex items-center gap-1 mb-1.5 text-[11px] text-amber-500 font-bold">
                ${stars}
                <span class="text-gray-500 font-normal ml-1">${p.avg_rating ?? '–'} (${p.review_count ?? 0})</span>
            </div>
            ${hours ? `<p class="text-[10px] text-gray-400 mb-1.5"><i class="fas fa-clock mr-1"></i>${hours}</p>` : ''}
            <div class="flex gap-1 flex-wrap">${tags}</div>
        </div>
    </div>`;
}

function buildStars(avg) {
    const n = Math.round(parseFloat(avg) || 0);
    return Array.from({ length: 5 }, (_, i) =>
        `<i class="fas fa-star text-[10px] ${i < n ? 'text-amber-400' : 'text-gray-200'}"></i>`
    ).join('');
}

export function openProvider(id) {
    sessionStorage.setItem('kf_funeral_id', id);
    window.location.href = '/funeral/detail';
}