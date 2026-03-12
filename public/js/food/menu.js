import { supabase } from '../supabase.js';
import { addToCart } from './cart.js';

// In-memory map of item id → item object — never pass objects through onclick attributes
const _itemMap = new Map();

export async function renderMenu(restaurantId) {
    const container = document.getElementById('view-menu');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10 text-gray-300 text-sm animate-pulse">Loading menu...</div>`;

    const { data: cats } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');

    const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order');

    if (!cats?.length) {
        container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No menu available yet.</p>`;
        return;
    }

    // Store all items in map so onclick only needs the id
    (items || []).forEach(item => _itemMap.set(item.id, item));

    container.innerHTML = (cats || []).map(cat => {
        const catItems = (items || []).filter(i => i.category_id === cat.id);
        return `
        <div class="mb-6">
            <h3 class="font-bold text-gray-800 text-base border-b border-gray-100 pb-2 mb-3">${cat.name}</h3>
            ${catItems.length
                ? catItems.map(item => buildItem(item)).join('')
                : '<p class="text-xs text-gray-400 py-2">No items in this category.</p>'}
        </div>`;
    }).join('');

    observeLazyImages(container);
}

function buildItem(item) {
    const img = item.image_url
        ? `<img data-src="${item.image_url}" class="lazy w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-200" src="" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-300 text-xl"><i class="fas fa-utensils"></i></div>`;

    // Pass only item.id — safe, no special chars can break the attribute
    return `
    <div class="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
        ${img}
        <div class="flex-1 min-w-0">
            <h4 class="font-bold text-gray-900 text-sm">${item.name}</h4>
            ${item.description ? `<p class="text-[10px] text-gray-500 mt-0.5 leading-tight">${item.description}</p>` : ''}
            <div class="flex items-center justify-between mt-2">
                <span class="text-coral font-bold text-sm">${item.price.toLocaleString()} RWF</span>
                <button onclick="window._addToCart('${item.id}')"
                        class="bg-coral text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition">
                    + Add
                </button>
            </div>
        </div>
    </div>`;
}

// Called from restaurant.html — looks up item by id from map
export function addItemToCart(id) {
    const item = _itemMap.get(id);
    if (item) addToCart(item);
}

function observeLazyImages(container) {
    const imgs = container.querySelectorAll('img.lazy');
    if (!imgs.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const img = e.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                io.unobserve(img);
            }
        });
    }, { rootMargin: '100px' });
    imgs.forEach(img => io.observe(img));
}