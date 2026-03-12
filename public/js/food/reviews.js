import { supabase } from '../supabase.js';

let _selectedRating = 0;

export async function renderReviews(restaurantId) {
    const container = document.getElementById('view-reviews');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10 text-gray-300 text-sm animate-pulse">Loading reviews...</div>`;

    const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

    const avg = reviews?.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

    container.innerHTML = `
    <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center mb-4">
        <div class="text-4xl font-black text-coral mb-1">${avg ?? '–'}</div>
        <div class="text-amber-400 text-sm mb-1">${buildStarsFull(avg)}</div>
        <p class="text-xs text-gray-400">${reviews?.length ?? 0} review${reviews?.length !== 1 ? 's' : ''}</p>
    </div>

    <div class="bg-white border border-gray-100 rounded-xl p-4 mb-4">
        <h4 class="font-bold text-sm text-gray-800 mb-3">Write a Review</h4>
        <input id="rv-name" type="text" placeholder="Your name"
               class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 outline-none focus:border-coral transition">
        <div class="flex gap-2 mb-2" id="star-picker">
            ${[1,2,3,4,5].map(n => `
            <button onclick="window._setRating(${n})" data-star="${n}"
                    class="star-btn text-2xl text-gray-200 hover:text-amber-400 transition">
                <i class="fas fa-star"></i>
            </button>`).join('')}
        </div>
        <textarea id="rv-comment" rows="3" placeholder="Share your experience..."
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-coral resize-none transition"></textarea>
        <button onclick="window._submitReview('${restaurantId}')"
                class="w-full bg-coral text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition">
            Submit Review
        </button>
        <p id="rv-msg" class="hidden text-center text-xs mt-2 font-medium"></p>
    </div>

    <div id="review-list">
        ${reviews?.length ? reviews.map(buildReviewCard).join('') : '<p class="text-center text-gray-400 text-sm py-4">No reviews yet. Be the first!</p>'}
    </div>`;
}

export function setRating(value) {
    _selectedRating = value;
    document.querySelectorAll('.star-btn').forEach(btn => {
        const s = parseInt(btn.dataset.star);
        btn.classList.toggle('text-amber-400', s <= value);
        btn.classList.toggle('text-gray-200',  s > value);
    });
}

export async function submitReview(restaurantId) {
    const name    = document.getElementById('rv-name')?.value.trim();
    const comment = document.getElementById('rv-comment')?.value.trim();
    const msg     = document.getElementById('rv-msg');

    if (!name || !_selectedRating) {
        showMsg(msg, 'Please enter your name and a star rating.', 'text-red-500'); return;
    }

    const { error } = await supabase.from('reviews').insert({
        restaurant_id: restaurantId,
        reviewer_name: name,
        rating:        _selectedRating,
        comment:       comment || null
    });

    if (error) { showMsg(msg, 'Failed to submit. Try again.', 'text-red-500'); return; }

    _selectedRating = 0;
    showMsg(msg, '✓ Review submitted! Thank you.', 'text-green-600');
    setTimeout(() => renderReviews(restaurantId), 1000);
}

function buildReviewCard(r) {
    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    return `
    <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
        <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-xs text-gray-900">${r.reviewer_name}</span>
            <span class="text-[10px] text-amber-500 font-bold bg-white px-2 py-0.5 rounded shadow-sm">
                <i class="fas fa-star"></i> ${r.rating}.0
            </span>
        </div>
        ${r.comment ? `<p class="text-xs text-gray-600 leading-relaxed">${r.comment}</p>` : ''}
        <p class="text-[9px] text-gray-300 mt-1">${date}</p>
    </div>`;
}

function buildStarsFull(rating) {
    const r = parseFloat(rating) || 0;
    const f = Math.floor(r); const h = r % 1 >= 0.5;
    let s = '';
    for (let i = 0; i < f; i++)             s += '<i class="fas fa-star"></i>';
    if (h)                                   s += '<i class="fas fa-star-half-alt"></i>';
    for (let i = f + (h?1:0); i < 5; i++)   s += '<i class="far fa-star"></i>';
    return s;
}

function showMsg(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className = `text-center text-xs mt-2 font-medium ${cls}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}