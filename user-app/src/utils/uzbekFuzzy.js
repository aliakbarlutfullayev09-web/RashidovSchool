/**
 * Normalizes Uzbek apostrophes and specific characters
 * Handles variations: o‘, o', o’, g‘, g', g’, sh, ch
 */
export function normalizeUzbekText(text) {
  if (text === undefined || text === null) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[`'‘’ʼ]/g, "'") // Normalize all apostrophes to standard single quote
    .replace(/\s+/g, ' ');
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

const PURE_NUMBER_RE = /^-?\d+(?:[.,]\d+)?$/;
const PURE_LETTERS_RE = /^[a-zа-яёўқғҳ'\s]+$/i;

/**
 * Checks if student input matches the target answer.
 * - Numbers, answers containing any digit, or formulas/symbols require STRICT exact match
 *   (e.g. target "2500" rejects "250ф", "250", "2501"; decimal "." and "," are equivalent for pure numbers).
 * - Only long pure-word text answers (>= 6 letters, no digits) allow 1-character typo tolerance.
 */
export function isUzbekMatch(input, target) {
  const normInput = normalizeUzbekText(input);
  const normTarget = normalizeUzbekText(target);

  if (!normInput || !normTarget) return false;
  if (normInput === normTarget) return true;

  // Allow decimal comma/dot equivalence ONLY if both sides are strictly valid numbers
  if (PURE_NUMBER_RE.test(normTarget)) {
    if (!PURE_NUMBER_RE.test(normInput)) return false;
    return normInput.replace(',', '.') === normTarget.replace(',', '.');
  }

  // Reject any fuzzy matching if either side contains digits or non-letter symbols (e.g. 2500 vs 250ф)
  if (/\d/.test(normTarget) || /\d/.test(normInput)) {
    return false;
  }
  if (!PURE_LETTERS_RE.test(normTarget) || !PURE_LETTERS_RE.test(normInput)) {
    return false;
  }

  // Short words require exact match
  if (normTarget.length < 6) {
    return false;
  }

  // Gentle 1-character typo tolerance only for long alphabetic words
  return levenshteinDistance(normInput, normTarget) <= 1;
}
