import { supabase } from '../supabase.js';

let _mapLoaded = false;
let _map       = null;
let _markers   = [];
let _allData   = [];

function normalizePhone(raw) {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('250') && digits.length === 12) return digits;
    if (digits.startsWith('1')   && digits.length === 11) return digits;
    if (digits.startsWith('0')   && digits.length === 10) return '250' + digits.slice(1);
    if (digits.length === 9) return '250' + digits;
    return digits;
}

export function openMap() {
    const overlay = document.getElementById('map-overlay');
    if (overlay) overlay.classList.remove('hidden');

    if (_mapLoaded) {
        setTimeout(() => _map && _map.invalidateSize(), 100);
        return;
    }
    _mapLoaded = true;

    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script  = document.createElement('script');
    script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);
}

export function closeMap() {
    document.getElementById('map-overlay')?.classList.add('hidden');
    // Reset title when closing
    const t = document.getElementById('map-title');
    if (t) t.textContent = 'Saloons Map';
}

async function initMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;

    _map = L.map('leaflet-map', { zoomControl: true }).setView([-1.9441, 30.0619], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(_map);

    const { data } = await supabase
        .from('saloons_with_rating')
        .select('id, name, category, address, lat, lng, is_open, is_vip, avg_rating, tags, cover_image_url, booking_type, phone')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

    _allData = data || [];

    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = `${_allData.length} saloon${_allData.length !== 1 ? 's' : ''} on map`;

    _allData.forEach(s => addPin(s));

    if (_markers.length) {
        const group = L.featureGroup(_markers.map(m => m.marker));
        _map.fitBounds(group.getBounds().pad(0.2));
    }
}

function addPin(s) {
    const isVip  = s.is_vip;
    const isOpen = s.is_open;
    const color  = !isOpen ? '#9ca3af' : isVip ? '#f59e0b' : '#7C3AED';

    const icon = L.divIcon({
        className: '',
        html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
            <div style="
                background:${color};border:2.5px solid white;
                width:${isVip ? '36px' : '30px'};height:${isVip ? '36px' : '30px'};
                border-radius:50%;display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:${isVip ? '14px' : '12px'}">
                ${isVip ? '⭐' : getCategoryIcon(s.category)}
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
        </div>`,
        iconAnchor: [isVip ? 18 : 15, isVip ? 44 : 38],
        iconSize:   [isVip ? 36 : 30, isVip ? 44 : 38]
    });

    const marker = L.marker([s.lat, s.lng], { icon })
        .addTo(_map)
        .bindPopup(buildPopup(s), { maxWidth: 220, className: 'kivu-popup' });

    marker.on('popupopen', () => {
        const t = document.getElementById('map-title');
        if (t) t.textContent = s.name;
    });
    marker.on('popupclose', () => {
        const t = document.getElementById('map-title');
        if (t) t.textContent = 'Saloons Map';
    });

    _markers.push({ marker, data: s });
}

function buildPopup(s) {
    const stars  = s.avg_rating ? `⭐ ${parseFloat(s.avg_rating).toFixed(1)}` : '';
    const status = s.is_open
        ? `<span style="color:#16a34a;font-weight:700;font-size:10px">● Open</span>`
        : `<span style="color:#ef4444;font-weight:700;font-size:10px">● Closed</span>`;
    const img = s.cover_image_url
        ? `<img src="${s.cover_image_url}" style="width:100%;height:70px;object-fit:cover;border-radius:8px 8px 0 0" onerror="this.style.display='none'">`
        : '';
    const bookingMap = { walkin: '🚶 Walk-ins', appointment: '📅 Appt Only', both: '🚶+📅' };
    const booking = s.booking_type ? `<span style="font-size:10px;color:#7C3AED;font-weight:600">${bookingMap[s.booking_type] || ''}</span>` : '';
    const phone = s.phone ? normalizePhone(s.phone) : '';
    const waBtn = phone
        ? `<button onclick="window._mapWhatsApp('${phone}','${s.name.replace(/'/g,"\\'")}','')"
                   style="width:100%;background:#25D366;color:white;border:none;border-radius:8px;padding:7px;font-weight:700;font-size:11px;cursor:pointer;margin-top:4px">
               <i class="fab fa-whatsapp"></i> WhatsApp
           </button>`
        : '';

    return `
    <div style="font-family:system-ui,sans-serif;min-width:180px">
        ${img}
        <div style="padding:10px">
            <div style="font-weight:800;font-size:13px;color:#111;margin-bottom:3px">${s.name}</div>
            <div style="font-size:10px;color:#6b7280;margin-bottom:4px">${s.category} · ${s.address || ''}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:11px;color:#f59e0b;font-weight:700">${stars}</span>
                ${status}
            </div>
            <div style="margin-bottom:6px">${booking}</div>
            <button onclick="window._mapOpenSaloon('${s.id}')"
                    style="width:100%;background:#7C3AED;color:white;border:none;border-radius:8px;padding:7px;font-weight:700;font-size:11px;cursor:pointer">
                View Saloon →
            </button>
            ${waBtn}
        </div>
    </div>`;
}

window._mapOpenSaloon = function(id) {
    const cache = JSON.parse(sessionStorage.getItem('kf_saloons') || '{}');
    const s     = _allData.find(s => s.id === id);
    if (s) cache[s.id] = s;
    sessionStorage.setItem('kf_saloons', JSON.stringify(cache));
    sessionStorage.setItem('kf_saloon_id', id);
    window.location.href = '/saloon/detail';
};

window._mapWhatsApp = function(phone, name, service) {
    const msg = encodeURIComponent(`Hi! I'd like to book an appointment at *${name}*.\n\nPlease confirm my appointment. Thank you!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};

export function mapSearch(query) {
    if (!_map) return;
    const q = query.trim().toLowerCase();

    if (!q) {
        _markers.forEach(({ marker }) => { marker.addTo(_map); marker.setOpacity(1); });
        const countEl = document.getElementById('map-count');
        if (countEl) countEl.textContent = `${_allData.length} saloon${_allData.length !== 1 ? 's' : ''} on map`;
        return;
    }

    let matchCount = 0;
    let firstMatch = null;

    _markers.forEach(({ marker, data }) => {
        const haystack = [data.name, data.category, data.address, ...(data.tags || [])].join(' ').toLowerCase();
        const matches  = haystack.includes(q);
        if (matches) {
            marker.addTo(_map); marker.setOpacity(1);
            matchCount++;
            if (!firstMatch) firstMatch = marker;
        } else {
            marker.setOpacity(0.15);
        }
    });

    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = matchCount > 0
        ? `${matchCount} result${matchCount !== 1 ? 's' : ''} found`
        : 'No saloons found — searching location...';

    if (firstMatch) {
        _map.flyTo(firstMatch.getLatLng(), 15, { duration: 0.8 });
        firstMatch.openPopup();
    } else {
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=rw`)
            .then(r => r.json())
            .then(results => {
                if (results.length) {
                    _map.flyTo([results[0].lat, results[0].lon], 15, { duration: 0.8 });
                    if (countEl) countEl.textContent = `📍 ${results[0].display_name.split(',')[0]}`;
                }
            })
            .catch(() => {});
    }
}

function getCategoryIcon(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('barber'))  return '✂️';
    if (c.includes('nail'))    return '💅';
    if (c.includes('beauty'))  return '💄';
    if (c.includes('unisex'))  return '🪞';
    return '✂️';
}