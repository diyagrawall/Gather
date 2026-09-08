import { buildSeedState } from './data.js';
import { extractMemory } from './ai-sim.js';

const STORAGE_KEY = 'sla_prototype_state_v1';

let state = null;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load state, reseeding', e);
  }
  return buildSeedState();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist state', e);
  }
}

export function getState() {
  if (!state) state = load();
  return state;
}

export function resetAll() {
  state = buildSeedState();
  persist();
}

export function getPerson(id) {
  return getState().people.find((p) => p.id === id) || null;
}

export function getGroup(id) {
  return getState().groups.find((g) => g.id === id) || null;
}

export function getEntity(id, isGroup) {
  return isGroup ? getGroup(id) : getPerson(id);
}

export function getAllEntities() {
  const s = getState();
  return [
    ...s.people.map((p) => ({ ...p, isGroup: false })),
    ...s.groups.map((g) => ({ ...g, isGroup: true, lastContactDate: g.lastGroupContactDate })),
  ];
}

export function addPerson({ name, categories, connectionFrequency }) {
  const s = getState();
  const person = {
    id: uid('p'),
    name,
    initials: name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    categories,
    connectionFrequency,
    lastContactDate: new Date().toISOString(),
    memories: [],
    upcomingDates: [],
    interactionLog: [],
  };
  s.people.push(person);
  persist();
  return person;
}

export function updatePerson(id, patch) {
  const p = getPerson(id);
  if (!p) return;
  Object.assign(p, patch);
  persist();
}

export function logInteraction(entityId, isGroup, outcome, note) {
  const entity = getEntity(entityId, isGroup);
  if (!entity) return;
  const entry = { id: uid('log'), date: new Date().toISOString(), outcome, note: note || '' };
  entity.interactionLog.push(entry);
  if (outcome !== "Didn't happen") {
    if (isGroup) entity.lastGroupContactDate = entry.date;
    else entity.lastContactDate = entry.date;
  }
  persist();
  return entry;
}

export function addMemoryFromText(entityId, isGroup, rawText) {
  const entity = getEntity(entityId, isGroup);
  if (!entity) return null;
  const extracted = extractMemory(rawText);
  const memory = {
    id: uid('mem'),
    rawText,
    createdAt: new Date().toISOString(),
    ...extracted,
  };
  entity.memories.push(memory);
  persist();
  return memory;
}

export function updateMemory(entityId, isGroup, memoryId, patch) {
  const entity = getEntity(entityId, isGroup);
  if (!entity) return;
  const mem = entity.memories.find((m) => m.id === memoryId);
  if (!mem) return;
  Object.assign(mem, patch);
  persist();
}

export function deleteMemory(entityId, isGroup, memoryId) {
  const entity = getEntity(entityId, isGroup);
  if (!entity) return;
  entity.memories = entity.memories.filter((m) => m.id !== memoryId);
  persist();
}

export function addPlannedAction(action) {
  const s = getState();
  const pa = { id: uid('plan'), status: 'planned', ...action };
  s.plannedActions.push(pa);
  persist();
  return pa;
}

export function updatePlannedAction(id, patch) {
  const s = getState();
  const pa = s.plannedActions.find((a) => a.id === id);
  if (!pa) return;
  Object.assign(pa, patch);
  persist();
}

export function getUpcomingItems(withinDays = 14) {
  const s = getState();
  const now = Date.now();
  const items = [];
  for (const p of s.people) {
    for (const d of p.upcomingDates) {
      const days = Math.round((new Date(d.date).getTime() - now) / 86400000);
      if (days >= 0 && days <= withinDays) {
        items.push({ ...d, personId: p.id, personName: p.name, isGroup: false, daysUntil: days });
      }
    }
  }
  for (const a of s.plannedActions) {
    if (a.status !== 'planned') continue;
    const days = Math.round((new Date(a.scheduledFor).getTime() - now) / 86400000);
    if (days >= -1 && days <= withinDays) {
      const entity = getEntity(a.personId, a.isGroup);
      items.push({
        id: a.id,
        type: a.type,
        label: `${a.type} — ${entity ? entity.name : 'Someone'}`,
        date: a.scheduledFor,
        personId: a.personId,
        personName: entity ? entity.name : 'Someone',
        isGroup: a.isGroup,
        daysUntil: days,
        isPlannedAction: true,
        draftMessageText: a.draftMessageText,
      });
    }
  }
  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items;
}

export function updateSettings(patch) {
  const s = getState();
  Object.assign(s.settings, patch);
  persist();
}

export function completeOnboarding() {
  updateSettings({ onboardingComplete: true });
}

export { persist };
