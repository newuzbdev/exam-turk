export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  details?: { title: string; paragraphs: string[]; items: string[] };
};
export type LegalDocument = { title: string; introduction: string; sections: LegalSection[] };

export const privacyDocument: LegalDocument = {
  title: "Gizlilik Politikası",
  introduction: "Bu politika, TurkishMock’u kullanırken hangi kişisel verilerinizin işlendiğini, neden kullanıldığını, ne kadar saklandığını ve bu verilerle ilgili haklarınızı açıklar.",
  sections: [
    { id: "operator", title: "1. Hizmeti kim yönetiyor?", paragraphs: [
      "TurkishMock’u “EDU WAY” MChJ işletir. Şirket, bu politikada açıklanan kişisel verilerinizin işlenmesinden sorumludur. Şirket bilgilerini ve bize ulaşabileceğiniz iletişim yollarını sayfanın sonunda bulabilirsiniz.",
    ] },
    { id: "data", title: "2. Hangi veriler alınır?", paragraphs: [
      "Kullandığınız özelliklere bağlı olarak şu verileriniz işlenir:",
    ], items: [
      "Hesap bilgileri: Google veya Telegram’ın giriş sırasında paylaştığı hesap kimliğiniz, profil adınız, varsa profil fotoğrafınız, e-posta adresiniz veya kullanıcı adınız. Google ve Telegram şifrenizi almayız.",
      "Pratik ve test bilgileri: seçtiğiniz cevaplar, yazdığınız metinler, gönderim zamanı, sonuçlarınız, puanlarınız ve yapay zekâ yorumları.",
      "Konuşma kayıtları: gönderdiğiniz ses, kayıttan elde edilen metin (transkript) ve değerlendirme bilgileri.",
      "Yaş ve onay kayıtları: 18 yaşını doldurup doldurmadığınıza ilişkin beyanınız, verdiğiniz onaylar ve kabul ettiğiniz metnin sürümü ile tarihi. Doğum tarihinizi veya pasaport kopyanızı istemeyiz.",
      "Hesap ayarları: belirttiğiniz hedef seviye ve sınav tarihi gibi bilgiler.",
      "Ödeme bilgileri: ödeme özelliğini kullandığınızda siparişiniz, ödeme durumu ve ödeme kuruluşunun sağladığı işlem kimliği.",
      "Teknik bilgiler: IP adresiniz, tarayıcı bilgileri ve hizmetin çalışması ile güvenliği için tutulan teknik kayıtlar.",
    ] },
    { id: "purposes", title: "3. Veriler hangi amaçlarla kullanılır?", paragraphs: [
      "Verilerinizi hesabınıza giriş yapabilmeniz, pratikleri ve testleri kullanabilmeniz, cevaplarınızın değerlendirilmesi ve sonuç geçmişinizi görebilmeniz için kullanırız. Aboneliğinizi yönetmek, destek taleplerinizi yanıtlamak ve hizmetin güvenliğini sağlamak için de ilgili bilgilerinizden yararlanırız.",
      "Hizmeti geliştirmek için kimliğinizi belirlemeye imkân vermeyen toplu kullanım istatistiklerinden yararlanabiliriz.",
    ] },
    { id: "providers", title: "4. Dış hizmetler ve yapay zekâ", paragraphs: [
      "Giriş, barındırma, güvenlik ve cevaplarınızın değerlendirilmesi için dış hizmetlerden yararlanırız. Değerlendirme sırasında cevap metniniz veya ses kaydınız, ilgili soru ve varsa görsel ile birlikte değerlendirme hizmetlerine gönderilebilir.",
      "Verileriniz Özbekistan dışındaki sunucularda da saklanabilir ve işlenebilir. Kullandığımız hizmetleri ve görevlerini aşağıdaki listede görebilirsiniz.",
    ], details: {
      title: "Kullandığımız hizmetler",
      items: [
        "Contabo: sitenin ve verilerin barındırılması.",
        "Cloudflare: sitenin güvenliği ve dosyaların sunulması.",
        "Google ve Telegram: seçtiğiniz yöntemle hesabınıza giriş.",
        "Google/Gemini: cevaplarınızın değerlendirilmesi.",
        "Deepgram: bazı ses kayıtlarının metne dönüştürülmesi.",
        "Ödeme sayfasında gösterilen ödeme kuruluşu: seçtiğiniz yöntemle ödemenizin gerçekleştirilmesi ve ödeme durumunun bildirilmesi.",
      ],
      paragraphs: [
        "Dış hizmetlerde tutulan kopyaların saklama ve silme koşulları, ilgili sağlayıcıyla geçerli olan düzenlemelere bağlıdır. TurkishMock’taki silme süreleri bu kopyalara otomatik olarak uygulanmaz. Bu kopyalar hakkında da aşağıdaki iletişim yollarından bilgi isteyebilirsiniz.",
      ],
    } },
    { id: "retention", title: "5. Saklama süresi", paragraphs: [
      "Ses kayıtlarınız, oluşturuldukları tarihten itibaren 90 gün saklanır. Bu sürenin sonunda silinen kayıtları raporunuzdan yeniden dinleyemezsiniz.",
      "Cevaplarınız, transkriptleriniz, puanlarınız ve değerlendirme geçmişiniz hesabınız aktif olduğu sürece saklanır. Hesabınızı bir yıl boyunca kullanmazsanız bu öğrenme geçmişi silinir. Bu işlem hesabınızı veya gerekli ödeme kayıtlarını otomatik olarak silmez.",
      "Ödeme ve uyuşmazlık kayıtları, ilgili yasal yükümlülükler için gerekli süre boyunca saklanabilir. Yedeklerdeki ve dış hizmetlerdeki kopyalar aynı anda silinmeyebilir; bu kopyalara ilgili saklama ve silme düzeni uygulanır. Verilerinizin silinmesini ayrıca talep edebilirsiniz.",
    ] },
    { id: "public-results", title: "6. Herkese açık sonuçlar", paragraphs: [
      "Sonuçlarınızı herkese açık listede paylaşmadan önce sizden ayrıca onay isteriz. Paylaşım için onay vermemeniz, pratikleri ve testleri kullanmanıza engel olmaz.",
      "Paylaşımı onayladığınızda profil adınız, varsa profil fotoğrafınız, test türünüz, puanınız ve test tarihiniz diğer ziyaretçilere gösterilebilir. Kısaltılmış bir ad veya takma ad da sizi tanıyan kişiler için kimliğinizi belli edebilir.",
      "Paylaşım tercihinizi Profil sayfasındaki Sonuç paylaşımı bölümünden değiştirebilirsiniz. Onayınızı kaldırdığınızda sonuçlarınız açık listeden çıkar; kendi raporlarınız hesabınızda kalır. Yardım için aşağıdaki iletişim yollarından bize ulaşabilirsiniz.",
    ] },
    { id: "minors", title: "7. 18 yaşından küçük kullanıcılar", paragraphs: [
      "TurkishMock üyeliği, pratikleri ve mock testleri 18 yaşını doldurmuş kullanıcılar içindir. Google veya Telegram ile giriş yapsanız da testleri kullanmadan önce yaş beyanı vermeniz istenir.",
      "Yaş beyanı vermediğinizde veya 18 yaşından küçük olduğunuzu belirttiğinizde testlere ve yapay zekâ hizmetlerine erişemezsiniz. Yaş bilgisi kendi beyanınıza dayanır; kimlik belgesiyle doğrulama yapılmaz. 18 yaşından küçükler için ebeveyn onayıyla erişim seçeneği sunulmaz.",
    ] },
    { id: "rights", title: "8. Haklarınız", paragraphs: [
      "Hakkınızda işlenen verileri ve bu verilerin kimlerle paylaşıldığını öğrenebilir, yanlış bilgilerin düzeltilmesini isteyebilir ve verdiğiniz onayı geri alabilirsiniz. Kanunda öngörülen durumlarda verilerinizin kullanımının durdurulmasını veya silinmesini talep edebilirsiniz. Başvurunuzu sayfanın sonundaki iletişim yollarından iletebilirsiniz.",
      "Verilerinizi korumak için başvurunun size ait olduğunu doğrulamamızı sağlayacak bilgiler isteyebiliriz. Şifrenizi veya giriş kodunuzu istemeyiz. Talebinizin sonucunu ve yasal nedenle saklanması gereken bir kayıt varsa bunun gerekçesini size bildiririz. Bazı verilerin silinmesi, ilgili özellikleri kullanmanızı engelleyebilir. Yetkili makamlara başvurma hakkınız saklıdır.",
    ] },
    { id: "browser", title: "9. Tarayıcıda saklanan veriler", paragraphs: [
      "Giriş durumunuzu, arayüz tercihlerinizi ve gerekli sınav bilgilerini korumak için tarayıcı depolamasından yararlanırız. Cloudflare güvenlik hizmetleri gerekli teknik çerezleri kullanabilir. Tarayıcı verilerini temizlemeniz oturumunuzu kapatabilir veya cihazınızda saklanan tercihleri ve tamamlanmamış çalışmaları kaldırabilir.",
    ] },
    { id: "changes", title: "10. Değişiklikler", paragraphs: [
      "Bu politikayı güncellediğimizde yeni metni ve güncelleme tarihini bu sayfada yayımlarız. Verilerinizin kullanımıyla ilgili önemli değişiklikleri hizmet içinde duyururuz. Ayrıca onay vermenizi gerektiren bir değişiklik olursa sizden yeniden onay isteriz.",
    ] },
  ],
};

