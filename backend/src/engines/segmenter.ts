export interface TextSegment {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Splits text into paragraphs, then splits paragraphs into sentences.
 * Preserves exact indices of sentences relative to the original text.
 */
export function segmentText(content: string): TextSegment[] {
  if (!content) return [];

  const segments: TextSegment[] = [];
  const textLength = content.length;
  let start = 0;

  const abbreviations = ['eg', 'ie', 'vs', 'mr', 'mrs', 'dr', 'prof', 'inc', 'ltd', 'co'];

  for (let i = 0; i < textLength; i++) {
    const char = content[i];
    if (char === '.' || char === '!' || char === '?') {
      const nextChar = content[i + 1];
      
      // A sentence boundary is a punctuation followed by whitespace or the end of the string
      if (!nextChar || /\s/.test(nextChar)) {
        
        // Retrieve the word just before this punctuation
        const textBefore = content.substring(start, i);
        const lastWordMatch = textBefore.match(/(\b\w+)$/);
        const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';
        
        // If the preceding word is an abbreviation, do not split
        if (abbreviations.includes(lastWord)) {
          continue;
        }

        const segmentTextRaw = content.substring(start, i + 1);
        const trimmed = segmentTextRaw.trim();
        
        if (trimmed.length > 2) {
          const leadingWhitespaceLen = segmentTextRaw.length - segmentTextRaw.trimStart().length;
          const actualStart = start + leadingWhitespaceLen;
          const actualEnd = actualStart + trimmed.length;
          
          segments.push({
            text: trimmed,
            startIndex: actualStart,
            endIndex: actualEnd
          });
        }

        // Fast-forward past any trailing whitespace
        let nextStart = i + 1;
        while (nextStart < textLength && /\s/.test(content[nextStart])) {
          nextStart++;
        }
        start = nextStart;
        i = nextStart - 1; // Sync loop pointer
      }
    }
  }

  // Capture any remaining text
  if (start < textLength) {
    const segmentTextRaw = content.substring(start);
    const trimmed = segmentTextRaw.trim();
    if (trimmed.length > 2) {
      const leadingWhitespaceLen = segmentTextRaw.length - segmentTextRaw.trimStart().length;
      segments.push({
        text: trimmed,
        startIndex: start + leadingWhitespaceLen,
        endIndex: start + leadingWhitespaceLen + trimmed.length
      });
    }
  }

  return segments;
}
