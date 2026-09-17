// Generic structured-output LLM interface. Concrete providers (e.g.
// lib/ai/providers/anthropic.ts) implement this so the rest of the
// app never talks to a vendor SDK directly (spec §26: "Do not
// hard-wire the entire application to one provider").

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StructuredCallInput {
  systemPrompt: string;
  userPrompt: string;
  tool: ToolDefinition;
}

export interface LLMProvider {
  /**
   * Calls the model and forces it to respond via the given tool,
   * returning the raw (untrusted) tool-call input. Callers MUST
   * validate this with the matching Zod schema before using it —
   * this function does not validate.
   */
  callStructured(input: StructuredCallInput): Promise<unknown>;
}
