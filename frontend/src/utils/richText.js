/**
 * richText.js
 * Processes AI-generated paragraph text for better readability:
 *  1. Replaces overused em-dashes (—) with natural punctuation
 *  2. Splits long text into 2-3 readable paragraphs at topic boundaries
 *  3. Highlights key terms — currencies, %, regulatory frameworks, article numbers
 *
 * Usage: <div dangerouslySetInnerHTML={{ __html: richText(str) }} />
 * Safe: content is from our own trusted Claude API, not user input.
 */

// Topic-change keywords that should start a new paragraph when the
// current paragraph already has ≥2 sentences.
const TOPIC_STARTERS = /^(CSRD|CSDDD|SFDR|EUDR|LkSG|SBTi|EU Taxonomy|France|Despite|However|Although|Note that|For LPs|Nordic|LP|In addition|Furthermore|Additionally|The company|Upgrading|We recommend|Priority|This fund|Scope [123])/;

function splitIntoParagraphs(text) {
  // Only split text that is long enough to benefit from it
  if (text.length < 220) return [text];

  // Split on sentence boundaries (period/! followed by space + capital)
  // Uses a lookahead so the delimiter stays attached to the sentence it ends.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);

  if (sentences.length <= 2) return [text];

  const paragraphs = [];
  let current = [];

  for (const s of sentences) {
    const startsNewTopic = TOPIC_STARTERS.test(s.trim());

    // Flush the current paragraph if:
    //  a) we already have ≥2 sentences AND this sentence begins a new topic, OR
    //  b) we have ≥4 sentences regardless (hard cap to avoid walls of text)
    if ((current.length >= 2 && startsNewTopic) || current.length >= 4) {
      paragraphs.push(current.join(' '));
      current = [s];
    } else {
      current.push(s);
    }
  }

  if (current.length) paragraphs.push(current.join(' '));

  return paragraphs;
}

function applyHighlights(s) {
  // Regulatory frameworks  →  soft cyan
  s = s.replace(
    /\b(CSRD|CSDDD|SFDR 2\.0|SFDR|EUDR|LkSG|SBTi|EU Taxonomy|RE100|ESRS [A-Z]\d[\d-]*|GRI \d+|ISSB|TCFD|EDCI)\b/g,
    '<strong style="color:#73dfe7;font-weight:600">$1</strong>'
  );

  // SFDR Article numbers  →  purple
  s = s.replace(
    /\b(Article [6-9]|Article 8\+?)\b/g,
    '<strong style="color:#bea1ff;font-weight:700">$1</strong>'
  );

  // Scope 1/2/3  →  cyan
  s = s.replace(
    /\b(Scope [123](?:\+[123])*)\b/g,
    '<strong style="color:#73dfe7;font-weight:600">$1</strong>'
  );

  // Currency amounts (€100M, £4.2B, $500K, €0.14-0.16/kWh ranges)
  s = s.replace(
    /([€£\$])(\d[\d,.]*)(?:([-–]\d[\d,.]*))?(\/[a-zA-Z]+)?(\s*[BKMT](?:n|illion|illions|housand)?)?/g,
    '<strong style="color:#e8e8ff;font-weight:700">$1$2$3$4$5</strong>'
  );

  // Percentages  →  light purple
  s = s.replace(
    /(\d+(?:\.\d+)?%)/g,
    '<strong style="color:#bea1ff;font-weight:600">$1</strong>'
  );

  // Time targets / deadlines like "24 months", "FY2027", "Q4 2025", "Dec 2026"
  s = s.replace(
    /\b(FY\d{4}|Q[1-4]\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d+\s+(?:months?|years?))\b/g,
    '<em style="color:#9dcfff;font-style:normal;font-weight:500">$1</em>'
  );

  return s;
}

export function richText(text) {
  if (!text) return '';

  // ── Step 1: em-dash normalisation ──────────────────────────────────────────
  let s = text
    .replace(/ — ([A-Z])/g, '. $1')   // " — Capital" → ". Capital"
    .replace(/ — /g, ', ');             // " — lower"   → ", lower"

  // ── Step 2: paragraph splitting ────────────────────────────────────────────
  const paragraphs = splitIntoParagraphs(s);

  // ── Step 3: highlight each paragraph, then join with spacing ───────────────
  if (paragraphs.length === 1) {
    return applyHighlights(paragraphs[0]);
  }

  return paragraphs
    .map(p => `<p style="margin:0 0 0.65rem 0;line-height:inherit">${applyHighlights(p)}</p>`)
    .join('');
}
