
import { QuizQuestion, QuizOption, DENIM_BRANDS } from "./quiz-data";

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
};

const TENS = ["twenty", "thirty", "forty", "fifty", "sixty"];
const ONES = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
];


export function extractNumber(text: string): number | null {
  const cleaned = text.toLowerCase().trim();
  const digitMatch = cleaned.match(/\d+(\.\d+)?/);
  if (digitMatch) {
    return Math.round(parseFloat(digitMatch[0]));
  }


  const words = cleaned.replace(/-/g, " ").split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (TENS.includes(word)) {
      const tensValue = NUMBER_WORDS[word];
      const next = words[i + 1];
      if (next && ONES.includes(next)) {
        return tensValue + NUMBER_WORDS[next];
      }
      return tensValue;
    }
    if (word in NUMBER_WORDS) {
      return NUMBER_WORDS[word];
    }
  }

  return null;
}

export function parseHeight(text: string): string | null {
  const cleaned = text.toLowerCase().trim();
  const symbolMatch = cleaned.match(/(\d)\s*['']\s*(\d{1,2})/);
  if (symbolMatch) {
    const feet = parseInt(symbolMatch[1], 10);
    const inches = parseInt(symbolMatch[2], 10);
    if (feet >= 4 && feet <= 6 && inches >= 0 && inches <= 11) {
      return `${feet}'${inches}"`;
    }
  }

  const wordMatch = cleaned.match(
    /(\w+)\s*(?:foot|feet|ft)\s*(\w+)?(?:\s*inch(?:es)?)?/
  );
  if (wordMatch) {
    const feetWord = wordMatch[1];
    const inchWord = wordMatch[2];
    const feet = NUMBER_WORDS[feetWord] ?? parseInt(feetWord, 10);
    let inches = 0;
    if (inchWord) {
      inches = NUMBER_WORDS[inchWord] ?? parseInt(inchWord, 10) ?? 0;
    }
    if (!isNaN(feet) && feet >= 4 && feet <= 6 && inches >= 0 && inches <= 11) {
      return `${feet}'${inches}"`;
    }
  }

  const twoNumMatch = cleaned.match(
    /^(\w+|\d)\s+(\w+|\d{1,2})(?:\s+inch(?:es)?)?$/
  );
  if (twoNumMatch) {
    const feetRaw = twoNumMatch[1];
    const inchRaw = twoNumMatch[2];
    const feet   = NUMBER_WORDS[feetRaw]  ?? parseInt(feetRaw,  10);
    const inches = NUMBER_WORDS[inchRaw]  ?? parseInt(inchRaw,  10);
    if (!isNaN(feet) && !isNaN(inches) && feet >= 4 && feet <= 6 && inches >= 0 && inches <= 11) {
      return `${feet}'${inches}"`;
    }
  }

  const bareMatch = cleaned.match(/^(four|five|six|seven|eight|nine|ten|eleven|\d{1,2})$/);
  if (bareMatch) {
    const inches = NUMBER_WORDS[bareMatch[1]] ?? parseInt(bareMatch[1], 10);
    if (!isNaN(inches) && inches >= 0 && inches <= 11) {
      return `5'${inches}"`;
    }
  }

  return null;
}

export function fuzzyMatchOption(
  text: string,
  options: QuizOption[]
): QuizOption | null {
  const cleaned = text.toLowerCase().trim();

  for (const opt of options) {
    const label = opt.label.toLowerCase();
    if (cleaned.includes(label) || label.includes(cleaned)) {
      return opt;
    }
  }

  const cleanedWords = new Set(cleaned.split(/\s+/));
  let best: { opt: QuizOption; score: number } | null = null;

  for (const opt of options) {
    const labelWords = opt.label.toLowerCase().split(/\s+/);
    const overlap = labelWords.filter((w) => cleanedWords.has(w)).length;
    if (overlap > 0 && (!best || overlap > best.score)) {
      best = { opt, score: overlap };
    }
  }

  return best?.opt ?? null;
}

export function extractBrands(text: string): string[] {
  const cleaned = text.toLowerCase();
  const found: string[] = [];

  for (const brand of DENIM_BRANDS) {
    if (brand === "Other") continue;
    const brandLower = brand.toLowerCase().replace(/['']/g, "");
    const textNormalized = cleaned.replace(/['']/g, "");
    if (textNormalized.includes(brandLower)) {
      found.push(brand);
    }
  }

  if (
    found.length === 0 &&
    /\b(none|never|nothing|first time|no brands?)\b/.test(cleaned)
  ) {
    return [];
  }

  return found;
}

export function isSkipIntent(text: string): boolean {
  const cleaned = text.toLowerCase();
  return /\b(skip|pass|prefer not|rather not|no thanks|don'?t want to say|next question)\b/.test(
    cleaned
  );
}


export function parseAnswerForQuestion(
  question: QuizQuestion,
  rawText: string
): unknown {
  const text = rawText.trim();
  if (!text) return null;

  if (question.optional && isSkipIntent(text)) {
    return null; 
  }

  switch (question.id) {
    case "height":
      return parseHeight(text);

    case "weight": {
      const num = extractNumber(text);
      return num !== null && num > 0 && num < 400 ? num : null;
    }

    case "waist":
    case "hip": {
      const num = extractNumber(text);
      if (num === null) return null;
      const opt = question.options?.find((o) => o.value === String(num));
      return opt ? opt.value : null;
    }

    case "brands":
      return extractBrands(text);

    case "frustration":
    case "waistFit":
    case "rise":
    case "thighFit": {
      const match = fuzzyMatchOption(text, question.options ?? []);
      return match?.value ?? null;
    }

    default:
      return null;
  }
}