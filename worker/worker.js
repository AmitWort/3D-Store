// Cloudflare Worker — הדבקה ישירה ב-Dashboard (Workers & Pages → Create Worker → Quick Edit)
// לפני ההדבקה: עדכן את חמשת הקבועים למטה. אחרי ה-deploy: הגדר 4 secrets דרך Settings → Variables
// (GITHUB_TOKEN, ADMIN_PASSWORD, SESSION_SECRET, RESEND_API_KEY) — ראה README.md.

const GITHUB_OWNER = 'amitwort'; //שם המשתמש/ארגון שלך -GitHub
const GITHUB_REPO = '3D-Store'; 
const GITHUB_BRANCH = 'main';
const OWNER_EMAIL = 'amit.wort@gmail.com'; //המייל של בעל החנות שיקבל התראות
const ALLOWED_ORIGIN = 'https://amitwort.github.io'; //  כתובת ה-GitHub Pages (בלי סלאש בסוף)

const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 שעות תוקף לחיבור אדמין
const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// האתר מוגש ע"י GitHub Pages מתוך תיקיית docs/ בלבד (Settings → Pages → Folder: /docs),
// לכן כל קובץ שהאתר קורא בעצמו (products.json, תמונות מוצרים) חייב לשבת בתוך docs/
// כדי שיהיה נגיש בפועל דרך הכתובת הציבורית. orders.csv נשאר בכוונה בשורש הריפו,
// מחוץ ל-docs/, כדי שלא יוגש פומבית דרך האתר (רק בעל הריפו רואה אותו ב-GitHub).
const PRODUCTS_PATH = 'docs/data/products.json';
const IMAGES_DIR = 'docs/images';

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    try {
      let result;
      if (url.pathname === '/admin/login' && request.method === 'POST') {
        result = await handleLogin(request, env);
      } else if (url.pathname === '/admin/products' && request.method === 'POST') {
        result = await handleAddProduct(request, env);
      } else if (url.pathname.startsWith('/admin/products/') && request.method === 'DELETE') {
        const id = decodeURIComponent(url.pathname.split('/').pop());
        result = await handleDeleteProduct(id, request, env);
      } else if (url.pathname === '/order' && request.method === 'POST') {
        result = await handleOrder(request, env);
      } else {
        result = { status: 404, body: { error: 'Not found' } };
      }
      return json(result.body, result.status, cors);
    } catch (err) {
      return json({ error: err.message || 'שגיאת שרת' }, err.status || 500, cors);
    }
  },
};

// ---------- Route handlers ----------

async function handleLogin(request, env) {
  const { password } = await request.json();
  if (password !== env.ADMIN_PASSWORD) {
    return { status: 401, body: { error: 'סיסמה שגויה' } };
  }
  const token = await createToken(env.SESSION_SECRET, SESSION_TTL_MS);
  return { status: 200, body: { token } };
}

async function handleAddProduct(request, env) {
  const data = await request.json();
  if (!(await verifyToken(data.token, env.SESSION_SECRET))) {
    return { status: 401, body: { error: 'לא מחובר, יש להתחבר מחדש' } };
  }

  const name = String(data.name || '').trim();
  const price = Number(data.price);
  if (!name) return { status: 400, body: { error: 'שם מוצר חסר' } };
  if (!Number.isFinite(price) || price <= 0) return { status: 400, body: { error: 'מחיר לא תקין' } };
  if (!data.imageBase64) return { status: 400, body: { error: 'תמונה חסרה' } };

  const match = /^data:image\/(\w+);base64,(.+)$/.exec(data.imageBase64);
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
  const rawBase64 = match ? match[2] : data.imageBase64;
  const id = crypto.randomUUID();
  const imageRepoPath = `${IMAGES_DIR}/${id}.${ext}`; // נתיב בריפו (עם docs/) - לשימוש מול GitHub API בלבד
  const imageSitePath = `images/${id}.${ext}`; // נתיב יחסי לאתר עצמו (docs/ הוא שורש האתר) - זה מה שנשמר ב-products.json

  await githubPutBinary(env, imageRepoPath, rawBase64, `הוספת תמונה למוצר: ${name}`);

  const product = { id, name, price, image: imageSitePath };
  await updateProductsJson(env, (products) => {
    products.push(product);
    return products;
  }, `הוספת מוצר: ${name}`);

  return { status: 200, body: { ok: true, product } };
}

async function handleDeleteProduct(id, request, env) {
  const data = await request.json().catch(() => ({}));
  if (!(await verifyToken(data.token, env.SESSION_SECRET))) {
    return { status: 401, body: { error: 'לא מחובר, יש להתחבר מחדש' } };
  }
  await updateProductsJson(env, (products) => products.filter((p) => p.id !== id), `מחיקת מוצר: ${id}`);
  return { status: 200, body: { ok: true } };
}

