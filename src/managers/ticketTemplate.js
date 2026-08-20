import { MessageFlags } from 'discord.js';
import { config } from '../utils/configLoader.js';

export function textDisplay(content) {
  return {
    type: 10,
    content: content
  };
}

export function separator(divider = true, spacing = 1) {
  return {
    type: 14,
    divider: divider,
    spacing: spacing
  };
}

export function container(components, accentColor) {
  const containerObj = {
    type: 17,
    components: components
  };
  if (accentColor) {
    const hex = String(accentColor).replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      containerObj.accent_color = parseInt(hex, 16);
    }
  }
  return containerObj;
}

export function footerDisplay() {
  return textDisplay('-# Powered by akuyage');
}

export function createPanelMessage() {
  const panelText = [
    '## 🎫 Destek & İletişim Merkezi',
    'Yardıma mı ihtiyacınız var? Aşağıdaki menüden ilgili kategoriyi seçerek hemen bir destek talebi oluşturabilirsiniz.',
    '',
    '### 📌 Bilgilendirme:',
    '• Gereksiz yere talep açmak işlem kısıtlamasına yol açabilir.',
    '• Talebinizi açtıktan sonra lütfen yetkili ekibimizin yanıtını sabırla bekleyiniz.',
    '• Talebinizle ilgili tüm detayları eksiksiz iletmeniz çözümü hızlandıracaktır.',
    '',
    '### 📁 Mevcut Kategoriler',
    '**❓ Genel Destek**',
    '↳ Genel sorular, öneriler ve bilgi talepleri.',
    '',
    '**💻 Teknik Destek**',
    '↳ Hata bildirimleri, teknik problemler ve kurulum yardımı.',
    '',
    '**💳 Ödeme & Fatura**',
    '↳ Satın alımlar, ödeme bildirimleri ve fatura işlemleri.'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(panelText),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'select_ticket_category',
              placeholder: 'Lütfen bir destek kategorisi seçin...',
              options: [
                {
                  label: 'Genel Destek',
                  value: 'cat_general',
                  description: 'Genel sorular, öneriler ve bilgi talepleri.',
                  emoji: { name: '❓' }
                },
                {
                  label: 'Teknik Destek',
                  value: 'cat_technical',
                  description: 'Hata bildirimleri, teknik problemler ve kurulum yardımı.',
                  emoji: { name: '💻' }
                },
                {
                  label: 'Ödeme & Fatura',
                  value: 'cat_payment',
                  description: 'Satın alımlar, ödeme bildirimleri ve fatura işlemleri.',
                  emoji: { name: '💳' }
                },
                {
                  label: 'Seçimi Sıfırla',
                  value: 'cat_reset',
                  description: 'Seçiminizi sıfırlamak için tıklayın.',
                  emoji: { name: '🔄' }
                }
              ]
            }
          ]
        },
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function createTicketChannelMessage(ticket, categoryName, answers = {}) {
  const answerLines = Object.entries(answers)
    .map(([key, val]) => `**${key}:** ${val}`)
    .join('\n');

  const contentLines = [
    `## 🎫 Ticket #${ticket.ticketId} — ${categoryName}`,
    `**Oluşturan:** <@${ticket.userId}>`,
    `**Öncelik:** \`${(ticket.priority || 'normal').toUpperCase()}\``,
    `**Durum:** \`${(ticket.status || 'open').toUpperCase()}\``,
    ticket.claimedBy ? `**Üstlenen:** <@${ticket.claimedBy}>` : '**Üstlenen:** *Henüz üstlenilmedi*'
  ];

  if (answerLines) {
    contentLines.push('\n### 📋 Başvuru Detayları\n' + answerLines);
  }

  contentLines.push('\nLütfen sorununuzu detaylıca açıklayın. Yetkili ekibimiz en kısa sürede sizinle ilgilenecektir.');

  if (config.staffRoleId) {
    contentLines.push(`\n<@&${config.staffRoleId}>`);
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(contentLines.join('\n')),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              custom_id: `btn_claim_${ticket.ticketId}`,
              label: '📌 Üstlen',
              disabled: !!ticket.claimedBy
            },
            {
              type: 2,
              style: 3,
              custom_id: `btn_unclaim_${ticket.ticketId}`,
              label: '📤 Bırak',
              disabled: !ticket.claimedBy
            },
            {
              type: 2,
              style: 4,
              custom_id: `btn_close_${ticket.ticketId}`,
              label: '🔒 Kapat'
            },
            {
              type: 2,
              style: 1,
              custom_id: `btn_call_user_${ticket.ticketId}`,
              label: '📣 Kullanıcıyı Çağır'
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              custom_id: `btn_note_add_${ticket.ticketId}`,
              label: '📝 Not Ekle'
            },
            {
              type: 2,
              style: 4,
              custom_id: `btn_note_remove_${ticket.ticketId}`,
              label: '🗑️ Not Kaldır'
            },
            {
              type: 2,
              style: 1,
              custom_id: `btn_note_view_${ticket.ticketId}`,
              label: '👁️ Notları Gör'
            }
          ]
        },
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function createLogMessage(title, fields = [], colorEmoji = 'ℹ️', buttons = []) {
  const fieldsContent = fields.map(f => `**${f.name}:** ${f.value}`).join('\n');
  const body = `### ${colorEmoji} ${title}\n\n${fieldsContent}`;

  const innerComponents = [
    textDisplay(body),
    separator(true, 1)
  ];

  if (buttons.length > 0) {
    innerComponents.push({ type: 1, components: buttons });
  }

  innerComponents.push(footerDisplay());

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container(innerComponents)
    ]
  };
}

