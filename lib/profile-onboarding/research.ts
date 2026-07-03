import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, INTERVIEW_MODEL } from "@/lib/interview/anthropic";
import type { ResearchResult } from "./types";

const MAX_SOURCES = 6;

const RESEARCH_SYSTEM_PROMPT = `You research a company's public web presence on behalf of an admin who works there and is filling out a profile of their own company. Given a company name and/or website, search the web and write a concise summary, no more than 4-5 sentences, covering what the company appears to sell, who they seem to target (industry, company size, roles), and any positioning or differentiation signals you can find.

If you can't find meaningful public information (the company is too small, private, ambiguous to identify confidently, or the input given isn't enough to search on), say so in one plain sentence rather than guessing or inventing details.

Respond with only the summary, nothing else. No headers, no markdown formatting, no source list, no preamble.`;

export async function researchCompany(companyInput: string): Promise<ResearchResult> {
  const anthropic = getAnthropicClient();

  const completion = await anthropic.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 1024,
    system: RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Research this company: ${companyInput}` }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
  });

  const summary = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();

  const sources: ResearchResult["sources"] = [];
  for (const block of completion.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result" && sources.length < MAX_SOURCES) {
          sources.push({ url: result.url, title: result.title });
        }
      }
    }
  }

  return { summary, sources };
}
