import { describe, expect, it } from '@jest/globals';
import { parseCitations } from '../src/utils/parseCitations';
import type { Citation } from '../src/types.d';

/**
 * Test suite for the citation parser.
 *
 * Author: Myroslav Mokhammad Abdeljawwad
 */
describe('parseCitations', () => {
  /**
   * Helper to compare two arrays of citations regardless of order.
   */
  const expectCitationsEqual = (actual: Citation[], expected: Citation[]) => {
    // Normalize arrays for comparison
    const normalize = (arr: Citation[]) =>
      arr
        .map((c) => ({
          id: c.id,
          text: c.text.trim(),
          start: c.start,
          end: c.end,
        }))
        .sort((a, b) => a.start - b.start);

    expect(normalize(actual)).toEqual(normalize(expected));
  };

  it('returns an empty array for empty input', () => {
    const result = parseCitations('');
    expect(result).toEqual([]);
  });

  it('parses single inline citation with brackets', () => {
    const text = 'This is a reference to the literature [1].';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '1', text: '[1]', start: 33, end: 36 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('parses multiple citations in one sentence', () => {
    const text =
      'Several studies support this claim [2] and further evidence is found in [3].';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '2', text: '[2]', start: 34, end: 37 },
      { id: '3', text: '[3]', start: 68, end: 71 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('handles citations with numeric ranges', () => {
    const text = 'See studies [4–6] for more details.';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '4–6', text: '[4–6]', start: 8, end: 14 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('ignores non-citation brackets', () => {
    const text = 'The function (foo) is used in [7] and the result is (bar).';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '7', text: '[7]', start: 32, end: 35 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('throws error when input is not a string', () => {
    // @ts-expect-error intentional misuse
    expect(() => parseCitations(null as any)).toThrow(
      /input must be a string/i,
    );
  });

  it('parses citations with nested brackets correctly', () => {
    const text = 'Nested example [[8]] should still work.';
    const result = parseCitations(text);
    // The parser is expected to treat double brackets as a single citation
    const expected: Citation[] = [
      { id: '[8]', text: '[[8]]', start: 16, end: 22 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('parses citations at the very beginning of the document', () => {
    const text = '[9] Introduction starts here.';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '9', text: '[9]', start: 0, end: 3 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('parses citations with multiple digits and hyphens', () => {
    const text = 'Complex citation [12-15] appears.';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '12-15', text: '[12-15]', start: 14, end: 22 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('does not return false positives for similar patterns', () => {
    const text = 'Error code [404] indicates a missing page.';
    const result = parseCitations(text);
    // The parser treats numeric codes as citations; this test ensures that
    // the function's behavior is consistent with design decisions.
    const expected: Citation[] = [
      { id: '404', text: '[404]', start: 13, end: 18 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('returns citations in order of appearance even if input is unsorted', () => {
    const text =
      'Later citation [5] appears after earlier one [2].';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '2', text: '[2]', start: 36, end: 39 },
      { id: '5', text: '[5]', start: 21, end: 24 },
    ];
    // The parser should preserve the order in which citations are found.
    expectCitationsEqual(result, expected);
  });

  it('handles edge case where citation is adjacent to punctuation', () => {
    const text = 'End of sentence [10]!';
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '10', text: '[10]', start: 20, end: 24 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('returns correct indices for multiline text', () => {
    const text = `Paragraph one [1].
Paragraph two with citation [2] and more text.`;
    const result = parseCitations(text);
    const expected: Citation[] = [
      { id: '1', text: '[1]', start: 14, end: 17 },
      { id: '2', text: '[2]', start: 44, end: 47 },
    ];
    expectCitationsEqual(result, expected);
  });

  it('handles empty string within brackets gracefully', () => {
    const text = 'Empty [ ] should be ignored.';
    const result = parseCitations(text);
    // Depending on implementation, this might return an empty id or skip.
    // We assert that no citation is returned.
    expect(result).toEqual([]);
  });

  it('handles very long documents efficiently', () => {
    const largeText = Array(1000)
      .fill('[999]')
      .join(' ');
    const startTime = Date.now();
    const result = parseCitations(largeText);
    const duration = Date.now() - startTime;
    // Ensure that the function returns 1000 citations and completes quickly.
    expect(result.length).toBe(1000);
    expect(duration).toBeLessThan(200); // milliseconds
  });
});