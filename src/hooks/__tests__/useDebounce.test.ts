import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces changes', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } },
    );
    rerender({ value: 'world' });
    expect(result.current).toBe('hello');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('world');
  });

  it('uses latest value when multiple changes happen quickly', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    rerender({ value: 'c' });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('c');
  });
});
