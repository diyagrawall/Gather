export const CATEGORIES = ['Family', 'Close Friends', 'Friends', 'College', 'Work', 'Long Distance', 'Other'];

export const FREQUENCIES = [
  { key: 'often', label: 'Often', days: 3 },
  { key: 'weekly', label: 'Weekly', days: 7 },
  { key: 'biweekly', label: 'Every 2 weeks', days: 14 },
  { key: 'monthly', label: 'Monthly', days: 30 },
  { key: 'occasionally', label: 'Occasionally', days: 60 },
];

export function frequencyDays(key) {
  const f = FREQUENCIES.find((f) => f.key === key);
  return f ? f.days : 30;
}

export function frequencyLabel(key) {
  const f = FREQUENCIES.find((f) => f.key === key);
  return f ? f.label : 'Monthly';
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function daysAgoISO(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNowISO(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function makePerson({ name, categories, connectionFrequency, lastContactDaysAgo, memories = [], upcomingDates = [] }) {
  return {
    id: uid('p'),
    name,
    initials: initials(name),
    categories,
    connectionFrequency,
    lastContactDate: daysAgoISO(lastContactDaysAgo),
    memories: memories.map((m) => ({ id: uid('mem'), createdAt: daysAgoISO(m.createdDaysAgo ?? 5), ...m })),
    upcomingDates: upcomingDates.map((d) => ({ id: uid('date'), ...d })),
    interactionLog: [],
  };
}

export function buildSeedState() {
  const sarahInterviewDate = (() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilThursday = (4 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilThursday);
    return d.toISOString();
  })();

  const people = [
    makePerson({
      name: 'Mom',
      categories: ['Family'],
      connectionFrequency: 'weekly',
      lastContactDaysAgo: 6,
    }),
    makePerson({
      name: 'Dad',
      categories: ['Family'],
      connectionFrequency: 'biweekly',
      lastContactDaysAgo: 9,
    }),
    makePerson({
      name: 'Sarah',
      categories: ['Close Friends'],
      connectionFrequency: 'weekly',
      lastContactDaysAgo: 18,
      memories: [
        {
          rawText: "Sarah's interview is next Thursday.",
          extractedTitle: 'Interview',
          extractedTags: ['work'],
          extractedDate: sarahInterviewDate,
          suggestedQuestion: 'How did your interview go?',
          createdDaysAgo: 10,
        },
        {
          rawText: 'Sarah is planning a Goa trip with her friends.',
          extractedTitle: 'Goa trip',
          extractedTags: ['travel'],
          extractedDate: null,
          suggestedQuestion: 'How are the Goa trip plans coming along?',
          createdDaysAgo: 16,
        },
      ],
    }),
    makePerson({
      name: 'Riya',
      categories: ['Friends'],
      connectionFrequency: 'monthly',
      lastContactDaysAgo: 12,
      upcomingDates: [
        { type: 'Birthday', label: "Riya's birthday", date: daysFromNowISO(3), recurring: true },
      ],
    }),
    makePerson({
      name: 'Arjun',
      categories: ['College'],
      connectionFrequency: 'monthly',
      lastContactDaysAgo: 21,
      memories: [
        {
          rawText: 'Arjun is moving to Bangalore next month for a new job.',
          extractedTitle: 'Moving to Bangalore',
          extractedTags: ['life', 'work'],
          extractedDate: daysFromNowISO(28),
          suggestedQuestion: 'How are the plans for moving to Bangalore coming along?',
          createdDaysAgo: 4,
        },
        {
          rawText: "Arjun is nervous about starting his new job.",
          extractedTitle: 'New job nerves',
          extractedTags: ['work'],
          extractedDate: null,
          suggestedQuestion: 'How are you feeling about the new job?',
          createdDaysAgo: 4,
        },
      ],
    }),
    makePerson({
      name: 'Priya',
      categories: ['Work'],
      connectionFrequency: 'occasionally',
      lastContactDaysAgo: 40,
    }),
    makePerson({
      name: 'Kabir',
      categories: ['Long Distance', 'Friends'],
      connectionFrequency: 'monthly',
      lastContactDaysAgo: 35,
    }),
    makePerson({
      name: 'Neha',
      categories: ['Other', 'Friends'],
      connectionFrequency: 'occasionally',
      lastContactDaysAgo: 50,
    }),
  ];

  const arjun = people.find((p) => p.name === 'Arjun');
  const riya = people.find((p) => p.name === 'Riya');

  const groups = [
    {
      id: uid('g'),
      name: 'College Friends',
      memberPersonIds: [arjun.id, riya.id],
      connectionFrequency: 'biweekly',
      lastGroupContactDate: daysAgoISO(24),
      memories: [],
      interactionLog: [],
    },
  ];

  return {
    settings: {
      onboardingComplete: false,
      defaultFrequencyByCategory: {
        Family: 'weekly',
        'Close Friends': 'weekly',
        Friends: 'monthly',
        College: 'monthly',
        Work: 'occasionally',
        'Long Distance': 'monthly',
        Other: 'occasionally',
      },
      notificationPrefs: { birthdays: true, needsAttention: true, plans: true },
    },
    people,
    groups,
    plannedActions: [],
  };
}
