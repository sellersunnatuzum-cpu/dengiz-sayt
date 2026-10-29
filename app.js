const ENDPOINT = window.DENGIZ_ENDPOINT;
let lang = 'uz';
try { const s = localStorage.getItem('lang'); if (s === 'ru' || s === 'uz') lang = s; } catch (e) {}

function apply() {
  const d = T[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i]').forEach(el => { const v = d[el.dataset.i]; if (v !== undefined) el.textContent = v; });
  document.querySelectorAll('[data-i-html]').forEach(el => { el.innerHTML = d[el.dataset.iHtml + 'x']; });
  document.querySelectorAll('[data-ph]').forEach(el => { const v = d[el.dataset.ph]; if (v !== undefined) el.placeholder = v; });
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
}
document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.l;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  apply();
}));
apply();

document.getElementById('yr').textContent = new Date().getFullYear();

const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

// byudjet: tez tanlash tugmalari (brauzerning standart ro'yxati o'rniga)
const budgetInput = document.getElementById('budget'), quick = document.getElementById('quick');
const markQuick = () => quick.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === budgetInput.value.trim()));
quick.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  budgetInput.value = b.dataset.v;
  markQuick();
});
budgetInput.addEventListener('input', markQuick);

const form = document.getElementById('lead'), msg = document.getElementById('msg'), btn = document.getElementById('send');
const digits = s => (s || '').replace(/\D/g, '');

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const d = T[lang];
  const fd = Object.fromEntries(new FormData(form).entries());
  msg.className = 'msg';
  if (!fd.name.trim()) { msg.textContent = d.inv; msg.className = 'msg err'; return; }
  if (!PhoneUtil.ok(fd.phone)) { msg.textContent = d.invp; msg.className = 'msg err'; return; }
  btn.disabled = true;
  const payload = {
    name: fd.name, phone: fd.phone, telegram: fd.telegram, business: fd.business,
    budget: fd.budget, message: fd.message, website: fd.website, interest: 'pilot', lang,
  };
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) { form.reset(); markQuick(); msg.textContent = d.ok; msg.className = 'msg ok'; }
    else if (r.status === 429) { msg.textContent = d.busy; msg.className = 'msg err'; }
    else if (r.status === 400) { msg.textContent = d.invp; msg.className = 'msg err'; }
    else { msg.textContent = d.err; msg.className = 'msg err'; }
  } catch (e) { msg.textContent = d.err; msg.className = 'msg err'; }
  btn.disabled = false;
});
