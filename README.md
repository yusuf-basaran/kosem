# Köşem

Herkesin bir köşesi var.

Türkçe, çok kullanıcılı ve özelleştirilebilir blog platformu. Sade HTML, CSS ve ES modules kullanır. Firebase Authentication, Cloud Firestore ve Cloud Storage ile çalışır; GitHub üzerinden Vercel’e dağıtılır. Firebase Hosting kullanılmaz.

## Yerelde çalıştırma

Node.js 22 veya daha yeni bir sürüm gerekir.

```sh
npm install
npm run dev
```

`http://localhost:3000` adresini açın. Bu küçük geliştirme sunucusu `/@kullaniciadi` ve `/@kullaniciadi/yazi-adresi` yönlendirmelerini de destekler. Vercel için yalnızca statik dosyalar `dist/` dizinine hazırlanır:

```sh
node scripts/build.mjs
```

Firebase config boşsa gerçekçi Türkçe içeriklerle **önizleme** açılır. Bloglar gezilebilir, arama ve kategori filtreleri çalışır; panelde tema/blok düzeni ve editörde Markdown önizlenebilir. Önizleme kayıt, giriş, yükleme, yayınlama veya sunucuya kaydetme işlemi yapmaz. Firebase bağlandığında önizleme içerikleri kullanılmaz; boş bir veritabanı boş durumları gösterir.

## 1. Firebase projesi

