import { supabase } from '../supabase.js';

export async function loadRestaurant() {
    // 1. Try sessionStorage first (set by feed page on card click — no network needed)
    const sessionId = sessionStorage.getItem('kf_selected_id');
    const urlId     = new URLSearchParams(window.location.search).get('id');
    const id        = sessionId || urlId;   // QR scans land with ?id= but no sessionStorage
    const cache     = JSON.parse(sessionStorage.getItem('kf_restaurants') || '{}');
    let r           = id ? cache[id] : null;

    // 2. Fallback: fetch from Supabase (QR scan, shared link, page refresh)
    if (!r && id) {
        const { data, error } = await supabase
            .from('restaurants_with_rating')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) { window.location.href = '/food'; return null; }
        r = data;
    }

    if (!r) { window.location.href = '/food'; return null; }

    // Populate header
    document.getElementById('resto-name').textContent     = r.name;
    document.getElementById('resto-category').textContent = r.category;
    document.getElementById('resto-address').innerHTML    =
        `<i class="fas fa-map-marker-alt mr-1"></i>${r.address || ''}`;

    const statusEl   = document.getElementById('resto-status');
    statusEl.textContent = r.is_open ? 'Open' : 'Closed';
    statusEl.className   = r.is_open
        ? 'text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200'
        : 'text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-400 border border-red-200';

    const cover = document.getElementById('resto-cover');
    if (cover) {
        cover.style.display = '';          // always clear any hidden state first
        if (r.cover_image_url) {
            cover.src = r.cover_image_url;
            cover.onerror = () => { cover.style.display = 'none'; };
        } else {
            cover.style.display = 'none';
        }
    }

    const playBtn = document.getElementById('youtube-play-btn');
    if (!r.youtube_url) {
        playBtn?.classList.add('hidden');
    } else {
        playBtn?.classList.remove('hidden');
        playBtn.onclick = () => loadYoutube(r.youtube_url);
    }

    const waBtn = document.getElementById('whatsapp-order-btn');
    if (waBtn && r.phone) waBtn.dataset.phone = r.phone.replace(/\D/g, '');

    const qrBtn = document.getElementById('qr-btn');
    if (qrBtn) qrBtn.dataset.id = r.id;

    document.getElementById('rating-avg').textContent   = r.avg_rating ?? '–';
    document.getElementById('rating-count').textContent = `${r.review_count ?? 0} reviews`;

    return r;
}

// Back button — clear selected id so feed shows fresh
export function goBack() {
    sessionStorage.removeItem('kf_selected_id');
    window.location.href = '/food';
}

function loadYoutube(url) {
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
    if (!videoId) return;

    const frame   = document.getElementById('youtube-frame');
    const playBtn = document.getElementById('youtube-play-btn');
    const cover   = document.getElementById('resto-cover');
    const overlay = document.getElementById('hero-gradient');

    // Hide cover + gradient, show iframe filling the full hero
    if (cover)   cover.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');

    frame.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1"
        frameborder="0" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
    frame.classList.remove('hidden');
    playBtn?.classList.add('hidden');
}