import { supabase } from '../supabase.js';

let _mapLoaded  = false;
let _map        = null;
let _markers    = [];   // { marker, data } — all pins
let _allData    = [];   // full restaurant list for search

export function openMap() {
    const overlay = document.getElementById('map-overlay');
    if (overlay) overlay.classList.remove('hidden');

    if (_mapLoaded) {
        // Invalidate size in case overlay was hidden when map rendered
        setTimeout(() => _map && _map.invalidateSize(), 100);
        return;
    }

    _mapLoaded = true;

    const link  = document.createElement('link');
    link.rel    = 'stylesheet';
    link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script  = document.createElement('script');
    script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);
}

export function closeMap() {
    document.getElementById('map-overlay')?.classList.add('hidden');
}

async function initMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;

    _map = L.map('leaflet-map', { zoomControl: true }).setView([-1.9441, 30.0619], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(_map);

    // Fetch all restaurants that have coordinates
    const { data } = await supabase
        .from('restaurants_with_rating')
        .select('id, name, category, address, lat, lng, is_open, is_vip, avg_rating, tags, cover_image_url')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

    _allData = data || [];

    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = `${_allData.length} restaurant${_allData.length !== 1 ? 's' : ''} on map`;

    _allData.forEach(r => addPin(r));

    // Fit map to show all pins if any exist
    if (_markers.length) {
        const group = L.featureGroup(_markers.map(m => m.marker));
        _map.fitBounds(group.getBounds().pad(0.2));
    }
}

function addPin(r) {
    const isVip  = r.is_vip;
    const isOpen = r.is_open;

    // Custom pin — coral for open/VIP, gray for closed
    const color  = !isOpen ? '#9ca3af' : isVip ? '#f59e0b' : '#FF7F50';
    const icon   = L.divIcon({
        className: '',
        html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
            <div style="
                background:${color};border:2.5px solid white;
                width:${isVip ? '36px' : '30px'};height:${isVip ? '36px' : '30px'};
                border-radius:50%;display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:${isVip ? '14px' : '12px'}">
                ${isVip ? '⭐' : getCategoryIcon(r.category)}
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
        </div>`,
        iconAnchor: [isVip ? 18 : 15, isVip ? 44 : 38],
        iconSize:   [isVip ? 36 : 30, isVip ? 44 : 38]
    });

    const marker = L.marker([r.lat, r.lng], { icon })
        .addTo(_map)
        .bindPopup(buildPopup(r), { maxWidth: 220, className: 'kivu-popup' });

    _markers.push({ marker, data: r });
}

function buildPopup(r) {
    const stars  = r.avg_rating ? `⭐ ${parseFloat(r.avg_rating).toFixed(1)}` : '';
    const status = r.is_open
        ? `<span style="color:#16a34a;font-weight:700;font-size:10px">● Open</span>`
        : `<span style="color:#ef4444;font-weight:700;font-size:10px">● Closed</span>`;
    const img = r.cover_image_url
        ? `<img src="${r.cover_image_url}" style="width:100%;height:70px;object-fit:cover;border-radius:8px 8px 0 0" onerror="this.style.display='none'">`
        : '';

    return `
    <div style="font-family:system-ui,sans-serif;min-width:180px">
        ${img}
        <div style="padding:10px">
            <div style="font-weight:800;font-size:13px;color:#111;margin-bottom:3px">${r.name}</div>
            <div style="font-size:10px;color:#6b7280;margin-bottom:4px">${r.category} · ${r.address || ''}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:11px;color:#f59e0b;font-weight:700">${stars}</span>
                ${status}
            </div>
            <button onclick="window._mapOpenRestaurant('${r.id}')"
                    style="width:100%;background:#FF7F50;color:white;border:none;border-radius:8px;padding:7px;font-weight:700;font-size:11px;cursor:pointer">
                View Restaurant →
            </button>
        </div>
    </div>`;
}

// Navigate from map popup — store in sessionStorage then navigate
window._mapOpenRestaurant = function(id) {
    // Store in sessionStorage same as feed does
    const cache = JSON.parse(sessionStorage.getItem('kf_restaurants') || '{}');
    const r     = _allData.find(r => r.id === id);
    if (r) cache[r.id] = r;
    sessionStorage.setItem('kf_restaurants', JSON.stringify(cache));
    sessionStorage.setItem('kf_selected_id', id);
    window.location.href = '/food/restaurant';
};

// Search — filters pins and flies to matched restaurant or geocoded location
export function mapSearch(query) {
    if (!_map) return;
    const q = query.trim().toLowerCase();

    if (!q) {
        // Reset — show all pins
        _markers.forEach(({ marker, data }) => {
            marker.addTo(_map);
            marker.setOpacity(1);
        });
        const countEl = document.getElementById('map-count');
        if (countEl) countEl.textContent = `${_allData.length} restaurants on map`;
        return;
    }

    // Filter markers by restaurant name, category, address, tags
    let matchCount = 0;
    let firstMatch = null;

    _markers.forEach(({ marker, data }) => {
        const haystack = [data.name, data.category, data.address, ...(data.tags || [])].join(' ').toLowerCase();
        const matches  = haystack.includes(q);
        if (matches) {
            marker.addTo(_map);
            marker.setOpacity(1);
            matchCount++;
            if (!firstMatch) firstMatch = marker;
        } else {
            marker.setOpacity(0.15);
        }
    });

    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = matchCount > 0
        ? `${matchCount} result${matchCount !== 1 ? 's' : ''} found`
        : 'No restaurants found — searching location...';

    if (firstMatch) {
        // Fly to first matched restaurant
        _map.flyTo(firstMatch.getLatLng(), 15, { duration: 0.8 });
        firstMatch.openPopup();
    } else {
        // No restaurant match — try geocoding the query as a place name
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=rw`)
            .then(r => r.json())
            .then(results => {
                if (results.length) {
                    _map.flyTo([results[0].lat, results[0].lon], 15, { duration: 0.8 });
                    if (countEl) countEl.textContent = `Showing: ${results[0].display_name.split(',')[0]}`;
                }
            })
            .catch(() => {});
    }
}

function getCategoryIcon(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('cafe') || c.includes('coffee')) return '☕';
    if (c.includes('bar'))                           return '🍺';
    if (c.includes('bakery'))                        return '🥐';
    if (c.includes('grill'))                         return '🔥';
    if (c.includes('fast'))                          return '🍟';
    return '🍽️';
}