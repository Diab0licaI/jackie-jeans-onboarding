
export type QuestionType =
  | "dropdown"
  | "single-select"
  | "multi-select"
  | "number-optional"
  | "brand-size-followup";

export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizQuestion {
  id: string; // stable key used to store the answer
  order: number;
  question: string; // shown in manual flow
  voicePrompt: string; // spoken version - slightly more conversational
  type: QuestionType;
  options?: QuizOption[];
  unit?: string; // e.g. `"` for inches
  optional?: boolean;
  dependsOn?: string; // id of question this depends on (for Q9 -> Q8)
}

// Helper to generate a numeric range of dropdown options, e.g. 24-52 inches
function range(start: number, end: number, suffix = ""): QuizOption[] {
  const opts: QuizOption[] = [];
  for (let i = start; i <= end; i++) {
    opts.push({ label: `${i}${suffix}`, value: String(i) });
  }
  return opts;
}

// Heights as feet'inches" - 4'10" to 6'2"
function heightRange(): QuizOption[] {
  const opts: QuizOption[] = [];
  for (let feet = 4; feet <= 6; feet++) {
    const startIn = feet === 4 ? 10 : 0;
    const endIn = feet === 6 ? 2 : 11;
    for (let inch = startIn; inch <= endIn; inch++) {
      const label = `${feet}'${inch}"`;
      opts.push({ label, value: label });
    }
  }
  return opts;
}

export const DENIM_BRANDS: string[] = [
  "Levi's",
  "Wrangler",
  "Lee",
  "Diesel",
  "Calvin Klein",
  "Tommy Hilfiger",
  "Zara",
  "H&M",
  "Uniqlo",
  "American Eagle",
  "Gap",
  "Pepe Jeans",
  "Spykar",
  "Flying Machine",
  "Numero Uno",
  "Mufti",
  "Killer Jeans",
  "Jack & Jones",
  "Only",
  "Other",
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "height",
    order: 1,
    question: "What is your height?",
    voicePrompt: "What's your height?",
    type: "dropdown",
    options: heightRange(),
  },
  {
    id: "weight",
    order: 2,
    question: "What is your weight? (optional)",
    voicePrompt:
      "And if you don't mind sharing, what's your weight? Totally fine to skip this one.",
    type: "number-optional",
    unit: "kg",
    optional: true,
  },
  {
    id: "waist",
    order: 3,
    question: "Waist measurement in inches (narrowest point)",
    voicePrompt: "What's your waist measurement, in inches, at the narrowest point?",
    type: "dropdown",
    options: range(24, 52, '"'),
  },
  {
    id: "hip",
    order: 4,
    question: "Hip measurement in inches (fullest point)",
    voicePrompt: "And your hip measurement in inches, at the fullest point?",
    type: "dropdown",
    options: range(32, 60, '"'),
  },
  {
    id: "waistFit",
    order: 5,
    question: "How do you like jeans to fit at the waist?",
    voicePrompt: "How do you like your jeans to fit at the waist - snug, slightly relaxed, or relaxed?",
    type: "single-select",
    options: [
      { label: "Snug", value: "snug" },
      { label: "Slightly relaxed", value: "slightly-relaxed" },
      { label: "Relaxed", value: "relaxed" },
    ],
  },
  {
    id: "rise",
    order: 6,
    question: "Where should the waistband sit?",
    voicePrompt: "Where do you like the waistband to sit - high rise, mid rise, or low rise?",
    type: "single-select",
    options: [
      { label: "High rise", value: "high-rise" },
      { label: "Mid rise", value: "mid-rise" },
      { label: "Low rise", value: "low-rise" },
    ],
  },
  {
    id: "thighFit",
    order: 7,
    question: "How should jeans fit through the thighs?",
    voicePrompt: "And through the thighs - fitted, relaxed, or loose?",
    type: "single-select",
    options: [
      { label: "Fitted", value: "fitted" },
      { label: "Relaxed", value: "relaxed" },
      { label: "Loose", value: "loose" },
    ],
  },
  {
    id: "brands",
    order: 8,
    question: "Which denim brands have you bought before?",
    voicePrompt: "Which denim brands have you bought before? You can name a few.",
    type: "multi-select",
    options: DENIM_BRANDS.map((b) => ({ label: b, value: b })),
  },
  {
    id: "brandSizes",
    order: 9,
    question: "What size did you buy in those brands?",
    voicePrompt: "What size do you usually wear in each of those?",
    type: "brand-size-followup",
    dependsOn: "brands",
  },
  {
    id: "frustration",
    order: 10,
    question: "Biggest fit frustration when buying jeans?",
    voicePrompt: "Last one - what's your biggest frustration when buying jeans?",
    type: "single-select",
    options: [
      { label: "Waist gap", value: "waist-gap" },
      { label: "Hip tightness", value: "hip-tightness" },
      { label: "Wrong length", value: "wrong-length" },
      { label: "Thigh fit", value: "thigh-fit" },
      { label: "Rise", value: "rise" },
      { label: "Other", value: "other" },
    ],
  },
];

// Type for the answers object collected across the quiz.
export interface QuizAnswers {
  height?: string;
  weight?: number | null; // null = explicitly skipped
  waist?: string;
  hip?: string;
  waistFit?: string;
  rise?: string;
  thighFit?: string;
  brands?: string[];
  brandSizes?: Record<string, string>; // { "Levi's": "32", "Zara": "30" }
  frustration?: string;
}

export const TOTAL_STEPS = QUIZ_QUESTIONS.length;