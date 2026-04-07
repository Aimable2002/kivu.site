// /js/clinic/feed.js
import { supabase } from '/js/supabase.js';

const PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────
//  renderFeed(page, state)
//  state: { open, rating, tags[], search }
// ─────────────────────────────────────────────────────────────────────
export async function renderFeed(page = 1, state = {}) {
    const el = document.getElementById('clinic-feed');
    el.innerHTML = '<div class="text-center py-8 text-gray-400 text-xs">Loading...</div>';

    let query = supabase
        .from('clinics')
        .select('id, name, category, address, cover_image_url, tags, is_open, is_vip, rating_avg, rating_count')
        .order('is_vip', { ascending: false })
        .order('rating_avg', { ascending: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    if (state.open)   query = query.eq('is_open', true);
    if (state.rating) query = query.gte('rating_avg', 4.0);
    if (state.search) query = query.ilike('name', `%${state.search}%`);

    // Tag filtering — row must contain ALL selected tags
    if (state.tags?.length) {
        query = query.contains('tags', state.tags);
    }

    const { data, error } = await query;

    if (error) {
        el.innerHTML = `<div class="text-red-400 text-xs text-center py-6">Error: ${error.message}</div>`;
        return;
    }

    if (!data?.length) {
        el.innerHTML = '<div class="text-gray-400 text-xs text-center py-10 italic">No clinics found.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    el.innerHTML = data.map(c => cardHTML(c)).join('');

    // Pagination
    document.getElementById('pagination').innerHTML =
        page > 1
            ? `<div class="flex justify-center gap-4 mt-6">
                   <button onclick="window._changePage(${page - 1})" class="px-5 py-2 text-xs font-bold rounded-full border border-gray-200 text-gray-600 active:scale-95 transition">← Prev</button>
                   ${data.length === PER_PAGE ? `<button onclick="window._changePage(${page + 1})" class="px-5 py-2 text-xs font-bold rounded-full text-white active:scale-95 transition" style="background:#1D4ED8">Next →</button>` : ''}
               </div>`
            : data.length === PER_PAGE
                ? `<div class="flex justify-center mt-6">
                       <button onclick="window._changePage(2)" class="px-5 py-2 text-xs font-bold rounded-full text-white active:scale-95 transition" style="background:#1D4ED8">Load More →</button>
                   </div>`
                : '';
}

function cardHTML(c) {
    const cover = c.cover_image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=60';
    const tags  = (c.tags || []).slice(0, 3).map(tagChip).join('');
    return `
    <div onclick="window.location.href='/clinic/detail?id=${c.id}'"
         class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition cursor-pointer">
        <div class="relative h-36 bg-blue-900">
            <img src="${cover}" class="w-full h-full object-cover opacity-80" loading="lazy">
            <div class="absolute top-3 left-3 flex gap-1.5">
                <span class="bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase">${c.category}</span>
                <span class="${c.is_open ? 'bg-green-500' : 'bg-gray-500'} text-white text-[9px] font-black px-2.5 py-1 rounded-full">
                    ${c.is_open ? '🟢 Open' : '⚫ Closed'}
                </span>
            </div>
            ${c.is_vip ? '<div class="absolute top-3 right-3 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded">⭐ VIP</div>' : ''}
        </div>
        <div class="p-3">
            <div class="flex justify-between items-start mb-1">
                <h3 class="font-black text-gray-900 text-sm truncate flex-1 mr-2">${c.name}</h3>
                ${c.rating_avg > 0 ? `<span class="text-amber-500 text-xs font-bold flex items-center gap-0.5 shrink-0"><i class="fas fa-star text-[10px]"></i> ${c.rating_avg}</span>` : ''}
            </div>
            ${c.address ? `<p class="text-[10px] text-gray-400 mb-2"><i class="fas fa-map-marker-alt mr-1"></i>${c.address}</p>` : ''}
            <div class="flex gap-1.5 flex-wrap">${tags}</div>
        </div>
    </div>`;
}

function tagChip(tag) {
    const map = {
        emergency: '🚑 Emergency', insurance: '🛡️ Insurance', lab: '🧪 Lab',
        pediatric: '👶 Pediatric', dental: '🦷 Dental', pharmacy: '💊 Pharmacy',
        parking: '🚗 Parking', ambulance: '🚐 Ambulance',
    };
    return `<span class="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full">${map[tag] || tag}</span>`;
}

export function openCenter(id) {
    window.location.href = `/clinic/detail?id=${id}`;
}
