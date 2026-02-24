import { describe, it, expect } from 'vitest';
import { formatDuration, getBestThumbnail, getSquareThumbnail } from '../format.js';

describe('formatDuration', () => {
  it('returns empty string for null/undefined/NaN/zero/negative', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(NaN)).toBe('');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(-5)).toBe('');
  });

  it('formats seconds < 60', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(3.5)).toBe('0:03');
    expect(formatDuration(61)).toBe('1:01');
  });
});

describe('getBestThumbnail', () => {
  it('returns empty string for null/empty', () => {
    expect(getBestThumbnail(null)).toBe('');
    expect(getBestThumbnail([])).toBe('');
  });

  it('returns the highest-width thumbnail', () => {
    const thumbnails = [
      { url: 'small.jpg', width: 100 },
      { url: 'large.jpg', width: 500 },
      { url: 'medium.jpg', width: 300 }
    ];
    expect(getBestThumbnail(thumbnails)).toBe('large.jpg');
  });

  it('handles thumbnails without width', () => {
    const thumbnails = [{ url: 'a.jpg' }, { url: 'b.jpg', width: 200 }];
    expect(getBestThumbnail(thumbnails)).toBe('b.jpg');
  });
});

describe('getSquareThumbnail', () => {
  it('returns empty string for empty thumbnails', () => {
    expect(getSquareThumbnail([])).toBe('');
  });

  it('replaces Google URL params with square dimensions', () => {
    const thumbnails = [
      { url: 'https://lh3.googleusercontent.com/img=w120-h90-stuff', width: 120 }
    ];
    expect(getSquareThumbnail(thumbnails)).toBe(
      'https://lh3.googleusercontent.com/img=w226-h226-l90-rj'
    );
  });

  it('supports custom size parameter', () => {
    const thumbnails = [
      { url: 'https://lh3.googleusercontent.com/img=w120-h90-stuff', width: 120 }
    ];
    expect(getSquareThumbnail(thumbnails, 400)).toBe(
      'https://lh3.googleusercontent.com/img=w400-h400-l90-rj'
    );
  });

  it('passes through non-Google URLs unchanged', () => {
    const thumbnails = [{ url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg', width: 480 }];
    expect(getSquareThumbnail(thumbnails)).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });
});
