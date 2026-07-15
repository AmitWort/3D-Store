const ADMIN_TOKEN_KEY = '3dstorekids_admin_token';

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
    const products = await res.json();
    if (!products.length) {
      listEl.innerHTML = '<p>אין עדיין מוצרים בגלריה.</p>';
      return;
    }
    listEl.innerHTML = products
      .map(
        (p) => `
        <div class="admin-product-row" data-id="${p.id}">
          <img src="${p.image}" alt="" />
          <span class="name">${escapeHtml(p.name)} - ₪${Number(p.price).toFixed(2)}</span>
          <button type="button" class="btn btn-danger" data-delete="${p.id}">מחק</button>
        </div>`
      )
      .join('');
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
    loadAdminProducts();
  } catch (err) {
    if (err.message && err.message.includes('מחובר')) {
      clearAdminToken();
      showLogin();
    }
    alert(err.message || 'שגיאה במחיקת המוצר');
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleAddProduct(event) {
  event.preventDefault();
  const form = event.target;
  const msgEl = document.getElementById('add-product-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  const name = form.name.value.trim();
  const price = Number(form.price.value);
  const file = form.image.files[0];

  if (!name || !Number.isFinite(price) || price <= 0 || !file) {
    msgEl.textContent = 'יש למלא שם, מחיר תקין ולבחור תמונה.';
    msgEl.className = 'message error';
    return;
  }

  submitBtn.disabled = true;
  msgEl.textContent = 'מעלה מוצר, זה עשוי לקחת כמה שניות...';
  msgEl.className = 'message';

  try {
    const imageBase64 = await fileToDataUrl(file);
    const res = await fetch(`${WORKER_URL}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getAdminToken(), name, price, imageBase64, imageFilename: file.name }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'הוספת המוצר נכשלה');
    msgEl.textContent = 'המוצר נוסף בהצלחה! הוא יופיע בגלריה תוך כדקה.';
    msgEl.className = 'message success';
    form.reset();
    loadAdminProducts();
  } catch (err) {
    if (err.message && err.message.includes('מחובר')) {
      clearAdminToken();
      showLogin();
    }
    msgEl.textContent = err.message || 'שגיאה בהוספת המוצר.';
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
  document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
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