export function createRatingMessage(ticket, closeReason, disabled = false, feedbackEnabled = false) {
  const body = [
    `## 📩 Ticket #${ticket.ticketId} Kapatıldı`,
    `**Neden:** ${closeReason || 'Sebep belirtilmedi.'}`,
    `**Kapatan:** <@${ticket.closedBy}>`,
    disabled ? '\nDeğerlendirmeniz için teşekkürler!' : '\nHizmet kalitemizi artırmak için lütfen aldığınız desteği 1 ile 5 arasında puanlayın:'
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(body),
        separator(true, 1),
        {
          type: 1,
          components: [1, 2, 3, 4, 5].map(rating => ({
            type: 2,
            style: 2,
            custom_id: `btn_rate_${rating}_${ticket.ticketId}`,
            label: `⭐ ${rating}`,
            disabled: disabled
          }))
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              custom_id: `btn_feedback_${ticket.ticketId}`,
              label: feedbackEnabled ? '💬 Geri Bildirim Yap' : '🔒 Geri Bildirim Kapalı',
              disabled: !feedbackEnabled
            }
          ]
        },
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function createFeedbackPendingMessage(feedback, disabled = false) {
  const body = [
    '### 💬 Yeni Geri Bildirim (Onay Bekliyor)',
    `**Ticket:** #${feedback.ticketId}`,
    `**Kullanıcı:** <@${feedback.userId}> (${feedback.userId})`,
    '**İçerik:**',
    feedback.content
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(body),
        separator(true, 1),
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              custom_id: `btn_feedback_approve_${feedback.feedbackId}`,
              label: '✅ Onayla',
              disabled: disabled
            },
            {
              type: 2,
              style: 4,
              custom_id: `btn_feedback_reject_${feedback.feedbackId}`,
              label: '❌ Reddet',
              disabled: disabled
            }
          ]
        },
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}

export function createFeedbackApprovedMessage(feedback) {
  const body = [
    '### 💬 Geri Bildirim',
    '',
    `**Gönderen:** <@${feedback.userId}>`,
    '',
    feedback.content
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      container([
        textDisplay(body),
        separator(true, 1),
        footerDisplay()
      ])
    ]
  };
}
