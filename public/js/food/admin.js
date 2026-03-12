const api = (path, opts = {}) =>
    fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
        .then(r => r.json());

// ── Initial full load ─────────────────────────────────────────
export async function loadAll() {
    const container = document.getElementById('admin-list');
    if (!container) return;
    container.innerHTML = skeleton();

    const [applications, restaurants] = await Promise.all([
        api('/api/admin/applications'),
        api('/api/admin/restaurants')
    ]);

    if (applications.error || restaurants.error) {
        container.innerHTML = `<p class="text-red-400 text-sm text-center py-8">
            Failed to load. Check server .env keys.</p>`;
        return;
    }

    container.innerHTML = '';

    const pending  = applications.filter(a => a.status === 'pending');
    const approved = restaurants.filter(r => r.status === 'approved');
    const rejected = applications.filter(a => a.status === 'rejected');

    if (pending.length) {
        container.insertAdjacentHTML('beforeend', sectionHeader('🟡 Pending Applications', pending.length, 'pending-section'));
        pending.forEach(a => container.insertAdjacentHTML('beforeend', buildApplicationCard(a)));
    }

    if (approved.length) {
        container.insertAdjacentHTML('beforeend', sectionHeader('🟢 Live Restaurants', approved.length, 'approved-section'));
        approved.forEach(r => container.insertAdjacentHTML('beforeend', buildRestaurantCard(r)));
    }

    if (rejected.length) {
        container.insertAdjacentHTML('beforeend', sectionHeader('🔴 Rejected', rejected.length, 'rejected-section'));
        rejected.forEach(a => container.insertAdjacentHTML('beforeend', buildApplicationCard(a)));
    }

    if (!pending.length && !approved.length && !rejected.length) {
        container.innerHTML = `<p class="text-gray-400 text-sm text-center py-16">Nothing here yet.</p>`;
    }
}

// ── Actions — NO full reload, update card in place ────────────
export async function approveApplication(id) {
    const card = document.getElementById('card-' + id);
    setCardLoading(card, true);

    const res = await api(`/api/admin/applications/${id}/approve`, { method: 'POST' });
    if (res.error) { setCardLoading(card, false); alert('Failed: ' + res.error); return; }

    // Remove from pending section, card disappears with fade
    fadeRemove(card);

    // Fetch the newly created restaurant and add it to live section
    const restaurants = await api('/api/admin/restaurants');
    const r = restaurants.find ? restaurants[0] : null; // newest one
    if (r) appendToSection('approved-section', buildRestaurantCard(r));
    updateSectionCount('pending-section', -1);
    updateSectionCount('approved-section', +1);
}

export async function rejectApplication(id) {
    const card = document.getElementById('card-' + id);
    setCardLoading(card, true);

    const res = await api(`/api/admin/applications/${id}/reject`, { method: 'POST' });
    if (res.error) { setCardLoading(card, false); alert('Failed: ' + res.error); return; }

    // Replace card's buttons with rejected badge — no flash, no reload
    const btnRow = card.querySelector('.action-row');
    if (btnRow) btnRow.remove();
    const badge = card.querySelector('.status-badge');
    if (badge) {
        badge.textContent = 'REJECTED';
        badge.className = 'status-badge text-[10px] font-bold px-2 py-1 rounded border shrink-0 bg-red-100 text-red-400 border-red-200';
    }
    card.style.opacity = '0.6';
    updateSectionCount('pending-section', -1);
}

