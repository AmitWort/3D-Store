function renderCartPage() {
  const cart = getCart();
  const tableWrap = document.getElementById('cart-table-wrap');
  const emptyState = document.getElementById('cart-empty');
  const formSection = document.getElementById('checkout-form-section');

  if (!cart.length) {
    tableWrap.classList.add('hidden');
    formSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tableWrap.classList.remove('hidden');
  formSection.classList.remove('hidden');

  const rows = cart
    .map(
      (item) => `
      <tr data-id="${item.id}">
        <td><img src="${item.image}" alt="${escapeHtml(item.name)}" /></td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>₪${(item.price * item.qty).toFixed(2)}</td>
        <td><button type="button" class="remove-btn" data-remove="${item.id}" aria-label="הסר">✕</button></td>
      </tr>`
    )
    .join('');

  tableWrap.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr><th>תמונה</th><th>מוצר</th><th>כמות</th><th>סה"כ לפריט</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cart-total-row">
      <span>סה"כ לתשלום:</span>
      <span>₪${cartTotal().toFixed(2)}</span>
    </div>
  `;

  tableWrap.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.getAttribute('data-remove'));
      renderCartPage();
    });
  });
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.target;
  const msgEl = document.getElementById('order-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  const fullName = form.fullName.value.trim();
  const phone = form.phone.value.trim();
  const address = form.address.value.trim();
  const notes = form.notes.value.trim();

  if (!fullName || !phone) {
    msgEl.textContent = 'שם מלא וטלפון הם שדות חובה.';
    msgEl.className = 'message error';
    return;
  }

  const items = getCart().map((item) => ({ id: item.id, qty: item.qty }));
  submitBtn.disabled = true;
  msgEl.textContent = 'שולח הזמנה...';
  msgEl.className = 'message';

  try {
    const res = await fetch(`${WORKER_URL}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, fullName, phone, address, notes }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'שליחת ההזמנה נכשלה');
    }
    clearCart();
    document.getElementById('checkout-form-section').classList.add('hidden');
    document.getElementById('cart-table-wrap').classList.add('hidden');
    document.getElementById('order-success').classList.remove('hidden');
    document.getElementById('order-id-display').textContent = data.orderId;
  } catch (err) {
    msgEl.textContent = err.message || 'שגיאה בשליחת ההזמנה, נסו שוב.';
    msgEl.className = 'message error';
    submitBtn.disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
  const form = document.getElementById('checkout-form');
  if (form) form.addEventListener('submit', submitOrder);
});