export const termsDocument: LegalDocument = {
  title: "Kullanım Şartları",
  introduction: "Bu şartlar, TurkishMock hesabınızı, pratikleri, mock testleri ve varsa ücretli üyeliğinizi kullanırken geçerli olan kuralları açıklar.",
  sections: [
    { id: "service", title: "1. Hizmet", paragraphs: [
      "TurkishMock, Türkçe sınavlarına hazırlanmanız için pratikler ve mock testler sunar. Hizmeti “EDU WAY” MChJ işletir. TurkishMock resmî bir sınav kuruluşu değildir; burada aldığınız sonuçlar resmî sınav puanı veya sertifika yerine geçmez.",
    ] },
    { id: "account", title: "2. Hesap ve güvenlik", paragraphs: [
      "Google veya Telegram üzerinden kendi hesabınızla giriş yapın. Giriş kodlarınızı ve hesabınıza erişimi başkalarıyla paylaşmayın. Hesabınızın izinsiz kullanıldığını düşünüyorsanız bize bildirin.",
      "Üyelik, pratikler ve testler için 18 yaşını doldurmuş olmanız gerekir. Yaş beyanı vermeden veya 18 yaşından küçük olduğunuzu belirttiğinizde testlere ve yapay zekâ hizmetlerine erişemezsiniz. Beyanınızın doğru olması gerekir.",
    ] },
    { id: "tests", title: "3. Pratikler ve değerlendirme", paragraphs: [
      "Pratik ve testlerde sayfada gösterilen süreleri ve gönderim adımlarını takip edin. Konuşma görevlerinde mikrofonunuzun çalıştığını ve kaydınızın duyulabildiğini kontrol edin.",
      "Yapay zekâ puanları ve yorumları, hazırlığınıza yardımcı olan yaklaşık değerlendirmelerdir. Hatalı veya eksik olabilirler; resmî sınav sonucunuzla aynı puanı alacağınız garanti edilmez.",
      "Sesinizin yüklenmemesi, cevabınızın eksik görünmesi veya raporun açılmaması gibi teknik sorunları sonuç bağlantısıyla bize bildirebilirsiniz. Destek başvurusu, puanınızın elle değiştirileceği veya cevabınızın yeniden değerlendirileceği anlamına gelmez.",
    ] },
    { id: "subscription", title: "4. Abonelik ve ödeme", paragraphs: [
      "Ücretli bir paket sunulduğunda fiyatını, kapsamını ve kullanım sınırlarını satın alma sayfasında görebilirsiniz. Üyelik dönemi 30 gündür. Satın almadan önce bu bilgileri inceleyin.",
      "Üyeliği yeniden satın aldığınızda yeni bir 30 günlük dönem ve o dönemin kullanım hakları başlar. Önceki dönemin kullanılmayan hakları yeni döneme eklenmez. Üyelik için kartınızdan otomatik ve düzenli ödeme alınmaz; yeni dönem için yeniden satın alma yapmanız gerekir.",
      "Ödemeler “EDU WAY” MChJ adına, satın alma sayfasında gösterilen ödeme kuruluşu üzerinden alınır. Ödemenizin tamamlanması, ödeme kuruluşunun başarılı işlem onayına bağlıdır.",
      "Hatalı veya tekrarlanan bir ödeme ya da satın aldığınız hizmetin sunulmaması durumunda işlem bilgileriyle bize ulaşabilirsiniz. İade talebinizi ilgili işlem, sunulan hizmet ve geçerli mevzuata göre değerlendirir, sonucunu size bildiririz. Bu şartlar yasal tüketici haklarınızı sınırlamaz.",
    ] },
    { id: "content", title: "5. İçerik ve kurallar", paragraphs: [
      "Materyalleri kendi sınav hazırlığınız için kullanabilirsiniz. Başkalarına ait cevapları, ses kayıtlarını veya kişisel verileri izinsiz göndermeyin. Başka hesaplara izinsiz erişmek, sitenin güvenliğini ihlal etmek veya hizmetin çalışmasını engellemek yasaktır.",
      "Bakım veya teknik sorunlar nedeniyle geçici kesintiler yaşanabilir. Bir sorunla karşılaştığınızda destek kanallarımızdan bize ulaşabilirsiniz.",
    ] },
    { id: "privacy", title: "6. Gizlilik ve herkese açık sonuçlar", paragraphs: [
      "Hesap bilgilerinizin, cevaplarınızın ve ses kayıtlarınızın nasıl işlendiğini Gizlilik Politikası’nda bulabilirsiniz. Sonuçlarınızın herkese açık listede paylaşılması için ayrıca onayınız istenir. Paylaşımı onaylamamanız, pratikleri ve testleri kullanmanıza engel olmaz.",
    ] },
    { id: "contact", title: "7. Başvurular ve uyuşmazlıklar", paragraphs: [
      "Hesabınız, teknik sorunlar, ödemeler veya verilerinizle ilgili sorularınızı sayfanın sonundaki iletişim yollarından iletebilirsiniz. Başvurunuzu inceleyerek çözüm hakkında size bilgi veririz. Tüketici haklarınızı kullanmak, yetkili makamlara veya mahkemeye başvurmak için sahip olduğunuz yasal haklar saklıdır.",
    ] },
  ],
};

