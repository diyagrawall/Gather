import { getAllEntities, getEntity } from '../state.js';
import { parseIntent, suggestForMinutes, activityForMinutes } from '../ai-sim.js';
import { connectFlow, memoryCaptureFlow } from '../components/flows.js';
import { meetupFlow } from '../components/meetupFlow.js';
import { rerenderCurrent } from '../router.js';

let thread = [
  {
    role: 'assistant',
    html: `Hi! Tell me how much time you have, who you'd like to reach out to, or anything you want me to remember.`,
  },
];

const SUGGESTIONS = [
  "I'm free tonight and want to video call my college friends",
  'I have 15 minutes',
  "Sarah's interview is next Thursday",
  'Draft a birthday message for Riya',
  'Let\'s grab coffee with Neha this weekend',
];

function pushAssistant(html) {
  thread.push({ role: 'assistant', html });
}

function pushUser(text) {
  thread.push({ role: 'user', html: text });
}

function handleMinutes(minutes) {
  const entities = getAllEntities();
  const suggestions = suggestForMinutes(minutes, entities, 3);
  const activity = activityForMinutes(minutes);
  if (!suggestions.length) {
    pushAssistant("You're all caught up — no one urgently needs a check-in right now 💛");
    return;
  }
  const html = `
    <div class="ai-card">
      <div class="ai-card-label">You have ${minutes} minutes. Here's who you could reach out to for a quick ${activity}:</div>
      ${suggestions
        .map(
          (s) => `<button class="card ai-suggestion" data-entity-id="${s.entity.id}" data-is-group="${s.entity.isGroup}" data-activity="${activity}">
            <div class="avatar">${s.entity.isGroup ? '👥' : s.entity.initials}</div>
            <div class="person-card-body">
              <div class="person-card-name">${s.entity.name}</div>
              <div class="person-card-sub">${s.rationale}</div>
            </div>
          </button>`
        )
        .join('')}
    </div>
  `;
  pushAssistant(html);
}

function handlePlan(parsed) {
  const entities = getAllEntities();
  if (!parsed.entity) {
    const suggestions = suggestForMinutes(15, entities, 3);
    const html = `
      <div class="ai-card">
        <div class="ai-card-label">Who would you like to ${parsed.activity} with?</div>
        ${suggestions
          .map(
            (s) => `<button class="chip" data-plan-entity="${s.entity.id}" data-is-group="${s.entity.isGroup}" data-activity="${parsed.activity}" data-time="${parsed.timePhrase}">${s.entity.name}</button>`
          )
          .join('')}
      </div>`;
    pushAssistant(html);
    return;
  }
  const isMeetup = parsed.activity === 'meetup';
  const html = `
    <div class="ai-card">
      <div class="ai-card-label">Got it — ${parsed.activity} with <strong>${parsed.entity.name}</strong> ${parsed.timePhrase}.</div>
      <button class="btn btn-primary" data-continue-plan="${parsed.entity.id}" data-is-group="${parsed.entity.isGroup}" data-time="${parsed.timePhrase}" data-activity="${parsed.activity}">${isMeetup ? 'Plan the meetup 🎉' : 'Draft a message'}</button>
    </div>`;
  pushAssistant(html);
}

function handleRemember(parsed) {
  memoryCaptureFlow(parsed.entity, { prefill: parsed.rawText });
  pushAssistant(`Got it — saving that about <strong>${parsed.entity.name}</strong>.`);
}

function handleAsk() {
  pushAssistant(
    `I can help you plan a connection, draft a message, remember something about someone, or find people to reach out to. Try "I have 15 minutes" or "call Mom tonight".`
  );
}

function handleInput(text) {
  pushUser(text);
  const entities = getAllEntities();
  const parsed = parseIntent(text, entities);
  if (parsed.mode === 'minutes') handleMinutes(parsed.minutes);
  else if (parsed.mode === 'plan') handlePlan(parsed);
  else if (parsed.mode === 'remember') handleRemember(parsed);
  else handleAsk();
  rerenderCurrent();
}

export function render(container) {
  const pendingMinutes = sessionStorage.getItem('pending_minutes');
  if (pendingMinutes) {
    sessionStorage.removeItem('pending_minutes');
    pushUser(`I have ${pendingMinutes} minutes`);
    handleMinutes(parseInt(pendingMinutes, 10));
  }

  container.innerHTML = `
    <div class="screen ai-screen">
      <div class="screen-header">
        <div class="screen-title">Assistant</div>
      </div>
      <div class="chip-row">
        ${SUGGESTIONS.map((s) => `<button class="chip" data-suggestion="${s}">${s}</button>`).join('')}
      </div>
      <div class="ai-thread" id="ai-thread">
        ${thread
          .map(
            (m) => `<div class="ai-message ai-message--${m.role}">${m.html}</div>`
          )
          .join('')}
      </div>
      <form class="ai-input-row" id="ai-form">
        <input class="input" id="ai-input" placeholder="Ask anything..." autocomplete="off" />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </div>
  `;

  const threadEl = container.querySelector('#ai-thread');
  threadEl.scrollTop = threadEl.scrollHeight;

  container.querySelectorAll('[data-suggestion]').forEach((chip) => {
    chip.addEventListener('click', () => handleInput(chip.dataset.suggestion));
  });

  container.querySelector('#ai-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector('#ai-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    handleInput(text);
  });

  container.querySelectorAll('.ai-suggestion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isGroup = btn.dataset.isGroup === 'true';
      const entity = getEntity(btn.dataset.entityId, isGroup);
      if (!entity) return;
      if (btn.dataset.activity === 'meetup') meetupFlow({ ...entity, isGroup });
      else connectFlow({ ...entity, isGroup });
    });
  });

  container.querySelectorAll('[data-plan-entity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entity = getEntity(btn.dataset.planEntity, btn.dataset.isGroup === 'true');
      if (!entity) return;
      handlePlan({ entity: { ...entity, isGroup: btn.dataset.isGroup === 'true' }, activity: btn.dataset.activity, timePhrase: btn.dataset.time });
      rerenderCurrent();
    });
  });

  container.querySelectorAll('[data-continue-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isGroup = btn.dataset.isGroup === 'true';
      const entity = getEntity(btn.dataset.continuePlan, isGroup);
      if (!entity) return;
      if (btn.dataset.activity === 'meetup') meetupFlow({ ...entity, isGroup }, { time: btn.dataset.time });
      else connectFlow({ ...entity, isGroup }, { time: btn.dataset.time });
    });
  });
}
