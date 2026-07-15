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
      .map(
        (p) => `
        <a class="product-card" href="product.html?id=${encodeURIComponent(p.id)}">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <div class="info">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="price">₪${Number(p.price).toFixed(2)}</div>
          </div>
        </a>`
      )
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
