import { supabase } from '../supabase.js';

const DEFAULT_AVATAR = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%239ca3af'/%3E%3Cellipse cx='50' cy='82' rx='28' ry='20' fill='%239ca3af'/%3E%3C/svg%3E`;

function normalizePhone(raw) {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('250') && digits.length === 12) return digits;
    if (digits.startsWith('1')   && digits.length === 11) return digits;
    if (digits.startsWith('0')   && digits.length === 10) return '250' + digits.slice(1);
    if (digits.length === 9) return '250' + digits;
    return digits;
}

export async function loadSaloon() {
    const sessionId = sessionStorage.getItem('kf_saloon_id');
    const urlId     = new URLSearchParams(window.location.search).get('id');
    const id        = sessionId || urlId;
    const cache     = JSON.parse(sessionStorage.getItem('kf_saloons') || '{}');
    let s           = id ? cache[id] : null;

    if (!s && id) {
        const { data, error } = await supabase.from('saloons_with_rating').select('*').eq('id', id).single();
        if (error || !data) { window.location.href = '/saloon'; return null; }
        s = data;
    }
    if (!s) { window.location.href = '/saloon'; return null; }

    document.getElementById('saloon-name').textContent     = s.name;
    document.getElementById('saloon-category').textContent = s.category;
    document.getElementById('saloon-address').innerHTML    = `<i class="fas fa-map-marker-alt mr-1"></i>${s.address || ''}`;
    document.getElementById('rating-avg').textContent      = s.avg_rating ?? '–';
    document.getElementById('rating-count').textContent    = `${s.review_count ?? 0} reviews`;

    const statusEl = document.getElementById('saloon-status');
    statusEl.textContent = s.is_open ? 'Open' : 'Closed';
    statusEl.className   = s.is_open
        ? 'text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200'
        : 'text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-400 border border-red-200';

    const cover = document.getElementById('saloon-cover');
    if (cover) {
        cover.style.display = '';
        if (s.cover_image_url) { cover.src = s.cover_image_url; cover.onerror = () => { cover.style.display = 'none'; }; }
        else cover.style.display = 'none';
    }

    const waBtn = document.getElementById('whatsapp-book-btn');
    if (waBtn && s.phone) waBtn.dataset.phone = normalizePhone(s.phone);

    const playBtn = document.getElementById('youtube-play-btn');
    if (!s.youtube_url) playBtn?.classList.add('hidden');
    else { playBtn?.classList.remove('hidden'); playBtn.onclick = () => loadYoutube(s.youtube_url); }

    const infoEl = document.getElementById('view-info');
    if (infoEl) {
        const hours        = s.hours?.display || (typeof s.hours === 'string' ? s.hours : null) || Object.values(s.hours || {})[0] || null;
        const bookingMap   = { walkin: '🚶 Walk-ins Welcome', appointment: '📅 Appointment Only', both: '🚶 Walk-ins + 📅 Appointments' };
        const bookingLabel = bookingMap[s.booking_type] || '';
        const tags         = (s.tags || []).join(' · ');
        infoEl.innerHTML = `
        <div class="space-y-3">
            ${s.address ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-map-marker-alt text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                    <p class="text-sm text-gray-700">${s.address}</p>
                </div>
            </div>` : ''}
            ${hours ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-clock text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Hours</p>
                    <p class="text-sm text-gray-700">${hours}</p>
                </div>
            </div>` : ''}
            ${bookingLabel ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-calendar-check text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Booking</p>
                    <p class="text-sm text-gray-700">${bookingLabel}</p>
                </div>
            </div>` : ''}
            ${s.phone ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fab fa-whatsapp text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Contact</p>
                    <p class="text-sm text-gray-700">${s.phone}</p>
                </div>
            </div>` : ''}
            ${tags ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-tag text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Tags</p>
                    <p class="text-sm text-gray-700">${tags}</p>
                </div>
            </div>` : ''}
            ${s.description ? `
            <div class="flex gap-3 items-start">
                <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fas fa-info text-gray-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">About</p>
                    <p class="text-sm text-gray-600 leading-relaxed">${s.description}</p>
                </div>
            </div>` : ''}
        </div>`;
    }

    return s;
}

export function goBack() {
    sessionStorage.removeItem('kf_saloon_id');
    window.location.href = '/saloon';
}

export async function renderServices(saloonId) {
    const container = document.getElementById('view-services');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-8 text-gray-300 text-sm animate-pulse">Loading services...</div>`;

    const { data } = await supabase.from('saloon_services')
        .select('*').eq('saloon_id', saloonId).eq('is_available', true).order('sort_order');

    if (!data?.length) { container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No services listed yet.</p>`; return; }

    const groups = {};
    data.forEach(s => { if (!groups[s.category]) groups[s.category] = []; groups[s.category].push(s); });

    container.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="mb-5">
        <h3 class="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2 mb-3">${cat}</h3>
        ${items.map(item => `
        <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
            <div class="flex-1 min-w-0 pr-3">
                <h4 class="font-bold text-gray-900 text-sm">${item.name}</h4>
                ${item.description ? `<p class="text-[10px] text-gray-500 mt-0.5">${item.description}</p>` : ''}
                ${item.duration ? `<p class="text-[10px] font-bold mt-0.5" style="color:#7C3AED"><i class="fas fa-clock mr-1"></i>${item.duration} min</p>` : ''}
            </div>
            <div class="text-right shrink-0">
                <p class="font-black text-sm" style="color:#7C3AED">${item.price.toLocaleString()} RWF</p>
                <button onclick="window._bookService('${item.name}', ${item.price})"
                        class="mt-1 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition" style="background:#7C3AED">
                    Book
                </button>
            </div>
        </div>`).join('')}
    </div>`).join('');
}

