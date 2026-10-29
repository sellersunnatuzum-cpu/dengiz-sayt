const ENDPOINT = window.DENGIZ_ENDPOINT;
const FREE_COUNT = 2;
let R = null, RAW = '';
let lang = 'uz';
try { const s = localStorage.getItem('lang'); if (s === 'ru' || s === 'uz') lang = s; } catch (e) {}
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = x => R && R.currency === 'USD' ? '$' + x.toFixed(2) : x.toFixed(2) + (R && R.currency ? ' ' + R.currency : '');
const pct = x => (x * 100).toFixed(x < 0.1 ? 1 : 0) + '%';
const digits = s => (s || '').replace(/\D/g, '');

const A = {
  uz: {
    n1: 'Qanday ishlaydi', n2: 'Xavfsizlik', n3: 'Pilot', n4: 'Savollar', n5: 'Bepul audit', home: '← Bosh sahifa', navbtn: 'Bepul boshlash',
    eyebrow: 'Bepul CSV audit · Meta Ads · 2 daqiqa',
    h1: 'Reklamangiz qayerda <em>pul yo‘qotyapti?</em>',
    sub: 'Ads Manager eksportini yuklang. Tahlil sizning brauzeringizda bo‘ladi, fayl hech qayerga yuborilmaydi.',
    s1h: '1. Ads Manager’dan CSV oling',
    how1: 'Ads Manager → kerakli sana oralig‘ini tanlang (masalan, oxirgi 30 kun).',
    how2: '<b>Reklamalar</b> (Ads) darajasini oching.',
    how3: 'Ustunlar: “Performance” va video ko‘rsatkichlari (3 soniyalik ko‘rish, 25/50/75/100%) bo‘lsa yaxshi.',
    how4: 'Xohlasangiz <b>Breakdown → Age</b> (yoki Region, Placement) qo‘shing. Chuqurroq tahlil uchun <b>Time → Day</b> (uzilishlar, ichki raqobat) yoki <b>Time of day</b> (tungi arizalar) ham qo‘shing.',
    how5: '<b>Export → Export table data → CSV</b>.',
    s2h: '2. Faylni yuklang', drop1: 'CSV faylni shu yerga tashlang', drop2: 'yoki bosib tanlang',
    privacy: 'Fayl serverga yuklanmaydi. Hisobot ochilganda faqat qisqa xulosa raqamlari (jami xarajat, natija soni, topilmalar nomi) va kontaktingiz yuboriladi.',
    kpiH: 'Umumiy holat', findH: 'Topilmalar', gateH: 'To‘liq hisobotni oching', gateP: 'Barcha topilmalar, segmentlar va reklamalar jadvali. Bepul.',
    gn: 'Ismingiz', gp: 'Telefon raqamingiz', gt: 'Telegram username', gb: 'Biznes nomi', opt: 'ixtiyoriy', gs: 'Hisobotni ochish',
    entsH: 'Reklamalar (xarajat bo‘yicha)', missH: 'Bu faylda nima yo‘q',
    ctaH: 'Bepul chuqur audit (API)',
    ctaP: 'Reklama akkauntiga faqat ko‘rish huquqini bersangiz, o‘sha kunning o‘zida soniyalab video tahlili, kim nimani o‘zgartirgani va sifatli lid narxi bilan to‘liq audit qilamiz. Har bir biznesga bir marta bepul.',
    ctaBtn: 'Chuqur auditga yozilish',
    SEV: { high: 'Muhim', medium: 'E’tibor bering', info: 'Ma’lumot' },
    kSpend: 'Xarajat', kRes: 'Natijalar', kCpr: 'Natija narxi', kCtr: 'Havola CTR',
    src: (period, n, lvl) => `Manba: sizning CSV faylingiz${period} · ${n} ta ${lvl}`,
    none: 'Jiddiy muammo topilmadi. Breakdown va video ustunlari bilan qayta eksport qilsangiz, tahlil chuqurroq bo‘ladi.',
    more: 'Qo‘shimcha topilmalar, segmentlar va reklamalar jadvali.',
    segH: 'Segmentlar', segHead: ['Segment', 'Xarajat', 'Ulush', 'Natija ulushi'],
    noSeg: 'Faylda breakdown yo‘q. Age, Region yoki Placement bilan eksport qiling.',
    entHead: ['Nomi', 'Xarajat', 'Natija', 'Narxi', 'CTR', 'Chastota'],
    big: 'Fayl juda katta (20 MB dan ko‘p).',
    needName: 'Ismingizni kiriting.', badPhone: 'Telefon raqamini to‘g‘ri kiriting (masalan, +998 90 123 45 67).', sendFail: 'Yuborib bo‘lmadi. Birozdan keyin urinib ko‘ring.',
  },
  ru: {
    n1: 'Как работает', n2: 'Безопасность', n3: 'Пилот', n4: 'Вопросы', n5: 'Бесплатный аудит', home: '← На главную', navbtn: 'Начать бесплатно',
    eyebrow: 'Бесплатный CSV-аудит · Meta Ads · 2 минуты',
    h1: 'Где ваша реклама <em>теряет деньги?</em>',
    sub: 'Загрузите экспорт из Ads Manager. Анализ идёт в вашем браузере, файл никуда не отправляется.',
    s1h: '1. Выгрузите CSV из Ads Manager',
    how1: 'Ads Manager → выберите нужный период (например, последние 30 дней).',
    how2: 'Откройте уровень <b>Объявления</b> (Ads).',
    how3: 'Столбцы: желательно «Performance» и показатели видео (3-секундные просмотры, 25/50/75/100%).',
    how4: 'При желании добавьте <b>Breakdown → Age</b> (или Region, Placement). Для более глубокого анализа добавьте <b>Time → Day</b> (перерывы, внутренняя конкуренция) или <b>Time of day</b> (ночные заявки).',
    how5: '<b>Export → Export table data → CSV</b>.',
    s2h: '2. Загрузите файл', drop1: 'Перетащите CSV-файл сюда', drop2: 'или нажмите, чтобы выбрать',
    privacy: 'Файл не загружается на сервер. При открытии отчёта отправляются только краткие итоги (общие расходы, число результатов, названия находок) и ваш контакт.',
    kpiH: 'Общая картина', findH: 'Находки', gateH: 'Откройте полный отчёт', gateP: 'Все находки, сегменты и таблица объявлений. Бесплатно.',
    gn: 'Ваше имя', gp: 'Номер телефона', gt: 'Telegram username', gb: 'Название бизнеса', opt: 'необязательно', gs: 'Открыть отчёт',
    entsH: 'Объявления (по расходам)', missH: 'Чего нет в этом файле',
    ctaH: 'Бесплатный глубокий аудит (API)',
    ctaP: 'Если дадите доступ к рекламному аккаунту только на просмотр, мы в тот же день сделаем полный аудит: посекундный анализ видео, кто что изменил и цена качественного лида. Один раз бесплатно для каждого бизнеса.',
    ctaBtn: 'Записаться на глубокий аудит',
    SEV: { high: 'Важно', medium: 'Обратите внимание', info: 'Информация' },
    kSpend: 'Расходы', kRes: 'Результаты', kCpr: 'Цена результата', kCtr: 'CTR по ссылке',
    src: (period, n, lvl) => `Источник: ваш CSV-файл${period} · ${n} шт. (${lvl})`,
    none: 'Серьёзных проблем не найдено. Если экспортировать с разбивками и видео-столбцами, анализ будет глубже.',
    more: 'Дополнительные находки, сегменты и таблица объявлений.',
    segH: 'Сегменты', segHead: ['Сегмент', 'Расходы', 'Доля', 'Доля результатов'],
    noSeg: 'В файле нет разбивок. Выгрузите с Age, Region или Placement.',
    entHead: ['Название', 'Расходы', 'Результат', 'Цена', 'CTR', 'Частота'],
    big: 'Файл слишком большой (больше 20 МБ).',
    needName: 'Введите имя.', badPhone: 'Введите номер телефона правильно (например, +998 90 123 45 67).', sendFail: 'Не удалось отправить. Попробуйте чуть позже.',
  },
};
const L = () => A[lang];

