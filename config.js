// Sayt sozlamalari: Supabase loyihasi o'zgarsa, faqat shu fayl yangilanadi.
window.DENGIZ_ENDPOINT = 'https://fjvvaivzwmlqgqgltkva.supabase.co/functions/v1/site-lead';
// Ochiq (publishable) kalit: brauzerda bo'lishi mo'ljallangan, maxfiy emas.
window.DENGIZ_SB = { url: 'https://fjvvaivzwmlqgqgltkva.supabase.co', key: 'sb_publishable_ppQqXY1maKW710bAzodQMw_qae7FqZW' };

// Menyuga "Kirish" / "Kabinet" havolasi (bosh sahifa va audit sahifasida).
(function () {
  let lang = null, logged = false;
  try { lang = localStorage.getItem('lang'); logged = !!localStorage.getItem('dg_auth'); } catch (e) {}
  const ru = lang === 'ru' && !location.pathname.startsWith('/audit');
  const label = logged ? (ru ? 'Кабинет' : 'Kabinet') : (ru ? 'Войти' : 'Kirish');
  const st = document.createElement('style');
  st.textContent = '.navlogin{color:#fff;font-weight:700;font-size:.88rem;padding:9px 16px;border:1.5px solid rgba(255,255,255,.35);border-radius:999px;white-space:nowrap;text-decoration:none;transition:.2s}.navlogin:hover{background:rgba(255,255,255,.12)}@media(max-width:560px){.navlogin{padding:8px 12px}}';
  document.head.appendChild(st);
  document.addEventListener('DOMContentLoaded', () => {
    const right = document.querySelector('nav .right');
    if (!right) return;
    const a = document.createElement('a');
    a.className = 'navlogin';
    a.href = logged ? '/kabinet/' : '/kirish/';
    a.textContent = label;
    right.insertBefore(a, right.lastElementChild);
  });
})();
