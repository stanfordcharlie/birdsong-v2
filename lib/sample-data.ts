import type { InterviewMessage } from "@/lib/interview/types";

// Fixture content for the one-click demo dataset (POST /api/sample-data).
// Hardcoded on purpose: seeding must be instant, free, and deterministic —
// never a runtime Claude call. Every person, organization, and quote here
// is invented; none correspond to real companies or people.
//
// Shape rules the seeding route relies on:
// - The survey is created with status "draft" and is_sample: true, so it is
//   never publicly reachable and removal can target exactly these rows.
// - Every response is inserted with is_test: true, so nothing here ever
//   counts as a real lead, fires email, or skews stats.

export const SAMPLE_SURVEY = {
  title: "Sample: Parks & Rec Modernization",
  external_title: "How Parks & Recreation Teams Run Their Operations",
  topic:
    "How municipal parks and recreation departments handle program registration, scheduling, and payments today, and where their current tools fall short.",
  question_guide: `1. What software or systems the department currently uses for program registration and facility scheduling, and how long they've been on them.

2. Where staff time actually goes in a typical week — manual workarounds, spreadsheets, phone-based processes.

3. How payments and refunds are handled, especially for cancellations and waitlists.

4. What triggered any past attempts to switch systems, and what stopped them.

5. Who would be involved in a decision to change tooling, and what would matter most in choosing.`,
  tone: "warm, curious, and conversational",
  num_questions: 7,
  gift_card_amount: 25,
  custom_fields: ["job_title", "company"],
} as const;

type SampleResponse = {
  respondent_name: string;
  respondent_email: string;
  custom_field_values: { job_title: string; company: string };
  daysAgo: number;
  completed: boolean;
  lead_score: number | null;
  summary: string | null;
  fit_reason: string | null;
  pain_points: string[];
  call_script: { opener: string; talking_points: string[] } | null;
  signals: {
    economic_buyer: string | null;
    decision_criteria: string | null;
    decision_process: string | null;
    metrics: string | null;
    champion: string | null;
  } | null;
  messages: InterviewMessage[];
};