async function handleOrder(request, env) {
  const data = await request.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const fullName = String(data.fullName || '').trim();
  const phone = String(data.phone || '').trim();
  const address = String(data.address || '').trim();
  const notes = String(data.notes || '').trim();

  if (!items.length) return { status: 400, body: { error: 'העגלה ריקה' } };
  if (!fullName) return { status: 400, body: { error: 'שם מלא הוא שדה חובה' } };
  if (!phone) return { status: 400, body: { error: 'טלפון הוא שדה חובה' } };

  // מחיר וכמות נגזרים מחדש מ-products.json בצד השרת - לא סומכים על מה שהגיע מהלקוח
  const productsFile = await githubGetFile(env, PRODUCTS_PATH);
  const products = productsFile ? JSON.parse(productsFile.content) : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const lineItems = [];
  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) continue;
    const qty = Math.max(1, Math.floor(Number(item.qty)) || 1);
    total += product.price * qty;
    lineItems.push(`${product.name} x${qty} (₪${product.price})`);
  }
  if (!lineItems.length) return { status: 400, body: { error: 'לא נמצאו פריטים תקינים בעגלה' } };

  const orderId = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  const timestamp = new Date().toISOString();
  const itemsSummary = lineItems.join('; ');
  const row = [orderId, timestamp, fullName, phone, address, notes, itemsSummary, total.toFixed(2)];
  const csvLine = row.map(csvEscape).join(',') + '\r\n';
  const header = 'OrderID,DateTime,FullName,Phone,Address,Notes,Items,Total\r\n';

  await appendCsvLine(env, 'orders.csv', header, csvLine, `הזמנה חדשה: ${orderId}`);

  try {
    await sendOrderEmail(env, { orderId, fullName, phone, address, notes, itemsSummary, total });
  } catch (e) {
    // שליחת המייל היא best-effort - כשלון בה לא אמור לבטל את ההזמנה שכבר נרשמה ב-CSV
  }

  return { status: 200, body: { ok: true, orderId, total } };
}

// ---------- GitHub Contents API ----------

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': '3DStoreKids-Worker',
    Accept: 'application/vnd.github+json',
  };
}

async function githubGetFile(env, path) {
  const res = await fetch(`${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) throw httpError(res.status, `GitHub GET ${path} נכשל: ${await res.text()}`);
  const data = await res.json();
  return { sha: data.sha, content: base64ToUtf8(data.content.replace(/\n/g, '')) };
}

async function githubPutText(env, path, contentStr, message, sha) {
  const body = { message, content: utf8ToBase64(contentStr), branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${API_BASE}/contents/${path}`, {
    method: 'PUT',
    headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw httpError(res.status, `GitHub PUT ${path} נכשל: ${await res.text()}`);
  return res.json();
}

async function githubPutBinary(env, path, base64Content, message) {
  const res = await fetch(`${API_BASE}/contents/${path}`, {
    method: 'PUT',
    headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64Content, branch: GITHUB_BRANCH }),
  });
  if (!res.ok) throw httpError(res.status, `GitHub PUT ${path} נכשל: ${await res.text()}`);
  return res.json();
}

async function updateProductsJson(env, mutateFn, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const file = await githubGetFile(env, PRODUCTS_PATH);
    const products = file ? JSON.parse(file.content) : [];
    const updated = mutateFn(products);
    try {
      await githubPutText(env, PRODUCTS_PATH, JSON.stringify(updated, null, 2), message, file ? file.sha : undefined);
      return updated;
    } catch (err) {
      if (err.status === 409 && attempt === 0) continue;
      throw err;
    }
  }
}

async function appendCsvLine(env, path, header, line, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const file = await githubGetFile(env, path);
    const newContent = file ? file.content + line : header + line;
    try {
      await githubPutText(env, path, newContent, message, file ? file.sha : undefined);
      return;
    } catch (err) {
      if (err.status === 409 && attempt === 0) continue;
      throw err;
    }
  }
}

// ---------- Email (Resend) ----------

async function sendOrderEmail(env, order) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'הזמנות 3D Store <onboarding@resend.dev>',
      to: [OWNER_EMAIL],
      subject: `הזמנה חדשה #${order.orderId} - ₪${order.total.toFixed(2)}`,
      text:
        `התקבלה הזמנה חדשה באתר!\n\n` +
        `מספר הזמנה: ${order.orderId}\n` +
        `שם מלא: ${order.fullName}\n` +
        `טלפון: ${order.phone}\n` +
        `כתובת: ${order.address || '-'}\n` +
        `הערות: ${order.notes || '-'}\n\n` +
        `פריטים:\n${order.itemsSummary}\n\n` +
        `סה"כ לתשלום: ₪${order.total.toFixed(2)}`,
    }),
  });
}

// ---------- Auth tokens (HMAC-signed, stateless) ----------

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return arrayBufferToBase64(sig);
}

async function createToken(secret, ttlMs) {
  const payloadB64 = utf8ToBase64(JSON.stringify({ exp: Date.now() + ttlMs }));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  const expectedSig = await hmacSign(payloadB64, secret);
  if (!timingSafeEqual(sig, expectedSig)) return false;
  try {
    const payload = JSON.parse(base64ToUtf8(payloadB64));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// ---------- Small utilities ----------

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
