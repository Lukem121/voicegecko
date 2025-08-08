export type Role = {
  id: string;
  title: string;
  department:
    | 'Engineering'
    | 'Design'
    | 'Go-to-Market'
    | 'Operations'
    | 'Support';
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  compensation: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
};

export const ROLES: Role[] = [
  {
    id: 'eng-fe-1',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote (UTC‑1 to UTC+4)',
    type: 'Full-time',
    compensation: '$160k–$200k + equity',
    description:
      'Own core web experiences across marketing and desktop app surfaces. You ship fast, write accessible UI, and sweat the details.',
    responsibilities: [
      'Lead end‑to‑end delivery of new user‑facing features across Next.js and Tauri surfaces',
      'Raise the bar on performance, accessibility, and design quality',
      'Partner with Design and Product to scope, iterate, and ship quickly',
    ],
    requirements: [
      '5+ years building production React/TypeScript apps',
      'Strong eye for UX and component design',
      'Experience with performance profiling and accessibility best practices',
    ],
  },
  {
    id: 'eng-be-1',
    title: 'Backend Engineer (Node/TypeScript)',
    department: 'Engineering',
    location: 'Remote (UTC‑1 to UTC+4)',
    type: 'Full-time',
    compensation: '$160k–$200k + equity',
    description:
      'Build reliable, scalable services for transcription, billing, and real‑time features.',
    responsibilities: [
      'Design and evolve API surfaces (tRPC/HTTP) with strong typing and observability',
      'Own core services for transcription pipeline and billing',
      'Improve reliability, performance, and developer ergonomics',
    ],
    requirements: [
      '5+ years with Node.js/TypeScript in production',
      'Experience with SQL databases and job queues',
      'Bias towards shipping and measuring impact',
    ],
  },
  {
    id: 'eng-ml-1',
    title: 'Machine Learning Engineer — Speech',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    compensation: '$180k–$230k + equity',
    description:
      'Push the state of the art in speech accuracy and latency. Own model evaluation and inference optimizations.',
    responsibilities: [
      'Evaluate and optimize ASR models for quality/latency trade‑offs',
      'Build robust evaluation pipelines and datasets',
      'Collaborate with product to translate improvements into user value',
    ],
    requirements: [
      'Strong Python and ML fundamentals',
      'Experience with ASR/TTS or adjacent speech domains',
      'Practical mindset—measure, iterate, ship',
    ],
  },
  {
    id: 'design-1',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    compensation: '$140k–$180k + equity',
    description:
      'Define the look, feel, and interaction patterns of Voice Gecko across desktop and web.',
    responsibilities: [
      'Drive end‑to‑end design from discovery to polished execution',
      'Create repeatable component patterns and design tokens',
      'Partner tightly with engineering to ship with quality',
    ],
    requirements: [
      'Portfolio showcasing shipped product work',
      'Strong interaction design and systems thinking',
      'Comfort with Figma and prototyping tools',
    ],
  },
  {
    id: 'gtm-pm-1',
    title: 'Product Marketing Manager',
    department: 'Go-to-Market',
    location: 'Remote',
    type: 'Full-time',
    compensation: '$120k–$160k + equity',
    description:
      'Tell the story—clear, benefit‑focused positioning across site, email, and launches.',
    responsibilities: [
      'Craft messaging and narratives that resonate with target segments',
      'Own launch plans and measure impact',
      'Partner with product to translate features into outcomes',
    ],
    requirements: [
      '3+ years in product marketing at a developer or productivity company',
      'Excellent writing and structure',
      'Portfolio of launch/positioning work',
    ],
  },
  {
    id: 'support-1',
    title: 'Customer Support Specialist (Contract)',
    department: 'Support',
    location: 'Remote (Americas/Europe timezones)',
    type: 'Contract',
    compensation: '$40–$60/hr',
    description:
      'Be the first line of help for our customers. You’ll triage, resolve, and turn feedback into improvements.',
    responsibilities: [
      'Own first‑response across email and in‑app support',
      'Document solutions and flag recurring issues',
      'Collaborate with engineering to improve product quality',
    ],
    requirements: [
      'Excellent written communication',
      'Experience with support tooling and triage',
      'Empathy and ownership mindset',
    ],
  },
];

export const VALUES: { title: string; description: string }[] = [
  {
    title: 'Ship to learn',
    description: 'Bias to action. Iterate with real usage, not hypotheticals.',
  },
  {
    title: 'Quality first',
    description: 'We sweat details—performance, a11y, and UX clarity.',
  },
  {
    title: 'Own the outcome',
    description: 'We pick up the broom. Problems are shared; wins are shared.',
  },
  {
    title: 'Be direct, be kind',
    description: 'Clear, respectful feedback. Debate ideas, not people.',
  },
];

export const BENEFITS: { title: string; items: string[] }[] = [
  {
    title: 'Comp & Equity',
    items: [
      'Competitive salary',
      'Meaningful early equity',
      'Annual compensation review',
    ],
  },
  {
    title: 'Work & Life',
    items: [
      'Remote‑first flexibility',
      'Generous PTO & company resets',
      'Hardware & home office stipend',
    ],
  },
  {
    title: 'Health & Wellness',
    items: [
      'Health, dental, vision (country‑dependent)',
      'Mental health support',
      'Fitness stipend',
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do you hire remotely?',
    a: 'Yes, we are remote‑first with a preference for UTC‑1 to UTC+4 overlap.',
  },
  {
    q: 'What does the interview process look like?',
    a: 'Intro chat, role deep‑dive, practical exercise, founder conversation, offer.',
  },
  {
    q: 'Do you sponsor visas?',
    a: 'We can sponsor in select countries on a case‑by‑case basis.',
  },
];