export const SAMPLE_RESPONSES: SampleResponse[] = [
  {
    respondent_name: "Dana Whitfield",
    respondent_email: "dana.whitfield@example.com",
    custom_field_values: { job_title: "Recreation Director", company: "Cedar Hollow Parks District" },
    daysAgo: 2,
    completed: true,
    lead_score: 9,
    summary:
      "Recreation director actively evaluating replacements for a 12-year-old registration system, with budget approved for next fiscal year and a painful spring registration behind her.",
    fit_reason:
      "Actively in the market with approved budget and pain that maps directly to registration and scheduling modernization.",
    pain_points: [
      "Spring registration crashed twice and staff processed 300 signups by hand",
      "Refunds take up to three weeks because finance has to re-key everything",
      "No waitlist automation, coordinators call families one by one",
    ],
    call_script: {
      opener:
        "You mentioned your spring registration crash forced the team to process about 300 signups by hand — I wanted to pick that thread up, because that's exactly the failure mode we built around.",
      talking_points: [
        "Their refund cycle runs three weeks because finance re-keys everything; connect to automated payment reconciliation.",
        "Coordinators phone families one at a time off paper waitlists; show automated waitlist promotion.",
        "Budget is already approved for next fiscal year, so the conversation is about fit and timing, not funding.",
      ],
    },
    signals: {
      economic_buyer: "She holds the budget line, with sign-off from the district administrator.",
      decision_criteria: "Reliability under registration-day load, and how painful data migration would be.",
      decision_process: "She shortlists, IT reviews security, district administrator signs.",
      metrics: "Staff hours on manual processing; refund turnaround time.",
      champion: "Dana herself — she's driving the evaluation.",
    },
    messages: [
      { role: "assistant", content: "Thanks for making time, Dana. To start, what does your team currently use to run **program registration**, and how long has that been in place?" },
      { role: "user", content: "We're on a system we installed about 12 years ago. It technically works but it was built for a much smaller operation than we are now." },
      { role: "assistant", content: "Twelve years is a long run. When it strains under what you've become, where does that show up **most visibly** for your staff?" },
      { role: "user", content: "Registration mornings. This spring it crashed twice on opening day and we ended up processing about 300 signups by hand. My coordinators were on the phones for two days straight." },
      { role: "assistant", content: "That sounds exhausting. After something like that, how do **refunds and cancellations** get handled on your side?" },
      { role: "user", content: "Honestly, badly. Finance has to re-key every refund into their own system, so families wait two, sometimes three weeks. We get complaints about that more than anything else." },
      { role: "assistant", content: "You mentioned complaints — when a program fills up, what happens with **waitlists** today?" },
      { role: "user", content: "Paper, more or less. The coordinators keep lists and call families one by one when spots open. It's nobody's favorite job." },
      { role: "assistant", content: "Given all this, has the department taken any **concrete steps** toward changing systems?" },
      { role: "user", content: "Yes, actually. We got budget approved for next fiscal year. I'm shortlisting options now, IT will do a security review, and our district administrator signs off. Reliability on registration day and how bad the data migration would be are what I care about most." },
    ],
  },
  {
    respondent_name: "Marcus Okafor",
    respondent_email: "m.okafor@example.com",
    custom_field_values: { job_title: "Operations Manager", company: "Brightwater Community Services" },
    daysAgo: 4,
    completed: true,
    lead_score: 8,
    summary:
      "Operations manager running scheduling across 14 facilities on spreadsheets; no active project, but clear friction and a boss who's asked him to look into options.",
    fit_reason:
      "Strong workflow pain in facility scheduling and his director has asked for options, though no budget is committed yet.",
    pain_points: [
      "Double-bookings across 14 facilities managed in shared spreadsheets",
      "Seasonal staff can't be trusted with the master schedule, so two people bottleneck all changes",
      "Field permit requests arrive by email and get lost",
    ],
    call_script: {
      opener:
        "You described running fourteen facilities off shared spreadsheets and eating the occasional double-booking — I'd love to show you what centralized scheduling would look like for a footprint your size.",
      talking_points: [
        "Only two people can safely touch the master schedule, bottlenecking every change; connect to role-based access.",
        "Permit requests arrive by email and get lost; show the request-to-approval pipeline.",
        "His director asked him to gather options, so equip him to make the internal case.",
      ],
    },
    signals: {
      economic_buyer: "His director, who asked him to gather options.",
      decision_criteria: "Something seasonal staff can use without breaking the master schedule.",
      decision_process: null,
      metrics: null,
      champion: "Marcus is positioned to advocate internally.",
    },
    messages: [
      { role: "assistant", content: "Appreciate you joining, Marcus. How does your team currently manage **facility scheduling** across your locations?" },
      { role: "user", content: "Shared spreadsheets, mostly. We run 14 facilities and the master schedule lives in a workbook only two of us are allowed to edit." },
      { role: "assistant", content: "Only two editors for fourteen facilities — what drove the decision to **restrict access** that tightly?" },
      { role: "user", content: "We got burned. A seasonal hire overwrote a whole weekend of gym bookings once. Since then everything funnels through me or my counterpart, which honestly makes us the bottleneck." },
      { role: "assistant", content: "When conflicts do slip through, like a **double-booking**, how does that usually surface?" },
      { role: "user", content: "Usually when two groups show up at the same field. It's rare but it's mortifying every time, and it's always a spreadsheet merge issue." },
      { role: "assistant", content: "And requests from the public, say **field permits** — how do those come in?" },
      { role: "user", content: "Email. Which means they sit in inboxes, and some just get lost. My director actually asked me last month to look into whether there's tooling that would fix this whole area." },
    ],
  },
  {
    respondent_name: "Priya Raman",
    respondent_email: "p.raman@example.com",
    custom_field_values: { job_title: "Program Coordinator", company: "Sagebrush Valley Recreation" },
    daysAgo: 6,
    completed: true,
    lead_score: 7,
    summary:
      "Program coordinator spending roughly a day a week reconciling registrations against payments by hand; frustrated but not the decision maker.",
    fit_reason:
      "Her weekly manual reconciliation is squarely the problem the product removes, but she'd need to sell it upward.",
    pain_points: [
      "Spends most of every Friday reconciling registrations against payment records",
      "Families register twice because confirmation emails land in spam",
      "Program capacity lives in her head, not the system",
    ],
    call_script: {
      opener:
        "You said Fridays basically disappear into matching registrations against payments by hand — I wanted to talk about what that day looks like when reconciliation is automatic.",
      talking_points: [
        "Duplicate registrations from missed confirmations create refund work downstream; connect to reliable notifications.",
        "Capacity tracking lives in her head; show real-time capacity in the product.",
        "She isn't the buyer, so give her material that helps her make the case to her director.",
      ],
    },
    signals: {
      economic_buyer: null,
      decision_criteria: null,
      decision_process: null,
      metrics: "A full day per week of her time on reconciliation.",
      champion: null,
    },
    messages: [
      { role: "assistant", content: "Thanks for being here, Priya. Walk me through what a **typical week** looks like managing your programs." },
      { role: "user", content: "Monday through Thursday is mostly normal coordination work. Friday is reconciliation day — I match registrations against payment records line by line. It eats most of the day." },
      { role: "assistant", content: "A full day a week is significant. What makes the **matching process** manual in the first place?" },
      { role: "user", content: "The registration system and the payment processor don't really talk to each other. So I export both and go row by row in a spreadsheet." },
      { role: "assistant", content: "Are there **downstream effects** when something doesn't match up?" },
      { role: "user", content: "Duplicates are the big one. Confirmation emails go to spam sometimes, families think it didn't work, and they register and pay twice. Then I have to process a refund, which is its own ordeal." },
      { role: "assistant", content: "How do you keep track of **program capacity** while all this is happening?" },
      { role: "user", content: "Honestly? It's in my head. The system has a capacity field but nobody trusts it, so people just ask me. If I'm out sick, things get overbooked." },
    ],
  },
  {
    respondent_name: "Tom Gallagher",
    respondent_email: "t.gallagher@example.com",
    custom_field_values: { job_title: "Parks Superintendent", company: "Iron Creek Township" },
    daysAgo: 9,
    completed: true,
    lead_score: 6,
    summary:
      "Superintendent focused on grounds and maintenance; registration pain exists but sits with another team, mild personal friction around field permits.",
    fit_reason:
      "Adjacent to the buying center — feels permit friction personally but registration tooling is another team's problem.",
    pain_points: [
      "Field permit approvals route through him on paper forms",
      "No visibility into which fields are booked when planning maintenance",
    ],
    call_script: {
      opener:
        "You mentioned maintenance crews showing up to fields that turned out to be booked — I wanted to explore how shared facility visibility might fit your side of the house.",
      talking_points: [
        "Paper permit forms still route across his desk; connect to digital approvals.",
        "Maintenance scheduling is blind to bookings; show the shared calendar view.",
      ],
    },
    signals: {
      economic_buyer: null,
      decision_criteria: null,
      decision_process: null,
      metrics: null,
      champion: null,
    },
    messages: [
      { role: "assistant", content: "Good to meet you, Tom. Your world is more the **grounds and facilities** side — how does scheduling touch your work?" },
      { role: "user", content: "Mostly through field permits. Groups apply to use our fields and those approvals still route across my desk on paper forms, believe it or not." },
      { role: "assistant", content: "Paper in 2026 — how does that affect **turnaround** for the groups applying?" },
      { role: "user", content: "It's slow, a week or two usually. Nobody loves it but it's survivable. The bigger annoyance for me is maintenance planning." },
      { role: "assistant", content: "Say more about **maintenance planning** — where does it collide with bookings?" },
      { role: "user", content: "My crews will schedule field work and then find out the field's booked that morning. We don't see the reservation calendar; it belongs to the recreation side. So we call over there and hope someone picks up." },
      { role: "assistant", content: "If that visibility existed, would it change how you **plan the season**, or mostly remove day-to-day friction?" },
      { role: "user", content: "Mostly friction. Registration systems are the rec department's battle, not mine. I just want to know when the fields are free." },
    ],
  },
  {
    respondent_name: "Elena Vasquez",
    respondent_email: "e.vasquez@example.com",
    custom_field_values: { job_title: "Assistant Director", company: "Harborline Parks & Recreation" },
    daysAgo: 13,
    completed: true,
    lead_score: 5,
    summary:
      "Assistant director generally content with a recently-adopted system; some grumbles about reporting but no appetite for change after last year's migration.",
    fit_reason:
      "Recently migrated and change-fatigued — reporting gaps are real but not painful enough to reopen the decision soon.",
    pain_points: [
      "Canned reports don't answer the questions their board actually asks",
      "Migration last year was harder than the vendor promised",
    ],
    call_script: {
      opener:
        "You mentioned your board asks questions the canned reports can't answer — I'd keep this light, but that reporting gap is worth a look when the timing is right.",
      talking_points: [
        "Fresh off a hard migration, so lead with respect for the switching cost, not against their current vendor.",
        "Board reporting is the one live wound; show custom reporting briefly and leave the door open.",
      ],
    },
    signals: {
      economic_buyer: null,
      decision_criteria: "Whatever they adopt next must migrate cleanly; last year's move burned them.",
      decision_process: null,
      metrics: null,
      champion: null,
    },
    messages: [
      { role: "assistant", content: "Thanks for the time, Elena. You switched systems fairly recently — how has the **new setup** been treating you?" },
      { role: "user", content: "Honestly, decently. We moved about a year ago and day-to-day registration works fine now. The migration itself was rougher than promised, but we're through it." },
      { role: "assistant", content: "Glad it settled. A year in, is there anywhere it still **falls short** of what you hoped?" },
      { role: "user", content: "Reporting, mainly. The canned reports answer the vendor's questions, not ours. Our board asks things like revenue per program hour and I end up building it in a spreadsheet." },
      { role: "assistant", content: "How often does that **board reporting** cycle come around?" },
      { role: "user", content: "Quarterly. So four times a year I lose a couple of days to it. Annoying, not fatal." },
      { role: "assistant", content: "If the reporting gap persisted, could you see it **reopening the tooling question**, or is that door closed for a while?" },
      { role: "user", content: "Closed for a while, I'd say. Nobody here has the stomach for another migration yet. Ask me again in two years." },
    ],
  },
  {
    respondent_name: "Ray Chen",
    respondent_email: "ray.chen@example.com",
    custom_field_values: { job_title: "Aquatics Supervisor", company: "Foxglove City Parks" },
    daysAgo: 16,
    completed: true,
    lead_score: 2,
    summary:
      "Aquatics supervisor happy with current tools; his pain is lifeguard hiring, which is outside anything registration software addresses.",
    fit_reason:
      "Content with current tooling and his real problem, lifeguard staffing, is outside the product's scope entirely.",
    pain_points: [],
    call_script: {
      opener:
        "You were clear that scheduling tools aren't your problem and staffing is — this one's probably not a fit today, and honesty about that is the right opener if we talk at all.",
      talking_points: [
        "No tooling pain surfaced; deprioritize.",
        "If the district ever consolidates systems his usage would come along, but he is not an entry point.",
      ],
    },
    signals: {
      economic_buyer: null,
      decision_criteria: null,
      decision_process: null,
      metrics: null,
      champion: null,
    },
    messages: [
      { role: "assistant", content: "Thanks for hopping on, Ray. How do **swim program signups** run at your pools today?" },
      { role: "user", content: "Pretty smoothly, honestly. The city system handles lesson registration fine. Parents complain about the 6am signup window but that's a policy choice, not the software." },
      { role: "assistant", content: "Fair distinction. Is there any part of running aquatics where the **tools get in your way**?" },
      { role: "user", content: "Not really the tools. My problem is people. I can't hire enough lifeguards. I could have the best software on earth and I'd still be closing lanes on Saturdays." },
      { role: "assistant", content: "That's a real constraint. Does scheduling **staff shifts** at least work smoothly with the team you have?" },
      { role: "user", content: "Yeah, we use a shift app the guards actually like. No complaints there. Wish I had more names to put in it." },
    ],
  },
  {
    respondent_name: "Nadia Osei",
    respondent_email: "n.osei@example.com",
    custom_field_values: { job_title: "Recreation Coordinator", company: "Millbrook Parks Department" },
    daysAgo: 19,
    completed: false,
    lead_score: null,
    summary: null,
    fit_reason: null,
    pain_points: [],
    call_script: null,
    signals: null,
    messages: [
      { role: "assistant", content: "Hi Nadia, thanks for joining. To start off, what does **program registration** look like at Millbrook today?" },
      { role: "user", content: "We use an older county-provided system, plus a lot of paper for the senior programs." },
      { role: "assistant", content: "Interesting split. What keeps the **senior programs** on paper while everything else is digital?" },
    ],
  },
  {
    respondent_name: "Kevin Brandt",
    respondent_email: "k.brandt@example.com",
    custom_field_values: { job_title: "Facilities Scheduler", company: "Alder Point Community Center" },
    daysAgo: 21,
    completed: false,
    lead_score: null,
    summary: null,
    fit_reason: null,
    pain_points: [],
    call_script: null,
    signals: null,
    messages: [
      { role: "assistant", content: "Thanks for making time, Kevin. How does **room and court booking** work at your center right now?" },
      { role: "user", content: "A whiteboard and a shared calendar, mostly. It's held together by habit." },
      { role: "assistant", content: "Held together by habit is a great phrase. When the habit breaks, what's the **most common failure**?" },
      { role: "user", content: "Someone books over league night. Happens every few weeks." },
    ],
  },
];
