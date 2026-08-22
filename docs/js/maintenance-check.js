// נטען לפני שאר הדף (ראה index.html/product.html/cart.html) כדי לבדוק אם החנות במצב תחזוקה
// ולהעביר את הלקוח ל-maintenance.html בלי שיבחין בכלל בדף המקורי.
// admin.html *לא* טוען את הקובץ הזה בכוונה - הבעלים חייב תמיד להיות מסוגל להיכנס ולכבות את מצב התחזוקה.
document.documentElement.style.visibility = 'hidden';
(async function () {
  try {
    const res = await fetch('data/settings.json?t=' + Date.now(), { cache: 'no-store' });
    const settings = res.ok ? await res.json() : {};
    if (settings.maintenanceMode) {
      window.location.replace('maintenance.html');
      return;
    }
  } catch (err) {
    // בדיקה שנכשלה (למשל בעיית רשת) לא אמורה לחסום את האתר - ממשיכים כרגיל
  }
  document.documentElement.style.visibility = 'visible';
})();
