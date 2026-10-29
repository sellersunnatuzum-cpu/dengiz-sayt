# Dengiz sayti: loyiha yo'riqnomasi

Dengiz = "AI targetolog" (Meta Ads + amoCRM). Foydalanuvchi o'zbek tilida yozadi, javoblar ham o'zbekcha.
Sayt statik (HTML + oddiy JS + CSS, build yo'q). Orqa tomon Supabase edge funksiyalari.

## Manzillar va ID'lar (maxfiy emas)
- Sayt: https://dengiz-sayt.vercel.app (Vercel project `prj_jQ3uDjL3IlJWKDs046zRceurWkvF`, team `team_xp2WO1Qe7AFHQjdogpyHgFy2`)
- Supabase project: `fjvvaivzwmlqgqgltkva` (sxema: `targetolog`)
- Edge funksiyalar va migratsiyalar: `C:\Users\user\dengiz\supabase\` (functions/, migrations/)
- Maxfiy kalit/token hech qachon chatga yoki faylga yozilmaydi.

## Deploy (saytni chiqarish)
- Shu papkada: `powershell -File deploy.ps1` (avval `node --check` bilan barcha .js tekshiriladi, keyin `vercel deploy --prod`).
- Vercel'ga bu kompyuterda bir marta kirilgan. "No existing credentials" chiqsa: foydalanuvchi `npx vercel login` qiladi.
- Production'ga chiqarish va bazaga migratsiya: foydalanuvchi aniq so'ragandagina. Avto-rejim bularni bloklaydi; foydalanuvchi tasdiqlash oynasida ruxsat berishi kerak.
- Deploydan keyin tekshirish: jonli fayllarni `curl` bilan lokal nusxa bilan solishtirish va brauzerda kabinetni ochib konsolni (xato yo'qligini) ko'rish.

## Baza
- Migratsiya: `apply_migration` (foydalanuvchi tasdiqlaydi) yoki foydalanuvchi SQL Editor'ga matnni qo'yadi. Matnni klipbordga `Get-Content -Raw ... | Set-Clipboard` bilan nusxalab berish qulay.
- `audit_log` faqat qo'shish uchun: UPDATE/DELETE taqiqlangan (forbid_change trigger).
- 0010 migratsiya qo'llangan (jsonb tuzatish, triggerlar, Telegram spam himoyasi). Zaxira jadval: `targetolog._bak_alerts_20261029`.

## Ma'lum tuzoqlar
- postgres.js: JSONB yozishda `${sql.json(x)}` ishlating. `${JSON.stringify(x)}::jsonb` ikki marta kodlaydi (jsonb string bo'lib qoladi). Bazada himoya trigger bor, lekin kodni to'g'ri yozing.
- Kabinet kodida massiv/obyekt kelishini `arr()`/`obj()` (kabinet/common.js) bilan himoyalang.
- Taymer bilan serverni urmang (foydalanuvchi talabi): yangilash faqat hodisa bilan (tabga qaytish, bo'lim ochilishi).
- Kirgan foydalanuvchi landingga kirsa kabinetga qaytariladi; kabinetdan faqat "Chiqish" bilan chiqiladi (serverda sessiya bekor qilinadi).
- Reklama yaratish faqat "ko'rish va boshqarish" rejimida ulangan akkauntda; media kutubxonasi har akkauntning o'zida.

## Qanday sinash (deploydan oldin)
Lokal fayllarni `python -m http.server` bilan bering va jonli kabinet sahifasida (Chrome) skriptlarni shu manbadan inline joylab ishga tushiring: shunda haqiqiy sessiya va ma'lumot bilan sinaladi, saytga hech narsa chiqmaydi.

## Ochiq vazifalar (2026-10-29 holati)
- Edge funksiyalardagi `sql.json` tuzatishi (10 funksiya) lokal fayllarda, serverga hali chiqarilmagan (trigger vaqtincha to'g'rilab turibdi).
- "Chiqish" tugmasi jonli hali sinalmagan; Telegram'ga haqiqiy xabar borishi tasdiqlanmagan.
- "Sunnatilla Nasiridinov" akkauntida media kutubxonasi bo'sh; Dengiz Meta xatosini yashiradi (aniq sabab ko'rsatish va Dengiz'dan media yuklash g'oyasi).
- Meta hisobida "to'lanmagan qarz" ogohlantirishi: foydalanuvchi Ads Manager → Billing'ni tekshirishi kerak.
- Obsidian: `Suhbatlar\Xulosalar\2026-10-29 Dengiz kabinet xatolari.md`
