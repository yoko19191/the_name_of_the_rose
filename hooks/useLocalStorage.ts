'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const storedValueRef = useRef<T>(storedValue);

  // 保持 ref 同步
  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
        storedValueRef.current = parsed;
      }
    } catch (error) {
      console.error('读取 localStorage 失败:', error);
    }
    setIsLoaded(true);
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
      setStoredValue(valueToStore);
      storedValueRef.current = valueToStore;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('写入 localStorage 失败:', error);
    }
  }, [key]);

  return [storedValue, setValue, isLoaded] as const;
}
