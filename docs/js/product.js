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

  container.innerHTML = `
    <img src="${product.image}" alt="${escapeHtml(product.name)}" />
    <div>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="price">₪${Number(product.price).toFixed(2)}</div>
      <div class="qty-row">
        <button type="button" id="qty-minus" aria-label="הפחת כמות">-</button>
        <input type="number" id="qty-input" value="1" min="1" step="1" />
        <button type="button" id="qty-plus" aria-label="הוסף כמות">+</button>
      </div>
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
  document.getElementById('qty-minus').addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qtyInput.value = Number(qtyInput.value) + 1;
  });

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
