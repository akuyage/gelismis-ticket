# 🎫 Gelişmiş Ticket Bot - By Akuyage

Discord sunucuları için gelişmiş, Türkçe bir ticket (destek talebi) botu.
Kategori seçimli panel, SLA uyarıları, transkript, değerlendirme, geri bildirim, dahili notlar, embed/panel oluşturucu, yedekleme sistemi ve daha fazlasını içerir.

## ✨ Özellikler

- 🎫 Kategori seçimli ticket paneli (`panelgonder`) — görsel ekleme desteği
- 🛠️ Ticket kategorilerini tamamen özelleştirme (`panelozellestir`) — ekle / düzenle / sil / sıfırla
- 📌 Ticket üstlenme, bırakma ve yetkiliye devretme
- 🔒 Kapanışta otomatik HTML transkript + DM değerlendirme (1-5 ⭐)
- 💬 Geri bildirim sistemi (yetkili onayı ile yayınlama)
- 📝 Dahili not ekleme / silme / görüntüleme
- 🎚️ Öncelik derecesi (düşük / normal / yüksek / acil)
- ⛔ Kara liste yönetimi
- ⏰ SLA uyarı zamanlayıcısı
- 🛡️ Kapsamlı log kanalları
- 🧱 Embed / buton / select menü panel oluşturucu
- 💾 Otomatik / manuel veritabanı ve yapılandırma yedekleme
- 📊 Genel ve personel istatistikleri

## 📋 Gereksinimler

