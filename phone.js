// Telefon maydoni: +998 avtomatik chiqadi, raqam 90 123 45 67 ko'rinishida yoziladi.
// Tojikiston (+992) ham qabul qilinadi: prefiksni 992 ga almashtirsangiz yetarli.
const PhoneUtil = (() => {
  const CC = ['998', '992'];

  function format(raw) {
    let d = (raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (CC.some(c => c.startsWith(d))) return '+' + d;             // prefiks hali yozilmoqda: 9, 99, 998
    let cc = CC.find(c => d.startsWith(c));
    if (cc) d = d.slice(3); else cc = '998';                        // prefikssiz yozilgan mahalliy raqam
    d = d.slice(0, 9);
    const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return '+' + cc + ' ' + parts.join(' ');
  }

  // To'liq raqam: prefiks + 9 ta raqam
  function ok(v) {
    const d = (v || '').replace(/\D/g, '');
    return CC.some(c => d.startsWith(c)) && d.length === 12;
  }

  function attach(el) {
    el.addEventListener('focus', () => { if (!el.value) el.value = '+998 '; });
    el.addEventListener('input', () => {
      const v = format(el.value);
      el.value = (v === '+998' || v === '+992') ? v + ' ' : v;
    });
    el.addEventListener('blur', () => { if (/^\+99[28]\s*$/.test(el.value)) el.value = ''; });
  }

  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('input[type=tel]').forEach(attach));
  return { format, ok, attach };
})();
