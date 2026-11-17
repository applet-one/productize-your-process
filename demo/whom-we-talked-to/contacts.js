// Who we have talked to, extracted by hand from the files under input/raw_feedback/.
// Every touchpoint names the input file it comes from.

// External people we spoke with directly (interviews, calls, email threads).
export const contacts = [
  {
    name: "Peter Hartmann",
    role: "Head of Operations",
    company: "LogiTrans GmbH",
    relationship: "Customer",
    touchpoints: [
      { date: "2025-03-03", kind: "Interview", withWhom: "Marc Hoffmann", source: "raw_feedback/customer_interviews.md" },
      { date: "2025-03-10", kind: "Email thread", withWhom: "Marc Hoffmann", source: "raw_feedback/emails.md" },
    ],
    topics: ["Self-serve onboarding", "Compliance reports (supply chain, CO2)"],
  },
  {
    name: "Dr. Sabine Roth",
    role: "Head of Regulatory Affairs",
    company: "PharmaCare AG",
    relationship: "Customer",
    touchpoints: [
      { date: "2025-03-06", kind: "Interview", withWhom: "Anna Wagner", source: "raw_feedback/customer_interviews.md" },
      { date: "2025-03-11", kind: "Sales call", withWhom: "Anna Wagner", source: "raw_feedback/emails.md" },
    ],
    topics: ["Compliance checking of SOPs against FDA/EMA", "Minimal onboarding"],
  },
  {
    name: "Klaus Werner",
    role: "IT",
    company: "PharmaCare AG",
    relationship: "Customer",
    touchpoints: [
      { date: "2025-03-11", kind: "Sales call", withWhom: "Anna Wagner", source: "raw_feedback/emails.md" },
    ],
    topics: ["Joined the compliance-checking sales call"],
  },
  {
    name: "Thomas Berg",
    role: "CFO",
    company: "FinancePlus",
    relationship: "Customer",
    touchpoints: [
      { date: "2025-03-11", kind: "Interview", withWhom: "Marc Hoffmann", source: "raw_feedback/customer_interviews.md" },
      { date: "2025-03-14", kind: "Email", withWhom: "Marc Hoffmann", source: "raw_feedback/emails.md" },
    ],
    topics: ["Measured time savings (3 h/week)", "Onboarding of new colleagues", "Compliance (MiFID II, audits)"],
  },
  {
    name: "Sandra Pfeiffer",
    role: "Projektleiterin",
    company: "BauLogik AG",
    relationship: "Prospect",
    touchpoints: [
      { date: "2025-03-13", kind: "Interview", withWhom: "Sarah Klein", source: "raw_feedback/customer_interviews.md" },
    ],
    topics: ["Status reporting across 20 projects", "15-minute onboarding for project leads"],
  },
];

// Colleagues whose voices appear in the inputs (Slack, emails, retros).
export const internalVoices = [
  { name: "Marc Hoffmann", where: ["Interviews", "Emails", "Slack", "Retros"] },
  { name: "Anna Wagner", where: ["Interviews", "Emails", "Slack", "Retros"] },
  { name: "Sarah Klein", where: ["Interviews", "Emails", "Slack", "Retros"] },
  { name: "Kai Schmidt", where: ["Emails", "Slack", "Pattern-team meeting"] },
  { name: "Julia Meyer", where: ["Emails", "Slack", "Retros", "Pattern-team meeting"] },
  { name: "Felix Braun", where: ["Slack", "Retros", "Pattern-team meeting"] },
  { name: "Tom Bauer", where: ["Emails", "Slack", "Retros"] },
  { name: "David Müller", where: ["Emails", "Slack", "Retros"] },
  { name: "Lisa Chen", where: ["Slack"] },
];
