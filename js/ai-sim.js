import { frequencyDays } from './data.js';

export function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function nextWeekday(name) {
  const target = WEEKDAYS.indexOf(name);
  if (target === -1) return null;
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}

// ---------- Intent parsing ----------

const ACTIVITY_PATTERNS = [
  { key: 'video call', re: /video ?call|facetime|zoom/ },
  { key: 'call', re: /\bcall\b|phone (her|him|them)/ },
  { key: 'meetup', re: /meet ?up|hang ?out|grab (coffee|lunch|dinner)|coffee|see (her|him|them) in person/ },
  { key: 'message', re: /message|text|ping|dm\b/ },
];

const TIME_PHRASES = [
  { re: /\btonight\b/, label: 'tonight' },
  { re: /\btomorrow\b/, label: 'tomorrow' },
  { re: /this weekend/, label: 'this weekend' },
  { re: /\btoday\b/, label: 'today' },
  { re: /next week/, label: 'next week' },
];

function findEntityInText(text, entities) {
  const lower = text.toLowerCase();
  let best = null;
  for (const e of entities) {
    const name = e.name.toLowerCase();
    if (lower.includes(name)) {
      if (!best || name.length > best.name.length) best = e;
    }
  }
  if (best) return best;
  for (const e of entities) {
    if (e.categories) {
      for (const c of e.categories) {
        if (lower.includes(c.toLowerCase())) return e;
      }
    }
  }
  return null;
}

export function parseIntent(text, entities) {
  const lower = text.toLowerCase();

  const durationMatch = lower.match(/(\d+)\s*\+?\s*(minute|min|hour|hr)s?/);
  if (durationMatch) {
    const n = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    const minutes = unit.startsWith('h') ? n * 60 : n;
    return { mode: 'minutes', minutes, rawText: text };
  }

  let activity = null;
  for (const a of ACTIVITY_PATTERNS) {
    if (a.re.test(lower)) {
      activity = a.key;
      break;
    }
  }

  let timePhrase = null;
  for (const t of TIME_PHRASES) {
    if (t.re.test(lower)) {
      timePhrase = t.label;
      break;
    }
  }

  const entity = findEntityInText(text, entities);

  if (activity && entity) {
    return { mode: 'plan', entity, activity, timePhrase: timePhrase || 'soon', rawText: text };
  }

  if (entity && !activity) {
    return { mode: 'remember', entity, rawText: text };
  }

  if (activity && !entity) {
    return { mode: 'plan', entity: null, activity, timePhrase: timePhrase || 'soon', rawText: text };
  }

  return { mode: 'ask', rawText: text };
}

// ---------- Message drafting ----------

const CATCHUP_TEMPLATES = {
  warm: [
    "Hey {name}! It's been way too long — I'd love to catch up. Are you free {time}?",
    'Hi {name}, I was just thinking about you. Do you have time {time} to properly catch up?',
    "{name}!! We haven't talked in a bit — want to jump on a call {time}?",
  ],
  casual: [
    'yo {name} we NEED to catch up, you free {time}?',
    'heyy {name}, been ages! free {time} to chat?',
  ],
  funny: [
    "{name}! I've officially forgotten the sound of your voice — rescue me with a call {time}?",
    "{name}, this is your semi-official notice that we're overdue for a catch-up. {time} work?",
  ],
  short: ['Hey {name}, free {time} to catch up?', '{name} — call {time}?'],
};

const GROUP_TEMPLATES = {
  warm: [
    "Hey guys! We haven't properly caught up in forever 😭 I'm free {time} — anyone up for a video call?",
    'Hi everyone! Been way too long since we all talked — down for a call {time}?',
  ],
  casual: ['yo squad, video call {time}? we’re overdue', 'guyssss we need to catch up, {time}?'],
  funny: ['Emergency group catch-up requested. {time}. Attendance is emotionally mandatory.'],
  short: ['Group call {time}?', 'Catch up {time}?'],
};

const BIRTHDAY_TEMPLATES = [
  'Happy birthday {name}! 🎉 Hope your day is filled with all the good stuff. Let’s catch up soon!',
  'Happiest of birthdays, {name}! 🎂 Sending you so much love — can’t wait to celebrate properly.',
  'Happy birthday {name}!! 🎈 Thinking of you today — let’s plan something soon.',
];

const MEMORY_FOLLOWUP_TEMPLATES = [
  'Hey {name}! {memoryHook} — been meaning to check in, how’s everything?',
  '{name}! {memoryHook}? Would love to hear how it went.',
];

