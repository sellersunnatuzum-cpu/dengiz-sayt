const $ = id => document.getElementById(id);
const digits = s => (s || '').replace(/\D/g, '');

Auth.token().then(t => { if (t) location.replace('/kabinet/'); });

function show(which) {
  const signup = which === 'signup';
  $('fl').classList.toggle('hidden', signup);
  $('fs').classList.toggle('hidden', !signup);
  $('tl').classList.toggle('on', !signup);
  $('ts').classList.toggle('on', signup);
  $('ttl').textContent = signup ? 'Hisob yarating' : 'Shaxsiy kabinetga kiring';
  $('sub').textContent = signup ? 'Bir daqiqada. Kabinet bepul, to‘lov talab qilinmaydi.' : 'Reklamangiz holati, ogohlantirishlar va hisobotlar bir joyda.';
  history.replaceState(null, '', signup ? '#royxat' : location.pathname);
}
$('tl').onclick = () => show('login');
$('ts').onclick = () => show('signup');
if (location.hash === '#royxat') show('signup');

const say = (el, text, cls = 'err') => { el.textContent = text; el.className = 'msg ' + cls; };

$('fl').addEventListener('submit', async e => {
  e.preventDefault();
  const m = $('ml'); m.className = 'msg';
  const email = $('le').value.trim(), pass = $('lp').value;
  if (!email || !pass) return say(m, 'Email yoki telefon va parolni kiriting.');
  $('bl').disabled = true;
  try { await Auth.login(email, pass); location.href = '/kabinet/'; }
  catch (err) { say(m, err.message === 'invalid' ? 'Email/telefon yoki parol noto‘g‘ri.' : err.message === 'busy' ? 'Urinishlar ko‘p bo‘ldi. Birozdan keyin qayta urining.' : 'Kirib bo‘lmadi. Birozdan keyin urinib ko‘ring.'); $('bl').disabled = false; }
});

const ERR = {
  weak_password: 'Parol kamida 8 belgidan iborat bo‘lsin.',
  bad_email: 'Emailni to‘g‘ri kiriting.',
  bad_phone: 'Telefon raqamini to‘g‘ri kiriting (masalan, +998 90 123 45 67).',
  phone_taken: 'Bu telefon raqami bilan hisob allaqachon bor. Kirish bo‘limidan kiring.',
  email_taken: 'Bu email bilan hisob allaqachon bor. Kirish bo‘limidan kiring.',
  busy: 'Hozir so‘rovlar ko‘p. Birozdan keyin urinib ko‘ring.',
  invalid: 'Ism va barcha majburiy maydonlarni to‘ldiring.',
};

$('fs').addEventListener('submit', async e => {
  e.preventDefault();
  const m = $('ms'); m.className = 'msg';
  const v = { name: $('sn').value.trim(), phone: $('sph').value.trim(), email: $('se').value.trim(), telegram: $('stg').value.trim(), business: $('sb').value.trim(), password: $('sp').value };
  if (!v.name) return say(m, ERR.invalid);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.email)) return say(m, ERR.bad_email);
  if (v.phone && v.phone.replace(/\D/g, '').length > 4 && !PhoneUtil.ok(v.phone)) return say(m, ERR.bad_phone);
  if (!PhoneUtil.ok(v.phone)) v.phone = '';
  if (v.password.length < 8) return say(m, ERR.weak_password);
  $('bs').disabled = true;
  let r;
  try { r = await Auth.call('auth-signup', { ...v, website: $('shp').checked ? 'x' : '', lang: 'uz' }, false); }
  catch (err) { say(m, 'Aloqa xatosi. Internetni tekshirib, qayta urinib ko‘ring.'); $('bs').disabled = false; return; }
  if (r.status !== 200) { say(m, ERR[r.data.error] || 'Hisob yaratib bo‘lmadi. Birozdan keyin urinib ko‘ring.'); $('bs').disabled = false; return; }
  try { await Auth.login(v.email, v.password); location.href = '/kabinet/'; }
  catch (err) { say(m, 'Hisob yaratildi. “Kirish” bo‘limidan email va parol bilan kiring.', 'ok'); $('bs').disabled = false; show('login'); $('le').value = v.email; }
});
