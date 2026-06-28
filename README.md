# Jackie Jeans — Smart Fit Onboarding

An AI-powered denim fit onboarding experience built for the Jackie Jeans internship hackathon challenge. Two flows, one goal: find your perfect fit.

## Features

### Manual Onboarding
- Mobile-first, one question at a time
- 10-question Fit Quiz with validation
- Handles text, number, single-select, multi-select, and brand-size inputs
- Progress bar with smooth transitions

### Voice Onboarding
- Fully voice-to-voice conversational quiz
- Built on the Web Speech API — no API keys, no cost
- Live transcript captions while you speak
- Smart parser handles natural speech ("five foot six", "thirty two inches", "snug I guess")
- Graceful retry on unclear answers, auto-skips after 2 failed attempts
- Works in Chrome, Edge, and Safari

## Tech Stack

- **Next.js 16** (App Router, webpack mode)
- **TypeScript**
- **Tailwind CSS v4**
- **Web Speech API** — SpeechRecognition (STT) + speechSynthesis (TTS)
- Deployed on **Vercel**

## Design

Denim-inspired palette — deep indigo `#1b2a4a`, thread-gold `#c8954b`, warm cream `#faf8f4`. Manrope for headings, Inter for body, with a signature stitch-line dashed divider motif throughout.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** The app uses `--webpack` flag due to Next.js 16 Turbopack compatibility. This is already set in `package.json`.

## Project Structure

```
app/
  page.tsx                  # Landing page — choose Manual or Voice
  manual/page.tsx           # Manual onboarding flow
  voice/page.tsx            # Voice onboarding flow
components/
  manual/
    ProgressBar.tsx         # Step progress bar
    QuestionRenderer.tsx    # Renders all 5 input types
lib/
  quiz-data.ts              # Single source of truth — all 10 questions
  use-speech.ts             # Web Speech API hook (STT + TTS)
  speech-types.d.ts         # TypeScript ambient declarations for Speech API
  voice-parser.ts           # Parses spoken answers into valid quiz values
  use-conversation-engine.ts # Voice flow state machine
```

## The Fit Quiz

10 questions collected across both flows:

| # | Question | Type |
|---|----------|------|
| 1 | Height | Text (parsed from speech) |
| 2 | Weight | Number (optional) |
| 3 | Waist measurement | Number |
| 4 | Hip measurement | Number |
| 5 | Waist fit preference | Single select |
| 6 | Rise preference | Single select |
| 7 | Thigh fit | Single select |
| 8 | Denim brands you wear | Multi select |
| 9 | Size per brand | Brand-size followup |
| 10 | Biggest fit frustration | Single select |

## Voice Flow Architecture

```
intro → asking → listening → confirming → [next question]
                     ↓
                 clarifying → listening (1 retry)
                     ↓
              skip & move on (after 2 failures)
```

## Browser Support

Voice onboarding requires the Web Speech API:
- ✅ Chrome
- ✅ Edge  
- ✅ Safari
- ❌ Firefox (falls back to manual gracefully)
