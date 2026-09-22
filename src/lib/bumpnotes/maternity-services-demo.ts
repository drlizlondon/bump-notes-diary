export const maternityDemo = {
  woman: {
    name: "Amelia Carter",
    gestation: "24+3 weeks",
    dueDate: "08/01/2027",
    service: "Nottingham Maternity Service",
    team: "Community Midwifery Team · Central",
    hospital: "City Maternity Unit",
  },
  journal: [
    { type: "Symptoms and signs", detail: "Headache — moderate. Added a note about when it started.", date: "21/09/2026", tone: "coral" },
    { type: "Save a Question", detail: "Can we discuss travel plans at my next appointment?", date: "20/09/2026", tone: "mint" },
    { type: "People & Care", detail: "Saw Rachel, community midwife. Discussed the anomaly scan.", date: "18/09/2026", tone: "butter" },
    { type: "Measurements", detail: "Blood pressure 118/72 mmHg. Recorded at home.", date: "18/09/2026", tone: "lavender" },
  ],
  summarySections: [
    { id: "updates", title: "What has happened since my last appointment", lines: ["Headache — moderate · 21/09/2026", "Blood pressure 118/72 mmHg · 18/09/2026"] },
    { id: "questions", title: "What I want to ask", lines: ["Can we discuss travel plans at my next appointment?"] },
    { id: "preferences", title: "What I want my team to know", lines: ["I prefer written information after appointments."] },
    { id: "care", title: "People and care", lines: ["Rachel — community midwife", "Anomaly scan discussed · 18/09/2026"] },
  ],
  inbox: [
    { name: "Amelia Carter", detail: "24+3 weeks · Summary shared 22/09/2026 at 16:42", status: "New" },
    { name: "Sofia Malik", detail: "31+1 weeks · Summary shared 22/09/2026 at 14:08", status: "Reviewed" },
    { name: "Grace Evans", detail: "19+5 weeks · Summary shared 21/09/2026 at 18:16", status: "New" },
  ],
  metrics: [
    { label: "BumpNotes users", value: "1,248", note: "Example active users this month" },
    { label: "Summaries shared", value: "386", note: "Example patient-led shares" },
    { label: "Reviewed by teams", value: "82%", note: "Example demonstration rate" },
    { label: "Saved for later", value: "174", note: "Example summaries not shared" },
  ],
  themes: [
    { label: "Questions about appointments", value: 68 },
    { label: "Symptoms and signs recorded", value: 54 },
    { label: "Preferences about receiving care", value: 39 },
    { label: "People and care updates", value: 31 },
  ],
} as const;

export const maternityStages = [
  "Woman’s BumpNotes",
  "Prepare a summary",
  "Share with the team",
  "Maternity team inbox",
  "Service dashboard",
  "Patient-generated insight",
] as const;
