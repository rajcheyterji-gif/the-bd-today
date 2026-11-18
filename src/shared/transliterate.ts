// Roman (Latin-letter) Bengali -> Bengali script, best-effort Avro-style
// phonetic transliteration, plus a loose Roman normaliser for slug matching.
//
// Why two helpers? Readers usually type Bengali in Latin letters
// ("Bisshokap", "Padma Setu", "cricket"), and a Bengali LIKE search finds
// nothing for those. A Latin search therefore tries three forms:
//   1. the query as typed (matches English words in titles),
//   2. its Bengali transliteration (matches Bengali titles when the Roman
//      spelling is close to the phonetic spelling, e.g. "Padma Setu" ->
//      "পদ্মা সেতু"),
//   3. its loose Roman form against article slugs (matches even when the
//      Roman spelling is loose — "Bisshokap" still finds the "bishwokap"
//      slug, because doubled letters and h/w are ignored on both sides).
// No single form covers every spelling; together they cover the common ones.

export function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

// Longest-match units first: trigraphs, then digraphs, then single letters.
const TRIGRAPHS: Record<string, string> = {
  kkh: "ক্ষ",
};

const DIGRAPHS: Record<string, string> = {
  kh: "খ",
  gh: "ঘ",
  ch: "ছ",
  jh: "ঝ",
  th: "থ",
  dh: "ধ",
  ph: "ফ",
  bh: "ভ",
  sh: "শ",
  ng: "ঙ",
  ny: "ঞ",
  rr: "ড়",
  rh: "ঢ়",
};

const CONSONANTS: Record<string, string> = {
  k: "ক",
  g: "গ",
  c: "চ",
  j: "জ",
  t: "ত",
  d: "দ",
  n: "ন",
  p: "প",
  f: "ফ",
  b: "ব",
  v: "ভ",
  m: "ম",
  r: "র",
  l: "ল",
  w: "ব",
  s: "স",
  h: "হ",
  y: "য",
};

const VOWELS: Record<string, { standalone: string; kar: string }> = {
  aa: { standalone: "আ", kar: "া" },
  ii: { standalone: "ঈ", kar: "ী" },
  uu: { standalone: "ঊ", kar: "ূ" },
  ou: { standalone: "ঔ", kar: "ৌ" },
  oi: { standalone: "ঐ", kar: "ৈ" },
  au: { standalone: "ঔ", kar: "ৌ" },
  a: { standalone: "আ", kar: "া" },
  i: { standalone: "ই", kar: "ি" },
  u: { standalone: "উ", kar: "ু" },
  e: { standalone: "এ", kar: "ে" },
  o: { standalone: "ও", kar: "ো" },
};

// Avro-style retroflex capitals.
const RETROFLEX: Record<string, string> = { T: "ট", D: "ড", N: "ণ" };
const RETROFLEX_DIGRAPHS: Record<string, string> = { Th: "ঠ", Dh: "ঢ" };

function peekUnit(input: string, i: number): { kind: "vowel" | "consonant" | "other"; len: number; isNg: boolean } {
  if (i >= input.length) return { kind: "other", len: 0, isNg: false };
  const ch = input[i];
  if (!/[A-Za-z]/.test(ch)) return { kind: "other", len: 1, isNg: false };
  const two = input.slice(i, i + 2);
  const three = input.slice(i, i + 3).toLowerCase();
  if (RETROFLEX_DIGRAPHS[two] || RETROFLEX[ch] || TRIGRAPHS[three] || DIGRAPHS[two.toLowerCase()]) {
    return { kind: "consonant", len: RETROFLEX_DIGRAPHS[two] || RETROFLEX[ch] ? (RETROFLEX_DIGRAPHS[two] ? 2 : 1) : TRIGRAPHS[three] ? 3 : 2, isNg: two.toLowerCase() === "ng" };
  }
  const lowerTwo = two.toLowerCase();
  if (VOWELS[lowerTwo]) return { kind: "vowel", len: 2, isNg: false };
  if (VOWELS[ch.toLowerCase()]) return { kind: "vowel", len: 1, isNg: false };
  return { kind: "consonant", len: 1, isNg: false };
}

function peekIsVowel(input: string, i: number): boolean {
  return peekUnit(input, i).kind === "vowel";
}

