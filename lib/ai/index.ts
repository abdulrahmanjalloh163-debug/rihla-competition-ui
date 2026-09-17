import { anthropicProvider } from './providers/anthropic';
import { localProvider } from './providers/local';
import type { LLMProvider, StructuredCallInput } from './provider';

/**
 * Claude is the primary provider.
 *
 * If Anthropic is unavailable because the account has no credits,
 * Rihla automatically falls back to the free local V1 analyzer.
 *
 * This allows the complete prototype pipeline to be tested without
 * requiring paid API credits.
 */
export const llmProvider: LLMProvider = {
  async callStructured(input: StructuredCallInput): Promise<unknown> {
    try {
      return await anthropicProvider.callStructured(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.warn(
        `Anthropic unavailable. Using local Rihla fallback. Reason: ${message}`
      );

      return localProvider.callStructured(input);
    }
  },
};