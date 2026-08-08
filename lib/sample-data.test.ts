import { describe, it, expect } from "vitest";
import { SAMPLE_RESPONSES } from "./sample-data";
import { parseCallScript, isPairedPoint } from "./interview/call-script";

// The seeded fixture is what a new account sees first, so it has to hold the
// same rule the extraction prompt holds the model to: a talking point's
// `said` is the respondent's own words, not a tidied-up paraphrase. That is
// easy to break by hand (capitalizing a mid-sentence word is enough), and a
// fixture that quietly stops quoting real lines would be demoing something
// the product does not actually do.
describe("SAMPLE_RESPONSES call scripts", () => {
  const withScripts = SAMPLE_RESPONSES.filter((r) => r.call_script !== null);

  it("covers every seeded response that has a script", () => {
    expect(withScripts.length).toBeGreaterThan(0);
  });

  for (const response of withScripts) {
    describe(response.respondent_name, () => {
      const respondentTurns = response.messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");

      it("quotes only the respondent's own turns, verbatim", () => {
        for (const point of response.call_script!.talking_points) {
          expect(respondentTurns, `"${point.said}" is not a verbatim respondent line`).toContain(
            point.said
          );
        }
      });

      it("gives every point an angle that is not just the quote again", () => {
        for (const point of response.call_script!.talking_points) {
          expect(point.angle.trim().length).toBeGreaterThan(0);
          expect(point.angle).not.toBe(point.said);
        }
      });

      it("parses through the shared reader as fully paired points", () => {
        const parsed = parseCallScript(response.call_script);
        expect(parsed).not.toBeNull();
        expect(parsed!.talkingPoints.length).toBe(response.call_script!.talking_points.length);
        expect(parsed!.talkingPoints.every(isPairedPoint)).toBe(true);
      });
    });
  }
});
