async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const container = document.getElementById('product-container');

  if (!id) {
    container.innerHTML = '<p class="empty-state">מוצר לא נמצא.</p>';
    return;
  }

  let product;
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    const products = await res.json();
    product = products.find((p) => p.id === id);
  } catch {
    container.innerHTML = '<p class="empty-state">שגיאה בטעינת המוצר.</p>';
    return;
  }

  if (!product) {
    container.innerHTML = '<p class="empty-state">מוצר לא נמצא.</p>';
    return;
  }

  document.title = `${product.name} - חנות הדפסה תלת מימד`;

  const hasTiers = Array.isArray(product.tiers) && product.tiers.length > 0;
  const tiersHtml = hasTiers
    ? `<ul class="tier-list">
        <li>1 יח' - ₪${Number(product.price).toFixed(2)}</li>
        ${product.tiers.map((t) => `<li>${t.qty} יח' - ₪${Number(t.price).toFixed(2)}</li>`).join('')}
      </ul>`
    : '';

  container.innerHTML = `
    <div class="product-image-wrap">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
      ${hasTiers ? '<span class="sale-badge">🔥 מבצע</span>' : ''}
    </div>
    <div>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="price">₪${Number(product.price).toFixed(2)} <span class="price-unit">ליחידה</span></div>
      ${tiersHtml}
      <div class="qty-row">
        <button type="button" id="qty-minus" aria-label="הפחת כמות">-</button>
        <input type="number" id="qty-input" value="1" min="1" step="1" />
        <button type="button" id="qty-plus" aria-label="הוסף כמות">+</button>
      </div>
      <div id="qty-total" class="qty-total"></div>
      <div class="action-row" id="pre-add-actions">
        <button type="button" class="btn btn-primary" id="add-to-cart-btn">הוסף לעגלה</button>
      </div>
      <div class="action-row hidden" id="post-add-actions">
        <span class="message success">המוצר נוסף לעגלה!</span>
        <a class="btn btn-outline" href="index.html">המשך בקניות</a>
        <a class="btn btn-secondary" href="cart.html">לסיום ההזמנה</a>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById('qty-input');
  const qtyTotalEl = document.getElementById('qty-total');

  const updateQtyTotal = () => {
    const qty = Math.max(1, Math.floor(Number(qtyInput.value)) || 1);
    qtyTotalEl.textContent = `סה"כ עבור ${qty} יח': ₪${calcLineTotal(product, qty).toFixed(2)}`;
  };
  updateQtyTotal();

  document.getElementById('qty-minus').addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    updateQtyTotal();
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qtyInput.value = Number(qtyInput.value) + 1;
    updateQtyTotal();
  });
  qtyInput.addEventListener('input', updateQtyTotal);

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const qty = Math.max(1, Math.floor(Number(qtyInput.value)) || 1);
    addToCart(product, qty);
    document.getElementById('pre-add-actions').classList.add('hidden');
    document.getElementById('post-add-actions').classList.remove('hidden');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadProduct);
