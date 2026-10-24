# Köşem doğrulama raporu

24 Ekim 2026

- İstemci doğrulama: **6/6 test geçti**. Tema beyaz listeleri, hazır temaların kontrastı, düzen boyutu/türleri, sosyal bağlantılar, kullanıcı adları, Türkçe başlık/slug ve görsel sınırları.
- Firestore ve Storage emülatörleri: **8/8 test geçti**. Atomik profil/kullanıcı adı kaydı, eşzamanlı ad çakışması, değişmez adlar, alan doğrulamaları, taslak mahremiyeti, yazı sahipliği ve yükleme izinleri. Yedi blok türünün her biri sekizli listede kabul edildi; dokuzuncu blok ve geçersiz/null blok reddedildi.
- Tarayıcı önizlemesi: **geçti**. Kategori, başlık öneki arama, boş sonuçlar, sayfalama, blog/yazı adresleri, altı tema, kontrast uyarısı, mobil önizleme, blok sıralama, düz metin ve Markdown güvenliği.
- Duyarlı görünüm: **360, 390, 768 ve 1440 px kontrolleri geçti**. Kontrol edilen ana sayfa, panel, editör, kayıt ve blog sayfalarında yatay taşma yok.
- Firebase uçtan uca: **geçti**. Gerçek modüler SDK 12.19.0 ile yerel Auth/Firestore/Storage: kayıt → profil/avatar yükleme → kapaklı taslak → ziyaretçiden gizleme → yayın → blog/yazı sayfası → tema/düzen kaydı → ziyaretçiye yansıma → çıkış → korumalı panel yönlendirmesi → yeniden giriş → yazı silme.
- Statik dağıtım derlemesi: **geçti**. `dist/` yalnızca sayfalar, CSS, istemci modülleri, görseller ve tarayıcı kütüphanelerini içerir.

Üretim Firebase projesi ve Vercel alan adı bağlanmadı. Emülatörler gerçek e-posta teslimatını, üretim Authorized domains ayarını, bileşik indekslerin üretimde hazır olmasını veya Vercel dağıtımını doğrulamaz. Bu adımlar README’de açıklanır. Sosyal paylaşım botları için istemci tarafından güncellenen metaların sınırı da README’de belirtilir.

Ekran görüntüleri `artifacts/` altında bulunur: masaüstü, mobil, koyu görünüm, tema ekranı ve blok düzenleyici.