- [Node.js](https://nodejs.org) v18 veya üzeri (önerilen: LTS)
- Discord Developer Portal'da oluşturulmuş bir bot token'ı
- Botu sunucunuza davet edin ve şu izinleri verin:
  `Administrator` (veya en az: Kanal Yönet, Mesaj Yönet, Mesaj Gönder, Mesajları Sabitle, Rol Ver)

## 🚀 Kurulum

1. Projeyi indirin / klonlayın.
2. `.env.example` dosyasını `.env` olarak kopyalayın ve token'ınızı girin:
   ```env
   DISCORD_TOKEN=sizin_bot_tokeniniz
   ```
3. `config.example.json` dosyasını `config.json` olarak kopyalayın ve kanal/rol ID'lerini doldurun.
4. Bağımlılıkları kurun:
   ```
   npm install
   ```
5. Botu başlatın:
   ```
   npm start
   ```
   veya Windows'ta `start.bat` dosyasını çift tıklayın.

## ⚙️ Yapılandırma

`.env`:

| Değişken | Açıklama |
| --- | --- |
| `DISCORD_TOKEN` | Bot token'ı (gizli tutun!) |

`config.json`:

| Alan | Açıklama |
| --- | --- |
| `panelChannelId` | Ticket panelinin gönderileceği kanal |
| `logChannelId` | Genel log kanalı |
| `ticketCategoryId` | Ticket kanallarının açılacağı kategori |
| `noteLogChannelId` | Dahili not log kanalı |
| `transcriptChannelId` | Transkript dosyalarının saklandığı kanal |
| `feedbackSystemChannelId` | Onay bekleyen geri bildirimlerin geldiği kanal |
| `feedbackChannelId` | Onaylanan geri bildirimlerin yayınlandığı kanal |
| `scoreLogChannelId` | Değerlendirme (puan) log kanalı |
| `blacklistLogChannelId` | Kara liste log kanalı |
| `staffRoleId` | Yetkili personel rolü |
| `slaWarningTimeout` | SLA uyarı süresi (saniye) |
| `devGuildId` | Geliştirme sunucusu ID'si (isteğe bağlı) |
| `developers` | Geliştirici kullanıcı ID'leri |
| `status` | Botun durum mesajı |

Kanal ve rol ID'lerini yapılandırmak için `config` ve `cfg-duzenle` komutları da kullanılabilir. Ticket kategorileri (ad, açıklama, emoji, form başlığı/etiketi) ise `/panelozellestir` komutuyla yönetilir ve `TicketCategories` tablosunda saklanır.

## 🗂️ Komutlar

### Genel

| Komut | Açıklama |
| --- | --- |
| `/yardim` | Tüm komutları ve kullanımı gösterir |
| `/panelgonder` | Ticket panelini belirtilen kanala gönderir (`gorsel` ile görsel eklenebilir) |
| `/gecmis <kullanici>` | Kullanıcının ticket geçmişini gösterir |
| `/istatistik` | Personel performans istatistiklerini gösterir |
| `/sistemistatistik` | Sistemin genel istatistiklerini gösterir |

### Yönetici

| Komut | Açıklama |
| --- | --- |
| `/kur` | Botu kurar; kategori ve log kanallarını hazırlar |
| `/kaldir` | Ticket sisteminin kurulumunu ve kanallarını kaldırır |
| `/panelozellestir` | Ticket kategorilerini özelleştirir (`liste` / `ekle` / `duzenle` / `kaldir` / `sifirla`). Kategoriler veritabanında saklanır; ad, açıklama, emoji ve form başlığı/etiketi düzenlenebilir |
| `/config` | Konfigürasyonu görüntüler/düzenler |
| `/cfg-duzenle` | Rol ve kanal ayarlarını düzenler |
| `/blacklist` | Kara listeyi yönetir |
| `/devret <ticket> <yetkili>` | Ticket'ı başka yetkiliye devreder |
| `/oncelik <ticket> <derece>` | Ticket önceliğini değiştirir |
| `/embedolustur` | Yeni bir embed/panel oluşturur |
| `/embedduzenle` | Mevcut bir embed/paneli düzenler |
| `/embedgonder` | Bir embed/paneli kanala gönderir |
| `/embedlist` | Tüm embed/panelleri listeler |
| `/embedsil` | Bir embed/paneli siler |
| `/yedek` | Veritabanı ve yapılandırmayı yedekler |
| `/yedekgoster` | Yedekleri listeler |
| `/yedekyukle` | Bir yedeği geri yükler |
| `/yedeksil` | Bir yedeği siler |
| `/db-sil` | Veritabanındaki tüm verileri temizler (yalnızca geliştiriciler) |

## 📁 Proje Yapısı

```
src/
├── index.js                 # Bot giriş noktası
├── commands/                # Slash komutları (admin / general)
├── interactions/            # Buton, select menü, modal işleyicileri
├── events/                  # Discord olayları (interactionCreate, ready...)
├── managers/                # Ticket, embed, durum yönetimi ve mesaj şablonları
├── handlers/                # Komut / bileşen / olay yükleyicileri
├── utils/                   # Yardımcı araçlar (transkript, config, yedek...)
├── database/                # Veritabanı bağlantısı ve tablo kurulumu
└── tasks/                   # Zamanlanmış görevler (SLA uyarıları)
```

Veritabanı `data/` klasöründe tutulur ve bot açılışta otomatik oluşturulur. Yedekler `backups/` klasörüne kaydedilir.

## 🔒 Güvenlik Notları

- `.env` içindeki bot token'ı **asla** paylaşılmamalıdır.
- `config.json`, `data/`, `backups/` ve `.env` dosyaları `.gitignore` ile hariç tutulmuştur; yalnızca şablonları (`config.example.json`, `.env.example`) paylaşın.

## 📄 Lisans

Bu proje **Akuyage License (Source-Available)** ile lisanslanmıştır.

Bu lisans altında yazılımı kişisel veya ticari amaçlarla ücretsiz olarak kullanabilir, değiştirebilir, barındırabilir ve dağıtabilirsiniz. Ancak yazılımın kullanımı, paylaşımı veya türetilmesi durumunda aşağıdaki zorunlu atıf (attribution) şartlarına eksiksiz uyulması gerekmektedir:

1. **Discord Bot Profil Durumu:**
   `<Proje Adı> - akuyage` (Örn: `Ticket - akuyage`)
2. **Kaynak Kod Reposu:**
   README, `package.json` (`"author"` alanı) veya eşdeğer metadata dosyalarında orijinal yazar olarak **akuyage** adı korunmalıdır.
3. **Kamuya Açık Alanlar:**
   Dokümantasyon, web sitesi, destek sunucusu veya proje listelemelerinde görünür şekilde `"Originally created by akuyage"` (mümkünse [orijinal depoya](https://github.com/akuyage/gelismis-ticket) bağlantı verilerek) belirtilmelidir.

Ayrıntılı lisans şartları ve koşulları için [LICENSE](LICENSE) dosyasına bakınız.

Orijinal Depo: [https://github.com/akuyage/gelismis-ticket](https://github.com/akuyage/gelismis-ticket)  
Destek Sunucusu: https://discord.gg/kK8Gdqk88a

*Powered by akuyage*
