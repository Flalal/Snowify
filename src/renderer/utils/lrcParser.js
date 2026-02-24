/**
 * Parse LRC format lyrics into timestamped lines.
 * @param {string} lrcText - Raw LRC text
 * @returns {Array<{time: number, text: string}>} Sorted lines
 */
export function parseLRC(lrcText) {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;
  lrcText.split('\n').forEach((line) => {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      let ms = parseInt(match[3]);
      if (match[3].length === 2) ms *= 10;
      const time = min * 60 + sec + ms / 1000;
      const text = match[4].trim();
      if (text) lines.push({ time, text });
    }
  });
  return lines.sort((a, b) => a.time - b.time);
}