// menyu: sahifa aylantirilganda to'q fon
const nav = $('nav');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

function finding(f) {
  return `<div class="f ${f.severity}"><h3><span class="sev ${f.severity}">${L().SEV[f.severity]}</span>${esc(f.title)}</h3><p>${esc(f.detail)}</p>${f.items.length ? '<ul>' + f.items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' : ''}</div>`;
}

function render() {
  const s = R.summary, t = L();
  $('kpis').innerHTML = [[t.kSpend, money(s.spend)], [t.kRes, s.results.toLocaleString('ru-RU')], [t.kCpr, s.cpr ? money(s.cpr) : '—'], [t.kCtr, s.linkClicks ? pct(s.ctr) : '—']]
    .map(([k, v]) => `<div class="kpi"><small>${k}</small><b>${v}</b></div>`).join('');
  $('src').textContent = t.src(R.period.start ? ' · ' + R.period.start + ' — ' + R.period.end : '', s.entities, R.levelLabel.toLowerCase());
  const fs = R.findings;
  $('free').innerHTML = fs.length ? fs.slice(0, FREE_COUNT).map(finding).join('') : `<p class="src">${t.none}</p>`;
  const rest = fs.slice(FREE_COUNT);
  $('rest').innerHTML = rest.length ? rest.map(finding).join('') : `<p class="src">${t.more}</p>`;
  const seg = Object.entries(R.segments), h = t.segHead;
  $('segcard').innerHTML = `<h2>${t.segH}</h2>` + (seg.length ? seg.map(([k, v]) => `<h3 style="margin-top:12px;color:var(--deep)">${esc(k)}</h3><div class="tw"><table><tr><th>${h[0]}</th><th class="n">${h[1]}</th><th class="n">${h[2]}</th><th class="n">${h[3]}</th></tr>${v.map(x => `<tr><td>${esc(x.value)}</td><td class="n">${money(x.spend)}</td><td class="n">${pct(x.spendShare)}</td><td class="n">${pct(x.resultShare)}</td></tr>`).join('')}</table></div>`).join('') : `<p class="src">${t.noSeg}</p>`);
  const e = t.entHead;
  $('ents').innerHTML = `<tr><th>${e[0]}</th><th class="n">${e[1]}</th><th class="n">${e[2]}</th><th class="n">${e[3]}</th><th class="n">${e[4]}</th><th class="n">${e[5]}</th></tr>` +
    R.entities.slice(0, 30).map(x => `<tr><td>${esc(x.name)}</td><td class="n">${money(x.spend)}</td><td class="n">${x.results}</td><td class="n">${x.cpr != null ? money(x.cpr) : '—'}</td><td class="n">${x.ctr ? pct(x.ctr) : '—'}</td><td class="n">${x.freq ? x.freq.toFixed(1) : '—'}</td></tr>`).join('');
  $('missing').innerHTML = R.missing.map(m => '<li>' + esc(m) + '</li>').join('');
}