export function romanToBengali(input: string): string {
  let out = "";
  // Last unit was a bare consonant (its inherent অ is still pending).
  let afterConsonant = false;
  // The last consonant was emitted with a hasant: "fola" when it is a
  // w/y/r fola (শ্ব, ক্র, ত্য), "plain" for any other conjunct member.
  let lastJoinKind: "fola" | "plain" | null = null;
  // A letter has been emitted in the current word.
  let inWord = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (!/[A-Za-z]/.test(ch)) {
      out += ch;
      afterConsonant = false;
      lastJoinKind = null;
      inWord = false;
      i += 1;
      continue;
    }
    const two = input.slice(i, i + 2);
    const three = input.slice(i, i + 3).toLowerCase();
    let unit: string | null = null;
    let len = 0;
    if (RETROFLEX_DIGRAPHS[two]) {
      unit = RETROFLEX_DIGRAPHS[two];
      len = 2;
    } else if (RETROFLEX[ch]) {
      unit = RETROFLEX[ch];
      len = 1;
    } else if (TRIGRAPHS[three]) {
      unit = TRIGRAPHS[three];
      len = 3;
    } else if (DIGRAPHS[two.toLowerCase()]) {
      unit = DIGRAPHS[two.toLowerCase()];
      len = 2;
    }
    if (unit !== null) {
      if (unit === "ঙ") {
        // "ng" before a consonant or at the end of a word is the anusvara
        // (বাংলা, বাংলাদেশ, রং) — not a bare ঙ.
        if (!peekIsVowel(input, i + len)) {
          out += "ং";
          afterConsonant = false;
          lastJoinKind = null;
          inWord = true;
          i += len;
          continue;
        }
      }
      const joined = afterConsonant;
      if (joined) out += "্";
      out += unit;
      afterConsonant = true;
      lastJoinKind = joined ? "plain" : null;
      inWord = true;
      i += len;
      continue;
    }
    const lowerTwo = two.toLowerCase();
    if (VOWELS[lowerTwo] || VOWELS[ch.toLowerCase()]) {
      const v = VOWELS[lowerTwo] ?? VOWELS[ch.toLowerCase()];
      const vLen = VOWELS[lowerTwo] ? 2 : 1;
      const key = VOWELS[lowerTwo] ? lowerTwo : ch.toLowerCase();
      // Rule 1: 'a' is the inherent vowel — drop it when it sits before a
      // consonant cluster ("padma" -> পদ্মা, not পাদ্মা). The consonant
      // keeps its inherent অ, so the next consonant starts fresh. "ng"
      // does not count as a cluster consonant: it becomes the anusvara
      // ("bangladesh" -> বাংলাদেশ, not বংলাদেশ).
      if (key === "a" && afterConsonant) {
        const n1 = peekUnit(input, i + vLen);
        const n2 = peekUnit(input, i + vLen + n1.len);
        if (n1.kind === "consonant" && !n1.isNg && n2.kind === "consonant") {
          afterConsonant = false;
          lastJoinKind = null;
          i += vLen;
          continue;
        }
      }
      // Rule 2: 'o' after a conjunct member is the inherent vowel of that
      // member, not a written ো — when the member is a w/y/r fola
      // ("bishwokap" -> বিশ্বকাপ), or at the end of the word
      // ("shwopno" -> স্বপ্ন, "shobdo" -> শব্দ). A plain conjunct member
      // mid-word keeps its ো ("Bisshokap" -> বিস্শোকাপ).
      if (key === "o" && afterConsonant && lastJoinKind !== null) {
        const atWordEnd = i + vLen >= input.length || !/[A-Za-z]/.test(input[i + vLen] ?? "");
        if (lastJoinKind === "fola" || atWordEnd) {
          afterConsonant = false;
          lastJoinKind = null;
          i += vLen;
          continue;
        }
      }
      out += afterConsonant ? v.kar : v.standalone;
      afterConsonant = false;
      lastJoinKind = null;
      inWord = true;
      i += vLen;
      continue;
    }
    const lowerOne = ch.toLowerCase();
    if (CONSONANTS[lowerOne]) {
      if (lowerOne === "y" && !afterConsonant && inWord) {
        // "y" after a vowel is য় (জয়, ভয়) — not য.
        out += "য়";
        afterConsonant = false;
        lastJoinKind = null;
      } else {
        const joined = afterConsonant;
        if (joined) out += "্";
        out += CONSONANTS[lowerOne];
        afterConsonant = true;
        // w/y/r are folas: they always join the preceding consonant.
        lastJoinKind = joined ? (lowerOne === "w" || lowerOne === "y" || lowerOne === "r" ? "fola" : "plain") : null;
      }
      inWord = true;
      i += 1;
      continue;
    }
    // Unknown letter (q, x, z…): copy it through unchanged.
    out += ch;
    afterConsonant = false;
    lastJoinKind = null;
    inWord = true;
    i += 1;
  }
  return out;
}

/** Loose Roman skeleton: lowercase, drop h/w, collapse doubled letters,
 *  drop everything that is not a letter or digit. Applied to BOTH the query
 *  and the slug, so loose spellings still match. */
export function looseRoman(input: string): string {
  return input
    .toLowerCase()
    .replace(/[hw]/g, "")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}
