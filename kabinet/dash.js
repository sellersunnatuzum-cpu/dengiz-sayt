// Dashboard: barcha reklamalar hisoboti. Ma'lumot `dashboard` funksiyasidan; akkaunt ulanmagan bo'lsa namuna rejimi.
const Dash = (() => {
  const S = { acc: null, days: 30, data: null, demo: false, chart: null, sub: 'camp', bd: 'age', sort: {}, poll: null, polls: 0, tried: {}, seq: 0, empties: {}, picked: false };
  try { const a = localStorage.getItem('dg_acc'); if (a) { S.acc = a; S.picked = true; } } catch (e) {}
  const KPI_DEF = {
    spend: { t: 'Sarflangan', f: d => d.spend, fmt: (v, c) => money(v, c), good: 0 },
    leads: { t: 'Lidlar', f: d => d.leads, fmt: v => nf(v), good: 1 },
    cpl: { t: 'Lid narxi', f: d => d.leads ? d.spend / d.leads : null, fmt: (v, c) => money(v, c), good: -1 },
    impressions: { t: 'Ko‘rsatuvlar', f: d => d.impressions, fmt: v => nf(v), good: 1 },
    reach: { t: 'Qamrov', f: d => d.reach, fmt: v => nf(v), good: 1 },
    clicks: { t: 'Havola bosish', f: d => d.link_clicks, fmt: v => nf(v), good: 1 },
    ctr: { t: 'CTR', f: d => d.impressions ? d.link_clicks / d.impressions * 100 : null, fmt: v => pct(v), good: 1 },
    cpc: { t: 'Bosish narxi', f: d => d.link_clicks ? d.spend / d.link_clicks : null, fmt: (v, c) => money(v, c), good: -1 },
    ql: { t: 'Sifatli lidlar', f: d => d.ql, fmt: v => nf(v), good: 1, crm: true },
    cpql: { t: 'Sifatli lid narxi', f: d => d.ql ? d.spend / d.ql : null, fmt: (v, c) => money(v, c), good: -1, crm: true },
    sales: { t: 'Sotuvlar', f: d => d.sales, fmt: v => nf(v), good: 1, crm: true },
    cac: { t: 'Mijoz narxi (CAC)', f: d => d.sales ? d.spend / d.sales : null, fmt: (v, c) => money(v, c), good: -1, crm: true },
    roas: { t: 'ROAS', f: d => d.spend ? d.revenue / d.spend : null, fmt: v => (Math.round(v * 100) / 100) + '×', good: 1, crm: true },
  };
  const DEFAULT_KPI = ['spend', 'leads', 'cpl', 'ql', 'cpql', 'cac', 'ctr', 'impressions'];
  const loadKpi = () => { try { const v = JSON.parse(localStorage.getItem('dg_kpi')); if (Array.isArray(v) && v.length) return v.filter(k => KPI_DEF[k]); } catch (e) {} return DEFAULT_KPI.slice(); };
  const saveKpi = v => { try { localStorage.setItem('dg_kpi', JSON.stringify(v)); } catch (e) {} };

  // ---------- namuna ma'lumot (deterministik)
  function demo(days) {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const until = new Date(); until.setDate(until.getDate() - 1);
    const dayStr = k => { const d = new Date(until); d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
    const mk = n => Array.from({ length: n }, (_, i) => {
      const spend = 28 + rnd() * 22 + (n - i) * 0.1, imp = spend * (110 + rnd() * 40), clicks = imp * (0.012 + rnd() * 0.008);
      return { d: dayStr(n - 1 - i), spend, impressions: imp, clicks, leads: Math.round(clicks * (0.07 + rnd() * 0.05)) };
    });
    const cur = mk(days), prv = mk(days);
    const tot = a => ({ spend: a.reduce((x, y) => x + y.spend, 0), impressions: a.reduce((x, y) => x + y.impressions, 0), reach: a.reduce((x, y) => x + y.impressions, 0) * 0.62,
      link_clicks: a.reduce((x, y) => x + y.clicks, 0), leads: a.reduce((x, y) => x + y.leads, 0) });
    const T = tot(cur), P = tot(prv);
    const names = ['Kurs — lid (video)', 'Kurs — retarget', 'Aksiya — kontaktlar', 'Brend xabardorligi'];
    const share = [0.46, 0.18, 0.27, 0.09], lshare = [0.4, 0.3, 0.27, 0.03];
    const campaigns = names.map((name, i) => ({ id: 'c' + i, name, status: i === 3 ? 'PAUSED' : 'ACTIVE', spend: T.spend * share[i], leads: Math.round(T.leads * lshare[i]), impressions: T.impressions * share[i], clicks: T.link_clicks * share[i] }));
    const ads = [];
    campaigns.forEach((c, i) => [1, 2, 3].forEach(j => {
      const w = [0.5, 0.3, 0.2][j - 1], imp = c.impressions * w;
      ads.push({ id: `a${i}${j}`, name: `${['Video', 'Karusel', 'Rasm'][j - 1]} ${j} — ${c.name.split(' ')[0]}`, status: c.status, campaign: c.name, spend: c.spend * w, leads: Math.round(c.leads * (w + (rnd() - 0.5) * 0.15)), impressions: imp, clicks: c.clicks * w,
        v3s: j === 1 ? imp * (0.18 + rnd() * 0.12) : 0, p25: j === 1 ? imp * 0.12 : 0, p50: j === 1 ? imp * (0.05 + rnd() * 0.03) : 0, p75: j === 1 ? imp * 0.03 : 0, p100: j === 1 ? imp * 0.012 : 0, thruplay: j === 1 ? imp * 0.04 : 0 });
    }));
    const bk = (b, vals, sh, ls) => vals.map((v, i) => ({ breakdown: b, value: v, spend: T.spend * sh[i], leads: Math.round(T.leads * ls[i]), impressions: T.impressions * sh[i] }));
    return {
      accounts: [{ id: 'act_demo', display_name: 'Namuna akkaunt', currency: 'USD' }], account: { id: 'act_demo', display_name: 'Namuna akkaunt', currency: 'USD' },
      range: { since: dayStr(days - 1), until: dayStr(0), days }, cur: T, prev: P,
      daily: cur.map(x => ({ d: x.d, spend: x.spend, leads: x.leads, impressions: x.impressions, clicks: x.clicks })), campaigns, ads,
      breakdowns: [...bk('age', ['18-24', '25-34', '35-44', '45-54', '55-64'], [0.12, 0.38, 0.28, 0.15, 0.07], [0.1, 0.42, 0.3, 0.12, 0.06]),
        ...bk('gender', ['female', 'male'], [0.56, 0.44], [0.62, 0.38]),
        ...bk('region', ['Toshkent', 'Samarqand', 'Farg‘ona', 'Andijon'], [0.5, 0.2, 0.18, 0.12], [0.58, 0.18, 0.14, 0.1]),
        ...bk('publisher_platform', ['instagram', 'facebook', 'audience_network'], [0.55, 0.38, 0.07], [0.6, 0.38, 0.02])],
      activities: [
        { event_time: new Date(Date.now() - 3600e3 * 5).toISOString(), event_type: 'update_campaign_budget', actor_name: 'Targetolog', object_name: 'Kurs — lid (video)' },
        { event_time: new Date(Date.now() - 3600e3 * 30).toISOString(), event_type: 'update_ad_run_status', actor_name: 'Targetolog', object_name: 'Brend xabardorligi' }],
      crm: [{ event_type: 'qualified', n: Math.round(T.leads * 0.31), revenue: 0 }, { event_type: 'meeting', n: Math.round(T.leads * 0.14), revenue: 0 }, { event_type: 'purchase', n: Math.round(T.leads * 0.06), revenue: Math.round(T.leads * 0.06) * 280 }],
      audit: null, sync: null,
    };
  }

  // ---------- hisob-kitob
  function agg(d, cur) {
    const crm = d.crm || [];
    const cnt = k => crm.find(x => x.event_type === k)?.n || 0;
    const ql = Math.max(cnt('qualified'), cnt('meeting'), cnt('showed'), cnt('purchase'));
    return { ...cur, ql, sales: cnt('purchase'), revenue: crm.find(x => x.event_type === 'purchase')?.revenue || 0 };
  }
  function delta(def, a, b) {
    const x = def.f(a), y = def.f(b);
    if (x == null || y == null || y === 0) return '<span class="d flat">—</span>';
    const ch = (x - y) / Math.abs(y) * 100; if (Math.abs(ch) < 0.5) return '<span class="d flat">o‘zgarmagan</span>';
    const good = def.good === 0 ? 'flat' : (ch > 0) === (def.good > 0) ? 'good' : 'bad';
    return `<span class="d ${good}">${ch > 0 ? '▲' : '▼'} ${pct(Math.abs(ch))} <span style="font-weight:500">oldingi davrga nisbatan</span></span>`;
  }

  function kpisHtml(d) {
    const cur = agg(d, d.cur), prev = agg(d, d.prev), c = d.account.currency || 'USD';
    const hasCrm = (d.crm || []).length > 0;
    return loadKpi().map((k, i) => {
      const def = KPI_DEF[k]; const v = def.f(cur);
      const hint = def.crm && !hasCrm ? '<div class="hint">CRM ulangach to‘ladi</div>' : '';
      return `<div class="kpi ${i === 0 ? 'big' : ''}"><small>${def.t}</small><b>${v == null ? '—' : def.fmt(v, c)}</b>${v == null ? '' : delta(def, cur, prev)}${hint}</div>`;
    }).join('');
  }

  function chart(d) {
    if (S.chart) { S.chart.destroy(); S.chart = null; }
    const cv = $('dchart'); if (!cv || !window.Chart) return;
    const css = getComputedStyle(document.documentElement);
    const blue = (css.getPropertyValue('--blue') || '#1456D8').trim(), aqua = (css.getPropertyValue('--aqua') || '#14B8C4').trim();
    S.chart = new Chart(cv, {
      data: { labels: d.daily.map(x => x.d.slice(5)), datasets: [
        { type: 'bar', label: 'Sarflangan', data: d.daily.map(x => Math.round(x.spend * 100) / 100), backgroundColor: blue + '33', borderColor: blue, borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
        { type: 'line', label: 'Lidlar', data: d.daily.map(x => x.leads), borderColor: aqua, backgroundColor: aqua, tension: .3, pointRadius: 2, yAxisID: 'y1' }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Manrope', weight: 600 } } } },
        scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { family: 'Manrope' } } }, y: { beginAtZero: true, grid: { color: '#e6edf7' }, title: { display: true, text: 'Sarflangan' } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: 'Lidlar' }, ticks: { precision: 0 } } } },
    });
  }

  // ---------- jadvallar
  function table(id, cols, rows) {
    const st = S.sort[id] || { k: cols[1].k, dir: -1 };
    const rs = rows.slice().sort((a, b) => ((a[st.k] ?? -Infinity) > (b[st.k] ?? -Infinity) ? 1 : -1) * st.dir);
    const head = cols.map(c => `<th data-k="${c.k}" data-id="${id}">${c.t}${st.k === c.k ? (st.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('');
    const body = rs.map(r => `<tr>${cols.map(c => { const v = r[c.k]; const cls = c.cls ? c.cls(r) : ''; return `<td class="${cls}" ${c.k === 'name' ? `title="${esc(v)}"` : ''}>${c.f ? c.f(v, r) : esc(v)}</td>`; }).join('')}</tr>`).join('');
    return `<div class="tbl"><table class="t"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--muted)">Ma’lumot yo‘q</td></tr>`}</tbody></table></div>`;
  }
  const status = s => `<span class="pill ${s === 'ACTIVE' ? 'on' : s === 'PAUSED' ? 'off' : ''}">${s === 'ACTIVE' ? 'Yoniq' : s === 'PAUSED' ? 'To‘xtagan' : esc(s || '—')}</span>`;
  const enrich = r => ({ ...r, cpl: r.leads ? r.spend / r.leads : null, ctr: r.impressions ? r.clicks / r.impressions * 100 : null, hook: r.v3s && r.impressions ? r.v3s / r.impressions * 100 : null });
  const cplCls = avg => r => r.cpl != null && avg ? (r.cpl > avg * 1.3 ? 'bad' : r.cpl < avg * 0.8 ? 'good' : '') : '';

  function campTable(d) {
    const c = d.account.currency || 'USD', rows = d.campaigns.map(enrich), avg = d.cur.leads ? d.cur.spend / d.cur.leads : null;
    return table('camp', [{ k: 'name', t: 'Kampaniya' }, { k: 'spend', t: 'Sarflangan', f: v => money(v, c) }, { k: 'leads', t: 'Lidlar', f: nf },
      { k: 'cpl', t: 'Lid narxi', f: v => v == null ? '—' : money(v, c), cls: cplCls(avg) },
      { k: 'ctr', t: 'CTR', f: v => v == null ? '—' : pct(v) }, { k: 'status', t: 'Holat', f: status }], rows);
  }
  function adTable(d) {
    const c = d.account.currency || 'USD', rows = d.ads.map(enrich), avg = d.cur.leads ? d.cur.spend / d.cur.leads : null;
    const ret = (v, r) => {
      if (!r.v3s) return '—';
      const bars = [r.p25, r.p50, r.p75, r.p100].map(x => Math.min(22, Math.max(2, Math.round(x / r.v3s * 22))));
      return `<div class="ret" title="25% / 50% / 75% / 100% ko‘rish">${bars.map(h => `<i style="height:${h}px"></i>`).join('')}</div>`;
    };
    return table('ads', [{ k: 'name', t: 'Reklama' }, { k: 'spend', t: 'Sarflangan', f: v => money(v, c) }, { k: 'leads', t: 'Lidlar', f: nf },
      { k: 'cpl', t: 'Lid narxi', f: v => v == null ? '—' : money(v, c), cls: cplCls(avg) },
      { k: 'ctr', t: 'CTR', f: v => v == null ? '—' : pct(v) }, { k: 'hook', t: 'Hook (3 s)', f: v => v == null ? '—' : pct(v) }, { k: 'p25', t: 'Ushlab turish', f: ret }, { k: 'status', t: 'Holat', f: status }], rows);
  }
  const BD = { age: 'Yosh', gender: 'Jins', region: 'Hudud', publisher_platform: 'Platforma' };
  const BDV = { female: 'Ayollar', male: 'Erkaklar', unknown: 'Noma’lum', instagram: 'Instagram', facebook: 'Facebook', audience_network: 'Audience Network', messenger: 'Messenger' };
  function bdTable(d) {
    const c = d.account.currency || 'USD', rows = d.breakdowns.filter(x => x.breakdown === S.bd), tot = rows.reduce((a, b) => a + b.spend, 0) || 1, avg = d.cur.leads ? d.cur.spend / d.cur.leads : null;
    const rr = rows.map(r => ({ name: BDV[r.value] || r.value, spend: r.spend, share: r.spend / tot * 100, leads: r.leads, cpl: r.leads ? r.spend / r.leads : null }));
    return table('bd' + S.bd, [{ k: 'name', t: BD[S.bd] }, { k: 'spend', t: 'Sarflangan', f: v => money(v, c) }, { k: 'share', t: 'Ulush', f: pct }, { k: 'leads', t: 'Lidlar', f: nf },
      { k: 'cpl', t: 'Lid narxi', f: v => v == null ? '—' : money(v, c), cls: r => r.cpl != null && avg ? cplCls(avg)(r) : (r.share > 8 && !r.leads ? 'bad' : '') }], rr);
  }
  const ACT = { update_campaign_budget: 'Kampaniya byudjeti o‘zgardi', update_ad_set_budget: 'Reklama guruhi byudjeti o‘zgardi', update_ad_run_status: 'Holat o‘zgardi (yoqildi/to‘xtatildi)', create_campaign: 'Kampaniya yaratildi', create_ad: 'Reklama yaratildi', update_ad_creative: 'Kreativ o‘zgardi', update_ad_set_targeting: 'Auditoriya o‘zgardi', update_campaign_run_status: 'Kampaniya holati o‘zgardi' };
  function actList(d) {
    if (!d.activities.length) return '<p class="sub">Hozircha o‘zgarishlar yo‘q.</p>';
    return d.activities.map(a => `<div class="row2"><span><b>${esc(ACT[a.event_type] || a.event_type)}</b><br><span style="color:var(--muted)">${esc(a.object_name || '')}${a.actor_name ? ' · ' + esc(a.actor_name) : ''}</span></span><time style="color:var(--muted);font-size:.82rem">${when(a.event_time)}</time></div>`).join('');
  }

  // ---------- ko'rinish
  function subView(d) {
    const el = $('dsub'); if (!el) return;
    el.innerHTML = S.sub === 'camp' ? campTable(d) : S.sub === 'ads' ? adTable(d)
      : S.sub === 'aud' ? `<div class="subtabs" id="bdtabs">${Object.keys(BD).map(k => `<button data-bd="${k}" class="${S.bd === k ? 'on' : ''}">${BD[k]}</button>`).join('')}</div><p class="sub">Qizil — pul ko‘p ketgan, natija kam. Yashil — o‘rtachadan arzon.</p>${bdTable(d)}` : actList(d);
    document.querySelectorAll('#dsub th').forEach(th => th.onclick = () => { const id = th.dataset.id, k = th.dataset.k, o = S.sort[id] || {}; S.sort[id] = { k, dir: o.k === k ? -o.dir : -1 }; subView(d); });
    document.querySelectorAll('#bdtabs button').forEach(b => b.onclick = () => { S.bd = b.dataset.bd; subView(d); });
  }

  function draw() {
    const d = S.data, root = $('p-dash');
    const accSel = d.accounts.length > 1 && !S.demo ? `<select id="dacc">${d.accounts.map(a => `<option value="${esc(a.id)}" ${a.id === d.account.id ? 'selected' : ''}>${esc(a.display_name || a.id)}</option>`).join('')}</select>` : `<b>${esc(d.account.display_name || d.account.id)}</b>`;
    const noData = !S.demo && !d.daily.length;
    const synced = !!(d.account.last_synced_at || (d.sync && d.sync.status === 'done'));
    const syncing = !S.demo && ((noData && !synced) || (d.sync && d.sync.status === 'running'));
    const emptyAcc = !S.demo && noData && synced;
    root.innerHTML = `
      ${S.demo ? '<div class="banner">Bu <b>namuna</b> ma’lumot: dashboard shunday ko‘rinadi. Haqiqiy akkaunt ulangach, o‘z reklamalaringiz hisoboti chiqadi.</div>' : ''}
      ${emptyAcc ? '<div class="banner info"><b>Akkaunt ulandi, lekin oxirgi 90 kunda reklama ma‘lumoti yo‘q.</b> Bu akkauntda hali reklama yurmagan. Birinchi reklamani <a href="#ads" id="gotoads" style="color:var(--blue);font-weight:700">«Reklama berish»</a> orqali yoqing, ma‘lumot soatiga yangilanadi.</div>' : ''}
      ${syncing ? `<div class="banner info">${noData ? 'Reklama tarixi yuklanmoqda (odatda bir necha daqiqa). Tayyor bo‘lgach shu yerda o‘zi ko‘rinadi.' : 'Ma’lumot yangilanmoqda…'}</div>` : ''}
      ${d.sync && d.sync.status === 'error' && !S.demo ? '<div class="banner">Oxirgi yangilashda xato bo‘ldi. Keyingi soatlik yangilashda qayta uriniladi.</div>' : ''}
      <div class="ctl">${accSel}<span class="grow"></span>
        <div class="seg" id="drange">${[7, 14, 30, 90].map(n => `<button data-n="${n}" class="${S.days === n ? 'on' : ''}">${n} kun</button>`).join('')}</div>
        <button class="btn sm ghost" id="dkpi" type="button">Ko‘rsatkichlar</button>
        ${S.demo ? '<button class="btn sm" id="dconn" type="button">Akkauntimni ulash</button>' : ''}</div>
      <p class="sub" style="margin-bottom:12px">${d.range.since} — ${d.range.until}${d.account.last_synced_at ? ' · yangilandi: ' + when(d.account.last_synced_at) : ''}</p>
      <div class="kpis" id="dkpis">${kpisHtml(d)}</div>
      <div class="cardx"><h3>Kunlik xarajat va lidlar</h3><div class="chartbox"><canvas id="dchart"></canvas></div></div>
      <div class="cardx">
        <div class="subtabs" id="dsubs">${[['camp', 'Kampaniyalar'], ['ads', 'Reklamalar'], ['aud', 'Auditoriya'], ['act', 'O‘zgarishlar']].map(([k, t]) => `<button data-s="${k}" class="${S.sub === k ? 'on' : ''}">${t}</button>`).join('')}</div>
        <div id="dsub"></div></div>`;
    chart(d); subView(d);
    $('drange').onclick = e => { const n = +e.target.dataset.n; if (n) { S.days = n; load(); } };
    $('dsubs').onclick = e => { const k = e.target.dataset.s; if (k) { S.sub = k; document.querySelectorAll('#dsubs button').forEach(b => b.classList.toggle('on', b.dataset.s === k)); subView(d); } };
    $('dkpi').onclick = kpiModal;
    const sel = $('dacc'); if (sel) sel.onchange = () => { S.acc = sel.value; S.picked = true; try { localStorage.setItem('dg_acc', S.acc); } catch (e) {} load(); };
    const dc = $('dconn'); if (dc) dc.onclick = () => Panels.connect();
    const ga = $('gotoads'); if (ga) ga.onclick = e => { e.preventDefault(); document.querySelector('#tabs [data-t="ads"]').click(); };
    if (syncing) schedulePoll();
  }

  function kpiModal() {
    let list = loadKpi(); const all = Object.keys(KPI_DEF);
    const paint = () => {
      const order = all.slice().sort((a, b) => (list.indexOf(a) < 0 ? 99 : list.indexOf(a)) - (list.indexOf(b) < 0 ? 99 : list.indexOf(b)));
      openModal(`<h3 style="margin-bottom:6px">Ko‘rsatkichlar</h3><p class="sub">Yoqing/o‘chiring va tartibini o‘zgartiring. Birinchisi katta kartochka bo‘ladi. Sozlama shu qurilmada saqlanadi.</p>
        <div class="kcfg">${order.map(k => `<div><input type="checkbox" data-k="${k}" ${list.includes(k) ? 'checked' : ''} style="width:auto"><span>${KPI_DEF[k].t}${KPI_DEF[k].crm ? ' <small style="color:var(--muted)">(CRM)</small>' : ''}</span><button data-up="${k}" type="button">↑</button><button data-dn="${k}" type="button">↓</button></div>`).join('')}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sm ghost" id="kcancel" type="button">Bekor</button><button class="btn sm" id="ksave" type="button">Saqlash</button></div>`);
      const m = $('modal-in');
      m.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { const k = i.dataset.k; list = i.checked ? [...list, k] : list.filter(x => x !== k); });
      const mv = (k, o) => { const i = list.indexOf(k); if (i < 0) return; const j = i + o; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; paint(); };
      m.querySelectorAll('[data-up]').forEach(b => b.onclick = () => mv(b.dataset.up, -1));
      m.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => mv(b.dataset.dn, 1));
      $('kcancel').onclick = closeModal;
      $('ksave').onclick = () => { if (list.length) saveKpi(list); closeModal(); draw(); };
    };
    paint();
  }

  function empty() {
    $('p-dash').innerHTML = `<div class="cardx empty2"><h2>Reklamalaringiz hisoboti shu yerda bo‘ladi</h2>
      <p>Meta reklama akkauntini <b>faqat ko‘rish</b> huquqi bilan ulang. Parol so‘ralmaydi, reklamalarni o‘zgartirmaymiz. Ulangach oxirgi 90 kunlik hisobot va AI tahlil tayyor bo‘ladi.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" id="e-conn" type="button">Akkauntni ulash</button><button class="btn ghost" id="e-demo" type="button">Namunani ko‘rish</button></div></div>`;
    $('e-conn').onclick = () => Panels.connect();
    $('e-demo').onclick = () => { S.demo = true; S.data = demo(S.days); draw(); };
  }

  function schedulePoll() {
    clearTimeout(S.poll);
    if (++S.polls > 24) return;
    S.poll = setTimeout(() => { if (!document.hidden && document.querySelector('#tabs .on')?.dataset.t === 'dash') load(true); else schedulePoll(); }, 10000);
  }

  async function load(quiet) {
    if (S.demo) { S.data = demo(S.days); draw(); return; }
    if (!quiet) $('p-dash').innerHTML = '<div class="loading">Yuklanmoqda…</div>';
    const seq = ++S.seq;   // tez-tez davr/akkaunt almashtirilsa, faqat oxirgi so'rov javobi chiziladi
    const r = await Auth.call('dashboard', { account: S.acc, days: S.days });
    if (seq !== S.seq) return;
    if (r.status === 401) { location.replace('/kirish/'); return; }
    if (r.status !== 200) {
      if (quiet && S.data) { schedulePoll(); return; }   // fon yangilanishi xatosi: eski ma'lumot ko'rinib turadi
      $('p-dash').innerHTML = `<div class="cardx"><p>Hisobotni yuklab bo‘lmadi${r.status === 0 ? ' (internet sekin yoki uzilgan)' : ''}.</p><button class="btn sm" id="dretry" type="button">Qayta urinish</button></div>`;
      $('dretry').onclick = () => load(); return;
    }
    if (r.data.empty) { empty(); return; }
    ['daily', 'campaigns', 'ads', 'breakdowns', 'activities', 'crm', 'accounts'].forEach(k => { r.data[k] = arr(r.data[k]); });
    // Foydalanuvchi o'zi tanlamagan bo'lsa va akkauntda ma'lumot yo'q bo'lsa, ma'lumotli akkauntni qidiramiz
    if (S.picked && S.acc && r.data.account.id !== S.acc) S.picked = false;   // eslab qolingan akkaunt uzilgan
    if (!r.data.daily.length && !S.picked) {
      S.empties[r.data.account.id] = true;
      const next = r.data.accounts.find(a => !S.empties[a.id]);
      if (next) { S.acc = next.id; return load(quiet); }
    }
    S.data = r.data; S.acc = r.data.account.id;
    if (S.data.daily.length) S.polls = 0;
    try { draw(); } catch (e) { console.error('[Dengiz] dash', e); $('p-dash').innerHTML = '<div class="cardx"><p>Hisobotni ko‘rsatib bo‘lmadi. Sahifani yangilang.</p></div>'; return; }
    // Tarix yuklangan, lekin tahlil hali tayyor emas: AI tahlilni ishga tushiramiz (akkaunt uchun sahifada bir marta)
    if (r.data.daily.length && (!r.data.audit || r.data.audit.status !== 'done') && !S.tried[S.acc]) {
      S.tried[S.acc] = true;
      Auth.call('analyze', { ad_account_id: S.acc }).then(() => Panels.refreshAudit());
    }
    Panels.setAudit(r.data.audit);
  }
  return { load, state: S };
})();
