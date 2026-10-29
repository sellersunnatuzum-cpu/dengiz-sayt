// Kabinet bo'limlari: ogohlantirishlar, AI tahlil, ulanishlar (Meta, Telegram, webhook, CAPI, voronka), admin.
const Panels = (() => {
  let ME = null, AUDIT = null;
  const EP = () => (window.DENGIZ_SB && window.DENGIZ_SB.url ? window.DENGIZ_SB.url : '') + '/functions/v1/events-in';
  const KINDS = { lead: 'Lid', contacted: 'Bog‘lanildi', qualified: 'Sifatli lid', meeting: 'Uchrashuv belgilandi', showed: 'Uchrashuvga keldi', proposal: 'Taklif berildi', purchase: 'Sotuv', lost: 'Yo‘qotildi', other: 'Boshqa' };
  const CONN_ERR = {
    not_configured: 'Avtomatik ulash hali yoqilmagan. «Qo‘lda ulashni so‘rash» tugmasini bosing, sizga qo‘lda ulab beramiz.',
    no_access: 'Bu akkauntga kirish yo‘q. Business Manager’da bizni hamkor qilib, akkauntga «Ko‘rish» huquqini berganingizni va ID to‘g‘riligini tekshiring.',
    taken: 'Bu akkaunt boshqa hisobga ulangan.',
    free_used: 'Bu telefon yoki akkaunt uchun oxirgi 30 kunda bepul tahlil olingan. Keyingi bepul tahlil 30 kundan keyin.',
    busy: 'Urinishlar ko‘p bo‘ldi. Bir soatdan keyin qayta urining.',
    bad_account: 'Akkaunt ID noto‘g‘ri. Faqat raqamlar (yoki act_ bilan) kiriting.',
    phone_unverified: 'Avval telefoningizni Telegram orqali tasdiqlang (yuqoridagi tugma).',
    forbidden: 'Bu amal faqat biznes egasi yoki targetolog uchun.',
    no_accounts: 'Tanlangan biznesda reklama akkaunti topilmadi. Facebook oynasida akkauntni belgilaganingizni tekshiring.',
    denied: 'Facebook oynasida ruxsat berilmadi.',
    expired: 'Ulash oynasi eskirdi. Qaytadan bosing.',
    token: 'Facebook javob bermadi. Qaytadan urinib ko‘ring.',
    server: 'Serverda xato. Birozdan keyin urinib ko‘ring.',
  };

  // ---------- Ogohlantirishlar
  function alertHtml(a, sample) {
    const opts = arr(a.options).map((o, i) => `<div class="opt1"><i>${i + 1}</i><div><b>${esc(o.label)}</b><br><span>${esc(o.detail)}</span></div></div>`).join('');
    // Yig'iq ko'rinish: bir qator (daraja, sarlavha, vaqt). Bosilganda xulosa va variantlar ochiladi.
    return `<details class="alert ${esc(a.severity)}${a.id && !a.acked_at ? ' new' : ''}" ${a.id ? `data-id="${esc(a.id)}"` : ''}${sample ? ' open' : ''}>
      <summary><span class="sev">${SEV[a.severity] || 'Ma’lumot'}</span><span class="atitle" title="${esc(a.title)}">${esc(a.title)}</span>${sample ? '<span class="sample">Namuna</span>' : ''}${a.created_at ? `<time>${when(a.created_at)}</time>` : ''}<i class="chev"></i></summary>
      <div class="abody">
        ${a.summary ? `<div class="lbl">Xulosa</div><p>${esc(a.summary)}</p>` : ''}
        ${opts ? `<div class="lbl">Nima qilish mumkin</div><div class="opts">${opts}</div>` : ''}
        ${a.id && !a.acked_at ? '<div class="afoot"><button class="btn sm ghost ack" type="button">Ko‘rdim</button></div>' : a.acked_at ? '<div class="afoot"><span class="tag" style="margin:0">Ko‘rilgan</span></div>' : ''}
      </div>
    </details>`;
  }
  const SAMPLE = {
    severity: 'warning', title: 'Byudjet 2 barobar oshirildi: «Kurs — lid» kampaniyasi',
    summary: 'Kampaniya byudjeti kuniga 50 $ dan 100 $ ga o‘zgartirildi. Katta o‘zgarish Meta’ning o‘rganish bosqichini buzishi va natija narxini vaqtincha oshirishi mumkin.',
    options: [
      { label: 'Hozircha kuzating', detail: '3 kun davomida natija narxi va lid sonini solishtiring, shoshilib qayta o‘zgartirmang.' },
      { label: 'Keyingi o‘zgarishni kichik qiling', detail: 'Byudjetni har safar 20% dan oshirmang, shunda o‘rganish buzilmaydi.' },
      { label: 'Kerak bo‘lmasa qaytaring', detail: 'Natija narxi 1,5 barobar oshsa, avvalgi byudjetni tiklang.' }],
  };
  let openAlert = null;
  function alerts() {
    const list = ME.alerts, open = list.filter(a => !a.acked_at).length, c = $('acnt');
    c.textContent = open; c.classList.toggle('hidden', !open);
    $('p-alerts').innerHTML = `<div class="cardx"><h3>Ogohlantirishlar</h3>
      <p class="sub">Reklamangizda o‘zgarish bo‘lsa darhol xabar beramiz: nima bo‘ldi, xulosa va nima qilish mumkin. Qaror har doim sizda, AI hech narsani o‘zgartirmaydi.</p>
      ${list.length ? `<div class="alist">${list.map(a => alertHtml(a)).join('')}</div>` : `<p class="empty">Hozircha ogohlantirish yo‘q. Ogohlantirish shunday ko‘rinadi:</p>${alertHtml(SAMPLE, true)}`}</div>`;
    // Bir vaqtda bitta ochiq: ro'yxat tartibli turadi; real-time yangilanishda ochig'i yopilib qolmaydi
    const all = document.querySelectorAll('#p-alerts details.alert');
    all.forEach(d => {
      if (openAlert && d.dataset.id === openAlert) d.open = true;
      d.addEventListener('toggle', () => { if (!d.open) { if (openAlert === d.dataset.id) openAlert = null; return; } openAlert = d.dataset.id || null; all.forEach(x => { if (x !== d) x.open = false; }); });
    });
    document.querySelectorAll('#p-alerts .ack').forEach(b => b.onclick = async () => {
      const id = b.closest('.alert').dataset.id; b.disabled = true; openAlert = null;
      const r = await Auth.call('me', { action: 'ack_alert', id });
      if (r.status === 200) { const a = ME.alerts.find(x => x.id === id); if (a) a.acked_at = new Date().toISOString(); alerts(); } else b.disabled = false;
    });
  }

  // ---------- AI tahlil
  function audit() {
    const a = AUDIT, el = $('p-audit');
    if (!a || a.status !== 'done') {
      el.innerHTML = `<div class="cardx empty2"><h2>AI tahlil</h2><p>${ME.accounts.length ? 'Tahlil tayyorlanmoqda. Reklama tarixi yuklangach, bu yerda topilmalar va tavsiyalar chiqadi.' : 'Akkauntingizni ulang yoki Ads Manager eksportini yuklab bepul audit oling. Topilmalar va tavsiyalar shu yerda ko‘rinadi.'}</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${ME.accounts.length ? '' : '<button class="btn" id="a-conn" type="button">Akkauntni ulash</button>'}<a class="btn ghost" href="/audit/">CSV orqali bepul audit</a></div></div>`;
      const b = $('a-conn'); if (b) b.onclick = connect;
      return;
    }
    const f = arr(a.findings), s = obj(a.summary);
    el.innerHTML = `<div class="cardx"><h3>AI tahlil natijasi</h3><p class="sub">${when(a.created_at)} · AI faqat tahlil beradi, qaror sizniki.</p>
      ${s.narrative ? `<div class="narr">${esc(s.narrative)}</div>` : ''}
      ${f.length ? f.map(x => `<div class="find ${esc(x.severity)}"><b>${esc(x.title)}</b>${x.detail ? `<p>${esc(x.detail)}</p>` : ''}${x.items && x.items.length ? `<ul>${x.items.slice(0, 8).map(i => `<li>${esc(typeof i === 'string' ? i : JSON.stringify(i))}</li>`).join('')}</ul>` : ''}</div>`).join('') : '<p class="sub">Jiddiy muammo topilmadi.</p>'}</div>`;
  }

  // ---------- Meta akkauntni ulash
  // ---------- Telefonni Telegram orqali tasdiqlash (bepul)
  async function verifyPhone(target) {
    const r = await Auth.call('me', { action: 'tg_link' });
    const box = target || $('cmsg');
    if (r.status === 200 && r.data.url) {
      const url = r.data.url;
      watchVerify(true);
      if (box) {
        box.className = 'msg ok'; box.style.display = 'block';
        box.innerHTML = `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener" style="margin:8px 0">Telegram botni ochish</a><br>Botda <b>Start</b> ni, keyin <b>«Telefon raqamni tasdiqlash»</b> tugmasini bosing. Tasdiqlagach shu sahifaga qaytib, yangilang.`;
      }
      // Telefonda brauzer kechikkan window.open ni bloklaydi: to'g'ridan-to'g'ri o'tamiz (Telegram ilovasi ochiladi)
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) location.href = url;
      else window.open(url, '_blank', 'noopener');
    } else if (box) { box.className = 'msg err'; box.style.display = 'block'; box.textContent = r.data.error === 'not_configured' ? 'Telegram bot hali sozlanmagan.' : 'Havola yaratib bo‘lmadi. Birozdan keyin urinib ko‘ring.'; }
  }


  // ---------- Meta akkauntni ulash: Facebook orqali (avtomatik) yoki qo'lda (hamkorlik)
  function connect() {
    const verified = ME.profile.phone_verified;
    const fb = ME.meta_login;
    openModal(`<h3 style="margin-bottom:4px">Meta reklama akkauntini ulash</h3>
      <p class="sub">Parolingiz so‘ralmaydi. Ruxsatni istalgan vaqt Business Manager’da bekor qilishingiz mumkin.</p>
      ${verified ? '' : `<div class="banner" style="margin-bottom:12px"><b>1-qadam: telefoningizni tasdiqlang.</b> Bepul, Telegram orqali, 1 bosishda.<div style="margin-top:8px"><button class="btn sm" id="cver" type="button">Telegram orqali tasdiqlash</button></div></div>`}
      ${fb ? `<div class="lbl2" style="margin-bottom:6px">${verified ? '' : '2-qadam: '}Huquqni tanlang</div>
        <label class="pick"><input type="radio" name="cmode" value="view" checked><span><b>Faqat ko‘rish</b><br><small>Dengiz hisobot va ogohlantirish beradi.</small></span></label>
        <label class="pick"><input type="radio" name="cmode" value="edit"><span><b>Ko‘rish va boshqarish</b><br><small>Siz chatda «to‘xtat», «byudjetni 20% oshir» desangiz, tasdiqingizdan keyin Dengiz o‘zi bajaradi. O‘zi hech narsa qilmaydi.</small></span></label>
        <details class="fbhint"><summary>Facebook oynasida nima so‘raladi? Nima yozish kerak</summary>
          <p class="sub" style="margin:8px 0">Facebook ba‘zan «yangi obyektlar uchun kompaniya ma‘lumoti»ni so‘raydi. Quyidagicha to‘ldiring (tugma bilan nusxalang):</p>
          <div class="hrow"><span>Nomi</span><b>${esc((ME.business && ME.business.name) || 'Biznes nomi')}</b><button class="btn sm ghost" type="button" data-cp="${esc((ME.business && ME.business.name) || '')}">Nusxa</button></div>
          <div class="hrow"><span>Davlat</span><b>O‘zbekiston</b></div>
          <div class="hrow"><span>Sayt</span><b>sayt bo‘lsa shuni; bo‘lmasa Instagram yoki Facebook sahifa havolangiz; u ham bo‘lmasa quyidagi</b></div>
          <div class="hrow"><span></span><b>https://dengiz-sayt.vercel.app</b><button class="btn sm ghost" type="button" data-cp="https://dengiz-sayt.vercel.app">Nusxa</button></div>
          <div class="hrow"><span>Valyuta</span><b>USD</b></div>
          <div class="hrow"><span>Soat mintaqasi</span><b>Asia/Tashkent (GMT+05:00)</b></div>
        </details>
        <button class="btn full fbbtn" id="cfb" type="button" ${verified ? '' : 'disabled'}>Facebook orqali ulash</button>
        <p class="sub" style="margin-top:8px;font-size:.82rem">Facebook oynasida biznesingizni va reklama akkauntlarini tanlaysiz. Tanlanganlari avtomatik ulanadi va 90 kunlik hisobot yuklanadi.</p>
        <details style="margin-top:10px"><summary style="cursor:pointer;color:var(--muted);font-weight:600">Boshqa usul: hamkorlik orqali qo‘lda</summary>` : '<div>'}
      <ol class="steps2"><li><b>business.facebook.com</b> → Biznes sozlamalari → <b>Hamkorlar</b> → «Hamkor qo‘shish».</li>
        <li>Hamkor Business ID: <span class="code" style="display:inline;padding:2px 8px">912758621769367</span></li>
        <li>Reklama akkauntingizni tanlab, <b>«Ko‘rish»</b> (yoki boshqarish uchun <b>«Boshqarish»</b>) huquqini bering.</li>
        <li>Akkaunt ID’ni quyiga kiriting (Ads Manager yuqorisida, raqamlar).</li></ol>
      <label class="lbl2" for="cid">Reklama akkaunt ID</label>
      <input id="cid" inputmode="numeric" placeholder="masalan, 1234567890123456" autocomplete="off" style="margin:6px 0 10px">
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sm ghost" id="creq" type="button">Qo‘lda ulashni so‘rash</button><button class="btn sm" id="cgo" type="button" ${verified ? '' : 'disabled'}>Ulash</button></div>
      ${fb ? '</details>' : '</div>'}
      <div id="cmsg" class="msg" style="display:none"></div>
      <div style="text-align:right;margin-top:10px"><button class="btn sm ghost" id="ccancel" type="button">Yopish</button></div>`);
    const msg = (t, err) => { const m = $('cmsg'); m.textContent = t; m.className = 'msg ' + (err ? 'err' : 'ok'); m.style.display = 'block'; };
    $('ccancel').onclick = closeModal;
    const ver = $('cver'); if (ver) ver.onclick = () => verifyPhone();
    $('modal-in').querySelectorAll('[data-cp]').forEach(b => b.onclick = () => copy(b.dataset.cp, b));
    const fbb = $('cfb'); if (fbb) fbb.onclick = async () => {
      const mode = (document.querySelector('input[name=cmode]:checked') || {}).value || 'view';
      fbb.disabled = true; msg('Facebook oynasi ochilmoqda…');
      const r = await Auth.call('me', { action: 'meta_login', mode });
      if (r.status === 200 && r.data.url) { location.href = r.data.url; return; }
      fbb.disabled = false;
      msg(CONN_ERR[r.data.error] || 'Ulab bo‘lmadi. Keyinroq urinib ko‘ring.', true);
    };
    $('creq').onclick = async () => { const r = await Auth.call('me', { action: 'request_connect' }); msg(r.status === 200 ? 'So‘rov yuborildi. Siz bilan bog‘lanamiz.' : 'Yuborib bo‘lmadi.', r.status !== 200); };
    $('cgo').onclick = async () => {
      const v = $('cid').value; if (!/\d{5,}/.test(v)) { msg(CONN_ERR.bad_account, true); return; }
      $('cgo').disabled = true; msg('Tekshirilmoqda…');
      const r = await Auth.call('connect-account', { action: 'connect', account: v });
      $('cgo').disabled = false;
      if (r.status === 200 && r.data.ok) {
        closeModal(); Dash.state.demo = false; Dash.state.acc = r.data.account.id; Dash.state.polls = 0;
        await refreshMe(); document.querySelector('#tabs [data-t="dash"]').click(); Dash.load();
      } else msg(CONN_ERR[r.data.error] || 'Ulab bo‘lmadi. Keyinroq urinib ko‘ring.', true);
    };
  }

  // ---------- Facebook'dan qaytgach: reklama akkauntini tanlash (Facebook'dagi kabi bir bosish)
  async function metaPick() {
    openModal('<h3>Reklama akkauntini tanlang</h3><div class="loading">Facebook akkauntlaringiz yuklanmoqda…</div>');
    const r = await Auth.call('me', { action: 'meta_accounts' });
    if (r.status !== 200) {
      openModal(`<h3>Akkauntlarni olib bo‘lmadi</h3><p class="sub">${r.data.error === 'no_pending' ? 'Ulash oynasi eskirdi. Qaytadan «Facebook orqali ulash» ni bosing.' : esc(r.data.message || 'Birozdan keyin urinib ko‘ring.')}</p><div style="text-align:right"><button class="btn sm" onclick="closeModal()">Yopish</button></div>`);
      return;
    }
    const list = r.data.accounts || [];
    if (!list.length) {
      openModal('<h3>Reklama akkaunti topilmadi</h3><p class="sub">Facebook akkauntingizda reklama akkaunti yo‘q. Meta Ads Manager’da akkaunt yarating va qaytadan urinib ko‘ring.</p><div style="text-align:right"><button class="btn sm" onclick="closeModal()">Yopish</button></div>');
      return;
    }
    const ST = { 1: '', 2: ' · o‘chirilgan', 3: ' · to‘lanmagan qarz', 7: ' · tekshiruvda' };
    openModal(`<h3 style="margin-bottom:4px">Qaysi reklama akkauntini ulaymiz?</h3>
      <p class="sub">${r.data.can_manage ? 'Dengiz tanlangan akkauntda buyrug‘ingiz bilan reklamani boshqara oladi.' : 'Dengiz tanlangan akkauntni faqat ko‘radi.'} Boshqa akkauntlarga tegmaydi.</p>
      <div class="pickl">${list.map((a, i) => `<label class="pick ${a.taken ? 'dis' : ''}"><input type="checkbox" data-a="${esc(a.id)}" ${a.taken ? 'disabled' : (list.filter(x => !x.taken).length === 1 || a.connected ? 'checked' : '')}><span><b>${esc(a.name || a.id)}</b><br><small>${esc(a.id)} · ${esc(a.currency || '')}${a.business ? ' · ' + esc(a.business) : ''}${ST[a.status] || ''}${a.connected ? ' · ulangan' : ''}${a.taken ? ' · boshqa hisobga ulangan' : ''}</small></span></label>`).join('')}</div>
      <div id="pkmsg" class="msg" style="display:none"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn sm ghost" onclick="closeModal()">Keyinroq</button><button class="btn sm" id="pkgo" type="button">Ulash</button></div>`);
    $('pkgo').onclick = async () => {
      const ids = [...document.querySelectorAll('#modal-in [data-a]:checked')].map(x => x.dataset.a);
      const m = $('pkmsg'); m.style.display = 'block';
      if (!ids.length) { m.className = 'msg err'; m.textContent = 'Kamida bitta akkauntni tanlang.'; return; }
      $('pkgo').disabled = true; m.className = 'msg ok'; m.textContent = 'Ulanmoqda…';
      const rr = await Auth.call('me', { action: 'meta_pick', accounts: ids });
      if (rr.status === 200 && rr.data.ok) {
        closeModal(); Dash.state.demo = false; Dash.state.polls = 0; Dash.state.acc = ids[0];
        $('topnote').innerHTML = `<div class="banner info"><b>Ulandi: ${rr.data.connected} ta reklama akkaunti.</b> Hisobot bir necha daqiqada tayyor bo‘ladi.</div>`;
        await refreshMe(); document.querySelector('#tabs [data-t="dash"]').click(); Dash.load();
      } else { $('pkgo').disabled = false; m.className = 'msg err'; m.textContent = rr.data.taken || rr.status === 409 ? 'Bu akkaunt boshqa hisobga ulangan.' : (CONN_ERR[rr.data.error] || 'Ulab bo‘lmadi. Qayta urinib ko‘ring.'); }
    };
  }

  // ---------- Dengiz bilan chat: buyruq -> reja -> tasdiq -> Meta'da bajariladi
  const chatLog = [];
  function chatPush(who, text, extra) { chatLog.push({ who, text, ...(extra || {}) }); chatPaint(); }
  function chatPaint() {
    const box = $('chatbox'); if (!box) return;
    box.innerHTML = chatLog.map((m, i) => `<div class="bub ${m.who}">${esc(m.text).replace(/\n/g, '<br>')}${
      m.action && !m.done ? `<div class="bubact"><button class="btn sm" data-ok="${i}" type="button">Tasdiqlash</button><button class="btn sm ghost" data-no="${i}" type="button">Bekor qilish</button></div>` : ''}${
      m.undo && !m.done ? `<div class="bubact"><button class="btn sm ghost" data-undo="${i}" type="button">↩ Qaytarish</button></div>` : ''}</div>`).join('');
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll('[data-ok],[data-no],[data-undo]').forEach(b => b.onclick = async () => {
      const i = +(b.dataset.ok ?? b.dataset.no ?? b.dataset.undo), m = chatLog[i];
      m.done = true; chatPaint();
      const action = b.dataset.ok != null ? 'confirm' : b.dataset.no != null ? 'cancel' : 'undo';
      const r = await Auth.call('act', { action, id: m.action ? m.action.id : m.undo });
      chatReply(r);
      if (action === 'confirm' && r.status === 200 && r.data.undo) Dash.load(true);
    });
  }
  function chatReply(r) {
    if (r.status === 200) chatPush('bot', r.data.reply, { action: r.data.action, undo: r.data.undo });
    else chatPush('bot', r.data.error === 'forbidden' ? 'Sizda faqat ko‘rish huquqi bor.' : r.data.error === 'busy' ? 'Juda ko‘p so‘rov, biroz kuting.' : 'Xato yuz berdi, qayta urinib ko‘ring.');
  }
  function chat() {
    const el = $('p-chat'); if (!el) return;
    const manage = ME.accounts.some(a => a.access_level === 'manage');
    el.innerHTML = `<div class="cardx"><h3>Dengiz bilan chat</h3>
      <p class="sub">Oddiy so‘z bilan yozing: <i>«Kurs» kampaniyasini to‘xtat</i>, <i>«Retarget» byudjetini 20% oshir</i>, <i>holat</i>. Dengiz nima qilishini aytadi, siz tasdiqlaganingizdan keyingina Meta’da bajaradi. Telegram botda ham xuddi shunday.</p>
      ${manage ? '' : '<div class="banner">Hozir akkaunt faqat <b>ko‘rish</b> huquqi bilan ulangan: Dengiz hisobot beradi, lekin o‘zgartira olmaydi. Boshqarish uchun Ulanishlar → «Akkaunt ulash» → <b>Ko‘rish va boshqarish</b>.</div>'}
      <div id="chatbox" class="chatbox"></div>
      <form id="chatf" class="chatf"><input id="chati" maxlength="500" autocomplete="off" placeholder="Buyruq yozing…"><button class="btn sm" type="submit">Yuborish</button></form></div>
      <div class="cardx"><h3>So‘nggi amallar</h3><div id="acts"><p class="sub">Yuklanmoqda…</p></div></div>`;
    if (!chatLog.length) chatPush('bot', 'Salom! Men reklamangizni kuzataman va buyrug‘ingiz bilan o‘zgartiraman. Nima qilay?');
    else chatPaint();
    $('chatf').onsubmit = async e => {
      e.preventDefault();
      const t = $('chati').value.trim(); if (!t) return;
      $('chati').value = ''; chatPush('me', t);
      chatReply(await Auth.call('act', { action: 'say', text: t }));
      acts();
    };
    acts();
  }
  const ST = { pending: 'Kutilmoqda', done: 'Bajarildi', failed: 'Xato', cancelled: 'Bekor', expired: 'Eskirdi' };
  const KN = { pause: 'To‘xtatish', resume: 'Yoqish', set_budget: 'Byudjet' };
  async function acts() {
    const r = await Auth.call('act', { action: 'list' }), el = $('acts'); if (!el) return;
    const list = r.status === 200 ? r.data.actions : [];
    el.innerHTML = list.length ? list.map(a => `<div class="row2"><span><b>${KN[a.kind] || a.kind}: ${esc(a.object_name || '')}</b><br><span style="color:var(--muted)">${when(a.created_at)} · ${a.source === 'telegram' ? 'Telegram' : 'Kabinet'}</span></span><span class="pill ${a.status === 'done' ? 'on' : a.status === 'failed' ? 'off' : ''}">${ST[a.status] || a.status}</span></div>`).join('') : '<p class="sub">Hali amal bajarilmagan.</p>';
  }

  // ---------- Ulanishlar
  function settings() {
    const p = ME.profile, el = $('p-set');
    const accs = ME.accounts.map(a => `<div class="row2"><span><b>${esc(a.display_name || a.meta_ad_account_id)}</b><br><span style="color:var(--muted)">${esc(a.meta_ad_account_id)} · ${a.last_synced_at ? 'yangilandi ' + when(a.last_synced_at) : 'yuklanmoqda'}${a.capi_ready ? ' · CAPI ulangan' : ''}</span> <span class="pill ${a.access_level === 'manage' ? 'on' : ''}">${a.access_level === 'manage' ? 'Boshqarish' : 'Ko‘rish'}</span></span>
      <span><button class="btn sm ghost" data-capi="${esc(a.meta_ad_account_id)}" type="button">Sifat signali (CAPI)</button> <button class="btn sm danger" data-dis="${esc(a.meta_ad_account_id)}" type="button">Uzish</button></span></div>`).join('');
    const conns = ME.connectors.map(c => `<div class="row2"><span><b>${esc(c.label || 'Webhook')}</b><br><span style="color:var(--muted)">${when(c.created_at)}</span></span><button class="btn sm danger" data-rev="${esc(c.id)}" type="button">O‘chirish</button></div>`).join('');
    el.innerHTML = `
      <div class="cardx"><h3>Meta reklama akkaunti</h3>${ME.meta_pending ? '<div class="banner" style="margin-bottom:10px"><b>Facebook’ga kirdingiz, lekin reklama akkaunti hali tanlanmagan.</b><div style="margin-top:8px"><button class="btn sm" id="s-pick" type="button">Akkauntni tanlash</button></div></div>' : ''}<p class="sub">Facebook orqali bir bosishda ulanadi: faqat ko‘rish yoki ko‘rish va boshqarish. Ulangach oxirgi 90 kunlik tarix yuklanadi va soatiga yangilanadi.</p>
        ${accs || '<p class="empty">Hali akkaunt ulanmagan.</p>'}<div style="margin-top:12px"><button class="btn sm" id="s-conn" type="button">Akkaunt ulash</button></div></div>
      <div class="cardx"><h3>Telegram bot</h3><p class="sub">Ogohlantirish (xulosa va variantlar bilan) va kunlik hisobot Telegram’ga keladi. Botdan boshqarishingiz ham mumkin: /holat, /stop.</p>
        ${ME.telegram_linked ? '<span class="pill on">Ulangan</span>' : '<button class="btn sm" id="s-tg" type="button">Telegram’ni ulash</button>'}<div id="tgmsg" class="msg" style="display:none;margin-top:10px"></div></div>
      <div class="cardx"><h3>CRM / ERP / 1C / Billz</h3><p class="sub">Tizimingiz har bir sotuv bosqichini (sifatli lid, uchrashuv, sotuv) shu manzilga yuborsa, Meta’ga <b>sifat signali</b> qaytariladi va dashboardda sifatli lid narxi hamda CAC hisoblanadi. Telefon raqam shifrlanib saqlanadi.</p>
        ${conns}<div style="margin-top:12px"><button class="btn sm" id="s-wh" type="button">Ulanish yaratish</button> <button class="btn sm ghost" id="s-doc" type="button">Qanday yuboriladi?</button></div></div>
      <div class="cardx"><h3>Sotuv voronkasi</h3><p class="sub">Biznesingiz bosqichlarini yozing va qaysilari Meta’ga signal sifatida yuborilishini tanlang.</p><button class="btn sm ghost" id="s-fn" type="button">Voronkani sozlash</button></div>
      <div class="cardx"><h3>Ma’lumotlarim</h3><div class="kv">${[['Ism', p.full_name], ['Email', p.email], ['Telefon', p.phone], ['Telegram', p.telegram || '—']].map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div></div>`;
    $('s-conn').onclick = connect;
    const sp = $('s-pick'); if (sp) sp.onclick = metaPick;
    el.querySelectorAll('[data-dis]').forEach(b => b.onclick = async () => { if (!confirm('Akkauntni uzamizmi? Hisobot ko‘rinmay qoladi.')) return; await Auth.call('connect-account', { action: 'disconnect', account: b.dataset.dis }); Dash.state.acc = null; await refreshMe(); Dash.load(); });
    el.querySelectorAll('[data-capi]').forEach(b => b.onclick = () => capi(b.dataset.capi));
    el.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => { if (!confirm('Ulanishni o‘chiramizmi? Tizimingiz yuborishdan to‘xtaydi.')) return; await Auth.call('me', { action: 'revoke_connector', id: b.dataset.rev }); await refreshMe(); });
    const tg = $('s-tg'); if (tg) tg.onclick = async () => {
      const r = await Auth.call('me', { action: 'tg_link' }), m = $('tgmsg');
      m.style.display = 'block';
      if (r.status === 200 && r.data.url) { m.className = 'msg ok'; m.innerHTML = `Botni ochib «Start» bosing: <a href="${esc(r.data.url)}" target="_blank" rel="noopener">${esc(r.data.url)}</a> (havola 1 soat amal qiladi)`; }
      else { m.className = 'msg err'; m.textContent = r.data.error === 'not_configured' ? 'Telegram bot hali ishga tushirilmagan. Tez orada yoqiladi.' : 'Havola yaratib bo‘lmadi.'; }
    };
    $('s-wh').onclick = webhook; $('s-doc').onclick = docs; $('s-fn').onclick = funnel;
  }

  async function webhook() {
    const r = await Auth.call('me', { action: 'create_webhook', label: 'CRM' });
    if (r.status !== 200) { openModal(`<h3>Ulanish yaratilmadi</h3><p class="sub">${r.data.error === 'limit' ? 'Faol ulanishlar soni 5 tadan oshmasin.' : r.data.error === 'forbidden' ? 'Bu amal faqat biznes egasi uchun.' : 'Keyinroq urinib ko‘ring.'}</p><button class="btn sm" onclick="closeModal()">Yopish</button>`); return; }
    openModal(`<h3>Ulanish tayyor</h3><p class="sub"><b>Tokenni hozir nusxalang:</b> u faqat bir marta ko‘rsatiladi.</p>
      <div class="lbl2">Manzil (POST)</div><div class="code">${esc(r.data.url)}</div><div class="lbl2">Token (Authorization: Bearer …)</div><div class="code" id="tk">${esc(r.data.token)}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn sm ghost" id="tkc" type="button">Tokenni nusxalash</button><button class="btn sm" id="tkx" type="button">Tayyor</button></div>`);
    $('tkc').onclick = e => copy(r.data.token, e.target);
    $('tkx').onclick = async () => { closeModal(); await refreshMe(); };
  }
  function docs() {
    const ex = `POST ${EP()}\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "external_id": "deal-1042",\n  "stage_key": "qualified",\n  "phone": "+998901234567",\n  "value": 1500000,\n  "currency": "UZS",\n  "time": "2026-10-28T10:00:00Z"\n}`;
    openModal(`<h3>Tizimdan qanday yuboriladi</h3><p class="sub">Har bir bosqich o‘zgarganda (yoki sotuv bo‘lganda) bitta so‘rov yuboring. Bir xil <code>external_id</code> va bosqich ikki marta hisoblanmaydi.</p>
      <div class="code" style="white-space:pre-wrap">${esc(ex)}</div>
      <p class="sub"><b>stage_key</b> — voronkangizdagi bosqich kaliti, yoki <b>event_type</b>: ${Object.keys(KINDS).join(', ')}. Meta’ga faqat sifatli lid, uchrashuv, kelgan va sotuv yuboriladi. 7 kundan eski hodisa qabul qilinmaydi (Meta cheklovi).</p>
      <div style="text-align:right"><button class="btn sm" onclick="closeModal()">Yopish</button></div>`);
  }

  function capi(acc) {
    openModal(`<h3>Meta’ga sifat signali (CAPI)</h3><p class="sub">Meta Events Manager’dan <b>Dataset ID</b> va <b>Conversions API token</b> oling. Token xavfsiz omborda saqlanadi, qayta ko‘rsatilmaydi.</p>
      <label class="lbl2">Dataset ID</label><input id="cds" inputmode="numeric" style="margin:6px 0 10px" autocomplete="off">
      <label class="lbl2">Conversions API token</label><input id="ctk" type="password" style="margin:6px 0 10px" autocomplete="off">
      <div id="cpmsg" class="msg" style="display:none"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sm ghost" onclick="closeModal()">Bekor</button><button class="btn sm" id="cpgo" type="button">Saqlash</button></div>`);
    $('cpgo').onclick = async () => {
      const r = await Auth.call('me', { action: 'save_capi', account: acc, dataset_id: $('cds').value, token: $('ctk').value }), m = $('cpmsg');
      m.style.display = 'block';
      if (r.status === 200) { m.className = 'msg ok'; m.textContent = 'Saqlandi. Sifat signallari Meta’ga yuboriladi.'; $('ctk').value = ''; refreshMe(); }
      else { m.className = 'msg err'; m.textContent = r.data.error === 'forbidden' ? 'Bu amal faqat biznes egasi uchun.' : 'Ma’lumot noto‘g‘ri. Dataset ID va tokenni tekshiring.'; }
    };
  }

  async function funnel() {
    const r = await Auth.call('me', { action: 'funnel_get' });
    let st = (r.data.stages || []).map(s => ({ ...s }));
    if (!st.length) st = [{ key: 'lead', label: 'Yangi lid', kind: 'lead', sends_signal: true, has_value: false }, { key: 'qualified', label: 'Sifatli lid', kind: 'qualified', sends_signal: true, has_value: false }, { key: 'meeting', label: 'Uchrashuv', kind: 'meeting', sends_signal: true, has_value: false }, { key: 'purchase', label: 'Sotuv', kind: 'purchase', sends_signal: true, has_value: true }];
    const paint = () => {
      openModal(`<h3>Sotuv voronkasi</h3><p class="sub">Bosqich nomi, turi va Meta’ga signal yuborilsinmi.</p>
        <div class="fgrid lbl2"><span>Nomi</span><span>Turi</span><span>Signal</span><span>Summa</span><span></span></div>
        ${st.map((s, i) => `<div class="fgrid"><input data-i="${i}" data-f="label" value="${esc(s.label)}" maxlength="60"><select data-i="${i}" data-f="kind">${Object.entries(KINDS).map(([k, t]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <label class="chk"><input type="checkbox" data-i="${i}" data-f="sends_signal" ${s.sends_signal ? 'checked' : ''}> ha</label><label class="chk"><input type="checkbox" data-i="${i}" data-f="has_value" ${s.has_value ? 'checked' : ''}> ha</label><button class="btn sm danger" data-del="${i}" type="button">×</button></div>`).join('')}
        <div id="fmsg" class="msg" style="display:none"></div>
        <div style="display:flex;gap:8px;justify-content:space-between;margin-top:10px"><button class="btn sm ghost" id="fadd" type="button">+ Bosqich</button><span><button class="btn sm ghost" onclick="closeModal()">Bekor</button> <button class="btn sm" id="fsave" type="button">Saqlash</button></span></div>`);
      const m = $('modal-in');
      m.querySelectorAll('[data-f]').forEach(i => i.onchange = i.oninput = () => { const s = st[+i.dataset.i]; s[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; });
      m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { st.splice(+b.dataset.del, 1); paint(); });
      $('fadd').onclick = () => { if (st.length < 20) { st.push({ key: '', label: '', kind: 'other', sends_signal: false, has_value: false }); paint(); } };
      $('fsave').onclick = async () => {
        const rows = st.filter(s => s.label.trim()).map(s => ({ ...s, key: s.key || s.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || s.kind }));
        const rr = await Auth.call('me', { action: 'funnel_save', stages: rows }), f = $('fmsg'); f.style.display = 'block';
        if (rr.status === 200) { f.className = 'msg ok'; f.textContent = 'Saqlandi.'; } else { f.className = 'msg err'; f.textContent = rr.data.error === 'forbidden' ? 'Bu amal faqat biznes egasi uchun.' : 'Saqlab bo‘lmadi.'; }
      };
    };
    paint();
  }

  // ---------- Admin
  async function admin() {
    const el = $('p-admin'); el.innerHTML = '<div class="loading">Yuklanmoqda…</div>';
    const r = await Auth.call('me', { action: 'admin_list' });
    if (r.status !== 200) { el.innerHTML = '<div class="cardx"><p>Ruxsat yo‘q.</p></div>'; return; }
    const { leads, audits, counts } = r.data;
    el.innerHTML = `<div class="kpis"><div class="kpi"><small>Foydalanuvchilar</small><b>${counts.users}</b></div><div class="kpi"><small>Ulangan akkauntlar</small><b>${counts.accounts}</b></div><div class="kpi"><small>Arizalar</small><b>${counts.leads}</b></div></div>
      <div class="cardx"><h3>Auditlar</h3><div class="tbl"><table class="t"><thead><tr><th>Biznes</th><th>Tur</th><th>Holat</th><th>Sana</th><th>To‘lov</th></tr></thead><tbody>${audits.map(a => `<tr><td>${esc(a.business || '—')}</td><td>${esc(a.kind)}</td><td>${esc(a.status)}</td><td>${when(a.created_at)}</td><td>${a.paid ? '<span class="pill on">To‘langan</span>' : `<button class="btn sm ghost" data-paid="${esc(a.id)}" type="button">To‘langan deb belgilash</button>`}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="cardx"><h3>Arizalar</h3><div class="tbl"><table class="t"><thead><tr><th>Ism</th><th>Telefon</th><th>Telegram</th><th>Biznes</th><th>Byudjet</th><th>Turi</th><th>Sana</th></tr></thead><tbody>${leads.map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.phone)}</td><td>${esc(l.telegram || '')}</td><td>${esc(l.business || '')}</td><td>${esc(l.budget || '')}</td><td>${esc(l.interest || '')}</td><td>${when(l.created_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
    el.querySelectorAll('[data-paid]').forEach(b => b.onclick = async () => { b.disabled = true; await Auth.call('me', { action: 'admin_mark_paid', id: b.dataset.paid }); admin(); });
  }

  // ---------- Tayyorgarlik: ulanish ro'yxati (qadamlar, holat, bitta bosishda keyingi qadam)
  function onboarding() {
    const el = $('onb'); if (!el) return;
    const p = ME.profile, a = ME.accounts.length > 0, synced = ME.accounts.some(x => x.last_synced_at);
    const steps = [
      { done: true, t: 'Hisob yaratildi', d: 'Kabinetga kirdingiz.' },
      { done: !!p.phone_verified, t: 'Telefonni tasdiqlash', d: 'Telegram orqali, bepul, 1 bosish.', btn: 'Tasdiqlash', act: () => verifyPhone($('onbmsg')) },
      ME.meta_pending && !a
        ? { done: false, t: 'Reklama akkauntini tanlang', d: 'Facebook’ga kirdingiz. Endi qaysi reklama akkauntini ulashni belgilang.', btn: 'Akkauntni tanlash', act: metaPick }
        : { done: a, t: 'Meta reklama akkauntini ulash', d: 'Facebook orqali bir bosishda. Parol so‘ralmaydi.', btn: 'Ulash', act: connect, needs: p.phone_verified },
      { done: a && synced, t: 'Hisobot yuklandi', d: a ? (synced ? 'Akkaunt ma‘lumotlari yuklandi. Reklama ma‘lumoti bo‘lmasa, birinchi reklamani «Reklama berish» da yoqing.' : 'Oxirgi 90 kunlik tarix yuklanmoqda (3–10 daqiqa).') : 'Akkaunt ulangach avtomatik yuklanadi.', auto: true },
      { done: !!ME.telegram_linked, t: 'Telegram ogohlantirishlari', d: 'Muammo bo‘lsa darhol xabar beramiz va kunlik hisobot yuboramiz.', btn: 'Ulash', act: () => verifyPhone($('onbmsg')) },
      { done: ME.connectors.length > 0, t: 'CRM / sotuv signali', d: 'Ixtiyoriy: sifatli lid va sotuvlarni Meta’ga qaytarish.', btn: 'Sozlash', act: () => document.querySelector('#tabs [data-t="set"]').click(), optional: true },
    ];
    const req = steps.filter(s => !s.optional), left = req.filter(s => !s.done).length;
    const pct = Math.round(100 * req.filter(s => s.done).length / req.length);
    const next = steps.findIndex(s => !s.done && !s.auto && !s.optional);
    if (!left) { el.innerHTML = ''; return; }   // hammasi tayyor bo'lsa ro'yxat yashiriladi
    el.innerHTML = `<div class="cardx onb"><div class="onbh"><h3>${left ? 'Tayyorgarlik' : 'Hammasi tayyor'}</h3><span class="pill ${left ? '' : 'on'}">${pct}%</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <ol class="onbl">${steps.map((s, i) => `<li class="${s.done ? 'done' : i === next ? 'cur' : ''}"><span class="dot">${s.done ? '✓' : i + 1}</span><div><b>${esc(s.t)}${s.optional ? '<span class="tag">ixtiyoriy</span>' : ''}</b><p>${esc(s.d)}</p></div>
        ${!s.done && s.btn && !s.auto ? `<button class="btn sm ${i === next ? '' : 'ghost'}" data-onb="${i}" type="button" ${s.needs === false ? 'disabled title="Avval telefonni tasdiqlang"' : ''}>${s.btn}</button>` : ''}</li>`).join('')}</ol>
      <div id="onbmsg" class="msg"></div>${left ? '' : '<button class="btn sm ghost" id="onbhide" type="button">Yashirish</button>'}</div>`;
    el.querySelectorAll('[data-onb]').forEach(b => b.onclick = () => steps[+b.dataset.onb].act());
    const h = $('onbhide'); if (h) h.onclick = () => { try { localStorage.setItem('dg_onb_hide', '1'); } catch (e) {} onboarding(); };
  }

  // Telegram'da tasdiqlanganda sahifa o'zi yangilanadi (qo'lda yangilash shart emas)
  let verTimer = null, verUntil = 0, verBound = false;
  function watchVerify(fresh) {
    if (!ME || ME.profile.phone_verified) return;
    verUntil = Date.now() + (fresh ? 15 : 10) * 60 * 1000;
    const tick = async () => {
      if (document.hidden || !ME || ME.profile.phone_verified) return;
      if (Date.now() > verUntil) { clearInterval(verTimer); verTimer = null; return; }
      const r = await fetchMe();
      if (r.status !== 200 || !r.data.profile.phone_verified) return;
      clearInterval(verTimer); verTimer = null;
      ME = r.data; if (window.Ads) Ads.setMe(ME);
      paintAll();
      const tn = $('topnote'); if (tn) tn.innerHTML = '<div class="banner info"><b>Telefon tasdiqlandi.</b> Endi Meta reklama akkauntini ulashingiz mumkin.</div>';
      const mb = $('modal'); if (mb && mb.classList.contains('on') && $('cver')) connect();   // ulash oynasi ochiq bo'lsa, yangi holat bilan qayta chiziladi
    };
    if (!verTimer) verTimer = setInterval(tick, 3000);
    if (!verBound) { verBound = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); window.addEventListener('focus', tick); }
  }

  // Hisobot yuklanishi tugaguncha (last_synced_at paydo bo'lguncha) holatni kuzatamiz
  let syncTimer = null, syncUntil = 0;
  function watchSync() {
    if (!ME || !ME.accounts.length || ME.accounts.every(a => a.last_synced_at)) return;
    syncUntil = Date.now() + 10 * 60 * 1000;
    if (syncTimer) return;
    syncTimer = setInterval(async () => {
      if (document.hidden) return;
      if (Date.now() > syncUntil) { clearInterval(syncTimer); syncTimer = null; return; }
      const r = await fetchMe();
      if (r.status === 200 && r.data.accounts.every(a => a.last_synced_at)) {
        clearInterval(syncTimer); syncTimer = null;
        ME = r.data; if (window.Ads) Ads.setMe(ME); paintAll(); if (window.Dash) Dash.load(true);
      }
    }, 5000);
  }

  // Bitta bo'limdagi xato qolganlarini (va real-time kuzatuvni) to'xtatib qo'ymasin
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('[Dengiz] ' + name, e); const el = $('p-' + name); if (el) el.innerHTML = '<div class="cardx"><p>Bu bo‘limni ko‘rsatib bo‘lmadi. Sahifani yangilang.</p></div>'; } };
  const paintAll = () => { safe('alerts', alerts); safe('set', settings); safe('onb', onboarding); };
  // Bir vaqtda bitta "me" so'rovi: sekin tarmoqda taymerlar so'rovlarni ustma-ust yig'ib yubormaydi
  let meBusy = null;
  function fetchMe() { if (!meBusy) meBusy = Auth.call('me', {}).finally(() => { meBusy = null; }); return meBusy; }
  async function refreshMe() { const r = await fetchMe(); if (r.status === 200) { ME = r.data; if (window.Ads) Ads.setMe(ME); paintAll(); watchSync(); } return ME; }
  function init(me) { ME = me; paintAll(); safe('audit', audit); safe('chat', chat); watchVerify(false); watchSync(); watchLive(); if (me.is_admin) $('tab-admin').classList.remove('hidden'); }

  // Yangilash taymer bilan emas, hodisa bilan: tabga qaytganda yoki Ogohlantirishlar ochilganda (ko'pi bilan daqiqada bir marta).
  // Bekor turgan sahifa serverga umuman so'rov yubormaydi; tezkor xabar Telegram orqali keladi.
  let liveBound = false, liveSig = '', liveAt = 0;
  const sig = m => JSON.stringify([m.alerts.map(a => a.id + (a.acked_at ? 1 : 0)), m.accounts.map(a => a.meta_ad_account_id + a.last_synced_at + a.access_level), m.profile.phone_verified, m.telegram_linked, m.connectors.length, m.meta_pending]);
  function watchLive() {
    liveSig = sig(ME);
    liveAt = Date.now();
    const tick = async () => {
      if (document.hidden || $('modal').classList.contains('on') || Date.now() - liveAt < 60000) return;   // ochiq oynani buzmaymiz
      liveAt = Date.now();
      const r = await fetchMe();
      if (r.status !== 200) return;
      const s = sig(r.data); if (s === liveSig) return;
      liveSig = s; ME = r.data; if (window.Ads) Ads.setMe(ME); paintAll();
    };
    live = tick;
    if (!liveBound) { liveBound = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); window.addEventListener('focus', tick); }
  }
  let live = () => {};
  return { init, connect, admin, verifyPhone, chat, metaPick, live: () => live(),setAudit(a) { AUDIT = a; audit(); }, refreshAudit() { Dash.load(true); } };
})();
