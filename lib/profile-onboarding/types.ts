export type OnboardingMessage = {
  role: "user" | "assistant";
  content: string;
};

export type EnrichmentSource = {
  url: string;
  title: string;
};

export type ResearchResult = {
  summary: string;
  sources: EnrichmentSource[];
};
