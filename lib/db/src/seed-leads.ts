import { db } from "./index";
import { leadsTable } from "./schema/leads";

const sample = [
  {
    name: "Sarah Mitchell", email: "sarah.m@email.com", phone: "+1 (555) 123-4567",
    whatsappNumber: "+15551234567", interestedProperties: ["Manhattan Penthouse"],
    property: "Manhattan Penthouse", budget: "$5.2M", status: "negotiation",
    priority: "hot", source: "Referral", assignedTo: "James Donovan",
    lastContact: "2 hours ago", avatar: "SM", score: 88, urgencyScore: 85,
    campaign: "Luxury NYC Q2", adSource: "Partner Referral",
    aiSummary: "High-value negotiation lead in final stages of the Manhattan Penthouse deal. Cash buyer with an urgent timeline — HOA legal review is the last remaining blocker. Recommend scheduling a closing call this week.",
    suggestedActions: ["Schedule closing call", "Share HOA legal summary", "Confirm wire transfer details"],
    tags: ["VIP", "Cash Buyer"],
    notes: ["Requested private evening showing", "Needs legal review for HOA terms"],
    timeline: [
      { id: "1-a", title: "WhatsApp follow-up sent", time: "2h ago" },
      { id: "1-b", title: "Offer document shared", time: "Yesterday" },
      { id: "1-c", title: "Lead qualified by agent", time: "2 days ago" },
    ],
    attachments: [
      { name: "Financial_Statement.pdf", size: "2.4 MB", type: "pdf" },
      { name: "ID_Verification.pdf", size: "1.1 MB", type: "pdf" },
    ],
  },
  {
    name: "Michael Chen", email: "m.chen@email.com", phone: "+1 (555) 234-5678",
    whatsappNumber: "+15552345678", interestedProperties: ["Beverly Hills Estate", "Malibu Beach House"],
    property: "Beverly Hills Estate", budget: "$8.7M", status: "proposal",
    priority: "warm", source: "Website", assignedTo: "Sarah Mitchell",
    lastContact: "1 day ago", avatar: "MC", score: 72, urgencyScore: 62,
    campaign: "LA Luxury Homes",
    aiSummary: "High-budget investor comparing Beverly Hills Estate with a Malibu alternative. Proposal submitted — awaiting response. Strong financial profile with international background.",
    suggestedActions: ["Follow up on proposal", "Share Malibu comparison doc", "Schedule video call"],
    tags: ["Investor", "International"],
    notes: ["Comparing with two Malibu properties"],
    timeline: [
      { id: "2-a", title: "Pricing proposal submitted", time: "1d ago" },
      { id: "2-b", title: "Discovery call completed", time: "3 days ago" },
    ],
    attachments: [{ name: "Proof_of_Funds.pdf", size: "3.2 MB", type: "pdf" }],
  },
  {
    name: "Emily Rodriguez", email: "emily.r@email.com", phone: "+1 (555) 345-6789",
    whatsappNumber: "+15553456789", interestedProperties: ["Miami Beach Condo"],
    property: "Miami Beach Condo", budget: "$3.1M", status: "qualified",
    priority: "hot", source: "Instagram Ad", assignedTo: "Michael Chen",
    lastContact: "5 hours ago", avatar: "ER", score: 81, urgencyScore: 78,
    campaign: "Miami Summer 2026", adSource: "IG Story — Beachfront Living",
    aiSummary: "First-time luxury buyer with a strong urgency signal. Looking for a fast close on Miami Beach Condo. Came in via Instagram ad campaign with high engagement.",
    suggestedActions: ["Schedule property viewing", "Send financing options", "Send fast-close checklist"],
    tags: ["First-time Buyer", "Urgent"],
    notes: ["Interested in fast closing window"],
    timeline: [
      { id: "3-a", title: "Qualification form completed", time: "5h ago" },
      { id: "3-b", title: "Lead created from Instagram ad", time: "1 day ago" },
    ],
    attachments: [],
  },
  {
    name: "David Park", email: "david.park@email.com", phone: "+1 (555) 456-7890",
    whatsappNumber: "+15554567890", interestedProperties: ["San Francisco Loft", "Manhattan Penthouse"],
    property: "San Francisco Loft", budget: "$2.8M", status: "new",
    priority: "cold", source: "Email", assignedTo: "Emily Rodriguez",
    lastContact: "3 days ago", avatar: "DP", score: 45, urgencyScore: 30,
    tags: ["Relocating"], notes: ["Relocating from Seoul in Q3", "Needs pet-friendly building"],
    timeline: [{ id: "4-a", title: "Email inquiry received", time: "3d ago" }],
    attachments: [],
  },
  {
    name: "Amanda Foster", email: "amanda.f@email.com", phone: "+1 (555) 567-8901",
    whatsappNumber: "+15555678901", interestedProperties: ["Malibu Beach House"],
    property: "Malibu Beach House", budget: "$16M", status: "won",
    priority: "hot", source: "Referral", assignedTo: "James Donovan",
    lastContact: "1 week ago", avatar: "AF", score: 95, urgencyScore: 20,
    campaign: "Malibu Elite",
    tags: ["VIP", "Cash Buyer", "Investor"],
    notes: ["Deal closed successfully", "Prefers wire transfer"],
    timeline: [
      { id: "5-a", title: "Contract signed", time: "1wk ago" },
      { id: "5-b", title: "Final walkthrough done", time: "10d ago" },
      { id: "5-c", title: "Offer accepted", time: "2wk ago" },
    ],
    attachments: [
      { name: "Purchase_Agreement.pdf", size: "5.1 MB", type: "pdf" },
      { name: "Signed_Contract.pdf", size: "4.7 MB", type: "pdf" },
    ],
  },
  {
    name: "Robert Chang", email: "r.chang@email.com", phone: "+1 (555) 678-9012",
    whatsappNumber: "+15556789012", interestedProperties: ["Dubai Marina Villa"],
    property: "Dubai Marina Villa", budget: "$4.5M", status: "new",
    priority: "warm", source: "Cold Call", assignedTo: "Sarah Mitchell",
    lastContact: "Yesterday", avatar: "RC", score: 58, urgencyScore: 45,
    tags: ["International"], notes: ["Looking to buy before end of year"],
    timeline: [{ id: "6-a", title: "Cold call — expressed interest", time: "Yesterday" }],
    attachments: [],
  },
  {
    name: "Lisa Thornton", email: "l.thornton@email.com", phone: "+1 (555) 789-0123",
    whatsappNumber: "+15557890123", interestedProperties: ["Beverly Hills Estate"],
    property: "Beverly Hills Estate", budget: "$9.1M", status: "qualified",
    priority: "warm", source: "Referral", assignedTo: "James Donovan",
    lastContact: "2 days ago", avatar: "LT", score: 67, urgencyScore: 55,
    tags: ["Investor"], duplicateOf: 2,
    notes: ["Possible duplicate — similar budget and property interest as Michael Chen"],
    timeline: [
      { id: "7-a", title: "Referral from existing client", time: "2d ago" },
      { id: "7-b", title: "Initial call completed", time: "2d ago" },
    ],
    attachments: [{ name: "Investor_Profile.pdf", size: "1.8 MB", type: "pdf" }],
  },
  {
    name: "James Whitfield", email: "j.whitfield@email.com", phone: "+1 (555) 890-1234",
    whatsappNumber: "+15558901234", interestedProperties: ["Manhattan Penthouse"],
    property: "Manhattan Penthouse", budget: "$6.8M", status: "new",
    priority: "hot", source: "Google Ad", assignedTo: "James Donovan",
    lastContact: "4 hours ago", avatar: "JW", score: 74, urgencyScore: 80,
    campaign: "NYC Penthouse Q2", adSource: "Google Search — luxury penthouse nyc",
    tags: ["Cash Buyer"], notes: ["Submitted inquiry from Google ad at 11pm — high intent signal"],
    timeline: [{ id: "8-a", title: "Lead created from Google Ad", time: "4h ago" }],
    attachments: [],
  },
  {
    name: "Priya Nair", email: "priya.n@email.com", phone: "+1 (555) 901-2345",
    whatsappNumber: "+15559012345", interestedProperties: ["San Francisco Loft"],
    property: "San Francisco Loft", budget: "$3.4M", status: "qualified",
    priority: "warm", source: "LinkedIn", assignedTo: "Emily Rodriguez",
    lastContact: "1 day ago", avatar: "PN", score: 63, urgencyScore: 50,
    campaign: "SF Tech Buyer Outreach",
    tags: ["Relocating", "Investor"],
    notes: ["Tech executive relocating from Bangalore", "Interested in rooftop access"],
    timeline: [
      { id: "9-a", title: "LinkedIn message responded", time: "1d ago" },
      { id: "9-b", title: "LinkedIn campaign reached", time: "3d ago" },
    ],
    attachments: [],
  },
  {
    name: "Carlos Vega", email: "c.vega@email.com", phone: "+1 (555) 012-3456",
    whatsappNumber: "+15550123456", interestedProperties: ["Miami Beach Condo"],
    property: "Miami Beach Condo", budget: "$2.5M", status: "lost",
    priority: "cold", source: "Facebook Ad", assignedTo: "Michael Chen",
    lastContact: "2 weeks ago", avatar: "CV", score: 28, urgencyScore: 10,
    campaign: "Miami Beach Summer", adSource: "FB Carousel — Miami Condos",
    tags: [], notes: ["Went with a competing listing in Brickell"],
    timeline: [
      { id: "10-a", title: "Lead marked lost — competitor chosen", time: "2wk ago" },
      { id: "10-b", title: "Property viewing scheduled", time: "3wk ago" },
    ],
    attachments: [],
  },
];

async function seed() {
  const existing = await db.select().from(leadsTable);
  if (existing.length > 0) {
    console.log(`Already have ${existing.length} leads — skipping seed.`);
    return;
  }
  await db.insert(leadsTable).values(sample as any);
  console.log(`Seeded ${sample.length} sample leads.`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