1. [Firebase Console](https://console.firebase.google.com/) üzerinden proje oluşturun. Analytics bu uygulama için zorunlu değil.
2. Proje ayarları → Genel → Uygulamalarınız → Web (`</>`) seçeneğinden bir web uygulaması ekleyin. Hosting seçeneğini işaretlemeyin.
3. Verilen `firebaseConfig` içindeki değerleri `js/firebase.js` dosyasına kopyalayın: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Bu değerlerin tarayıcıda görünmesi normaldir. Servis hesabı anahtarı veya yönetici kimlik bilgisi eklemeyin. Erişim denetimi kurallarla yapılır.

```js
export const firebaseConfig = {
  apiKey: "konsoldaki-web-api-key",
  authDomain: "proje-kimligi.firebaseapp.com",
  projectId: "proje-kimligi",
  storageBucket: "konsoldaki-tam-bucket-adi",
  messagingSenderId: "konsoldaki-gonderici-kimligi",
  appId: "konsoldaki-uygulama-kimligi",
};
```

SDK modülleri sürümü sabitlenmiş Firebase 12.19.0 CDN adreslerinden yüklenir. Sunucu veya framework gerektirmez.

## 2. E-posta ve şifre ile hesaplar

1. Build → Authentication → Get started seçin.
2. Sign-in method / Sign-in providers → Email/Password seçin.
3. Email/Password seçeneğini açıp kaydedin. E-posta bağlantısıyla giriş bu uygulamada kullanılmaz.
4. Settings → Password policy üzerinden en az 8 karakter belirleyin. İstemci de aynı alt sınırı uygular.
5. Templates → Password reset bölümünde gönderen adını ve Türkçe e-posta şablonunu düzenleyin.
6. E-posta enumeration protection seçeneğini açık tutun. Şifre sıfırlama ekranı hesap varlığını açıklamayan bir mesaj gösterir.

Kayıt, Authentication hesabını açtıktan sonra transaction içinde hem `users/{uid}` hem `usernames/{username}` yazar. Kurallar bu iki kaydın birlikte ve aynı sahibi gösterecek şekilde oluşturulmasını zorunlu tutar. Aynı ad için eşzamanlı kayıtlardan yalnızca biri tamamlanır. Kesin olarak başarısız olan profil işleminde yeni açılan Auth hesabı temizlenir; ağ sorunu nedeniyle sonuç doğrulanamazsa kullanıcıya tekrar kayıt yapmaması söylenir. Kullanıcı adı sonradan değiştirilemez.

## 3. Firestore

1. Build → Firestore Database → Create database seçin.
2. Kullanıcılarınıza yakın bir bölge seçin. Bölge daha sonra kolayca değiştirilemez.
3. **Production mode** ile oluşturun. Test modu kuralları kullanmayın.
4. Veritabanı kimliği `(default)` olsun.
5. Aşağıdaki komutlarla projeye ait kuralları ve indeksleri yayınlayın.

```sh
npx firebase login
npx firebase use --add
npx firebase deploy --project PROJE_KIMLIGI --only firestore:rules,firestore:indexes,storage
```

`firebase use --add` sırasında konsoldaki doğru projeyi seçin. Her dağıtım komutunda `--project` değerini ayrıca belirtmek karışıklığı önler. Komut web sitesini yayınlamaz; yalnızca veri kurallarını ve indeksleri yükler. `firebase.json` içinde Hosting yapılandırması yoktur.

Alternatif olarak Firestore → Rules alanına `firestore.rules` içeriğini yapıştırıp Publish seçebilirsiniz. İndeksleri elle tek tek eklemek yerine `firestore.indexes.json` dosyasını CLI ile yayınlayın. Firestore → Indexes ekranında tüm bileşik indekslerin **Enabled** olmasını bekleyin. Oluşturulmaları birkaç dakika sürebilir.

Veri modeli:

- `users/{uid}`: `username`, `displayName`, `bio`, `avatarUrl`, `coverUrl`, `theme`, `layout`, `layoutMode`, `createdAt`.
- `usernames/{username}`: yalnızca `uid`. Doküman oluşturulduktan sonra değiştirilemez veya silinemez.
- `posts/{postId}`: istenen yazı alanlarına ek olarak arama için `titleLower` bulunur.
- `layoutMode`: `tek`, `yan`, `iki`. Tema haritasına yerleşim alanı karıştırmadan genel sayfa düzenini saklar.
- Slug: Türkçe karakterlerden türetilen başlığa 16 karakterlik rastgele ek eklenir. Slug, yazar kimliği ve oluşturma tarihi güncellemede sabittir.
- `authorName` ve `authorUsername` yazı üzerinde kopyadır. Yeni yazı ve sonraki düzenlemeler güncel görünen adı alır. Profilde ad değişince eski yazılardaki kopya ad topluca değiştirilmez. Kullanıcı adı her zaman sabittir.

Kurallar bilinmeyen alanları, ayrılmış kullanıcı adlarını, uygun olmayan türleri ve sınırı aşan değerleri reddeder. Profil adı 80, biyografi 500, başlık 160, açıklama 300, Markdown 100.000 karakterle sınırlıdır. Tema yalnızca izin verilen anahtar ve değerleri içerir; renkler altı haneli hex olmalıdır. Düzen en fazla 8 bloktur; blok ayarları tipe göre doğrulanır. Koleksiyon listelerinde `limit <= 12` gerekir. Taslakları yalnızca sahibi okuyabilir. Yayındaki yazılar ve profiller herkese açıktır.

## 4. Storage

1. Build → Storage → Get started üzerinden bucket oluşturun.
2. Firebase Cloud Storage kullanımı için güncel projelerde **Blaze / kullandıkça öde** planı ve bağlı faturalandırma hesabı gerekir. Ücretsiz kullanım payları ücretli planla karıştırılmamalıdır. Konsolda bütçe bildirimleri oluşturun; bildirim harcamayı kendiliğinden durdurmaz.
3. Bölgeyi seçin. Konsoldaki tam bucket adını config’e aktarın; eski projelerde `.appspot.com`, yenilerde `.firebasestorage.app` olabilir.
4. Rules bölümüne `storage.rules` içeriğini yayınlayın veya yukarıdaki deploy komutunu kullanın.

Yollar `avatars/{uid}/{rastgele-ad}` ve `covers/{uid}/{rastgele-ad}` biçimindedir. Yalnızca ilgili kullanıcı yükleyebilir/değiştirebilir/silebilir. JPEG, PNG, WebP, GIF ve AVIF kabul edilir; üst sınır 2 MB. SVG ve diğer içerik türleri reddedilir. İstemci de yüklemeden önce aynı kontrolleri yapar. Storage kuralları dosyanın beyan edilen MIME türünü denetler; dosya baytlarını çözümleyip yeniden kodlamaz.

Görseller, herkese açık blog varlıklarıdır. Yüklenen taslak kapakları da URL’sini bilenlerce okunabilir; gizli dosya deposu olarak kullanmayın. Başarısız kayıt işleminde o işlemde yüklenen yeni görseller temizlenir. Eski görseller bir başka yazıda kullanılabileceği için otomatik silinmez; zamanla kullanılmayan varlıklar için ayrıca bakım yapılabilir.

## 5. GitHub ve Vercel

1. GitHub’da boş bir depo oluşturun. Projeyi depoya gönderin. `node_modules`, `dist`, test çıktıları ve yerel ortam dosyaları `.gitignore` içindedir.
2. [Vercel](https://vercel.com/new) → Add New Project → GitHub deposunu içe aktarın.
3. Framework Preset: **Other**. Root Directory: proje kökü.
4. `vercel.json`, Build Command olarak `node scripts/build.mjs`, Output Directory olarak `dist` belirler. Bağımlılıklar yalnızca geliştirme/test araçlarıdır; çalışma anında Node sunucusu gerekmez.
5. Deploy seçin. Her GitHub push’ı yeni dağıtım oluşturur.
6. `/@deniz-yilmaz` → `blog.html`, `/@deniz-yilmaz/yazi-adresi` → `yazi.html` rewrite’ları otomatik uygulanır. Tarayıcı adresi değişmez; JavaScript kullanıcı adı ve slug’ı adresten okur.
7. Firebase config değişikliğini de commit edip Vercel’e yeniden dağıtın. Kuralları ayrı olarak Firebase CLI ile yayınlayın.

### Authentication için Vercel alan adını yetkilendirme

1. Dağıtım tamamlanınca Vercel Dashboard → Project → Settings → Domains ekranından kalıcı alan adını kopyalayın. Örneğin `kosem-projeniz.vercel.app`.
2. Firebase Console → Build → Authentication → Settings → **Authorized domains** açın.
3. **Add domain** seçin. Yalnızca alan adını yazın: `kosem-projeniz.vercel.app`. `https://`, yol, port veya sondaki `/` eklemeyin.
4. Özel domain bağlarsanız hem `ornek.com` hem kullanılıyorsa `www.ornek.com` için ayrı kayıt ekleyin.
5. Farklı bir Vercel preview adresinde Auth test edecekseniz o tam adresi de ekleyin. Wildcard kullanmayın. Kalıcı alan adıyla test etmek listeyi gereksiz büyütmez.
6. Yerel geliştirme için `localhost` listede yoksa ekleyin; yeni Firebase projelerinde varsayılan olarak gelmeyebilir.
7. Kaydedin, siteyi yeniden açın ve kayıt → çıkış → giriş → şifre sıfırlama akışını deneyin.

## Özelleştirme

Kum, Gece, Orman, Mürekkep, Gül ve Kömür hazır temaları vardır. Dokuz hazır font seçilebilir. Başlıklar Source Serif 4, varsayılan arayüz Inter; okuma alanı Source Serif 4, 18 px / 1.75 ve en fazla 68ch genişliktedir. Google Fonts `latin-ext` ve `display=swap` ile yüklenir.

Site genelindeki görünüm `html[data-tema]` ile değişir. Tercih `localStorage` içine kaydedilir; tercih yoksa `prefers-color-scheme` izlenir. Blog sahibinin teması yalnızca blog/okuma alanına uygulanır, ziyaretçinin site menüsü tercihini değiştirmez. Renkler CSS değişkenlerine yalnızca doğrulamadan sonra aktarılır. Özel renklerde yazı ve bağlantıların arka plan/kart üzerindeki kontrastı 4.5:1 altına düşerse panelde uyarı gösterilir. Vurgu üzerindeki buton yazısı için okunaklı açık/koyu renk seçilir.

Bloklar: kapak, hakkımda, yazılar, öne çıkan yazı, kategoriler, sosyal bağlantılar ve düz metin kutusu. Görünürlük ve genişlik her blokta bulunur. Genel düzen tek sütun, yan panelli veya iki sütunlu olabilir; yarım genişlikli bloklar çok sütunlu düzenlerde yan yana gelir. Mobilde tek sütuna düşer. Sürükle-bırak yanında yukarı/aşağı düğmeleri klavye kullanımını sağlar. Canlı önizleme sunucuya yazmaz; Kaydet düğmesi kalıcılaştırır.

## Güvenlik ve sınırlar

- Kullanıcı HTML, CSS veya JavaScript özelleştirmesi ekleyemez. Düz metinler `textContent` ile gösterilir.
- Yazılar Markdown saklanır; yerelde tutulan, sürümü sabitlenmiş marked ve DOMPurify ile işlenir. Ham HTML düz metin olarak gösterilir; sonuç ayrıca temizlenir. Script, inline stil, form, iframe ve güvensiz bağlantılar engellenir. Kütüphane lisansları `vendor/` içindedir.
- Yetki hem istemcide hem Firestore/Storage kurallarında denetlenir. Panelin gizlenmesi tek başına güvenlik önlemi değildir.
- Ana sayfa akışı `status == published`, `publishedAt desc`, `limit(12)` ve `startAfter` kullanır. Yazar listeleri ve blog listesi de sayfalıdır. Canlı listener yoktur. Profil ve ilk blog sorgusu sayfa ömrü boyunca önbelleklenir.
- **Arama tam metin değildir.** Türkçe küçük harfe çevrilmiş `titleLower` alanında `>= önek` / `<= önek + '\uf8ff'` kullanılır. Yalnızca başlığın başlangıcını bulur. Başlık ortası, içerik, yazım hatası veya anlamsal arama yoktur. Arama sırasında sıralama başlığa, eşit başlıklarda yayın tarihine göredir; normal akış tarihe göredir. Sorgu yalnızca form gönderildiğinde çalışır.
- Kategori blokları yüklenen yazıların kategorilerini gösterir; tüm arşivi okumaz. Tema/yerleşim önizlemesi panelin yüklediği yazıları kullanır.
- Firestore okuma kotaları sorgu sonuçlarına ek olarak güvenlik kurallarındaki belge okumalarını ve indeks taramalarını da içerebilir. Firebase konsolundan kullanımı takip edin.
- Başlık ve meta açıklaması blog/yazı yüklenince güncellenir. Bu statik istemci mimarisinde JavaScript çalıştırmayan sosyal paylaşım botları özel yazı metalarını göremez; eksiksiz sosyal kartlar/ilk HTML SEO için ileride sunucu tarafı ön işleme gerekir.
- Beğeni, yorum, takip ve okunma sayısı bu sürümde yoktur. İlgili alt koleksiyonlar için henüz izin verilmez.

## Kontroller

```sh
npm test
npm run test:rules
npm run dev
npm run test:browser
```

Kural testleri için Java 21 ve Node 22+ gerekir. Firebase emülatörleri `demo-kosem` projesiyle çalışır; gerçek veri kullanmaz. İlk çalıştırmada emülatör dosyaları indirilir. Tarayıcı testinde Chromium gerekir (`npx playwright install chromium` veya sistem Chromium’u). `tests/browser.mjs` yerel sunucunun açık olduğunu varsayar.

Elle kabul kontrolü:

1. Aynı kullanıcı adını iki farklı e-posta ile almayı deneyin; ikinci işlem reddedilmeli. Ardından ikinci e-posta ve farklı bir adla kayıt olabilmelisiniz.
2. Çıkış/giriş ve şifre sıfırlama bağlantısını deneyin. Giriş yapmadan panel adresine gidince giriş ekranına yönlenmelisiniz.
3. Ad/biyografi/avatar/kapak güncelleyin; sayfayı yeniledikten sonra korunmalı. Kullanıcı adı değişmemeli. 2 MB üzeri görsel ve SVG reddedilmeli.
4. Bir taslak oluşturun; ikinci hesapta ve gizli pencerede görünmemeli. Yayınlayın; ana sayfa ve kendi blogunda görünmeli. Düzenleyin, taslağa geri alın ve silin.
5. 13+ yayınla sayfalamayı; kategoriyle ve başlığın ilk kelimeleriyle aramayı deneyin.
6. Altı temayı, fontları, köşeleri ve yoğunluğu deneyin. Düşük kontrastlı renklerde uyarı görünmeli. Kaydettikten sonra blogu yenileyin.
7. Her blok türünü ekleyip ayarlarını değiştirin; sürükleyerek ve klavyeyle sıralayın; gizleyin, yarım genişlik ve iki sütunu deneyin. Mobil önizlemeyi kontrol edin. 9. blok eklenememeli.
8. 360, 390, 768 ve 1440 px genişliklerinde gezinme, editör, panel ve yazıyı kontrol edin. Açık/koyu tercihi yenilemeden sonra korunmalı.

Emülatörlerle tam kayıt, profil/görsel yükleme, taslak/yayın, tema/düzen kaydı, yeniden giriş ve silme akışı için yerel sunucu açıkken `npm run test:integration` çalıştırılabilir. Bu test üretim config dosyasını değiştirmez; yalnızca test tarayıcısında SDK bağlantısını yerel emülatörlere yönlendirir. Yerel Storage HTTP adresleri, HTTPS isteyen belge kurallarıyla uyum için test yanıtında eşdeğer HTTPS biçimine çevrilir. Test tarayıcısında yerel emülatör bağlantıları için CSP devre dışıdır; normal önizleme tarayıcı testi uygulamanın gerçek CSP başlıklarıyla çalışır.
