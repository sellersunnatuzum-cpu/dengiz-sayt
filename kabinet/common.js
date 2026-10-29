// Kabinet uchun umumiy yordamchilar
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Math.round(n).toLocaleString('ru-RU');
const money = (n, cur) => (cur === 'USD' ? '$' : '') + (n >= 100 ? nf(n) : (Math.round(n * 100) / 100).toLocaleString('ru-RU')) + (cur && cur !== 'USD' ? ' ' + cur : '');
const pct = n => (Math.round(n * 100) / 100).toLocaleString('ru-RU') + '%';
const when = t => new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
// Server ba'zan massivni JSON matn ko'rinishida qaytaradi: har doim massiv qaytaramiz
const arr = v => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch (e) {} } return []; };
const obj = v => { if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return {}; } } return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
const SEV ={ critical: 'Shoshilinch', warning: 'E’tibor bering', info: 'Ma’lumot' };

function openModal(html) { $('modal-in').innerHTML = html; $('modal').classList.add('on'); }
function closeModal() { $('modal').classList.remove('on'); }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = 'Nusxalandi'; setTimeout(() => btn.textContent = o, 1500); } } catch (e) {}
}
