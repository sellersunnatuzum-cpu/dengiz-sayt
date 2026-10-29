// Kabinet: kirish tekshiruvi, tablar va bo'limlarni ishga tushirish.
$('out').onclick = () => Auth.logout();

const ROLE = { owner: 'Biznes egasi', targetolog: 'Targetolog', viewer: 'Kuzatuvchi' };

function showTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('.mainc .panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  try { history.replaceState(null, '', '#' + t); } catch (e) {}
  if (t === 'admin') Panels.admin();
  if (t === 'ads') Ads.load();
  if (t === 'leads') Ads.leads();
  if (t === 'alerts') Panels.live();
  const ob = $('onb'); if (ob) ob.style.display = t === 'dash' ? '' : 'none';
}
$('tabs').onclick = e => { const t = e.target.closest('button')?.dataset.t; if (t) showTab(t); };

(async () => {
  const r = await Auth.call('me', {});
  if (r.status === 401) { location.replace('/kirish/'); return; }
  if (r.status !== 200) { $('loading').innerHTML = 'Ma’lumotni yuklab bo‘lmadi. <button class="btn sm" type="button" onclick="location.reload()">Qayta urinish</button>'; return; }
  const d = r.data, p = d.profile, b = d.business || {};
  $('loading').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('uname').textContent = p.full_name;
  $('hello').textContent = 'Salom, ' + p.full_name.split(' ')[0];
  $('bizline').textContent = b.name ? 'Biznes: ' + b.name : '';
  $('c-role').textContent = 'Rol: ' + (ROLE[b.role] || 'Egasi');
  if (b.autonomy_level === 2) $('c-ai').textContent = 'AI rejimi: buyrug‘ingiz va tasdiqingiz bilan bajaradi';
  Ads.setMe(d);
  Panels.init(d);
  // Facebook orqali ulashdan qaytganda natija
  const q = new URLSearchParams(location.search);
  const note = (html, cls) => { $('topnote').innerHTML = `<div class="banner ${cls || ''}">${html}</div>`; };
  if (q.get('meta') === 'pick') { setTimeout(() => Panels.metaPick(), 300); }
  else if (q.get('meta') === 'ok') note(`<b>Ulandi: ${esc(q.get('n') || '1')} ta reklama akkaunti</b> (${q.get('access') === 'manage' ? 'ko‘rish va boshqarish' : 'faqat ko‘rish'}). Hisobot bir necha daqiqada tayyor bo‘ladi.`, 'info');
  else if (q.get('meta') === 'err') note('Facebook orqali ulab bo‘lmadi: ' + esc({ denied: 'ruxsat berilmadi', expired: 'oyna eskirdi, qaytadan bosing', no_accounts: 'reklama akkaunti tanlanmadi', taken: 'akkaunt boshqa hisobga ulangan', not_configured: 'avtomatik ulash hali yoqilmagan', token: 'Facebook javob bermadi' }[q.get('e')] || 'qaytadan urinib ko‘ring') + '.');
  else if (!p.phone_verified) {
    note('<b>Telefoningizni tasdiqlang.</b> Bepul, Telegram orqali, 1 bosishda. Shundan keyin reklama akkauntini ulash mumkin. <button class="btn sm" id="tnver" type="button" style="margin-left:8px">Telegram orqali tasdiqlash</button><div id="tnmsg" class="msg"></div>');
    $('tnver').onclick = () => Panels.verifyPhone($('tnmsg'));
  }
  if (q.get('meta')) history.replaceState(null, '', location.pathname + location.hash);
  const h = location.hash.slice(1);
  if (['dash', 'ads', 'leads', 'alerts', 'chat', 'audit', 'set', 'admin'].includes(h) && (h !== 'admin' || d.is_admin)) showTab(h);
  Dash.load();
})();
