import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, StructuredCallInput } from '../provider';

const MODEL = 'claude-sonnet-4-6';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your environment before calling the AI provider.'
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Claude provider implementation of the generic LLMProvider interface.
 *
 * Uses forced tool-use (tool_choice: {type: 'tool', name: ...}) rather
 * than prompting "return JSON only", since Claude does not have a
 * guaranteed JSON-mode like some other providers. Forcing a single
 * tool call with a JSON-schema input is the reliable way to get
 * schema-shaped output back, which is then re-validated with Zod by
 * the caller before it reaches the adaptive engine or the database.
 */
export const anthropicProvider: LLMProvider = {
  async callStructured({ systemPrompt, userPrompt, tool }: StructuredCallInput) {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: tool.name },
    });

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUseBlock) {
      throw new Error(
        `Claude did not return a tool_use block for tool "${tool.name}". Stop reason: ${response.stop_reason}`
      );
    }

    return toolUseBlock.input;
  },
};
