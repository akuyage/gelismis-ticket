import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { container, textDisplay, separator, footerDisplay } from '../../managers/ticketTemplate.js';

export default {
  data: new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('Ticket sistemi komutlarını ve kullanım bilgilerini görüntüler.'),
  async execute(interaction) {
    const helpContent = [
      '## 📖 Ticket Sistemi Komut Rehberi',
      '',
      '### ⚙️ Yönetici Komutları',
      '• `/kur` — Ticket kategorisi ve otomatik log kanallarını kurar.',
      '• `/panelgonder` — Ticket panelini istediğiniz kanala gönderir (görsel eklenebilir).',
      '• `/panelozellestir` — Ticket kategorilerini ekler/düzenler/siler.',
      '• `/kaldir` — Ticket panelini ve bot ayarlarını kaldırır.',
      '• `/config` — Bot yapılandırma ayarlarını görüntüler ve düzenler.',
      '• `/blacklist` — Ticket açma kara listesini yönetir (ekle/kaldır/liste).',
      '• `/yedek` — Veritabanını ve yapılandırmayı yedekler.',
      '• `/yedekgoster` — Alınmış yedekleri listeler.',
      '• `/yedekyukle` — Alınmış bir yedeği geri yükler (veritabani/config).',
      '• `/yedeksil` — Alınmış bir yedeği siler.',
      '• `/cfg-duzenle` — Config.json içindeki rol ve kanal ayarlarını düzenler.',
      '• `/db-sil` — Veritabanındaki tüm verileri temizler (sadece geliştiriciler).',
      '• `/embedolustur` — Yeni bir embed/panel oluşturur.',
      '• `/embedduzenle` — Oluşturulmuş bir embed/paneli düzenler.',
      '• `/embedlist` — Oluşturulmuş embed/panelleri listeler.',
      '• `/embedgonder` — Oluşturulmuş bir embed/paneli kanala gönderir.',
      '• `/embedsil` — Oluşturulmuş bir embed/paneli siler.',
      '',
      '### 🛠️ Yetkili Komutları',
      '• `/oncelik` — Açık ticket kanalının öncelik derecesini (Düşük, Normal, Yüksek, Acil) değiştirir.',
      '• `/devret` — Açık ticketı başka bir yetkiliye devreder.',
      '• `/istatistik` — Yetkili personellerin performans ve değerlendirme istatistiklerini görüntüler.',
      '• `/sistemistatistik` — Ticket sisteminin genel kullanım istatistiklerini gösterir.',
      '',
      '### 📊 Genel Komutlar',
      '• `/gecmis` — Kullanıcının ticket geçmişini görüntüler.',
      '• `/yardim` — Bu yardım menüsünü görüntüler.'
    ].join('\n');

    const payload = {
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [
        container([
          textDisplay(helpContent),
          separator(true, 1),
          footerDisplay()
        ])
      ]
    };

    await interaction.reply(payload);
  }
};