const MEETUP_TEMPLATES = {
  warm: [
    'Hey {name}! Want to do {activity} {time}? I found a few good spots 👀',
    "{name}! It's been way too long — free {time} for {activity}?",
  ],
  casual: ['yo {name} down for {activity} {time}?', '{name} wanna do {activity} {time}?'],
  funny: ["{name}, I've decided {activity} {time} is mandatory. No excuses 😤"],
  short: ['{name} — {activity} {time}?'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDraft({ name, isGroup, tone = 'warm', occasion = 'catchup', time = 'soon', memoryHook, activityLabel }) {
  let templates;
  if (occasion === 'birthday') templates = BIRTHDAY_TEMPLATES;
  else if (occasion === 'meetup') templates = MEETUP_TEMPLATES[tone] || MEETUP_TEMPLATES.warm;
  else if (occasion === 'memory' && memoryHook) templates = MEMORY_FOLLOWUP_TEMPLATES;
  else templates = isGroup ? GROUP_TEMPLATES[tone] || GROUP_TEMPLATES.warm : CATCHUP_TEMPLATES[tone] || CATCHUP_TEMPLATES.warm;

  const template = pick(templates);
  return template
    .replace(/\{name\}/g, name)
    .replace(/\{time\}/g, time)
    .replace(/\{activity\}/g, activityLabel || 'something fun')
    .replace(/\{memoryHook\}/g, memoryHook || 'wanted to check in');
}

// ---------- Memory extraction ----------

const TAG_KEYWORDS = [
  { words: ['interview'], tag: 'work' },
  { words: ['job', 'promotion', 'offer', 'work'], tag: 'work' },
  { words: ['trip', 'vacation', 'travel', 'goa', 'holiday'], tag: 'travel' },
  { words: ['birthday'], tag: 'birthday' },
  { words: ['exam', 'college', 'university', 'semester'], tag: 'college' },
  { words: ['sick', 'surgery', 'hospital', 'health'], tag: 'health' },
  { words: ['moving', 'move', 'relocating', 'apartment'], tag: 'life' },
  { words: ['wedding', 'engaged', 'engagement'], tag: 'life' },
];

const QUESTION_TEMPLATES = {
  work: 'How did the {topic} go?',
  travel: 'How is the {topic} coming along?',
  birthday: 'Did you do anything fun for the {topic}?',
  college: 'How is the {topic} going?',
  health: 'How are you feeling — any update on the {topic}?',
  life: 'How is the {topic} going?',
  default: "What's the latest on the {topic}?",
};

function extractDate(text) {
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (/next month/.test(lower)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }
  if (/next week/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }
  for (const day of WEEKDAYS) {
    if (lower.includes(day)) return nextWeekday(day);
  }
  return null;
}

function extractTitle(text, matchedEntry) {
  const words = text.replace(/[.!?]$/, '').split(/\s+/);
  if (matchedEntry) {
    const idx = words.findIndex((w) => matchedEntry.words.some((kw) => w.toLowerCase().includes(kw)));
    if (idx !== -1) {
      const kw = words[idx].replace(/[.,!?]/g, '');
      return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
  }
  return words.slice(0, 4).join(' ');
}

export function extractMemory(rawText) {
  const lower = rawText.toLowerCase();
  let matchedEntry = null;
  for (const entry of TAG_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) {
      matchedEntry = entry;
      break;
    }
  }
  const tag = matchedEntry ? matchedEntry.tag : null;
  const extractedTags = tag ? [tag] : [];
  const extractedTitle = extractTitle(rawText, matchedEntry);
  const extractedDate = extractDate(rawText);
  const template = QUESTION_TEMPLATES[tag] || QUESTION_TEMPLATES.default;
  const suggestedQuestion = template.replace('{topic}', extractedTitle.toLowerCase());

  return { extractedTitle, extractedTags, extractedDate, suggestedQuestion };
}

// ---------- Ranking ----------

function urgencyScore(entity) {
  const goalDays = frequencyDays(entity.connectionFrequency);
  const since = daysSince(entity.lastContactDate);
  return since / goalDays;
}

export function rankNeedsAttention(entities, limit = 5) {
  return entities
    .map((e) => ({ entity: e, score: urgencyScore(e), days: daysSince(e.lastContactDate) }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function rankDoingWell(entities, limit = 4) {
  return entities
    .map((e) => ({ entity: e, score: urgencyScore(e), days: daysSince(e.lastContactDate) }))
    .filter((r) => r.score < 0.6)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

const MINUTE_ACTIVITY_MAP = {
  5: 'message',
  15: 'call',
  30: 'call',
  60: 'meetup',
};

export function activityForMinutes(minutes) {
  if (minutes <= 5) return 'message';
  if (minutes <= 15) return 'call';
  if (minutes <= 30) return 'call';
  return 'meetup';
}

export function suggestForMinutes(minutes, entities, limit = 3) {
  return entities
    .map((e) => ({ entity: e, score: urgencyScore(e), days: daysSince(e.lastContactDate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({
      ...r,
      rationale: `${r.days} day${r.days === 1 ? '' : 's'} since you last connected`,
    }));
}
