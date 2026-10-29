// Kirish va kabinet uchun umumiy yordamchilar. Parol brauzerda saqlanmaydi, faqat sessiya tokenlari.
const Auth = (() => {
  const SB = window.DENGIZ_SB;
  const KEY = 'dg_auth';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} };
  // 25 soniyadan oshsa so'rov bekor qilinadi: sahifa cheksiz "Yuklanmoqda" da qotib qolmaydi
  const post = (path, body, headers = {}, ms = 25000) => {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    return fetch(SB.url + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB.key, ...headers }, body: JSON.stringify(body), signal: ac.signal,
    }).finally(() => clearTimeout(t));
  };
  const save = j => write({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in - 60) * 1000 });

  // identifikator: email yoki telefon. Parol serverda tekshiriladi (auth-login).
  async function login(identifier, password) {
    const r = await post('/functions/v1/auth-login', { identifier, password });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) throw new Error('busy');
    if (!r.ok) throw new Error(r.status === 401 ? 'invalid' : 'fail');
    save(j);
  }
  // Bir vaqtda bir nechta so'rov token yangilasa, refresh token ikkinchi marta ishlatilib bekor bo'lardi
  // va foydalanuvchi chiqarib yuborilardi. Shuning uchun yangilash bitta umumiy va'da (promise) orqali.
  let refreshing = null;
  async function token() {
    const a = read();
    if (!a) return null;
    if (Date.now() < a.exp) return a.access;
    if (!refreshing) refreshing = (async () => {
      try {
        const r = await post('/auth/v1/token?grant_type=refresh_token', { refresh_token: a.refresh });
        if (r.status === 400 || r.status === 401) { write(null); return null; }   // token haqiqatan eskirgan
        if (!r.ok) return a.access;   // server/tarmoq vaqtinchalik xatosi: chiqarib yubormaymiz
        save(await r.json());
        return read().access;
      } catch (e) { return a.access; } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function call(fn, body, auth = true) {
    try {
      const t = auth ? await token() : null;
      if (auth && !t) return { status: 401, data: { error: 'unauthorized' } };
      const r = await post('/functions/v1/' + fn, body || {}, t ? { Authorization: 'Bearer ' + t } : {});
      return { status: r.status, data: await r.json().catch(() => ({})) };
    } catch (e) {
      // tarmoq uzildi yoki vaqt tugadi: chaqiruvchi kod oddiy xato sifatida ko'radi
      return { status: 0, data: { error: e && e.name === 'AbortError' ? 'timeout' : 'network' } };
    }
  }
  // Chiqish: sessiya serverda ham bekor qilinadi (eski token qayta ishlamaydi), shu brauzerdagi foydalanuvchi sozlamalari tozalanadi.
  // replace: "Orqaga" tugmasi bilan kabinetga qaytib bo'lmaydi.
  async function logout() {
    const a = read();
    write(null);
    try { ['dg_acc', 'dg_onb_hide'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (a && a.access) { try { await post('/auth/v1/logout?scope=local', {}, { Authorization: 'Bearer ' + a.access }, 5000); } catch (e) {} }
    location.replace('/kirish/');
  }
  return { login, token, call, logout };
})();
