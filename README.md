# 🎫 Gelişmiş Ticket Bot - By Akuyage

Discord sunucuları için gelişmiş, Türkçe bir ticket (destek talebi) botu.
Kategori seçimli panel, SLA uyarıları, transkript, değerlendirme, geri bildirim, dahili notlar, embed/panel oluşturucu, yedekleme sistemi ve daha fazlasını içerir.

## ✨ Özellikler

- 🎫 Kategori seçimli ticket paneli (`panelgonder`)
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

Kanal ve rol ID'lerini yapılandırmak için `config` ve `cfg-duzenle` komutları da kullanılabilir.

## 🗂️ Komutlar

### Genel

| Komut | Açıklama |
| --- | --- |
| `/yardim` | Tüm komutları ve kullanımı gösterir |
| `/panelgonder` | Ticket panelini belirtilen kanala gönderir |
| `/gecmis <kullanici>` | Kullanıcının ticket geçmişini gösterir |
| `/istatistik` | Personel performans istatistiklerini gösterir |
| `/sistemistatistik` | Sistemin genel istatistiklerini gösterir |

### Yönetici

| Komut | Açıklama |
| --- | --- |
| `/kur` | Botu kurar; kategori ve log kanallarını hazırlar |
| `/kaldir` | Ticket sisteminin kurulumunu ve kanallarını kaldırır |
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

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

https://discord.gg/kK8Gdqk88a

*Powered by akuyage*