function applyLang() {
  const t = L();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-k]').forEach(el => { if (t[el.dataset.k] !== undefined) el.textContent = t[el.dataset.k]; });
  document.querySelectorAll('[data-kh]').forEach(el => { if (t[el.dataset.kh] !== undefined) el.innerHTML = t[el.dataset.kh]; });
  document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  if (RAW) { try { R = CsvAudit.analyze(RAW, lang); render(); } catch (e) { /* til almashganda eski natija qoladi */ } }
}
document.querySelectorAll('#lang button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.l;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  applyLang();
}));

function load(file) {
  $('err').style.display = 'none';
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { $('err').textContent = L().big; $('err').style.display = 'block'; return; }
  const rd = new FileReader();
  rd.onload = () => {
    try {
      RAW = rd.result; R = CsvAudit.analyze(RAW, lang); render();
      $('report').classList.remove('hidden'); $('report').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { RAW = ''; $('err').textContent = e.message; $('err').style.display = 'block'; }
  };
  rd.readAsText(file, 'utf-8');
}
$('file').addEventListener('change', e => load(e.target.files[0]));
const drop = $('drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => load(e.dataTransfer.files[0]));

$('gate').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target).entries());
  const ge = $('gerr'); ge.style.display = 'none';
  const fail = t => { ge.textContent = t; ge.style.display = 'block'; };
  if (!fd.name.trim()) return fail(L().needName);
  if (!PhoneUtil.ok(fd.phone)) return fail(L().badPhone);
  const s = R.summary;
  const message = ('CSV audit | xarajat ' + money(s.spend) + ' | natija ' + s.results + ' | narx ' + (s.cpr ? money(s.cpr) : '-') + ' | ' + R.findings.map(f => f.title).join('; ')).slice(0, 1000);
  $('gs').disabled = true;
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fd.name, phone: fd.phone, telegram: fd.telegram, business: fd.business, website: fd.website, interest: 'csv_audit', lang, message }),
    });
    if (r.status === 400) { fail(L().badPhone); $('gs').disabled = false; return; }
    if (!r.ok) throw 0;
    $('lockwrap').classList.remove('locked'); $('gate').remove(); $('full').classList.remove('hidden');
  } catch (_) { fail(L().sendFail); $('gs').disabled = false; }
});

applyLang();
