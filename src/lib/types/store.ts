/**
 * Type definitions for Zustand stores
 * Provides proper typing for store creators and state setters
 */

import { StateCreator } from 'zustand';

/**
 * Generic type for Zustand state setter
 * @template T - The state type
 */
export type StateSetFn<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean | undefined
) => void;

/**
 * Generic type for Zustand state getter
 * @template T - The state type
 */
export type StateGetFn<T> = () => T;

/**
 * Store creator function type
 * @template T - The state type including actions
 */
export type StoreCreator<T> = StateCreator<T, [], [], T>;

/**
 * Extract state type from store
 * @template T - The store type
 */
export type ExtractState<T> = T extends StateCreator<infer S, any, any> ? S : never;