export const privacyDocumentUz: LegalDocument = {
  title: "Maxfiylik siyosati",
  introduction: "Ushbu siyosat TurkishMock’dan foydalanganingizda qaysi shaxsga doir ma’lumotlaringiz qayta ishlanishi, nima uchun ishlatilishi, qancha saqlanishi va ular bo‘yicha huquqlaringizni tushuntiradi.",
  sections: [
    { id: "operator", title: "1. Xizmatni kim boshqaradi?", paragraphs: [
      "TurkishMock xizmatini “EDU WAY” MChJ boshqaradi. Kompaniya ushbu siyosatda ko‘rsatilgan shaxsga doir ma’lumotlaringizni qayta ishlash uchun javobgardir. Kompaniya rekvizitlari va biz bilan bog‘lanish usullarini sahifa oxirida topishingiz mumkin.",
    ] },
    { id: "data", title: "2. Qanday ma’lumotlar olinadi?", paragraphs: [
      "Siz foydalanadigan imkoniyatlarga qarab quyidagi ma’lumotlaringiz qayta ishlanadi:",
    ], items: [
      "Hisob ma’lumotlari: Google yoki Telegram kirish paytida taqdim etgan hisob identifikatoringiz, profil nomingiz, mavjud bo‘lsa profil rasmingiz, e-pochta manzilingiz yoki foydalanuvchi nomingiz. Google va Telegram parolingizni olmaymiz.",
      "Mashq va sinov ma’lumotlari: belgilagan javoblaringiz, yozgan matnlaringiz, yuborish vaqti, natijalaringiz, ballaringiz va sun’iy intellekt izohlari.",
      "Ovoz yozuvlari: yuborgan audiongiz, undan olingan matn (transkript) va baholash ma’lumotlari.",
      "Yosh va rozilik qaydlari: 18 yoshga to‘lgan yoki to‘lmaganligingiz haqidagi bayonotingiz, bergan roziliklaringiz hamda qabul qilgan matnning versiyasi va sanasi. Tug‘ilgan sanangizni yoki pasport nusxangizni so‘ramaymiz.",
      "Hisob sozlamalari: belgilagan maqsad darajangiz va imtihon sanasi kabi ma’lumotlar.",
      "To‘lov ma’lumotlari: to‘lov imkoniyatidan foydalanganingizda buyurtmangiz, to‘lov holati va to‘lov tashkiloti taqdim etgan tranzaksiya identifikatori.",
      "Texnik ma’lumotlar: IP manzilingiz, brauzer ma’lumotlari hamda xizmat ishlashi va xavfsizligi uchun saqlanadigan texnik qaydlar.",
    ] },
    { id: "purposes", title: "3. Ma’lumotlar nima uchun ishlatiladi?", paragraphs: [
      "Ma’lumotlaringizdan hisobingizga kirishingiz, mashq va sinovlardan foydalanishingiz, javoblaringizni baholash va natijalar tarixini ko‘rishingiz uchun foydalanamiz. Obunangizni boshqarish, yordam so‘rovlaringizga javob berish va xizmat xavfsizligini ta’minlash uchun ham tegishli ma’lumotlaringizdan foydalanamiz.",
      "Xizmatni rivojlantirish uchun shaxsingizni aniqlash imkonini bermaydigan umumiy foydalanish statistikasidan foydalanishimiz mumkin.",
    ] },
    { id: "providers", title: "4. Tashqi xizmatlar va AI", paragraphs: [
      "Kirish, joylashtirish, xavfsizlik va javoblaringizni baholash uchun tashqi xizmatlardan foydalanamiz. Baholash paytida javob matningiz yoki ovoz yozuvingiz tegishli savol va, mavjud bo‘lsa, rasm bilan birga baholash xizmatlariga yuborilishi mumkin.",
      "Ma’lumotlaringiz O‘zbekistondan tashqaridagi serverlarda ham saqlanishi va qayta ishlanishi mumkin. Foydalanadigan xizmatlarimiz va ularning vazifalarini quyidagi ro‘yxatda ko‘rishingiz mumkin.",
    ], details: {
      title: "Foydalanadigan xizmatlarimiz",
      items: [
        "Contabo: sayt va ma’lumotlarni joylashtirish.",
        "Cloudflare: sayt xavfsizligi va fayllarni yetkazish.",
        "Google va Telegram: tanlagan usulingiz orqali hisobingizga kirish.",
        "Google/Gemini: javoblaringizni baholash.",
        "Deepgram: ayrim ovoz yozuvlarini matnga aylantirish.",
        "To‘lov sahifasida ko‘rsatilgan to‘lov tashkiloti: tanlagan usulingiz orqali to‘lovni amalga oshirish va uning holatini bildirish.",
      ],
      paragraphs: [
        "Tashqi xizmatlardagi nusxalarni saqlash va o‘chirish shartlari tegishli provayder bilan amaldagi kelishuvlarga bog‘liq. TurkishMock’dagi o‘chirish muddatlari bu nusxalarga avtomatik qo‘llanmaydi. Ushbu nusxalar haqida ham quyidagi aloqa usullari orqali ma’lumot so‘rashingiz mumkin.",
      ],
    } },
    { id: "retention", title: "5. Saqlash muddati", paragraphs: [
      "Ovoz yozuvlaringiz yaratilgan kundan boshlab 90 kun saqlanadi. Bu muddat tugagach o‘chirilgan yozuvlarni hisobotingizda qayta tinglay olmaysiz.",
      "Javoblaringiz, transkriptlaringiz, ballaringiz va baholash tarixi hisobingiz faol bo‘lgan davrda saqlanadi. Hisobingizdan bir yil foydalanmasangiz, ushbu o‘quv tarixi o‘chiriladi. Bu jarayon hisobingizni yoki zarur to‘lov yozuvlarini avtomatik o‘chirmaydi.",
      "To‘lov va nizoga oid qaydlar tegishli qonuniy majburiyatlar uchun zarur muddat davomida saqlanishi mumkin. Zaxira va tashqi xizmatlardagi nusxalar bir vaqtda o‘chirilmasligi mumkin; ularga tegishli saqlash va o‘chirish tartibi qo‘llanadi. Ma’lumotlaringizni o‘chirishni alohida so‘rashingiz ham mumkin.",
    ] },
    { id: "public-results", title: "6. Ochiq natijalar", paragraphs: [
      "Natijalaringizni ochiq ro‘yxatda chiqarishdan oldin sizdan alohida rozilik so‘raymiz. Bunga rozilik bermasligingiz mashq va sinovlardan foydalanishingizga to‘sqinlik qilmaydi.",
      "Ochiq chiqarishga rozi bo‘lganingizda profil nomingiz, mavjud bo‘lsa profil rasmingiz, sinov turi, ballingiz va sinov sanasi boshqa tashrif buyuruvchilarga ko‘rsatilishi mumkin. Qisqartirilgan ism yoki taxallus ham sizni taniydigan odamlarga kimligingizni bildirish imkonini berishi mumkin.",
      "Profil sahifasidagi Natijalarni ulashish bo‘limidan tanlovingizni o‘zgartirishingiz mumkin. Roziligingizni bekor qilsangiz, natijalaringiz ochiq ro‘yxatdan olinadi; shaxsiy hisobotlaringiz hisobingizda qoladi. Yordam uchun quyidagi aloqa usullari orqali bizga murojaat qilishingiz mumkin.",
    ] },
    { id: "minors", title: "7. Voyaga yetmaganlar", paragraphs: [
      "TurkishMock a’zoligi, mashqlari va mock testlari 18 yoshga to‘lgan foydalanuvchilar uchun mo‘ljallangan. Google yoki Telegram orqali kirgan bo‘lsangiz ham, sinovlardan foydalanishdan oldin yoshingiz haqida bayonot berishingiz so‘raladi.",
      "Yoshingiz haqida bayonot bermasangiz yoki 18 yoshdan kichik ekaningizni ko‘rsatsangiz, sinov va sun’iy intellekt xizmatlariga kira olmaysiz. Yosh haqidagi ma’lumot o‘z bayonotingizga asoslanadi; shaxsni tasdiqlovchi hujjat bilan tekshirilmaydi. 18 yoshdan kichiklar uchun ota-ona roziligi orqali kirish imkoniyati taklif etilmaydi.",
    ] },
    { id: "rights", title: "8. Sizning huquqlaringiz", paragraphs: [
      "Siz haqingizda qayta ishlanadigan ma’lumotlar va ular kimlar bilan ulashilishini bilishingiz, noto‘g‘ri ma’lumotlarni tuzatishni so‘rashingiz va bergan roziligingizni qaytarib olishingiz mumkin. Qonunda nazarda tutilgan hollarda ma’lumotlaringizdan foydalanishni to‘xtatishni yoki ularni o‘chirishni so‘rashingiz mumkin. Murojaatingizni sahifa oxiridagi aloqa usullari orqali yuborishingiz mumkin.",
      "Ma’lumotlaringizni himoya qilish uchun murojaat sizga tegishli ekanini tekshirishga yordam beradigan ma’lumotlarni so‘rashimiz mumkin. Parolingizni yoki kirish kodingizni so‘ramaymiz. So‘rovingiz natijasini va qonuniy sabab bilan saqlanishi kerak bo‘lgan qayd mavjud bo‘lsa, uning sababini sizga bildiramiz. Ayrim ma’lumotlarni o‘chirish tegishli imkoniyatlardan foydalanishingizni cheklashi mumkin. Vakolatli organlarga murojaat qilish huquqingiz saqlanadi.",
    ] },
    { id: "browser", title: "9. Brauzerda saqlanadigan ma’lumotlar", paragraphs: [
      "Hisobga kirish holatingiz, interfeys sozlamalaringiz va zarur sinov ma’lumotlarini saqlash uchun brauzer xotirasidan foydalanamiz. Cloudflare xavfsizlik xizmatlari zarur texnik cookie fayllaridan foydalanishi mumkin. Brauzer ma’lumotlarini tozalash hisobingizdan chiqishga yoki qurilmangizda saqlangan sozlamalar va tugallanmagan ishlaringizning o‘chishiga olib kelishi mumkin.",
    ] },
    { id: "changes", title: "10. O‘zgarishlar", paragraphs: [
      "Ushbu siyosatni yangilaganimizda yangi matn va yangilanish sanasini shu sahifada e’lon qilamiz. Ma’lumotlaringizdan foydalanishga oid muhim o‘zgarishlar haqida xizmat ichida xabar beramiz. Qo‘shimcha roziligingiz kerak bo‘lgan o‘zgarish yuz bersa, sizdan qayta rozilik so‘raymiz.",
    ] },
  ],
};

