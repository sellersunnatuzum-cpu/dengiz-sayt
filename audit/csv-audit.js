// CSV audit dvigateli: Meta Ads Manager eksportini brauzerda tahlil qiladi.
// Fayl hech qayerga yuborilmaydi. Node'da ham ishlaydi (testlar uchun).
(function (root) {
  'use strict';

  // ---------- CSV o'qish ----------
  function detectDelimiter(line) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (!q && ch in counts) counts[ch]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
    const d = detectDelimiter(firstLine);
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(c => c.trim() !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    return rows;
  }

  function num(v) {
    if (v == null) return 0;
    let s = String(v).replace(/[\s ]/g, '').replace(/[^0-9,.\-]/g, '');
    if (!s) return 0;
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  // ---------- ustunlarni aniqlash (EN / RU) ----------
  const COLS = {
    campaign: [/^campaign name$/, /^название кампании$/],
    adset: [/^ad set name$/, /^название группы объявлений$/],
    ad: [/^ad name$/, /^название объявления$/],
    spend: [/^amount spent/, /^потраченная сумма/, /^сумма затрат/],
    impressions: [/^impressions$/, /^показы$/],
    reach: [/^reach$/, /^охват$/],
    frequency: [/^frequency$/, /^частота$/],
    linkClicks: [/^link clicks$/, /^клики по ссылке$/],
    results: [/^results$/, /^результаты$/],
    resultType: [/^result indicator$/, /^result type$/, /^индикатор результатов$/, /^тип результата$/],
    v3s: [/3-second video plays/, /3-секундн/],
    v25: [/video plays at 25%/, /видео.*25%/],
    v50: [/video plays at 50%/, /видео.*50%/],
    v75: [/video plays at 75%/, /видео.*75%/],
    v100: [/video plays at 100%/, /видео.*100%/],
    thruplays: [/^thruplays$/, /thruplay/],
    day: [/^day$/, /^день$/],
    start: [/^reporting starts$/, /^начало отчетности$/, /^начало отчётности$/],
    end: [/^reporting ends$/, /^конец отчетности$/, /^конец отчётности$/],
  };
  const DIMS = {
    age: { label: 'Yosh', ru: 'Возраст', re: [/^age$/, /^возраст$/] },
    gender: { label: 'Jins', ru: 'Пол', re: [/^gender$/, /^пол$/] },
    region: { label: 'Hudud', ru: 'Регион', re: [/^region$/, /^регион$/] },
    country: { label: 'Mamlakat', ru: 'Страна', re: [/^country$/, /^страна$/] },
    placement: { label: 'Joylashuv', ru: 'Плейсмент', re: [/^placement$/, /^плейсмент$/, /^место размещения$/] },
    platform: { label: 'Platforma', ru: 'Платформа', re: [/^platform$/, /^платформа$/] },
    device: { label: 'Qurilma', ru: 'Устройство', re: [/^impression device$/, /^устройство/] },
    hour: { label: 'Soat', ru: 'Час', re: [/time of day/, /время суток/] },
  };

  function mapColumns(header) {
    const norm = header.map(h => h.trim().toLowerCase());
    const find = res => norm.findIndex(h => res.some(r => r.test(h)));
    const cols = {};
    for (const [k, res] of Object.entries(COLS)) cols[k] = find(res);
    const dims = {};
    for (const [k, d] of Object.entries(DIMS)) { const i = find(d.re); if (i >= 0) dims[k] = i; }
    const sp = cols.spend >= 0 ? header[cols.spend].match(/\(([A-Z]{3})\)/) : null;
    return { cols, dims, currency: sp ? sp[1] : '' };
  }

  // ---------- tahlil ----------
  const METRICS = ['spend', 'impressions', 'reach', 'linkClicks', 'results', 'v3s', 'v25', 'v50', 'v75', 'v100', 'thruplays'];

  function blank() { const o = {}; METRICS.forEach(m => (o[m] = 0)); return o; }
  function add(a, r) { METRICS.forEach(m => (a[m] += r[m])); }
  const share = (a, b) => (b > 0 ? a / b : 0);
  const median = xs => { const s = xs.filter(x => isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const pct = x => (x * 100).toFixed(x < 0.1 ? 1 : 0) + '%';
  // "2026-08-04" yoki "04.08.2026" -> kun raqami (UTC kunlar)
  const dayNum = s => {
    let m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5;
    m = String(s).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) / 864e5 : NaN;
  };

  function analyze(text, lang) {
    const T = (uz, ru) => (lang === 'ru' ? ru : uz);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error(T('Fayl bo\'sh yoki CSV emas.', 'Файл пустой или это не CSV.'));
    const header = rows[0];
    const { cols, dims, currency } = mapColumns(header);
    if (cols.spend < 0) throw new Error(T('"Amount spent" ustuni topilmadi. Ads Manager\'dan CSV eksport qiling.', 'Не найден столбец «Amount spent» (Потраченная сумма). Экспортируйте CSV из Ads Manager.'));
    const money = x => (currency === 'USD' ? '$' : '') + x.toFixed(2) + (currency && currency !== 'USD' ? ' ' + currency : '');

    const nameIdx = ['ad', 'adset', 'campaign'].map(k => cols[k]).filter(i => i >= 0);
    const level = cols.ad >= 0 ? 'ad' : cols.adset >= 0 ? 'adset' : cols.campaign >= 0 ? 'campaign' : null;
    const levelLabel = { ad: T('Reklama', 'Объявление'), adset: T('Reklama to\'plami', 'Группа объявлений'), campaign: T('Kampaniya', 'Кампания') }[level] || T('Qator', 'Строка');

    let data = rows.slice(1).map(r => {
      const o = {};
      METRICS.forEach(m => (o[m] = cols[m] >= 0 ? num(r[cols[m]]) : 0));
      o.name = level ? (r[cols[level]] || '').trim() : '';
      o.campaign = cols.campaign >= 0 ? (r[cols.campaign] || '').trim() : '';
      o.resultType = cols.resultType >= 0 ? (r[cols.resultType] || '').trim() : '';
      o.dims = {};
      for (const [k, i] of Object.entries(dims)) o.dims[k] = (r[i] || '').trim() || '—';
      o.day = cols.day >= 0 ? (r[cols.day] || '').trim() : '';
      o.start = cols.start >= 0 ? r[cols.start] : '';
      o.end = cols.end >= 0 ? r[cols.end] : '';
      o._named = nameIdx.some(i => (r[i] || '').trim());
      return o;
    });
    // Jami qatorini (nomsiz) olib tashlash, aks holda ikki marta hisoblanadi
    if (nameIdx.length && data.some(d => d._named)) data = data.filter(d => d._named);

    const total = blank();
    data.forEach(d => add(total, d));
    const ents = new Map();
    for (const d of data) {
      const key = d.name || T('(nomsiz)', '(без названия)');
      if (!ents.has(key)) ents.set(key, Object.assign(blank(), { name: key, campaign: d.campaign, resultTypes: new Set() }));
      const e = ents.get(key);
      add(e, d);
      if (d.resultType) e.resultTypes.add(d.resultType);
    }
    const list = [...ents.values()].sort((a, b) => b.spend - a.spend);
    list.forEach(e => {
      e.cpr = e.results > 0 ? e.spend / e.results : Infinity;
      e.ctr = share(e.linkClicks, e.impressions);
      e.freq = share(e.impressions, e.reach);
      e.hook = share(e.v3s, e.impressions);
      e.spendShare = share(e.spend, total.spend);
    });

    const cpr = total.results > 0 ? total.spend / total.results : 0;
    const ctr = share(total.linkClicks, total.impressions);
    const findings = [];
    const F = (severity, title, detail, items) => findings.push({ severity, title, detail, items: items || [] });

    // 1. Natijasiz xarajat
    const zero = list.filter(e => e.spend > 0 && e.results === 0);
    const zeroSpend = zero.reduce((s, e) => s + e.spend, 0);
    if (zero.length && total.results > 0) {
      const s = share(zeroSpend, total.spend);
      F(s >= 0.1 ? 'high' : 'medium', T('Natija keltirmagan xarajat', 'Расходы без результата'),
        T(`${zero.length} ta ${levelLabel.toLowerCase()} ${money(zeroSpend)} sarflagan (${pct(s)}), lekin bitta ham natija yo'q.`,
          `${zero.length} шт. (${levelLabel.toLowerCase()}) потратили ${money(zeroSpend)} (${pct(s)}), но не принесли ни одного результата.`),
        zero.slice(0, 8).map(e => `${e.name}: ${money(e.spend)}`));
    }

    // 2. Qimmat natija
    if (cpr > 0) {
      const exp = list.filter(e => e.results > 0 && e.cpr > 2 * cpr && e.spendShare >= 0.05);
      if (exp.length) F('medium', T('O\'rtachadan 2 barobar qimmat natija', 'Результат дороже среднего более чем вдвое'),
        T(`Akkaunt bo'yicha bitta natija ${money(cpr)}. Quyidagilarda 2 barobardan ko'p.`, `В среднем по аккаунту один результат стоит ${money(cpr)}. У этих объявлений он дороже более чем в 2 раза.`),
        exp.slice(0, 8).map(e => `${e.name}: ${money(e.cpr)} (${pct(e.spendShare)} ${T('xarajat', 'расходов')})`));
      const best = list.filter(e => e.results > 0 && e.cpr < 0.6 * cpr && e.spendShare < 0.15);
      if (best.length) F('info', T('Kam byudjet olayotgan samarali reklamalar', 'Эффективные объявления с малым бюджетом'),
        T('Natija narxi o\'rtachadan ancha arzon, lekin xarajat ulushi kichik. Byudjetni oshirib sinash mumkin.', 'Цена результата заметно ниже средней, но доля расходов мала. Можно попробовать увеличить бюджет.'),
        best.slice(0, 6).map(e => `${e.name}: ${money(e.cpr)} (${pct(e.spendShare)} ${T('xarajat', 'расходов')})`));
    }

    // 3. Chastota
    if (cols.reach >= 0 || cols.frequency >= 0) {
      const tired = list.filter(e => e.freq >= 3.5 && e.spendShare >= 0.03);
      if (tired.length) F('medium', T('Yuqori chastota', 'Высокая частота показов'),
        T('Bir odamga o\'rtacha 3,5 martadan ko\'p ko\'rsatilgan. Auditoriya charchagan bo\'lishi mumkin.', 'Одному человеку показано в среднем больше 3,5 раз. Аудитория могла устать от рекламы.'),
        tired.slice(0, 8).map(e => `${e.name}: ${e.freq.toFixed(1)}`));
    }

    // 4. Past CTR (akkauntning o'ziga nisbatan)
    if (cols.linkClicks >= 0 && ctr > 0) {
      const low = list.filter(e => e.impressions > 1000 && e.ctr < 0.5 * ctr && e.spendShare >= 0.05);
      if (low.length) F('medium', T('Havola bosilishi past', 'Низкий CTR по ссылке'),
        T(`Akkaunt o'rtachasi ${pct(ctr)}. Quyidagilarda yarmidan kam.`, `Среднее по аккаунту ${pct(ctr)}. У этих объявлений меньше половины.`),
        low.slice(0, 8).map(e => `${e.name}: ${pct(e.ctr)}`));
    }

    // 5. Video
    const hasVideo = cols.v3s >= 0 || cols.v25 >= 0;
    if (hasVideo) {
      const vids = list.filter(e => e.v3s > 0 || e.v25 > 0);
      if (cols.v3s >= 0) {
        const mh = median(vids.map(e => e.hook));
        const weak = vids.filter(e => e.impressions > 1000 && e.hook < 0.5 * mh);
        if (weak.length) F('medium', T('Birinchi 3 soniya ushlamayapti', 'Первые 3 секунды не удерживают'),
          T(`Kreativlar medianasi: ko'rsatilganlarning ${pct(mh)} qismi 3 soniya ko'rgan. Quyidagilarda yarmidan kam.`, `Медиана по креативам: ${pct(mh)} показов досмотрены до 3 секунд. У этих объявлений меньше половины.`),
          weak.slice(0, 8).map(e => `${e.name}: ${pct(e.hook)}`));
      }
      if (total.v25 > 0) {
        const steps = [['25→50%', share(total.v50, total.v25)], ['50→75%', share(total.v75, total.v50)], ['75→100%', share(total.v100, total.v75)]];
        const worst = steps.slice().sort((a, b) => a[1] - b[1])[0];
        F('info', T('Video ko\'rish chizig\'i (chorak bo\'yicha)', 'Кривая просмотра видео (по четвертям)'),
          T(`Eng katta yo'qotish ${worst[0]} oralig'ida: faqat ${pct(worst[1])} davom etgan. Soniyalab chiziq faqat API ulanganda ko'rinadi.`, `Больше всего зрителей теряется на отрезке ${worst[0]}: продолжили смотреть только ${pct(worst[1])}. Посекундная кривая доступна только при подключении по API.`),
          steps.map(s => `${s[0]}: ${pct(s[1])} ${T('davom etgan', 'продолжили')}`));
      }
    }

    // 6. Segmentlar (breakdown): xarajat ulushi > natija ulushi
    const segments = {};
    for (const [k] of Object.entries(dims)) {
      const g = new Map();
      for (const d of data) {
        const v = d.dims[k];
        if (!g.has(v)) g.set(v, blank());
        add(g.get(v), d);
      }
      const segs = [...g.entries()].map(([v, m]) => ({ value: v, spend: m.spend, results: m.results, spendShare: share(m.spend, total.spend), resultShare: share(m.results, total.results) }))
        .sort((a, b) => b.spend - a.spend);
      segments[T(DIMS[k].label, DIMS[k].ru)] = segs;
      const bad = segs.filter(s => s.spendShare >= 0.1 && total.results > 0 && s.resultShare < 0.5 * s.spendShare);
      if (bad.length) F('high', T(`${DIMS[k].label}: pul ko'p, natija kam`, `${DIMS[k].ru}: много денег, мало результата`),
        T('Bu segmentlar xarajatning katta qismini olgan, natijadagi ulushi esa ancha kichik.', 'Эти сегменты получили большую долю расходов, а их доля в результатах заметно меньше.'),
        bad.map(s => `${s.value}: ${T('xarajat', 'расходы')} ${pct(s.spendShare)}, ${T('natija', 'результат')} ${pct(s.resultShare)}`));
    }

    // 6a. Kunlik (Day) ma'lumot bo'lsa: uzilishlar, ichki raqobat, kampaniya almashtirish
    const dated = data.filter(d => d.day && isFinite(dayNum(d.day)));
    if (dated.length) {
      const dn = d => dayNum(d.day);
      const spendDays = new Set(dated.filter(d => d.spend > 0).map(dn));
      if (spendDays.size >= 5) {
        const lo = Math.min(...spendDays), hi = Math.max(...spendDays);
        let gaps = 0, run = 0, longest = 0;
        for (let x = lo; x <= hi; x++) {
          if (spendDays.has(x)) run = 0; else { gaps++; run++; longest = Math.max(longest, run); }
        }
        if (gaps >= 3) F('info', T('Reklama uzilgan kunlar', 'Дни без показов'),
          T(`${hi - lo + 1} kunlik davrda ${gaps} kun xarajat bo'lmagan (eng uzun ketma-ket: ${longest} kun). Sabab to'lov (billing) muammosi yoki qo'lda to'xtatish bo'lishi mumkin. Muhim sanalar oldidan to'lov holatini tekshiring.`,
            `За период в ${hi - lo + 1} дн. было ${gaps} дн. без расходов (самый длинный перерыв: ${longest} дн.). Причина может быть в оплате (billing) или в ручной остановке. Перед важными датами проверяйте состояние оплаты.`), []);
      }

      // bir xil reklama ikki kampaniyada ustma-ust, ikkinchisi ancha qimmat
      const byAd = new Map();
      for (const d of dated) {
        if (!d.name || !d.campaign) continue;
        if (!byAd.has(d.name)) byAd.set(d.name, new Map());
        const cm = byAd.get(d.name);
        if (!cm.has(d.campaign)) cm.set(d.campaign, { days: new Set(), spend: 0, results: 0 });
        const c = cm.get(d.campaign);
        c.days.add(dn(d)); c.spend += d.spend; c.results += d.results;
      }
      const overlaps = [];
      for (const [ad, cm] of byAd) {
        const cs = [...cm.entries()].map(([name, c]) => ({ name, ...c, first: Math.min(...c.days) })).sort((a, b) => a.first - b.first);
        for (let i = 0; i < cs.length; i++) {
          for (let j = i + 1; j < cs.length; j++) {
            const a = cs[i], b = cs[j];
            const common = [...b.days].filter(x => a.days.has(x)).length;
            if (!common || !a.results) continue;
            const acpr = a.spend / a.results, bcpr = b.results ? b.spend / b.results : Infinity;
            if (b.spend >= 0.03 * total.spend && bcpr >= 2 * acpr) overlaps.push({ ad, a, b, common, acpr, bcpr });
          }
        }
      }
      if (overlaps.length) F('high', T('Bir xil reklama bir vaqtda ikki kampaniyada', 'Одно и то же объявление одновременно в двух кампаниях'),
        T('Bir xil kreativ ustma-ust ishlaganda ular bir-biri bilan auksionda raqobatlashadi va natija narxi sakraydi.', 'Когда один и тот же креатив работает параллельно, объявления конкурируют друг с другом в аукционе, и цена результата растёт.'),
        overlaps.slice(0, 5).map(o => T(`${o.ad}: "${o.b.name}" va "${o.a.name}" ${o.common} kun ustma-ust, narx ${o.bcpr === Infinity ? 'natijasiz' : money(o.bcpr)} (oldingisi ${money(o.acpr)})`,
          `${o.ad}: «${o.b.name}» и «${o.a.name}» шли параллельно ${o.common} дн., цена ${o.bcpr === Infinity ? 'без результата' : money(o.bcpr)} (у предыдущей ${money(o.acpr)})`)));

      // kampaniyalar juda qisqa umr ko'rgan: Meta har safar o'rganishni noldan boshlaydi
      const spans = new Map();
      for (const d of dated) {
        if (!d.campaign) continue;
        const s = spans.get(d.campaign) || { lo: Infinity, hi: -Infinity };
        s.lo = Math.min(s.lo, dn(d)); s.hi = Math.max(s.hi, dn(d));
        spans.set(d.campaign, s);
      }
      const lives = [...spans.values()].map(s => s.hi - s.lo + 1);
      if (lives.length >= 4 && median(lives) <= 7) F('medium', T('Kampaniyalar tez-tez almashtirilgan', 'Кампании слишком часто меняются'),
        T(`${lives.length} ta kampaniya, o'rtacha umri ${median(lives)} kun. Har yangi kampaniya Meta o'rganish bosqichini noldan boshlaydi; bitta doimiy kampaniya odatda arzonroq natija beradi.`,
          `${lives.length} кампаний, средний срок жизни ${median(lives)} дн. Каждая новая кампания заставляет Meta проходить обучение заново; одна постоянная кампания обычно даёт более дешёвый результат.`), []);
    }

    // 6b. Soat (Time of day) bo'lsa: tungi arizalar
    if ('hour' in dims) {
      let night = 0, all = 0;
      for (const d of data) {
        const m = String(d.dims.hour).match(/(\d{1,2})/);
        if (!m) continue;
        const h = +m[1];
        all += d.results;
        if (h >= 21 || h < 9) night += d.results;
      }
      if (all >= 20 && night / all >= 0.3) F('medium', T('Tungi arizalar ko\'p', 'Много ночных заявок'),
        T(`Natijalarning ${pct(night / all)} qismi 21:00 dan 09:00 gacha kelgan. Tezkor javob bo'lmasa, bunday lidlar sovib ketadi: avtomatik javob yoki Telegram bot qo'shing.`,
          `${pct(night / all)} результатов пришло с 21:00 до 09:00. Без быстрого ответа такие лиды остывают: добавьте автоответ или Telegram-бота.`), []);
    }

    // 6c. Video oxirigacha ko'p ko'rilgan, lekin lid qimmat
    if (cols.thruplays >= 0 && cpr > 0) {
      const vs = list.filter(e => e.thruplays > 0 && e.impressions > 1000);
      const mt = median(vs.map(e => e.thruplays / e.impressions));
      const hit = vs.filter(e => e.thruplays / e.impressions >= 2 * mt && e.results > 0 && e.cpr > 1.15 * cpr && e.spendShare >= 0.03);
      if (hit.length) F('info', T('Ko\'p ko\'rilgan, lekin lid qimmat', 'Много досмотров, но лид дорогой'),
        T('Video oxirigacha ko\'p odam ko\'rgan, lekin natija narxi o\'rtachadan yuqori. Ushlab turish lidga aylanmayapti: chaqiriq (CTA) va taklifni tekshiring.', 'Видео досматривают до конца многие, но цена результата выше средней. Удержание не превращается в лиды: проверьте призыв к действию (CTA) и оффер.'),
        hit.slice(0, 5).map(e => T(`${e.name}: ko'rib bo'lish ${pct(e.thruplays / e.impressions)}, natija narxi ${money(e.cpr)}`, `${e.name}: досмотры ${pct(e.thruplays / e.impressions)}, цена результата ${money(e.cpr)}`)));
    }

    // 7. Har xil natija turlari aralash
    const types = new Set(list.flatMap(e => [...e.resultTypes]));
    if (types.size > 1) F('info', T('Natija turlari aralash', 'Смешаны разные типы результатов'),
      T('Kampaniyalar har xil natijaga optimallashtirilgan, shuning uchun "natija narxi"ni bir-biriga solishtirish noto\'g\'ri bo\'lishi mumkin.', 'Кампании оптимизированы под разные результаты, поэтому сравнивать «цену результата» между ними может быть некорректно.'),
      [...types].slice(0, 6));

    // 8. Faylda nima yetishmaydi
    const missing = [];
    if (!Object.keys(dims).length) missing.push(T('Breakdown yo\'q: yosh, jins, hudud, joylashuv bo\'yicha tahlil qilinmadi.', 'Нет разбивок: анализ по возрасту, полу, региону и плейсменту не выполнен.'));
    if (!dated.length) missing.push(T('Kunlik (Time → Day) breakdown yo\'q: reklama uzilishlari, ichki raqobat va kampaniya almashtirish tahlil qilinmadi.', 'Нет разбивки по дням (Time → Day): перерывы в показах, внутренняя конкуренция и смена кампаний не проанализированы.'));
    if (!('hour' in dims)) missing.push(T('Soat (Time of day) breakdown yo\'q: tungi arizalar tahlil qilinmadi.', 'Нет разбивки по времени суток (Time of day): ночные заявки не проанализированы.'));
    if (!hasVideo) missing.push(T('Video ustunlari yo\'q: kreativ ushlash tahlil qilinmadi.', 'Нет видео-столбцов: удержание креатива не проанализировано.'));
    if (cols.results < 0) missing.push(T('"Results" ustuni yo\'q: natija narxi hisoblanmadi.', 'Нет столбца «Results»: цена результата не рассчитана.'));
    missing.push(T('CSV\'da yo\'q: soniyalab video chizig\'i, kim nimani o\'zgartirgani, qaysi lid sotuvga aylangani. Bular API audit va CRM ulanganda.', 'Чего нет в CSV: посекундной кривой видео, кто что изменил и какой лид стал продажей. Это доступно при API-аудите и подключённой CRM.'));

    const order = { high: 0, medium: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      currency, level, levelLabel,
      period: { start: data.map(d => d.start).filter(Boolean).sort()[0] || '', end: data.map(d => d.end).filter(Boolean).sort().pop() || '' },
      summary: {
        spend: total.spend, impressions: total.impressions, linkClicks: total.linkClicks, results: total.results,
        cpr, ctr, entities: list.length, rows: data.length,
      },
      entities: list.map(e => ({ name: e.name, campaign: e.campaign, spend: e.spend, results: e.results, cpr: isFinite(e.cpr) ? e.cpr : null, ctr: e.ctr, freq: e.freq, hook: e.hook, spendShare: e.spendShare })),
      segments, findings, missing,
      detected: { columns: Object.keys(cols).filter(k => cols[k] >= 0), breakdowns: Object.keys(dims) },
    };
  }

  const api = { parseCSV, num, mapColumns, analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CsvAudit = api;
})(typeof self !== 'undefined' ? self : this);
