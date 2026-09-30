// Copy for the Ambassador Challenge landing page. Edit dates, rewards and
// wording here — the components only render these values.

export const campaign = {
  dateRange: "OCT 1 – DEC 31, 2026",
  copyright: "© 2026 ElevateMe, Inc. All rights reserved.",
};

export const hero = {
  line1: "REFER. EARN.",
  line2: "UNLOCK BIG.",
  copyStart: "Refer students to ElevateMe and earn rewards. Hit 15 successful enrollments to win an",
  highlight: "iPhone 18 Pro",
  copyEnd: "as an additional reward!",
  phoneImage: "/campaign/hero-iphone.png",
};

export type StepIcon = "UserPlus" | "GraduationCap" | "DollarSign" | "Users";
export type Tone = "red" | "green";

export const steps: { id: string; icon: StepIcon; tone: Tone; title: string; text: string }[] = [
  { id: "refer", icon: "UserPlus", tone: "red", title: "Refer a Student", text: "Share a student's details with the ElevateMe team." },
  { id: "enroll", icon: "GraduationCap", tone: "green", title: "Student Successfully Enrolls", text: "Your referred student enrolls in the ElevateMe program." },
];

export const rewards: {
  title: string;
  options: { id: string; icon: StepIcon; tone: Tone; title: string; amount: string; text: string }[];
} = {
  title: "YOUR REWARD (PER ENROLLMENT)",
  options: [
    { id: "referral", icon: "DollarSign", tone: "red", title: "Referral Only", amount: "Earn $50", text: "You earn $50 for every referred student who enrolls." },
    { id: "call", icon: "Users", tone: "green", title: "Join Enrollment Call", amount: "Earn $100", text: "Join the enrollment meeting with your referral and help them make their decision." },
  ],
};

export const bonus = {
  label: "BONUS CHALLENGE",
  line1: "15 SUCCESSFUL ENROLLMENTS =",
  line2: "iPHONE 18 PRO",
  trophyImage: "/campaign/trophy.webp",
  periodLabel: "Campaign Period",
  period: "October 1 – December 31, 2026",
  limitLine1: "No referral limit –",
  limitLine2: "Refer more, earn more!",
};

export const legalLinks = {
  terms: "https://elevateme.pro/terms-of-use/",
  privacy: "https://elevateme.pro/privacy-policy/",
};