export const termsDocumentUz: LegalDocument = {
  title: "Foydalanish shartlari",
  introduction: "Ushbu shartlar TurkishMock hisobingiz, mashqlar, mock testlar va mavjud bo‘lsa pulli a’zoligingizdan foydalanishda amal qiladigan qoidalarni tushuntiradi.",
  sections: [
    { id: "service", title: "1. Xizmat", paragraphs: [
      "TurkishMock turk tili imtihonlariga tayyorlanishingiz uchun mashqlar va mock testlarni taklif etadi. Xizmatni “EDU WAY” MChJ boshqaradi. TurkishMock rasmiy imtihon tashkiloti emas; bu yerda olgan natijalaringiz rasmiy imtihon bali yoki sertifikat o‘rnini bosmaydi.",
    ] },
    { id: "account", title: "2. Hisob va xavfsizlik", paragraphs: [
      "Google yoki Telegram orqali o‘z hisobingiz bilan kiring. Kirish kodlaringiz va hisobingizga kirish imkonini boshqalar bilan ulashmang. Hisobingizdan ruxsatsiz foydalanilgan deb hisoblasangiz, bizga xabar bering.",
      "A’zolik, mashq va sinovlar uchun 18 yoshga to‘lgan bo‘lishingiz kerak. Yoshingiz haqida bayonot bermasdan yoki 18 yoshdan kichik ekaningizni bildirganingizda sinov va sun’iy intellekt xizmatlariga kira olmaysiz. Bayonotingiz to‘g‘ri bo‘lishi kerak.",
    ] },
    { id: "tests", title: "3. Mashqlar va baholash", paragraphs: [
      "Mashq va sinovlarda sahifada ko‘rsatilgan vaqt va yuborish bosqichlariga amal qiling. Og‘zaki nutq topshiriqlarida mikrofoningiz ishlashini va ovoz yozuvingiz eshitilishini tekshiring.",
      "Sun’iy intellekt ballari va izohlari tayyorgarligingizga yordam beradigan taxminiy baholardir. Ular xato yoki to‘liq bo‘lmasligi mumkin; rasmiy imtihonda aynan shu ballni olishingiz kafolatlanmaydi.",
      "Ovoz yuklanmasligi, javobingiz to‘liq ko‘rinmasligi yoki hisobot ochilmasligi kabi texnik muammolarni natija havolasi bilan bizga bildirishingiz mumkin. Yordam uchun murojaat qilishingiz ballingiz qo‘lda o‘zgartirilishi yoki javobingiz qayta baholanishini anglatmaydi.",
    ] },
    { id: "subscription", title: "4. Obuna va to‘lov", paragraphs: [
      "Pulli paket taklif etilganda uning narxi, qamrovi va foydalanish chegaralarini xarid sahifasida ko‘rishingiz mumkin. A’zolik davri 30 kun. Xarid qilishdan oldin ushbu ma’lumotlar bilan tanishing.",
      "A’zolikni qayta xarid qilganingizda yangi 30 kunlik davr va shu davrning foydalanish huquqlari boshlanadi. Oldingi davrda ishlatilmagan huquqlar yangi davrga qo‘shilmaydi. A’zolik uchun kartangizdan avtomatik davriy to‘lov olinmaydi; yangi davr uchun qayta xarid qilishingiz kerak.",
      "To‘lovlar “EDU WAY” MChJ nomidan, xarid sahifasida ko‘rsatilgan to‘lov tashkiloti orqali qabul qilinadi. To‘lovingiz tugallanishi to‘lov tashkilotining muvaffaqiyatli tranzaksiya tasdig‘iga bog‘liq.",
      "Xato yoki takroriy to‘lov yoxud xarid qilgan xizmatingiz taqdim etilmasligi holatida tranzaksiya ma’lumotlari bilan bizga murojaat qilishingiz mumkin. Pulni qaytarish so‘rovingizni tegishli tranzaksiya, ko‘rsatilgan xizmat va amaldagi qonunchilikka muvofiq ko‘rib chiqamiz hamda natijasini sizga bildiramiz. Ushbu shartlar iste’molchi sifatidagi qonuniy huquqlaringizni cheklamaydi.",
    ] },
    { id: "content", title: "5. Kontent va qoidalar", paragraphs: [
      "Materiallardan o‘z imtihon tayyorgarligingiz uchun foydalanishingiz mumkin. Boshqalarga tegishli javoblar, ovoz yozuvlari yoki shaxsga doir ma’lumotlarni ruxsatsiz yubormang. Boshqa hisoblarga ruxsatsiz kirish, sayt xavfsizligini buzish yoki xizmat ishlashiga xalal berish taqiqlanadi.",
      "Texnik xizmat yoki nosozliklar sabab vaqtincha uzilishlar bo‘lishi mumkin. Muammoga duch kelsangiz, yordam kanallarimiz orqali bizga murojaat qilishingiz mumkin.",
    ] },
    { id: "privacy", title: "6. Maxfiylik va ochiq natijalar", paragraphs: [
      "Hisob ma’lumotlaringiz, javoblaringiz va ovoz yozuvlaringiz qanday qayta ishlanishini Maxfiylik siyosatida topishingiz mumkin. Natijalaringizni ochiq ro‘yxatda chiqarish uchun alohida roziligingiz so‘raladi. Bunga rozilik bermasligingiz mashq va sinovlardan foydalanishingizga to‘sqinlik qilmaydi.",
    ] },
    { id: "contact", title: "7. Murojaat va nizolar", paragraphs: [
      "Hisobingiz, texnik muammolar, to‘lovlar yoki ma’lumotlaringizga oid savollaringizni sahifa oxiridagi aloqa usullari orqali yuborishingiz mumkin. Murojaatingizni ko‘rib chiqib, yechim haqida sizga ma’lumot beramiz. Iste’molchi huquqlaringizdan foydalanish, vakolatli organlarga yoki sudga murojaat qilish bo‘yicha qonuniy huquqlaringiz saqlanadi.",
    ] },
  ],
};
