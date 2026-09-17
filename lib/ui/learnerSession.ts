'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'rihla_learner_id';
const EVENT_NAME = 'rihla-learner-change';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT_NAME, callback);
  };
}

function getSnapshot() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

function getServerSnapshot() {
  return '';
}

export function useStoredLearnerId() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getStoredLearnerId() {
  return getSnapshot();
}

export function storeLearnerId(learnerId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, learnerId);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function clearStoredLearnerId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT_NAME));
}
