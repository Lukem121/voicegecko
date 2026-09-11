export type AccuracyPresetId =
  | 'easy'
  | 'clear'
  | 'standard'
  | 'hard'
  | 'expert';

export type AccuracyPreset = {
  id: AccuracyPresetId;
  label: string;
  hint: string;
  script: string;
};

export const ACCURACY_TEST_PRESETS: AccuracyPreset[] = [
  {
    id: 'easy',
    label: 'Easy',
    hint: 'Short everyday words',
    script: 'Please send the files to the team today.',
  },
  {
    id: 'clear',
    label: 'Clear',
    hint: 'One simple request',
    script:
      'Call Sarah after lunch and ask her to book a quiet room for Friday morning.',
  },
  {
    id: 'standard',
    label: 'Standard',
    hint: 'Names, times, and a brand',
    script:
      'The meeting with Sam Taylor is on Tuesday at three thirty. Please send thirty seven invoices to Acme and copy VoiceGecko on the email.',
  },
  {
    id: 'hard',
    label: 'Hard',
    hint: 'Near-homophones and numbers',
    script:
      'The quarterly review with Priya Chen is on Thursday at four fifteen. Please wire two thousand four hundred dollars to Northwind and copy VoiceGecko on the email. Confirm the street is Baker not Barker and spell the client as Smythe with a y.',
  },
  {
    id: 'expert',
    label: 'Expert',
    hint: 'Long, rare names, tech terms',
    script:
      "Please open ticket eight four two for Wojciech Kowalski and Siobhan O'Neill at Meridian Labs. The PostgreSQL dump failed after the OAuth token expired at twenty three fifty nine. Requeue the JSON payload and send a copy to legal at VoiceGecko. The invoice total is six thousand three hundred fifty and the SKU is tango seven niner. Do not confuse affect with effect or complement with compliment. The meeting is not on Wednesday but Thursday.",
  },
];

export const ACCURACY_TEST_SCRIPT =
  ACCURACY_TEST_PRESETS.find((preset) => preset.id === 'standard')?.script ??
  (ACCURACY_TEST_PRESETS.at(0)?.script ?? '');

export type AlignedWord = {
  id: string;
  kind: 'match' | 'substitution' | 'deletion' | 'insertion';
  expected: string | null;
  heard: string | null;
};

export type WhisperAccuracyResult = {
  accuracyPercent: number;
  werPercent: number;
  expectedWordCount: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  expectedWords: string[];
  heardWords: string[];
  alignment: AlignedWord[];
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replaceAll(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);

const cell = (grid: number[][], row: number, col: number): number =>
  grid.at(row)?.at(col) ?? 0;

const levenshteinOps = (
  expected: string[],
  heard: string[]
): {
  substitutions: number;
  deletions: number;
  insertions: number;
  alignment: AlignedWord[];
} => {
  const rows = expected.length + 1;
  const cols = heard.length + 1;
  const distance: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  for (let i = 0; i < rows; i += 1) {
    const row = distance.at(i);
    if (row) {
      row[0] = i;
    }
  }
  for (let j = 0; j < cols; j += 1) {
    const row = distance.at(0);
    if (row) {
      row[j] = j;
    }
  }

  for (let i = 1; i < rows; i += 1) {
    const row = distance.at(i);
    if (row) {
      for (let j = 1; j < cols; j += 1) {
        const cost = expected.at(i - 1) === heard.at(j - 1) ? 0 : 1;
        row[j] = Math.min(
          cell(distance, i - 1, j) + 1,
          cell(distance, i, j - 1) + 1,
          cell(distance, i - 1, j - 1) + cost
        );
      }
    }
  }

  const alignment: AlignedWord[] = [];
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  let i = expected.length;
  let j = heard.length;
  let step = 0;
  while (i > 0 || j > 0) {
    const current = cell(distance, i, j);
    const expectedWord = expected.at(i - 1) ?? null;
    const heardWord = heard.at(j - 1) ?? null;
    if (
      i > 0 &&
      j > 0 &&
      current === cell(distance, i - 1, j - 1) &&
      expectedWord === heardWord
    ) {
      alignment.push({
        id: `m-${i}-${j}-${step}`,
        kind: 'match',
        expected: expectedWord,
        heard: heardWord,
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && current === cell(distance, i - 1, j - 1) + 1) {
      substitutions += 1;
      alignment.push({
        id: `s-${i}-${j}-${step}`,
        kind: 'substitution',
        expected: expectedWord,
        heard: heardWord,
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && current === cell(distance, i - 1, j) + 1) {
      deletions += 1;
      alignment.push({
        id: `d-${i}-${j}-${step}`,
        kind: 'deletion',
        expected: expectedWord,
        heard: null,
      });
      i -= 1;
    } else if (j > 0) {
      insertions += 1;
      alignment.push({
        id: `i-${i}-${j}-${step}`,
        kind: 'insertion',
        expected: null,
        heard: heardWord,
      });
      j -= 1;
    } else if (i > 0) {
      deletions += 1;
      alignment.push({
        id: `d-${i}-${j}-${step}`,
        kind: 'deletion',
        expected: expectedWord,
        heard: null,
      });
      i -= 1;
    } else {
      break;
    }
    step += 1;
  }

  alignment.reverse();

  return { substitutions, deletions, insertions, alignment };
};

export const scoreWhisperAccuracy = (
  expectedText: string,
  heardText: string
): WhisperAccuracyResult => {
  const expectedWords = tokenize(expectedText);
  const heardWords = tokenize(heardText);
  const ops = levenshteinOps(expectedWords, heardWords);
  const errors = ops.substitutions + ops.deletions + ops.insertions;
  const wer = expectedWords.length === 0 ? 0 : errors / expectedWords.length;
  const accuracyPercent = Math.max(0, Math.round((1 - wer) * 100));

  return {
    accuracyPercent,
    werPercent: Math.round(wer * 100),
    expectedWordCount: expectedWords.length,
    substitutions: ops.substitutions,
    deletions: ops.deletions,
    insertions: ops.insertions,
    expectedWords,
    heardWords,
    alignment: ops.alignment,
  };
};

export const formatLatency = (ms: number): string => {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};

export const whisperProfileLabel = (id: string): string => {
  if (id === 'base.en') {
    return 'Fast';
  }
  if (id === 'small.en') {
    return 'Recommended';
  }
  if (id === 'large-v3-turbo') {
    return 'Best';
  }
  return id;
};
