import { supabase } from '../supabase.js';

const cart = [];

export function addToCart(item) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCartBadge();
    showAddedFlash(item.name);
}

export function removeFromCart(itemId) {
    const idx = cart.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    if (cart[idx].qty > 1) cart[idx].qty -= 1;
    else cart.splice(idx, 1);
    renderCartBadge();
    renderCartDrawer();
}

export function renderCartBadge() {
    const badge = document.getElementById('cart-badge');
    const total = cart.reduce((s, i) => s + i.qty, 0);
    if (!badge) return;
    badge.textContent = total;
    badge.classList.toggle('hidden', total === 0);
    document.getElementById('cart-btn')?.classList.toggle('hidden', total === 0);
}

export function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.remove('hidden');
    renderCartDrawer();
}

export function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.add('hidden');
}

export function renderCartDrawer() {
    const list = document.getElementById('cart-list');
    const total = document.getElementById('cart-total');
    if (!list) return;

    if (!cart.length) {
        list.innerHTML = `<p class="text-center text-gray-400 text-sm py-8">Your cart is empty.</p>`;
        if (total) total.textContent = '0 RWF';
        return;
    }

    list.innerHTML = cart.map(item => `
    <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <div>
            <p class="text-sm font-bold text-gray-900">${item.name}</p>
            <p class="text-xs text-gray-400">${item.price.toLocaleString()} RWF × ${item.qty}</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-coral">${(item.price * item.qty).toLocaleString()} RWF</span>
            <button onclick="window._removeFromCart('${item.id}')" class="text-gray-300 hover:text-red-400 transition">
                <i class="fas fa-times"></i>
            </button>
        </div>
    </div>`).join('');

    const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (total) total.textContent = `${sum.toLocaleString()} RWF`;
}

export async function checkoutWhatsApp(restaurantId, phone) {
    if (!cart.length) return;

    const lines   = cart.map(i => `- ${i.name} x${i.qty} = ${(i.price * i.qty).toLocaleString()} RWF`).join('\n');
    const sum     = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const message = encodeURIComponent(`Hello! I would like to order:\n\n${lines}\n\nTotal: ${sum.toLocaleString()} RWF\n\nThank you!`);

    await supabase.from('orders').insert({
        restaurant_id:   restaurantId,
        items:           cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        whatsapp_number: phone
    });

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

function showAddedFlash(name) {
    const flash = document.getElementById('cart-flash');
    if (!flash) return;
    flash.textContent = `✓ ${name} added`;
    flash.classList.remove('hidden', 'opacity-0');
    flash.classList.add('opacity-100');
    setTimeout(() => {
        flash.classList.add('opacity-0');
        setTimeout(() => flash.classList.add('hidden'), 300);
    }, 1500);
}