import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/resume/route";
import { CLOSING_MESSAGE } from "@/lib/interview-prompt";

// The route's two collaborators: the service-role Supabase client and the
// rate limiter. Both are mocked at the module boundary so these tests
// exercise the real authorization, sanitizing, and response shaping.
const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  select: vi.fn(),
  isRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (columns: string) => {
        mocks.select(columns);
        return { eq: () => ({ maybeSingle: mocks.maybeSingle }) };
      },
    }),
  }),
}));

vi.mock("@/lib/interview/rate-limit", () => ({
  resumeRateLimiter: null,
  getClientIp: () => "203.0.113.7",
  isRateLimited: mocks.isRateLimited,
}));

const TOKEN = "a".repeat(64);
const RESPONSE_ID = "33333333-3333-3333-3333-333333333333";

function post(body: unknown): Request {
  return new Request("http://localhost/api/interview/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A row shaped like the real one, including the internal columns that must
// never reach a respondent's browser.
function row(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: RESPONSE_ID,
      completed: false,
      session_token: TOKEN,
      messages: [
        { role: "assistant", content: "How does dispatch work today?" },
        { role: "user", content: "Two people on radios." },
        { role: "assistant", content: "What breaks first when it gets busy?" },
      ],
      ...overrides,
    },
    error: null,
  };
}

beforeEach(() => {
  mocks.maybeSingle.mockReset();
  mocks.select.mockReset();
  mocks.isRateLimited.mockReset();
  mocks.isRateLimited.mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/interview/resume", () => {
  it("returns the transcript for a valid token on an unfinished interview", async () => {
    mocks.maybeSingle.mockResolvedValue(row());

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.complete).toBe(false);
    expect(body.messages).toEqual([
      { role: "assistant", content: "How does dispatch work today?" },
      { role: "user", content: "Two people on radios." },
      { role: "assistant", content: "What breaks first when it gets busy?" },
    ]);
  });

  it("narrows the select to the four columns it needs", async () => {
    mocks.maybeSingle.mockResolvedValue(row());

    await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));

    expect(mocks.select).toHaveBeenCalledWith("id, completed, messages, session_token");
  });

  it("returns only role and content per message, even when the row carries internal fields", async () => {
    mocks.maybeSingle.mockResolvedValue(
      row({
        messages: [
          {
            role: "assistant",
            content: "How does dispatch work today?",
            lead_score: 9,
            fit_reason: "Runs the workflow this product replaces",
            call_script: { opener: "You mentioned two dispatchers" },
            signals: { economic_buyer: "VP Ops" },
          },
        ],
      })
    );

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));
    const body = await res.json();

    expect(body.messages).toEqual([{ role: "assistant", content: "How does dispatch work today?" }]);
    expect(Object.keys(body.messages[0])).toEqual(["role", "content"]);
    // Nothing anywhere in the payload names an internal field or the token.
    const serialized = JSON.stringify(body);
    for (const leak of ["lead_score", "fit_reason", "call_script", "signals", "session_token", TOKEN]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("returns complete with a closing message for a finished interview", async () => {
    mocks.maybeSingle.mockResolvedValue(row({ completed: true }));

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ complete: true, message: CLOSING_MESSAGE });
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("does not return the transcript alongside a completed interview", async () => {
    mocks.maybeSingle.mockResolvedValue(row({ completed: true }));

    const body = await (await POST(post({ response_id: RESPONSE_ID, token: TOKEN }))).json();

    expect(body.messages).toBeUndefined();
  });

  // A wrong token and a missing row must be indistinguishable, or the route
  // becomes an oracle for which response ids exist.
  it("returns the same generic 404 for a bad token and a missing response", async () => {
    mocks.maybeSingle.mockResolvedValue(row());
    const badToken = await POST(post({ response_id: RESPONSE_ID, token: "b".repeat(64) }));
    const badTokenBody = await badToken.json();

    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const missing = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));
    const missingBody = await missing.json();

    expect(badToken.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(badTokenBody).toEqual(missingBody);
    expect(badTokenBody.error).toBe("This interview session is no longer available.");
    expect(JSON.stringify(badTokenBody)).not.toContain("token");
  });

  it("rejects a missing token the same way", async () => {
    mocks.maybeSingle.mockResolvedValue(row());

    const res = await POST(post({ response_id: RESPONSE_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "This interview session is no longer available." });
  });

  it("rejects a row that never had a session token", async () => {
    mocks.maybeSingle.mockResolvedValue(row({ session_token: null }));

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));

    expect(res.status).toBe(404);
  });

  it("returns the generic 404 when there is no interviewer turn to resume into", async () => {
    mocks.maybeSingle.mockResolvedValue(row({ messages: [{ role: "user", content: "hello?" }] }));

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "This interview session is no longer available." });
  });

  it("requires a response_id", async () => {
    const res = await POST(post({ token: TOKEN }));

    expect(res.status).toBe(400);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("rejects a malformed body", async () => {
    const res = await POST(
      new Request("http://localhost/api/interview/resume", { method: "POST", body: "{oops" })
    );

    expect(res.status).toBe(400);
  });

  it("rate limits before touching the database", async () => {
    mocks.isRateLimited.mockResolvedValue(true);

    const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));

    expect(res.status).toBe(429);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  // Chips are stripped before the transcript is persisted, so a resumed
  // question comes back without quick replies. Pinned so a future change to
  // what gets stored is a deliberate decision, not a silent regression.
  describe("chips", () => {
    it("returns an empty array for a normally stored question", async () => {
      mocks.maybeSingle.mockResolvedValue(row());

      const body = await (await POST(post({ response_id: RESPONSE_ID, token: TOKEN }))).json();

      expect(body.chips).toEqual([]);
    });

    it("recovers chips through the existing parser if a raw block was ever stored", async () => {
      mocks.maybeSingle.mockResolvedValue(
        row({
          messages: [
            {
              role: "assistant",
              content: "What breaks first?||CHIPS: Scheduling | Dispatch | Billing||",
            },
          ],
        })
      );

      const body = await (await POST(post({ response_id: RESPONSE_ID, token: TOKEN }))).json();

      expect(body.chips).toEqual(["Scheduling", "Dispatch", "Billing"]);
    });

    it("strips a stored raw chip block out of the returned question", async () => {
      mocks.maybeSingle.mockResolvedValue(
        row({
          messages: [
            { role: "assistant", content: "First question" },
            { role: "user", content: "An answer" },
            {
              role: "assistant",
              content: "What breaks first?||CHIPS: Scheduling | Dispatch | Billing||",
            },
          ],
        })
      );

      const body = await (await POST(post({ response_id: RESPONSE_ID, token: TOKEN }))).json();

      expect(body.messages.at(-1)).toEqual({ role: "assistant", content: "What breaks first?" });
      expect(JSON.stringify(body.messages)).not.toContain("CHIPS");
      // Earlier turns are untouched.
      expect(body.messages[0]).toEqual({ role: "assistant", content: "First question" });
    });

    it("returns the generic 404 when the stored question was nothing but a chip block", async () => {
      mocks.maybeSingle.mockResolvedValue(
        row({ messages: [{ role: "assistant", content: "||CHIPS: a | b||" }] })
      );

      const res = await POST(post({ response_id: RESPONSE_ID, token: TOKEN }));

      expect(res.status).toBe(404);
    });
  });
});
