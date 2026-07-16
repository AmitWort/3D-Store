const ADMIN_TOKEN_KEY = '3dstorekids_admin_token';

let cachedProducts = [];
let editingProductId = null;

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

function showPanel() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('panel-section').classList.remove('hidden');
  loadAdminProducts();
}

function showLogin() {
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('panel-section').classList.add('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById('admin-password').value;
  const msgEl = document.getElementById('login-message');
  msgEl.textContent = 'מתחבר...';
  msgEl.className = 'message';
  try {
    const res = await fetch(`${WORKER_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'התחברות נכשלה');
    setAdminToken(data.token);
    msgEl.textContent = '';
    showPanel();
  } catch (err) {
    msgEl.textContent = err.message || 'סיסמה שגויה';
    msgEl.className = 'message error';
  }
}

async function loadAdminProducts() {
  const listEl = document.getElementById('admin-product-list');
  listEl.innerHTML = '<p>טוען מוצרים...</p>';
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    cachedProducts = await res.json();
    if (!cachedProducts.length) {
      listEl.innerHTML = '<p>אין עדיין מוצרים בגלריה.</p>';
      return;
    }
    listEl.innerHTML = cachedProducts
      .map((p) => {
        const hasTiers = Array.isArray(p.tiers) && p.tiers.length > 0;
        return `
        <div class="admin-product-row" data-id="${p.id}">
          <img src="${p.image}" alt="" />
          <span class="name">${escapeHtml(p.name)} - ₪${Number(p.price).toFixed(2)}${hasTiers ? ' 🔥' : ''}</span>
          <div class="actions">
            <button type="button" class="btn btn-outline" data-edit="${p.id}">ערוך</button>
            <button type="button" class="btn btn-danger" data-delete="${p.id}">מחק</button>
          </div>
        </div>`;
      })
      .join('');
    listEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => startEdit(btn.getAttribute('data-edit')));
    });
    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-delete')));
    });
  } catch {
    listEl.innerHTML = '<p>שגיאה בטעינת המוצרים.</p>';
  }
}

async function deleteProduct(id) {
  if (!confirm('למחוק את המוצר הזה?')) return;
  try {
    const res = await fetch(`${WORKER_URL}/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getAdminToken() }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'מחיקה נכשלה');
    if (editingProductId === id) cancelEdit();
    loadAdminProducts();
  } catch (err) {
    if (err.message && err.message.includes('מחובר')) {
      clearAdminToken();
      showLogin();
    }
    alert(err.message || 'שגיאה במחיקת המוצר');
  }
}

// ---------- מבצעי כמות (tiers) ----------

function renderTierRow(qty, price) {
  const container = document.getElementById('tier-rows');
  const row = document.createElement('div');
  row.className = 'tier-row';
  row.innerHTML = `
    <input type="number" class="tier-qty" placeholder="כמות" min="2" step="1" value="${qty || ''}" />
    <span>יח' ב-₪</span>
    <input type="number" class="tier-price" placeholder="מחיר" min="0" step="0.01" value="${price ?? ''}" />
    <button type="button" class="remove-btn" aria-label="הסר מבצע">✕</button>
  `;
  row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function resetTierRows() {
  document.getElementById('tier-rows').innerHTML = '';
}

function collectTiers() {
  const tiers = [];
  document.querySelectorAll('#tier-rows .tier-row').forEach((row) => {
    const qty = Math.floor(Number(row.querySelector('.tier-qty').value));
    const price = Number(row.querySelector('.tier-price').value);
    if (qty > 1 && Number.isFinite(price) && price >= 0) tiers.push({ qty, price });
  });
  return tiers;
}

// ---------- הוספה / עריכה ----------

function startEdit(id) {
  const product = cachedProducts.find((p) => p.id === id);
  if (!product) return;

  editingProductId = id;
  const form = document.getElementById('add-product-form');
  form.name.value = product.name;
  form.price.value = product.price;
  form.image.value = '';
  form.image.required = false;

  resetTierRows();
  (product.tiers || []).forEach((t) => renderTierRow(t.qty, t.price));

  const noteEl = document.getElementById('current-image-note');
  noteEl.textContent = 'יש תמונה קיימת - היא תישמר אם לא תבחר תמונה חדשה.';
  noteEl.classList.remove('hidden');

  document.getElementById('product-form-title').textContent = `עריכת מוצר: ${product.name}`;
  document.getElementById('product-form-submit').textContent = 'עדכן מוצר';
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
  document.getElementById('add-product-message').className = 'message hidden';

  form.scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingProductId = null;
  const form = document.getElementById('add-product-form');
  form.reset();
  form.image.required = true;
  resetTierRows();

  const noteEl = document.getElementById('current-image-note');
  noteEl.textContent = '';
  noteEl.classList.add('hidden');

  document.getElementById('product-form-title').textContent = 'הוספת מוצר חדש';
  document.getElementById('product-form-submit').textContent = 'הוסף מוצר לגלריה';
  document.getElementById('cancel-edit-btn').classList.add('hidden');
  document.getElementById('add-product-message').className = 'message hidden';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleSubmitProduct(event) {
  event.preventDefault();
  const form = event.target;
  const msgEl = document.getElementById('add-product-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  const name = form.name.value.trim();
  const price = Number(form.price.value);
  const file = form.image.files[0];
  const tiers = collectTiers();
  const isEditing = Boolean(editingProductId);

  if (!name || !Number.isFinite(price) || price <= 0 || (!isEditing && !file)) {
    msgEl.textContent = 'יש למלא שם, מחיר תקין' + (isEditing ? '.' : ' ולבחור תמונה.');
    msgEl.className = 'message error';
    return;
  }

  submitBtn.disabled = true;
  msgEl.textContent = isEditing ? 'מעדכן מוצר...' : 'מעלה מוצר, זה עשוי לקחת כמה שניות...';
  msgEl.className = 'message';

  try {
    const body = { token: getAdminToken(), name, price, tiers };
    if (file) {
      body.imageBase64 = await fileToDataUrl(file);
      body.imageFilename = file.name;
    }

    const url = isEditing ? `${WORKER_URL}/admin/products/${encodeURIComponent(editingProductId)}` : `${WORKER_URL}/admin/products`;
    const method = isEditing ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'השמירה נכשלה');

    msgEl.textContent = isEditing ? 'המוצר עודכן בהצלחה!' : 'המוצר נוסף בהצלחה! הוא יופיע בגלריה תוך כדקה.';
    msgEl.className = 'message success';
    cancelEdit();
    loadAdminProducts();
  } catch (err) {
    if (err.message && err.message.includes('מחובר')) {
      clearAdminToken();
      showLogin();
    }
    msgEl.textContent = err.message || 'שגיאה בשמירת המוצר.';
    msgEl.className = 'message error';
  } finally {
    submitBtn.disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('add-product-form').addEventListener('submit', handleSubmitProduct);
  document.getElementById('add-tier-row-btn').addEventListener('click', () => renderTierRow('', ''));
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAdminToken();
    showLogin();
  });

  if (getAdminToken()) {
    showPanel();
  } else {
    showLogin();
  }
});
