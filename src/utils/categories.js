import { getCategoryName as dbGetCategoryName, FALLBACK_NAMES } from '../managers/categoryManager.js';

export const CATEGORY_NAMES = FALLBACK_NAMES;

export function getCategoryName(categoryId) {
  return dbGetCategoryName(categoryId);
}