export const CATEGORY_NAMES = {
  cat_general: 'Genel Destek',
  cat_technical: 'Teknik Destek',
  cat_payment: 'Ödeme & Fatura'
};

export function getCategoryName(categoryId) {
  return CATEGORY_NAMES[categoryId] || categoryId || 'Ticket';
}