import { Dispatch, SetStateAction, useEffect, useState } from "react";

function checkLocalStorage<T>(
  key: string,
  defaultValue: T,
  deserialize: (value: string) => T
): T {
  const value = window.localStorage.getItem(key);
  if (value == null) {
    return defaultValue;
  }
  return deserialize(value);
}

export default function useStateLocalStorage<T>(
  key: string,
  defaultValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (value: string) => T = JSON.parse
): [state: T, setState: Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() =>
    checkLocalStorage(key, defaultValue, deserialize)
  );

  useEffect(() => {
    window.localStorage.setItem(key, serialize(state));
  }, [key, state]);

  return [state, setState];
}
