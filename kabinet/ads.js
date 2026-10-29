// "Reklama berish": maqsad + byudjet + media -> AI taklifi -> ko'rib chiqish -> tasdiq -> Meta'da yaratiladi.
const Ads = (() => {
  const S = { acc: null, opts: null, media: null, pageId: '', draft: null, busy: false };
  const ERR = {
    view_only: 'Akkaunt faqat ko‘rish rejimida ulangan. Reklama yaratish uchun «Ko‘rish va boshqarish» rejimida qayta ulang.',
    phone_unverified: 'Avval telefoningizni Telegram orqali tasdiqlang.',
    forbidden: 'Bu amal faqat biznes egasi yoki targetolog uchun.',
    no_account: 'Reklama akkaunti topilmadi.',
    busy: 'Juda ko‘p so‘rov, biroz kuting.',
    goal: 'Maqsadni yozing.', budget: 'Kunlik byudjetni kiriting.',
  };
  const root = () => $('p-ads');
  const msg = (t, err) => { const m = $('admsg'); if (!m) return; m.textContent = t; m.className = 'msg ' + (err ? 'err' : 'ok'); m.style.display = t ? 'block' : 'none'; };
  const manageAccs = () => (window.__ME ? window.__ME.accounts : []).filter(a => a.access_level === 'manage');

  function intro(me) {
    const accs = manageAccs();
    if (!accs.length) {
      root().innerHTML = `<div class="cardx empty2"><h2>Reklamani Dengiz’da yoqing</h2>
        <p>Maqsadni yozing, byudjetni belgilang, rasm yoki videoni tanlang. AI auditoriya va forma savollarini tayyorlaydi, siz ko‘rib chiqib tasdiqlaysiz, Dengiz Meta’da reklamani yaratadi. Pulni Meta sizning kartangizdan oladi.</p>
        <p>Buning uchun akkaunt <b>«Ko‘rish va boshqarish»</b> rejimida ulangan bo‘lishi kerak.</p>
        <button class="btn" id="ad-conn" type="button">Akkaunt ulash</button></div>`;
      $('ad-conn').onclick = () => Panels.connect();
      return false;
    }
    S.acc = S.acc && accs.some(a => a.meta_ad_account_id === S.acc) ? S.acc : accs[0].meta_ad_account_id;
    return true;
  }

  async function load() {
    window.__ME = window.__ME || null;
    if (!intro()) return;
    root().innerHTML = '<div class="loading">Yuklanmoqda…</div>';
    const r = await Auth.call('ads', { action: 'options', account: S.acc });
    if (r.status !== 200) { root().innerHTML = `<div class="cardx"><p>${esc(ERR[r.data.error] || 'Yuklab bo‘lmadi. Birozdan keyin urinib ko‘ring.')}</p></div>`; return; }
    S.opts = r.data; S.media = null; S.draft = null; wizard();
  }

  // Ro'yxat bo'sh bo'lsa (sahifa yoki media yo'q) o'zi yangilanadi: foydalanuvchi Ads Manager'dan qaytganda (fokus), taymersiz
  let quiet = false;
  async function refreshOpts() {
    if (quiet || !S.acc || !S.opts || document.hidden || !root().offsetParent || !$('adgo') || $('adgo').disabled) return;
    const o = S.opts;
    if (o.pages.length && (o.videos.length || o.images.length)) return;
    quiet = true;
    try {
      const r = await Auth.call('ads', { action: 'options', account: S.acc });
      if (r.status !== 200) return;
      const n = r.data;
      if (n.pages.length === o.pages.length && (n.videos || []).length === (o.videos || []).length && (n.images || []).length === (o.images || []).length && n.pages_error === o.pages_error) return;
      const keep = ['adgoal', 'adbud', 'adhead', 'adtext'].map(id => [id, $(id) && $(id).value]);
      S.opts = n;
      wizard();
      keep.forEach(([id, v]) => { if (v != null && $(id)) $(id).value = v; });
    } finally { quiet = false; }
  }
  document.addEventListener('visibilitychange', refreshOpts);
  window.addEventListener('focus', refreshOpts);

  function wizard() {
    const o = S.opts, cur = o.currency || 'USD';
    const warn = [];
    if (o.pages_error) warn.push(`${esc(o.pages_error)} Sahifalar ro‘yxati olinmadi.`);
    else if (!o.pages.length) warn.push('Bu akkaunt uchun Facebook sahifasi topilmadi. Sahifa yarating yoki ulash paytida sahifani tanlang.');
    if (o.funding_ok === false) warn.push('Akkauntga <b>to‘lov usuli (karta)</b> ulanmagan ko‘rinadi. Ads Manager → Billing’da kartani qo‘shing, aks holda reklama ishlamaydi.');
    const media = [...(o.videos || []).map(v => ({ type: 'video', id: v.id, name: v.title || 'Video', pic: v.picture })), ...(o.images || []).map(i => ({ type: 'image', hash: i.hash, name: i.name || 'Rasm', pic: i.url }))];
    root().innerHTML = `<div class="cardx"><h3>Yangi reklama</h3>
      <p class="sub">Lid reklama: odam ariza qoldiradi (ism va telefon), lidlar kabinetga tushadi. Reklama Meta tekshiruvidan o‘tgach ishlay boshlaydi.</p>
      ${warn.map(w => `<div class="banner">${w}</div>`).join('')}
      ${manageAccs().length > 1 ? `<label class="lbl2">Reklama akkaunti</label><select id="adacc" style="margin:6px 0 12px">${manageAccs().map(a => `<option value="${esc(a.meta_ad_account_id)}" ${a.meta_ad_account_id === S.acc ? 'selected' : ''}>${esc(a.display_name || a.meta_ad_account_id)}</option>`).join('')}</select>` : ''}
      <div class="lbl2">Qaysi sahifa nomidan chiqadi</div>
      <div class="pgrid" id="adpage">${o.pages.map(p => `<button type="button" class="ppick ${p.id === S.pageId ? 'on' : ''}" data-id="${esc(p.id)}" data-n="${esc(p.name)}"><span class="pav" style="${p.pic ? `background-image:url('${esc(p.pic)}')` : ''}">${p.pic ? '' : esc((p.name || '?')[0].toUpperCase())}</span><span class="pt"><b>${esc(p.name)}</b><small>${esc(p.cat || 'Facebook sahifa')}</small></span><i class="pck">✓</i></button>`).join('') || '<div class="pempty">Sahifa topilmadi. Facebook sahifangiz bo‘lsa, ulanish paytida uni belgilang, bu yerda o‘zi chiqadi.</div>'}</div>
      <label class="lbl2" for="adgoal">Nima uchun reklama? (oddiy so‘z bilan)</label>
      <input id="adgoal" maxlength="500" placeholder="Masalan: sotuvchilik kursiga o‘quvchilar kerak, telefon raqamini qoldirsin" style="margin:6px 0 12px">
      <div class="row"><div><label class="lbl2" for="adbud">Kuniga qancha (${esc(cur)})</label><input id="adbud" inputmode="decimal" value="${cur === 'USD' ? '3' : ''}" style="margin:6px 0 12px"></div>
        <div><label class="lbl2" for="adhead">Sarlavha <span class="opt">ixtiyoriy</span></label><input id="adhead" maxlength="40" placeholder="AI taklif qiladi" style="margin:6px 0 12px"></div></div>
      <label class="lbl2" for="adtext">Reklama matni <span class="opt">ixtiyoriy, bo‘sh qoldirsangiz AI yozadi</span></label>
      <textarea id="adtext" maxlength="600" rows="3" style="width:100%;margin:6px 0 12px;font:500 1rem 'Manrope';padding:12px;border:1.5px solid var(--line);border-radius:12px"></textarea>
      <div class="lbl2">Rasm yoki video (Meta kutubxonangizdan)</div>
      ${media.length ? `<div class="mgrid">${media.map((x, i) => `<button type="button" class="mpick" data-i="${i}"><span class="mimg" style="background-image:url('${esc(x.pic || '')}')">${x.type === 'video' ? '<i>▶</i>' : ''}</span><small>${esc(x.name)}</small></button>`).join('')}</div>`
        : '<p class="sub">Kutubxonada rasm yoki video topilmadi. Ads Manager → Media’ga yuklang va bu sahifani yangilang.</p>'}
      <div id="admsg" class="msg" style="display:none"></div>
      <div style="margin-top:14px"><button class="btn" id="adgo" type="button">AI taklif qilsin</button></div></div>
      <div id="adlist"></div>`;
    const pps = root().querySelectorAll('.ppick');
    if (!S.pageId || !o.pages.some(p => p.id === S.pageId)) S.pageId = o.pages.length ? o.pages[0].id : '';
    pps.forEach(b => { b.classList.toggle('on', b.dataset.id === S.pageId); b.onclick = () => { S.pageId = b.dataset.id; pps.forEach(x => x.classList.toggle('on', x === b)); }; });
    root().querySelectorAll('.mpick').forEach(b => b.onclick = () => { S.media = media[+b.dataset.i]; root().querySelectorAll('.mpick').forEach(x => x.classList.toggle('on', x === b)); });
    const sel = $('adacc'); if (sel) sel.onchange = () => { S.acc = sel.value; load(); };
    $('adgo').onclick = () => propose(media);
    history_();
  }

  async function propose() {
    const o = S.opts, pg = { value: S.pageId }, opt = { dataset: { n: (o.pages.find(p => p.id === S.pageId) || {}).name || '' } };
    const goal = $('adgoal').value.trim(), budget = parseFloat(String($('adbud').value).replace(',', '.'));
    if (!pg.value) return msg('Sahifani tanlang.', true);
    if (!goal) return msg('Maqsadni yozing.', true);
    if (!(budget > 0)) return msg('Kunlik byudjetni kiriting.', true);
    if (!S.media) return msg('Rasm yoki videoni tanlang.', true);
    $('adgo').disabled = true; msg('AI taklif tayyorlamoqda…');
    S.pageId = pg.value;
    const r = await Auth.call('ads', { action: 'propose', account: S.acc, page_id: pg.value, page_name: opt.dataset.n, goal, budget, media: { type: S.media.type, id: S.media.id, hash: S.media.hash, name: S.media.name, thumb: S.media.type === 'video' ? S.media.pic : undefined }, text: $('adtext').value.trim(), headline: $('adhead').value.trim() });
    if (r.status !== 200) { $('adgo').disabled = false; return msg(ERR[r.data.error] || 'Taklif tayyorlab bo‘lmadi. Qayta urinib ko‘ring.', true); }
    S.draft = { id: r.data.id, proposal: r.data.proposal, goal, budget, pageName: opt.dataset.n, media: S.media, ai: r.data.ai, cur: o.currency || 'USD' };
    review();
  }

  const QL = { FULL_NAME: 'Ism-familiya', FIRST_NAME: 'Ism', LAST_NAME: 'Familiya', PHONE: 'Telefon', EMAIL: 'Email', CITY: 'Shahar' };
  function review() {
    const d = S.draft, p = d.proposal, t = p.targeting;
    root().innerHTML = `<div class="cardx"><h3>Reklama taklifi</h3>
      <p class="sub">${d.ai ? 'AI tayyorladi.' : 'AI kaliti ulanmagan, standart sozlamalar qo‘yildi.'} Hammasini o‘zgartirishingiz mumkin. «Ishga tushirish» tugmasini bosmaguningizcha hech narsa yaratilmaydi.</p>
      <div class="sum">
        <div><span>Maqsad</span><b>${esc(p.objective_label)}</b></div>
        <div><span>Sahifa</span><b>${esc(d.pageName)}</b></div>
        <div><span>Kunlik byudjet</span><b>${esc(d.budget)} ${esc(d.cur)}</b></div>
        <div><span>Media</span><b>${esc(d.media.name || '')}${d.media.type === 'video' ? ' (video)' : ''}</b></div>
        <div><span>Auditoriya</span><b>${t.age_min}–${t.age_max} yosh${t.genders.length ? t.genders[0] === 1 ? ', erkaklar' : ', ayollar' : ''}${t.cities.length ? ', ' + esc(t.cities.join(', ')) : ', butun O‘zbekiston'}</b></div>
        <div><span>Qiziqishlar</span><b>${t.interests.length ? esc(t.interests.join(', ')) : 'Meta tanlaydi'}</b></div>
        <div><span>Forma savollari</span><b>${p.form_questions.map(q => esc(q.label || QL[q.type] || q.type)).join(' · ')}</b></div>
      </div>
      ${p.budget_advice && p.budget_advice.suggested ? `<div class="banner info"><b>Byudjet tavsiyasi:</b> kuniga ${esc(p.budget_advice.suggested)} ${esc(d.cur)}. ${esc(p.budget_advice.reason || '')}</div>` : ''}
      <label class="lbl2" for="rvhead">Sarlavha</label><input id="rvhead" maxlength="40" value="${esc(p.headline)}" style="margin:6px 0 10px">
      <label class="lbl2" for="rvtext">Reklama matni</label>
      <textarea id="rvtext" maxlength="600" rows="4" style="width:100%;margin:6px 0 10px;font:500 1rem 'Manrope';padding:12px;border:1.5px solid var(--line);border-radius:12px">${esc(p.primary_text)}</textarea>
      <div class="row"><div><label class="lbl2" for="rvamin">Yosh dan</label><input id="rvamin" inputmode="numeric" value="${t.age_min}" style="margin:6px 0 10px"></div>
        <div><label class="lbl2" for="rvamax">Yosh gacha</label><input id="rvamax" inputmode="numeric" value="${t.age_max}" style="margin:6px 0 10px"></div></div>
      <label class="lbl2" for="rvbud">Kunlik byudjet (${esc(d.cur)})</label><input id="rvbud" inputmode="decimal" value="${esc(d.budget)}" style="margin:6px 0 10px">
      <div id="admsg" class="msg" style="display:none"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn ghost" id="rvback" type="button">Orqaga</button><button class="btn" id="rvgo" type="button">Reklamani ishga tushirish</button></div></div>`;
    $('rvback').onclick = () => wizard();
    $('rvgo').onclick = launch;
  }

  async function launch() {
    const d = S.draft, budget = parseFloat(String($('rvbud').value).replace(',', '.'));
    const proposal = { headline: $('rvhead').value.trim(), primary_text: $('rvtext').value.trim(), targeting: { age_min: +$('rvamin').value || 18, age_max: +$('rvamax').value || 65 } };
    if (!proposal.primary_text) return msg('Reklama matnini yozing.', true);
    if (!(budget > 0)) return msg('Kunlik byudjetni kiriting.', true);
    if (!confirm(`Reklama Meta’da yaratiladi va yoqiladi. Kuniga ${budget} ${d.cur} sarflanishi mumkin (pulni Meta kartangizdan oladi). Davom etamizmi?`)) return;
    $('rvgo').disabled = true; msg('Meta’da yaratilmoqda (10–20 soniya)…');
    const sv = await Auth.call('ads', { action: 'save', account: S.acc, id: d.id, budget, headline: proposal.headline, text: proposal.primary_text, proposal: { targeting: proposal.targeting, headline: proposal.headline, primary_text: proposal.primary_text } });
    if (sv.status !== 200) { $('rvgo').disabled = false; return msg('Saqlab bo‘lmadi. Qayta urinib ko‘ring.', true); }
    const r = await Auth.call('ads', { action: 'launch', account: S.acc, id: d.id, confirm: true });
    if (r.status === 200) {
      root().innerHTML = `<div class="cardx empty2"><h2>Reklama yuborildi</h2><p>Reklama Meta tekshiruviga yuborildi (odatda bir necha daqiqadan bir necha soatgacha). Lidlar «Mijozlar»ga tushadi, hisobotlar Dashboard’da ko‘rinadi.</p>
        <button class="btn" id="adnew" type="button">Yana reklama</button></div><div id="adlist"></div>`;
      $('adnew').onclick = () => load(); history_(); Dash.load(true); return;
    }
    $('rvgo').disabled = false;
    if (r.status === 422 && r.data.errors) return msg(r.data.errors.join(' '), true);
    msg(r.data.message || ERR[r.data.error] || 'Yaratib bo‘lmadi.', true);
  }

  async function history_() {
    const el = $('adlist'); if (!el) return;
    const r = await Auth.call('ads', { action: 'list' });
    const list = r.status === 200 ? r.data.drafts : [];
    if (!list.length) { el.innerHTML = ''; return; }
    const ST = { draft: 'Qoralama', launching: 'Yaratilmoqda', launched: 'Yuborildi', failed: 'Xato' };
    el.innerHTML = `<div class="cardx"><h3>Mening reklamalarim</h3>${list.map(x => `<div class="row2"><span><b>${esc((x.goal_text || '').slice(0, 70))}</b><br><span style="color:var(--muted)">${esc(x.page_name || '')} · ${esc(x.daily_budget)} ${esc(x.currency || '')}/kun · ${when(x.created_at)}${x.error ? ' · ' + esc(x.error) : ''}</span></span><span class="pill ${x.status === 'launched' ? 'on' : x.status === 'failed' ? 'off' : ''}">${ST[x.status] || x.status}</span></div>`).join('')}</div>`;
  }

  // ---------- Mijozlar (lidlar)
  async function leads() {
    const el = $('p-leads'); el.innerHTML = '<div class="loading">Yuklanmoqda…</div>';
    const r = await Auth.call('ads', { action: 'leads' });
    const list = r.status === 200 ? r.data.leads : [];
    if (!list.length) { el.innerHTML = '<div class="cardx empty2"><h2>Hali lid kelmagan</h2><p>Reklama ishlay boshlagach, ariza qoldirgan odamlar shu yerda ko‘rinadi va Telegram’da xabar keladi.</p></div>'; return; }
    el.innerHTML = `<div class="cardx"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3>Mijozlar (${list.length})</h3><button class="btn sm ghost" id="lcsv" type="button">Excel (CSV) yuklab olish</button></div>
      <div class="tbl"><table class="t"><thead><tr><th>Ism</th><th>Telefon</th><th>Email</th><th>Sana</th></tr></thead><tbody>${list.map(x => `<tr><td>${esc(x.name || '—')}</td><td>${esc(x.phone || '—')}</td><td>${esc(x.email || '')}</td><td>${when(x.created_time || x.created_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
    $('lcsv').onclick = () => {
      const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = '\uFEFF' + ['Ism,Telefon,Email,Sana', ...list.map(x => [x.name, x.phone, x.email, x.created_time || x.created_at].map(q).join(','))].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'mijozlar.csv'; a.click();
    };
  }

  return { load, leads, setMe(me) { window.__ME = me; } };
})();
