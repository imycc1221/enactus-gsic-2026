/**
 * claude.js
 * Thin wrapper around the Anthropic SDK.
 * Uses tool_choice to guarantee structured JSON output — no JSON.parse fragility.
 *
 * All heavy prompting lives in prompts.js.
 * All caching logic lives in cache.js.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * Core call wrapper. Forces a specific tool call and returns its input object.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} toolSchema  - { name, description, input_schema }
 * @returns {Promise<object>}  - The tool's input — already a parsed JS object
 */
/**
 * Streaming variant — calls Claude with tool_choice forced, emitting input_json_delta
 * chunks to onDelta(text) as they arrive. Returns the final parsed tool input.
 * @param {string}   systemPrompt
 * @param {string}   userPrompt
 * @param {object}   toolSchema
 * @param {function} onDelta  - called with each partial_json string
 * @returns {Promise<object>}
 */
export async function callWithToolStream(systemPrompt, userPrompt, toolSchema, onDelta) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [toolSchema],
    tool_choice: { type: 'tool', name: toolSchema.name },
    messages: [{ role: 'user', content: userPrompt }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
      onDelta(event.delta.partial_json ?? '');
    }
  }

  const finalMessage = await stream.finalMessage();
  const toolUse = finalMessage.content.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error(`No tool_use block for ${toolSchema.name}`);
  return toolUse.input;
}

export async function callWithTool(systemPrompt, userPrompt, toolSchema) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [toolSchema],
    tool_choice: { type: 'tool', name: toolSchema.name },
    messages: [{ role: 'user', content: userPrompt }]
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error(`Claude did not return a tool_use block for tool: ${toolSchema.name}`);
  }

  return toolUse.input;
}
