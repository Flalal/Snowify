import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../retry.js';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');
    const result = await withRetry(fn, { delays: [0] });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { maxRetries: 2, delays: [0] })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calls onError with error and attempt index', async () => {
    const onError = vi.fn();
    const err = new Error('boom');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { maxRetries: 3, delays: [0, 0], onError })).rejects.toThrow();
    expect(onError).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(err, 0);
    expect(onError).toHaveBeenCalledWith(err, 1);
    expect(onError).toHaveBeenCalledWith(err, 2);
  });

  it('works without onError callback', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    const result = await withRetry(fn, { delays: [0] });
    expect(result).toBe('ok');
  });

  it('passes attempt number to fn', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    await withRetry(fn, { delays: [0] });
    expect(fn).toHaveBeenNthCalledWith(1, 0);
    expect(fn).toHaveBeenNthCalledWith(2, 1);
  });

  it('falls back to last delay when attempts exceed delays array length', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, delays: [10] });
    // After first failure, delay is delays[0] = 10
    await vi.advanceTimersByTimeAsync(10);
    // After second failure, delay is delays[0] (last in array) = 10
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;
    expect(result).toBe('ok');
    vi.useRealTimers();
  });
});
