import DiffMatchPatch from 'diff-match-patch';

export type DiffRegionType = 'added' | 'removed' | 'changed';

export interface DiffRegion {
  id: string;
  type: DiffRegionType;
  fromPos: number;
  toPos: number;
  oldText: string;
  newText: string;
}

/**
 * FNV-1a hash for stable, deterministic IDs.
 */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Compute line-level diff regions between two strings.
 * Returns an empty array when before === after.
 */
export function computeDiffRegions(before: string, after: string): DiffRegion[] {
  if (before === after) {
    return [];
  }

  const dmp = new DiffMatchPatch();

  // Line-level diffing
  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(before, after);
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_charsToLines_(diffs, lineArray);

  const regions: DiffRegion[] = [];

  // Track character position in `after` text as we walk diffs
  let posInAfter = 0;
  // Track character position in `before` text for removed regions
  let posInBefore = 0;

  // Occurrence counters for stable IDs
  const occurrenceCounts: Record<string, number> = {};

  let i = 0;
  while (i < diffs.length) {
    const [op, text] = diffs[i];

    if (op === DiffMatchPatch.DIFF_EQUAL) {
      posInAfter += text.length;
      posInBefore += text.length;
      i++;
    } else if (op === DiffMatchPatch.DIFF_DELETE) {
      const removedText = text;
      // Check if the next op is an INSERT (= changed)
      if (i + 1 < diffs.length && diffs[i + 1][0] === DiffMatchPatch.DIFF_INSERT) {
        const addedText = diffs[i + 1][1];
        const fromPos = posInAfter;
        const toPos = posInAfter + addedText.length;

        const key = `changed\x00${removedText}\x00${addedText}`;
        occurrenceCounts[key] = (occurrenceCounts[key] ?? 0) + 1;
        const id = fnv1a(key + '\x00' + occurrenceCounts[key]);

        regions.push({
          id,
          type: 'changed',
          fromPos,
          toPos,
          oldText: removedText,
          newText: addedText,
        });

        posInAfter += addedText.length;
        posInBefore += removedText.length;
        i += 2; // skip the INSERT we consumed
      } else {
        // Pure removal — widget at current position in after
        const fromPos = posInAfter;
        const toPos = posInAfter; // zero-width widget

        const key = `removed\x00${removedText}\x00`;
        occurrenceCounts[key] = (occurrenceCounts[key] ?? 0) + 1;
        const id = fnv1a(key + '\x00' + occurrenceCounts[key]);

        regions.push({
          id,
          type: 'removed',
          fromPos,
          toPos,
          oldText: removedText,
          newText: '',
        });

        posInBefore += removedText.length;
        i++;
      }
    } else if (op === DiffMatchPatch.DIFF_INSERT) {
      const addedText = text;
      const fromPos = posInAfter;
      const toPos = posInAfter + addedText.length;

      const key = `added\x00\x00${addedText}`;
      occurrenceCounts[key] = (occurrenceCounts[key] ?? 0) + 1;
      const id = fnv1a(key + '\x00' + occurrenceCounts[key]);

      regions.push({
        id,
        type: 'added',
        fromPos,
        toPos,
        oldText: '',
        newText: addedText,
      });

      posInAfter += addedText.length;
      i++;
    }
  }

  return regions;
}
