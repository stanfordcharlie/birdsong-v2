import type { InterviewMessage } from "@/lib/interview/types";

// Fixture content for the one-click demo dataset (POST /api/sample-data).
// Hardcoded on purpose: seeding must be instant, free, and deterministic —
// never a runtime Claude call. Every person, organization, and quote here
// is invented; none correspond to real companies or people. The vertical is
// a deliberately fictional one: "Meridian Field Services," a made-up
// field-service management software company selling scheduling and dispatch
// software to commercial HVAC and plumbing contractors.
//
// Shape rules the seeding route relies on:
// - The survey is created with status "draft" and is_sample: true, so it is
//   never publicly reachable and removal can target exactly these rows.
// - Every response is inserted with is_test: true, so nothing here ever
//   counts as a real lead, fires email, or skews stats.

export const SAMPLE_SURVEY = {
  title: "Sample: Field Ops Scheduling Research",
  external_title: "How Commercial HVAC & Plumbing Teams Run Field Operations",
  topic:
    "How commercial HVAC and plumbing contractors handle job scheduling, dispatch, and invoicing today, and where their current tools fall short.",
  question_guide: `1. What software or systems the company currently uses for job scheduling and dispatch, and how long they've been on them.

2. Where office staff time actually goes in a typical week — manual workarounds, spreadsheets, phone-based processes.

3. How invoicing and billing are handled, especially for emergency calls and change orders.

4. What triggered any past attempts to switch systems, and what stopped them.

5. Who would be involved in a decision to change tooling, and what would matter most in choosing.`,
  tone: "warm, curious, and conversational",
  num_questions: 7,
  gift_card_amount: 25,
  sponsor: "Meridian Field Services",
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
    custom_field_values: { job_title: "Operations Director", company: "Copperpoint Mechanical" },
    daysAgo: 2,
    completed: true,
    lead_score: 9,
    summary:
      "Operations director actively evaluating replacements for a 12-year-old dispatch system, with budget approved for next fiscal year and a painful heat-wave week behind her.",
    fit_reason:
      "Actively in the market with approved budget and pain that maps directly to scheduling and dispatch modernization.",
    pain_points: [
      "Dispatch board crashed twice during a heat wave and staff routed 300 work orders by phone",
      "Invoices go out up to three weeks late because billing has to re-key everything",
      "No after-hours call triage, dispatchers phone technicians one by one",
    ],
    call_script: {
      opener:
        "You mentioned your dispatch board crashing in the heat wave forced the team to route about 300 work orders by phone — I wanted to pick that thread up, because that's exactly the failure mode we built around.",
      talking_points: [
        "Their invoicing runs three weeks late because billing re-keys everything; connect to automated job-to-invoice flow.",
        "Dispatchers phone techs one at a time for after-hours calls; show automated on-call routing.",
        "Budget is already approved for next fiscal year, so the conversation is about fit and timing, not funding.",
      ],
    },
    signals: {
      economic_buyer: "She holds the budget line, with sign-off from the company's general manager.",
      decision_criteria: "Reliability under peak-season load, and how painful data migration would be.",
      decision_process: "She shortlists, IT reviews security, the general manager signs.",
      metrics: "Staff hours on manual dispatch; invoice turnaround time.",
      champion: "Dana herself — she's driving the evaluation.",
    },
    messages: [
      { role: "assistant", content: "Thanks for making time, Dana. To start, what does your team currently use to run **job scheduling and dispatch**, and how long has that been in place?" },
      { role: "user", content: "We're on a system we installed about 12 years ago. It technically works but it was built for a much smaller operation than we are now." },
      { role: "assistant", content: "Twelve years is a long run. When it strains under what you've become, where does that show up **most visibly** for your staff?" },
      { role: "user", content: "Peak season. During the heat wave this summer the dispatch board crashed twice and we ended up routing about 300 work orders by phone and paper. My dispatchers were on the lines for two days straight." },
      { role: "assistant", content: "That sounds exhausting. After a stretch like that, how does **invoicing** get handled on your side?" },
      { role: "user", content: "Honestly, badly. Billing has to re-key every completed job into their own system, so invoices go out two, sometimes three weeks late. Our cash flow takes the hit, and customers query stale invoices more than anything else." },
      { role: "assistant", content: "You mentioned queries — when a call comes in **after hours**, what happens today?" },
      { role: "user", content: "Phone tree, more or less. The on-call dispatcher keeps a list and calls technicians one by one until someone picks up. It's nobody's favorite job." },
      { role: "assistant", content: "Given all this, has the company taken any **concrete steps** toward changing systems?" },
      { role: "user", content: "Yes, actually. We got budget approved for next fiscal year. I'm shortlisting options now, IT will do a security review, and our general manager signs off. Reliability in peak season and how bad the data migration would be are what I care about most." },
    ],
  },
  {
    respondent_name: "Marcus Okafor",
    respondent_email: "m.okafor@example.com",
    custom_field_values: { job_title: "Operations Manager", company: "Gable & Frost Plumbing" },
    daysAgo: 4,
    completed: true,
    lead_score: 8,
    summary:
      "Operations manager running scheduling across 14 crews on spreadsheets; no active project, but clear friction and a boss who's asked him to look into options.",
    fit_reason:
      "Strong workflow pain in crew scheduling and his general manager has asked for options, though no budget is committed yet.",
    pain_points: [
      "Double-booked technicians across 14 crews managed in shared spreadsheets",
      "Seasonal hires can't be trusted with the master schedule, so two people bottleneck all changes",
      "Service requests arrive by email and get lost",
    ],
    call_script: {
      opener:
        "You described running fourteen crews off shared spreadsheets and eating the occasional double-booked tech — I'd love to show you what centralized scheduling would look like for a fleet your size.",
      talking_points: [
        "Only two people can safely touch the master schedule, bottlenecking every change; connect to role-based access.",
        "Service requests arrive by email and get lost; show the request-to-work-order pipeline.",
        "His general manager asked him to gather options, so equip him to make the internal case.",
      ],
    },
    signals: {
      economic_buyer: "His general manager, who asked him to gather options.",
      decision_criteria: "Something seasonal hires can use without breaking the master schedule.",
      decision_process: null,
      metrics: null,
      champion: "Marcus is positioned to advocate internally.",
    },
    messages: [
      { role: "assistant", content: "Appreciate you joining, Marcus. How does your team currently manage **crew scheduling** across your service area?" },
      { role: "user", content: "Shared spreadsheets, mostly. We run 14 crews and the master schedule lives in a workbook only two of us are allowed to edit." },
      { role: "assistant", content: "Only two editors for fourteen crews — what drove the decision to **restrict access** that tightly?" },
      { role: "user", content: "We got burned. A seasonal hire overwrote a whole weekend of installs once. Since then everything funnels through me or my counterpart, which honestly makes us the bottleneck." },
      { role: "assistant", content: "When conflicts do slip through, like a **double-booked technician**, how does that usually surface?" },
      { role: "user", content: "Usually when a customer calls asking where their tech is, because he's across town on the other job. It's rare but it's mortifying every time, and it's always a spreadsheet merge issue." },
      { role: "assistant", content: "And incoming **service requests** — how do those reach you?" },
      { role: "user", content: "Email. Which means they sit in inboxes, and some just get lost. My GM actually asked me last month to look into whether there's tooling that would fix this whole area." },
    ],
  },
  {
    respondent_name: "Priya Raman",
    respondent_email: "p.raman@example.com",
    custom_field_values: { job_title: "Service Coordinator", company: "Sagebrush Mechanical Services" },
    daysAgo: 6,
    completed: true,
    lead_score: 7,
    summary:
      "Service coordinator spending roughly a day a week reconciling completed work orders against invoices by hand; frustrated but not the decision maker.",
    fit_reason:
      "Her weekly manual reconciliation is squarely the problem the product removes, but she'd need to sell it upward.",
    pain_points: [
      "Spends most of every Friday reconciling work orders against invoices",
      "Customers book twice because confirmation emails land in spam",
      "Technician availability lives in her head, not the system",
    ],
    call_script: {
      opener:
        "You said Fridays basically disappear into matching work orders against invoices by hand — I wanted to talk about what that day looks like when reconciliation is automatic.",
      talking_points: [
        "Duplicate bookings from missed confirmations create credit-memo work downstream; connect to reliable notifications.",
        "Availability tracking lives in her head; show real-time technician availability in the product.",
        "She isn't the buyer, so give her material that helps her make the case to her operations director.",
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
      { role: "assistant", content: "Thanks for being here, Priya. Walk me through what a **typical week** looks like coordinating your service jobs." },
      { role: "user", content: "Monday through Thursday is mostly normal coordination work. Friday is reconciliation day — I match completed work orders against invoices line by line. It eats most of the day." },
      { role: "assistant", content: "A full day a week is significant. What makes the **matching process** manual in the first place?" },
      { role: "user", content: "The scheduling system and the accounting software don't really talk to each other. So I export both and go row by row in a spreadsheet." },
      { role: "assistant", content: "Are there **downstream effects** when something doesn't match up?" },
      { role: "user", content: "Duplicates are the big one. Confirmation emails go to spam sometimes, customers think the booking didn't work, and they call in and book twice. Then two techs get assigned, and unwinding the billing is its own ordeal." },
      { role: "assistant", content: "How do you keep track of **technician availability** while all this is happening?" },
      { role: "user", content: "Honestly? It's in my head. The system has an availability view but nobody trusts it, so people just ask me. If I'm out sick, jobs get double-assigned." },
    ],
  },
  {
    respondent_name: "Tom Gallagher",
    respondent_email: "t.gallagher@example.com",
    custom_field_values: { job_title: "Install Superintendent", company: "Iron Creek Mechanical" },
    daysAgo: 9,
    completed: true,
    lead_score: 6,
    summary:
      "Superintendent focused on new-construction installs; dispatch pain exists but sits with the service team, mild personal friction around parts requisitions.",
    fit_reason:
      "Adjacent to the buying center — feels requisition friction personally but dispatch tooling is the service team's problem.",
    pain_points: [
      "Parts requisitions route through him on paper forms",
      "No visibility into service-side technician bookings when planning install crews",
    ],
    call_script: {
      opener:
        "You mentioned install crews losing techs mid-week to service calls they couldn't see coming — I wanted to explore how shared schedule visibility might fit your side of the house.",
      talking_points: [
        "Paper requisition forms still route across his desk; connect to digital approvals.",
        "Install planning is blind to service bookings; show the shared schedule view.",
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
      { role: "assistant", content: "Good to meet you, Tom. Your world is more the **new-construction install** side — how does scheduling touch your work?" },
      { role: "user", content: "Mostly through parts requisitions. My crews request equipment and materials, and those approvals still route across my desk on paper forms, believe it or not." },
      { role: "assistant", content: "Paper in 2026 — how does that affect **turnaround** for the crews requesting?" },
      { role: "user", content: "It's slow, a week or two usually. Nobody loves it but it's survivable. The bigger annoyance for me is crew planning." },
      { role: "assistant", content: "Say more about **crew planning** — where does it collide with the service side?" },
      { role: "user", content: "I'll plan a week of installs and then find out two of my techs got pulled onto emergency service calls that morning. We don't see the service schedule; it belongs to the dispatch side. So we call over there and hope someone picks up." },
      { role: "assistant", content: "If that visibility existed, would it change how you **plan the season**, or mostly remove day-to-day friction?" },
      { role: "user", content: "Mostly friction. Dispatch systems are the service department's battle, not mine. I just want to know when my techs are actually mine." },
    ],
  },
  {
    respondent_name: "Elena Vasquez",
    respondent_email: "e.vasquez@example.com",
    custom_field_values: { job_title: "Assistant General Manager", company: "Harborline HVAC Group" },
    daysAgo: 13,
    completed: true,
    lead_score: 5,
    summary:
      "Assistant GM generally content with a recently-adopted system; some grumbles about reporting but no appetite for change after last year's migration.",
    fit_reason:
      "Recently migrated and change-fatigued — reporting gaps are real but not painful enough to reopen the decision soon.",
    pain_points: [
      "Canned reports don't answer the questions their owners actually ask",
      "Migration last year was harder than the vendor promised",
    ],
    call_script: {
      opener:
        "You mentioned your owners ask questions the canned reports can't answer — I'd keep this light, but that reporting gap is worth a look when the timing is right.",
      talking_points: [
        "Fresh off a hard migration, so lead with respect for the switching cost, not against their current vendor.",
        "Owner reporting is the one live wound; show custom reporting briefly and leave the door open.",
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
      { role: "user", content: "Honestly, decently. We moved about a year ago and day-to-day scheduling works fine now. The migration itself was rougher than promised, but we're through it." },
      { role: "assistant", content: "Glad it settled. A year in, is there anywhere it still **falls short** of what you hoped?" },
      { role: "user", content: "Reporting, mainly. The canned reports answer the vendor's questions, not ours. Our owners ask things like revenue per truck roll and I end up building it in a spreadsheet." },
      { role: "assistant", content: "How often does that **owner reporting** cycle come around?" },
      { role: "user", content: "Quarterly. So four times a year I lose a couple of days to it. Annoying, not fatal." },
      { role: "assistant", content: "If the reporting gap persisted, could you see it **reopening the tooling question**, or is that door closed for a while?" },
      { role: "user", content: "Closed for a while, I'd say. Nobody here has the stomach for another migration yet. Ask me again in two years." },
    ],
  },
  {
    respondent_name: "Ray Chen",
    respondent_email: "ray.chen@example.com",
    custom_field_values: { job_title: "Service Manager", company: "Foxglove Plumbing & Heating" },
    daysAgo: 16,
    completed: true,
    lead_score: 2,
    summary:
      "Service manager happy with current tools; his pain is hiring licensed technicians, which is outside anything scheduling software addresses.",
    fit_reason:
      "Content with current tooling and his real problem, licensed-tech hiring, is outside the product's scope entirely.",
    pain_points: [],
    call_script: {
      opener:
        "You were clear that scheduling tools aren't your problem and staffing is — this one's probably not a fit today, and honesty about that is the right opener if we talk at all.",
      talking_points: [
        "No tooling pain surfaced; deprioritize.",
        "If the company ever consolidates systems his usage would come along, but he is not an entry point.",
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
      { role: "assistant", content: "Thanks for hopping on, Ray. How does **service call intake** run at your shop today?" },
      { role: "user", content: "Pretty smoothly, honestly. Our system handles booking fine. Customers grumble about the morning-only arrival windows but that's a policy choice, not the software." },
      { role: "assistant", content: "Fair distinction. Is there any part of running the service side where the **tools get in your way**?" },
      { role: "user", content: "Not really the tools. My problem is people. I can't hire enough licensed techs. I could have the best software on earth and I'd still be turning away calls on Saturdays." },
      { role: "assistant", content: "That's a real constraint. Does scheduling **on-call rotations** at least work smoothly with the team you have?" },
      { role: "user", content: "Yeah, we use a shift app the techs actually like. No complaints there. Wish I had more names to put in it." },
    ],
  },
  {
    respondent_name: "Nadia Osei",
    respondent_email: "n.osei@example.com",
    custom_field_values: { job_title: "Dispatch Lead", company: "Millbrook Comfort Systems" },
    daysAgo: 19,
    completed: false,
    lead_score: null,
    summary: null,
    fit_reason: null,
    pain_points: [],
    call_script: null,
    signals: null,
    messages: [
      { role: "assistant", content: "Hi Nadia, thanks for joining. To start off, what does **job scheduling** look like at Millbrook today?" },
      { role: "user", content: "We use an older system the previous owner picked, plus a lot of paper for the maintenance-contract customers." },
      { role: "assistant", content: "Interesting split. What keeps the **maintenance contracts** on paper while everything else is digital?" },
    ],
  },
  {
    respondent_name: "Kevin Brandt",
    respondent_email: "k.brandt@example.com",
    custom_field_values: { job_title: "Dispatcher", company: "Alder Point Mechanical" },
    daysAgo: 21,
    completed: false,
    lead_score: null,
    summary: null,
    fit_reason: null,
    pain_points: [],
    call_script: null,
    signals: null,
    messages: [
      { role: "assistant", content: "Thanks for making time, Kevin. How does **assigning jobs to technicians** work at your shop right now?" },
      { role: "user", content: "A whiteboard and a shared calendar, mostly. It's held together by habit." },
      { role: "assistant", content: "Held together by habit is a great phrase. When the habit breaks, what's the **most common failure**?" },
      { role: "user", content: "Someone books a job over a tech's standing maintenance route. Happens every few weeks." },
    ],
  },
];
