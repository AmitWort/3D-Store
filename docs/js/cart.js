// לוגיקת עגלת קניות משותפת - מבוססת localStorage בלבד, בלי צורך בשרת.
const CART_KEY = '3dstorekids_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartBadge();
}

function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, tiers: product.tiers || [], qty });
  }
  saveCart(cart);
}

// מחשב את המחיר הכולל הזול ביותר האפשרי לכמות נתונה, בהתחשב במבצעי הכמות (tiers) של המוצר.
// לדוגמה tiers=[{qty:2,price:5}] עם price בסיס 3: 3 יח' = 5+3=8 (לא 3*3=9).
// פתרון אופטימלי מלא (DP), לא ניחוש חמדני - תמיד השילוב הזול ביותר עבור הלקוח.
function calcLineTotal(product, qty) {
  const basePrice = Number(product.price) || 0;
  const tiers = [{ qty: 1, price: basePrice }];
  if (Array.isArray(product.tiers)) {
    for (const t of product.tiers) {
      const tq = Math.floor(Number(t.qty));
      const tp = Number(t.price);
      if (tq > 1 && Number.isFinite(tp) && tp >= 0) tiers.push({ qty: tq, price: tp });
    }
  }
  const n = Math.max(0, Math.floor(Number(qty)) || 0);
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (const t of tiers) {
      if (t.qty <= i && dp[i - t.qty] + t.price < dp[i]) {
        dp[i] = dp[i - t.qty] + t.price;
      }
    }
  }
  return dp[n] === Infinity ? n * basePrice : dp[n];
}

function removeFromCart(id) {
  saveCart(getCart().filter((item) => item.id !== id));
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + calcLineTotal(item, item.qty), 0);
}

function renderCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cartCount();
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', renderCartBadge);
