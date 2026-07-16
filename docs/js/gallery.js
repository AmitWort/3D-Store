async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('empty-state');
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    const products = await res.json();
    if (!products.length) {
      empty.classList.remove('hidden');
      return;
    }
    grid.innerHTML = products
      .map((p) => {
        const hasTiers = Array.isArray(p.tiers) && p.tiers.length > 0;
        const bestTier = hasTiers ? p.tiers.reduce((a, b) => (b.qty > a.qty ? b : a)) : null;
        return `
        <a class="product-card" href="product.html?id=${encodeURIComponent(p.id)}">
          <div class="product-image-wrap">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
            ${hasTiers ? '<span class="sale-badge">🔥 מבצע</span>' : ''}
          </div>
          <div class="info">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="price">₪${Number(p.price).toFixed(2)}</div>
            ${bestTier ? `<div class="tier-hint">${bestTier.qty} יח' ב-₪${Number(bestTier.price).toFixed(2)}</div>` : ''}
          </div>
        </a>`;
      })
      .join('');
  } catch (err) {
    empty.textContent = 'שגיאה בטעינת המוצרים, נסו לרענן את הדף.';
    empty.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadGallery);
