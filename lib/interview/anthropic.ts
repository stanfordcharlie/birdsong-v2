import Anthropic from "@anthropic-ai/sdk";

// The model driving both the live interview turns and the post-interview
// extraction pass.
export const INTERVIEW_MODEL = "claude-sonnet-5";

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}
