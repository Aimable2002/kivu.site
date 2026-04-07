// /js/clinic/map.js
import { supabase } from '/js/supabase.js';

let _map        = null;
let _markers    = [];
let _allClinics = [];

// ─────────────────────────────────────────────────────────────────────
export async function openMap() {
    document.getElementById('map-overlay').classList.remove('hidden');
    if (!_map) await initMap();
}

export function closeMap() {
    document.getElementById('map-overlay').classList.add('hidden');
}

export function mapSearch(q) {
    const filtered = q
        ? _allClinics.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.address || '').toLowerCase().includes(q.toLowerCase()))
        : _allClinics;
    plotMarkers(filtered);
}

// ─────────────────────────────────────────────────────────────────────
async function initMap() {
    // Load Leaflet CSS + JS dynamically
    if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    await new Promise(resolve => {
        const s = document.createElement('script');
        s.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = resolve;
        document.head.appendChild(s);
    });

    _map = L.map('leaflet-map').setView([-1.9441, 30.0619], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(_map);

    const { data } = await supabase
        .from('clinics')
        .select('id, name, category, address, lat, lng, is_open, rating_avg, phone')
        .not('lat', 'is', null);

    _allClinics = data || [];
    document.getElementById('map-count').textContent = `${_allClinics.length} clinics on map`;
    plotMarkers(_allClinics);
}

function plotMarkers(list) {
    _markers.forEach(m => m.remove());
    _markers = [];

    list.forEach(c => {
        if (!c.lat || !c.lng) return;

        const icon = L.divIcon({
            className: '',
            html: `<div style="
                background: #1D4ED8; color: white; border: 2px solid white;
                border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
                width: 28px; height: 28px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            </div>`,
            iconSize: [28, 28], iconAnchor: [14, 28],
        });

        const marker = L.marker([c.lat, c.lng], { icon })
            .addTo(_map)
            .bindPopup(`
                <div style="min-width:160px;font-family:sans-serif">
                    <p style="font-weight:900;font-size:13px;margin:0 0 2px">${c.name}</p>
                    <p style="font-size:10px;color:#6b7280;margin:0 0 4px">${c.category} · ${c.is_open ? '🟢 Open' : '⚫ Closed'}</p>
                    ${c.address ? `<p style="font-size:10px;color:#6b7280;margin:0 0 6px">${c.address}</p>` : ''}
                    ${c.rating_avg > 0 ? `<p style="font-size:10px;font-weight:bold;color:#f59e0b;margin:0 0 6px">★ ${c.rating_avg}</p>` : ''}
                    <a href="/clinic/detail?id=${c.id}"
                       style="background:#1D4ED8;color:white;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:999px;text-decoration:none;display:inline-block">
                       View →
                    </a>
                </div>`);

        _markers.push(marker);
    });

    if (list.length && _map) {
        const group = L.featureGroup(_markers);
        _map.fitBounds(group.getBounds().pad(0.15));
    }
}
