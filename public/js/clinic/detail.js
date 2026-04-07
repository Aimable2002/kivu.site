// /js/clinic/detail.js
import { supabase, normalizePhone, formatRWF } from '/js/supabase.js';

// ─────────────────────────────────────────────────────────────────────
//  loadCenter — reads ?id= from URL, populates header/hero/info
// ─────────────────────────────────────────────────────────────────────
export async function loadCenter() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { location.href = '/clinic'; return null; }

    const { data: c, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !c) { location.href = '/clinic'; return null; }

    // Header
    document.title = `${c.name} — Kivu`;
    document.getElementById('center-name').textContent     = c.name;
    document.getElementById('center-category').textContent = c.category;

    const statusEl = document.getElementById('center-status');
    statusEl.textContent = c.is_open ? '🟢 Open' : '⚫ Closed';
    statusEl.className   = `text-[10px] font-bold px-2 py-1 rounded shrink-0 ${c.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`;

    // Hero
    if (c.cover_image_url) document.getElementById('center-cover').src = c.cover_image_url;

    if (c.youtube_url) {
        const playBtn = document.getElementById('youtube-play-btn');
        playBtn.classList.remove('hidden');
        playBtn.onclick = () => openYoutube(c.youtube_url);
    }

    // Info strip
    if (c.address) document.getElementById('center-address').innerHTML = `<i class="fas fa-map-marker-alt mr-1 text-blue-600"></i>${c.address}`;
    document.getElementById('rating-avg').textContent   = c.rating_avg > 0 ? c.rating_avg : '—';
    document.getElementById('rating-count').textContent = c.rating_count > 0 ? `(${c.rating_count} reviews)` : '';

    // Info tab
    if (c.address) document.getElementById('center-address-full').textContent = c.address;

    // WhatsApp FAB
    const fab = document.getElementById('whatsapp-book-btn');
    if (fab) fab.dataset.phone = normalizePhone(c.phone);

    return c;
}

function openYoutube(url) {
    const frame   = document.getElementById('youtube-frame');
    const videoId = extractYoutubeId(url);
    if (!videoId) return;
    frame.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
    frame.classList.remove('hidden');
}

function extractYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

// ─────────────────────────────────────────────────────────────────────
//  renderServices — renders menu_data JSONB into services tab
// ─────────────────────────────────────────────────────────────────────
export async function renderServices(clinicId) {
    const { data: c } = await supabase
        .from('clinics')
        .select('menu_data, phone')
        .eq('id', clinicId)
        .single();

    const container = document.getElementById('view-services');

    if (!c?.menu_data?.length) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-8">No services listed yet.</p>';
        return;
    }

    const phone = normalizePhone(c.phone);
    container.innerHTML = c.menu_data.map(cat => `
        <p class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-3">${cat.name}</p>
        <div class="border border-gray-100 rounded-2xl overflow-hidden mb-4">
            <div class="divide-y divide-gray-50">
                ${(cat.items || []).map(item => `
                <div class="p-3 flex items-center justify-between active:bg-gray-50 transition">
                    <div class="flex-1">
                        <p class="font-bold text-sm text-gray-900">${item.name}</p>
                        ${item.description ? `<p class="text-[10px] text-gray-400 mt-0.5">${item.description}${item.duration ? ` · ${item.duration} min` : ''}</p>` : ''}
                    </div>
                    <div class="text-right ml-3 shrink-0">
                        <p class="font-black text-sm text-blue-700">${formatRWF(item.price)}</p>
                        <button onclick="window._bookService('${item.name.replace(/'/g,"\\'")}', ${item.price})"
                                class="mt-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full active:scale-95 transition">
                            Book
                        </button>
                    </div>
                </div>`).join('')}
            </div>
        </div>`).join('');
}