export async function toggleVIP(id, current) {
    const btn = document.getElementById('vip-btn-' + id);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    const next = !current;
    const res  = await api(`/api/admin/restaurants/${id}/vip`, {
        method: 'POST', body: JSON.stringify({ is_vip: next })
    });
    if (res.error) { if (btn) { btn.disabled = false; } alert('Failed: ' + res.error); return; }

    // Update button in place
    if (btn) {
        btn.disabled   = false;
        btn.textContent = next ? '★ Remove VIP' : '★ Make VIP';
        btn.className   = `flex-1 text-xs font-bold py-2.5 rounded-xl border active:scale-95 transition
            ${next ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
        btn.setAttribute('onclick', `window._toggleVIP('${id}', ${next})`);
    }
    // Update VIP badge on the card
    const card    = document.getElementById('card-' + id);
    const vipBadge = card?.querySelector('.vip-badge');
    if (vipBadge) {
        vipBadge.textContent  = next ? '⭐ VIP' : '';
        vipBadge.className    = next
            ? 'vip-badge text-[9px] bg-yellow-100 text-yellow-600 font-bold px-2 py-0.5 rounded border border-yellow-200'
            : 'vip-badge hidden';
    }
}

export async function toggleOpen(id, current) {
    const btn = document.getElementById('open-btn-' + id);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    const next = !current;
    const res  = await api(`/api/admin/restaurants/${id}/open`, {
        method: 'POST', body: JSON.stringify({ is_open: next })
    });
    if (res.error) { if (btn) { btn.disabled = false; } alert('Failed: ' + res.error); return; }

    if (btn) {
        btn.disabled    = false;
        btn.textContent = next ? 'Set Closed' : 'Set Open';
        btn.className   = `flex-1 text-xs font-bold py-2.5 rounded-xl border active:scale-95 transition
            ${next ? 'bg-red-50 text-red-400 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`;
        btn.setAttribute('onclick', `window._toggleOpen('${id}', ${next})`);
    }
    const card       = document.getElementById('card-' + id);
    const openBadge  = card?.querySelector('.open-badge');
    if (openBadge) {
        openBadge.textContent = next ? 'Open' : 'Closed';
        openBadge.className   = next
            ? 'open-badge text-[9px] font-bold px-2 py-0.5 rounded border bg-green-100 text-green-600 border-green-200'
            : 'open-badge text-[9px] font-bold px-2 py-0.5 rounded border bg-red-100 text-red-400 border-red-200';
    }
}

// ── Card builders ─────────────────────────────────────────────
function buildApplicationCard(a) {
    const date = new Date(a.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const tagList = (a.tags || []).join(', ') || '–';
    return `
    <div id="card-${a.id}" class="bg-white rounded-xl border border-gray-100 p-4 mb-3 shadow-sm transition-all duration-300">
        <div class="flex justify-between items-start mb-1">
            <div>
                <h4 class="font-bold text-gray-900 text-sm">${a.name}</h4>
                <p class="text-xs text-gray-400">${a.category || 'Restaurant'} · ${a.address || '–'}</p>
                <p class="text-xs text-gray-400">${a.phone || '–'} · ${date}</p>
                ${a.tags?.length ? `<p class="text-xs text-gray-400 mt-0.5">Tags: ${tagList}</p>` : ''}
                ${a.lat ? `<p class="text-xs text-green-500 mt-0.5"><i class="fas fa-map-marker-alt"></i> ${parseFloat(a.lat).toFixed(4)}, ${parseFloat(a.lng).toFixed(4)}</p>` : ''}
            </div>
            <span class="status-badge text-[10px] font-bold px-2 py-1 rounded border shrink-0 ${statusClass(a.status)}">${a.status.toUpperCase()}</span>
        </div>
        ${a.description ? `<p class="text-xs text-gray-500 mt-1 mb-2 leading-relaxed">${a.description}</p>` : '<div class="mb-1"></div>'}
        ${a.status === 'pending' ? `
        <div class="action-row flex gap-2 mt-2">
            <button onclick="window._approve('${a.id}')"
                    class="flex-1 bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition">
                ✓ Approve & Publish
            </button>
            <button onclick="window._reject('${a.id}')"
                    class="flex-1 bg-white text-red-400 text-xs font-bold py-2.5 rounded-xl border border-red-200 active:scale-95 transition">
                ✕ Reject
            </button>
        </div>` : ''}
    </div>`;
}

function buildRestaurantCard(r) {
    return `
    <div id="card-${r.id}" class="bg-white rounded-xl border border-gray-100 p-4 mb-3 shadow-sm">
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-bold text-gray-900 text-sm">${r.name}</h4>
                <p class="text-xs text-gray-400">${r.category} · ${r.address || '–'}</p>
                <p class="text-xs text-gray-400">${r.phone || '–'}</p>
            </div>
            <div class="flex flex-col gap-1 items-end">
                <span class="${r.is_vip ? 'vip-badge text-[9px] bg-yellow-100 text-yellow-600 font-bold px-2 py-0.5 rounded border border-yellow-200' : 'vip-badge hidden'}">${r.is_vip ? '⭐ VIP' : ''}</span>
                <span class="open-badge text-[9px] font-bold px-2 py-0.5 rounded border ${r.is_open ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-400 border-red-200'}">${r.is_open ? 'Open' : 'Closed'}</span>
            </div>
        </div>
        <div class="flex gap-2">
            <button id="vip-btn-${r.id}" onclick="window._toggleVIP('${r.id}', ${r.is_vip})"
                    class="flex-1 text-xs font-bold py-2.5 rounded-xl border active:scale-95 transition ${r.is_vip ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}">
                ${r.is_vip ? '★ Remove VIP' : '★ Make VIP'}
            </button>
            <button id="open-btn-${r.id}" onclick="window._toggleOpen('${r.id}', ${r.is_open})"
                    class="flex-1 text-xs font-bold py-2.5 rounded-xl border active:scale-95 transition ${r.is_open ? 'bg-red-50 text-red-400 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}">
                ${r.is_open ? 'Set Closed' : 'Set Open'}
            </button>
        </div>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────
function sectionHeader(label, count, sectionId) {
    return `<div id="${sectionId}" class="flex items-center gap-2 mb-2 mt-4 first:mt-0">
        <span class="text-xs font-black text-gray-700 uppercase tracking-widest">${label}</span>
        <span class="section-count text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">${count}</span>
    </div>`;
}

function fadeRemove(el) {
    if (!el) return;
    el.style.transition = 'opacity .3s, max-height .4s';
    el.style.opacity    = '0';
    el.style.maxHeight  = el.offsetHeight + 'px';
    setTimeout(() => {
        el.style.maxHeight = '0';
        el.style.padding   = '0';
        el.style.margin    = '0';
        el.style.border    = 'none';
    }, 300);
    setTimeout(() => el.remove(), 700);
}

function setCardLoading(card, loading) {
    if (!card) return;
    card.style.opacity = loading ? '0.5' : '1';
    card.querySelectorAll('button').forEach(b => b.disabled = loading);
}

function appendToSection(sectionId, html) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.insertAdjacentHTML('afterend', html);
}

function updateSectionCount(sectionId, delta) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const countEl = section.querySelector('.section-count');
    if (!countEl) return;
    const current = parseInt(countEl.textContent) || 0;
    const next    = current + delta;
    countEl.textContent = next;
    if (next <= 0) section.style.display = 'none';
}

function statusClass(s) {
    if (s === 'approved') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'rejected') return 'bg-red-100 text-red-400 border-red-200';
    return 'bg-yellow-100 text-yellow-600 border-yellow-200';
}

function skeleton() {
    return Array(3).fill(`
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-3 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-3/4 mb-1"></div>
        <div class="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>`).join('');
}