export async function renderStaff(saloonId) {
    const container = document.getElementById('view-staff');
    if (!container) return;
    const { data } = await supabase.from('saloon_staff').select('*').eq('saloon_id', saloonId).order('sort_order');
    if (!data?.length) { container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No staff listed yet.</p>`; return; }
    container.innerHTML = `<div class="grid grid-cols-3 gap-3 pt-1">${data.map(m => `
    <div class="text-center">
        <div class="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-2 overflow-hidden border-2 border-gray-100">
            <img src="${m.photo_url || DEFAULT_AVATAR}"
                 class="w-full h-full object-cover"
                 onerror="this.src='${DEFAULT_AVATAR}'">
        </div>
        <p class="text-xs font-bold text-gray-900 leading-tight">${m.name}</p>
        ${m.role ? `<p class="text-[10px] text-gray-400 mt-0.5">${m.role}</p>` : ''}
    </div>`).join('')}</div>`;
}

export async function renderReviews(saloonId) {
    const container = document.getElementById('view-reviews');
    if (!container) return;
    const { data } = await supabase.from('saloon_reviews').select('*').eq('saloon_id', saloonId).order('created_at', { ascending: false });
    const listEl = document.getElementById('reviews-list') || container;
    if (!data?.length) { listEl.innerHTML = `<p class="text-center text-gray-400 text-sm py-6">No reviews yet. Be the first!</p>`; return; }
    listEl.innerHTML = data.map(r => `
    <div class="bg-gray-50 rounded-xl p-3 mb-3">
        <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-gray-900 text-sm">${r.reviewer_name}</span>
            <span class="text-amber-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
        </div>
        <p class="text-xs text-gray-500">${r.comment || ''}</p>
        <p class="text-[9px] text-gray-300 mt-1">${new Date(r.created_at).toLocaleDateString()}</p>
    </div>`).join('');
}

export async function submitReview(saloonId) {
    const name    = document.getElementById('review-name')?.value.trim();
    const comment = document.getElementById('review-comment')?.value.trim();
    const rating  = window._currentRating || 0;
    if (!name || !rating) { alert('Please enter your name and select a rating.'); return; }
    const { error } = await supabase.from('saloon_reviews').insert({ saloon_id: saloonId, reviewer_name: name, rating, comment });
    if (!error) {
        document.getElementById('review-name').value = '';
        document.getElementById('review-comment').value = '';
        window._currentRating = 0;
        document.querySelectorAll('#star-picker i').forEach(s => s.style.color = '#d1d5db');
        renderReviews(saloonId);
    }
}

export function bookViaWhatsApp(saloonName, phone, serviceName, price) {
    const normalized  = normalizePhone(phone);
    const serviceText = serviceName && price > 0
        ? `\n\nService: *${serviceName}*\nPrice: ${price.toLocaleString()} RWF`
        : '';
    const msg = encodeURIComponent(`Hi! I'd like to book an appointment at *${saloonName}*.${serviceText}\n\nPlease confirm my appointment. Thank you!`);
    window.open(`https://wa.me/${normalized}?text=${msg}`, '_blank');
}

function loadYoutube(url) {
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
    if (!videoId) return;
    const frame    = document.getElementById('youtube-frame');
    const cover    = document.getElementById('saloon-cover');
    const gradient = document.getElementById('hero-gradient');
    if (cover)    cover.classList.add('hidden');
    if (gradient) gradient.classList.add('hidden');
    frame.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
    frame.classList.remove('hidden');
    document.getElementById('youtube-play-btn')?.classList.add('hidden');
}