// ─────────────────────────────────────────────────────────────────────
//  renderDoctors — reads clinic_doctors table for this clinic
// ─────────────────────────────────────────────────────────────────────
export async function renderDoctors(clinicId) {
    const { data, error } = await supabase
        .from('clinic_doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name', { ascending: true });

    const container = document.getElementById('view-doctors');

    if (error || !data?.length) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-8">No doctors listed yet.</p>';
        return;
    }

    container.innerHTML = `
        <p class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-3">Our Doctors</p>
        <div class="space-y-3">
            ${data.map(d => `
            <div class="flex items-center gap-3 p-3 border border-gray-100 rounded-2xl">
                <div class="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                    ${d.photo_url
                        ? `<img src="${d.photo_url}" class="w-full h-full object-cover" loading="lazy">`
                        : `<i class="fas fa-user-md text-blue-300 text-xl"></i>`}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm text-gray-900 truncate">${d.name}</p>
                    ${d.specialty ? `<p class="text-[10px] text-blue-600 font-bold">${d.specialty}</p>` : ''}
                    <p class="text-[10px] text-gray-400 mt-0.5">
                        ${d.years_exp ? `${d.years_exp} yrs experience` : ''}${d.years_exp && d.schedule ? ' · ' : ''}${d.schedule || ''}
                    </p>
                </div>
                <button onclick="window._bookDoctor('${d.name.replace(/'/g,"\\'")}', '${(d.specialty || '').replace(/'/g,"\\'")}' )"
                        class="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition shrink-0">
                    Book
                </button>
            </div>`).join('')}
        </div>`;
}

// ─────────────────────────────────────────────────────────────────────
//  renderReviews
// ─────────────────────────────────────────────────────────────────────
export async function renderReviews(clinicId) {
    const { data, error } = await supabase
        .from('clinic_reviews')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(30);

    const el = document.getElementById('reviews-list');
    if (error || !data?.length) {
        el.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">No reviews yet. Be the first!</p>';
        return;
    }

    el.innerHTML = data.map(r => `
    <div class="border-b border-gray-100 pb-3 mb-3 last:border-0">
        <div class="flex justify-between mb-1">
            <span class="font-bold text-sm text-gray-900">${r.reviewer}</span>
            <span class="text-amber-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
        </div>
        ${r.comment ? `<p class="text-xs text-gray-500">${r.comment}</p>` : ''}
        <p class="text-[9px] text-gray-300 mt-1">${new Date(r.created_at).toLocaleDateString()}</p>
    </div>`).join('');
}

// ─────────────────────────────────────────────────────────────────────
//  submitReview
// ─────────────────────────────────────────────────────────────────────
export async function submitReview(clinicId) {
    const reviewer = document.getElementById('review-name').value.trim();
    const comment  = document.getElementById('review-comment').value.trim();
    const rating   = window._currentRating || 0;

    if (!reviewer || !rating) {
        alert('Please enter your name and select a rating.');
        return;
    }

    const { error } = await supabase
        .from('clinic_reviews')
        .insert({ clinic_id: clinicId, reviewer, rating, comment });

    if (error) { alert('Error: ' + error.message); return; }

    document.getElementById('review-name').value    = '';
    document.getElementById('review-comment').value = '';
    window._currentRating = 0;
    document.querySelectorAll('#star-picker i').forEach(s => s.style.color = '#d1d5db');

    await renderReviews(clinicId);
}

// ─────────────────────────────────────────────────────────────────────
//  bookViaWhatsApp
// ─────────────────────────────────────────────────────────────────────
export function bookViaWhatsApp(clinicName, phone, serviceName, price) {
    if (!phone) { alert('No phone number for this clinic.'); return; }
    const msg = price > 0
        ? `Hi! I'd like to book *${serviceName}* at *${clinicName}*. Fee: ${formatRWF(price)}. Please confirm availability.`
        : `Hi! I'd like to book an appointment at *${clinicName}* — ${serviceName}. Please confirm availability.`;
    window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

export function goBack() {
    if (document.referrer) history.back();
    else window.location.href = '/clinic';
}