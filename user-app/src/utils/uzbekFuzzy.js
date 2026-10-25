/**
 * Normalizes Uzbek apostrophes and specific characters
 * Handles variations: o‘, o', o’, g‘, g', g’, sh, ch
 */
export function normalizeUzbekText(text) {
  if (!text) return '';
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

/**
 * Checks if input matches target with 1-character typo tolerance
 */
export function isUzbekMatch(input, target) {
  const normInput = normalizeUzbekText(input);
  const normTarget = normalizeUzbekText(target);

  if (normInput === normTarget) return true;
  // If target is very short (<= 3 chars), allow exact match only
  if (normTarget.length <= 3) return normInput === normTarget;
  // Levenshtein distance <= 1 allowed for longer words
  return levenshteinDistance(normInput, normTarget) <= 1;
}
