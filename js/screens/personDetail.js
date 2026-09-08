import { getPerson, getGroup, deleteMemory, updatePerson } from '../state.js';
import { daysSince } from '../ai-sim.js';
import { FREQUENCIES } from '../data.js';
import { connectFlow, interactionConfirmFlow, memoryCaptureFlow } from '../components/flows.js';
import { meetupFlow } from '../components/meetupFlow.js';
import { navigate, rerenderCurrent } from '../router.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function render(container, { id }) {
  if (!id) {
    navigate('/people');
    return;
  }

  let entity, isGroup;
  if (id.startsWith('group-')) {
    entity = getGroup(id.replace('group-', ''));
    isGroup = true;
  } else {
    entity = getPerson(id);
    isGroup = false;
  }

  if (!entity) {
    container.innerHTML = `<div class="empty-state">Not found.</div>`;
    return;
  }

  const days = daysSince(isGroup ? entity.lastGroupContactDate : entity.lastContactDate);
  const members = isGroup
    ? entity.memberPersonIds.map((mid) => getPerson(mid)).filter(Boolean)
    : [];

  container.innerHTML = `
    <div class="screen person-detail-screen">
      <button class="back-btn" id="back-btn">← Back</button>
      <div class="detail-header">
        <div class="avatar avatar-lg">${isGroup ? '👥' : entity.initials}</div>
        <div class="detail-name">${entity.name}</div>
        <div class="detail-sub">${days} days since ${isGroup ? 'the group last caught up' : 'you connected'}</div>
        ${!isGroup ? `<div class="chip-row">${entity.categories.map((c) => `<span class="chip chip--static">${c}</span>`).join('')}</div>` : ''}
        ${isGroup ? `<div class="chip-row">${members.map((m) => `<span class="chip chip--static">${m.name}</span>`).join('')}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Connection goal</div>
        <select class="input" id="freq-select" ${isGroup ? 'disabled' : ''}>
          ${FREQUENCIES.map((f) => `<option value="${f.key}" ${entity.connectionFrequency === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
      </div>

      <div class="section actions-row">
        <button class="btn btn-primary" id="reach-out">Reach out</button>
        <button class="btn btn-secondary" id="log-interaction">Log interaction</button>
      </div>
      <div class="section">
        <button class="btn btn-secondary btn-block" id="plan-meetup">🎉 Plan a meetup</button>
      </div>

      <div class="section">
        <div class="section-title">Memories</div>
        <div id="memories-list">
          ${
            entity.memories.length
              ? entity.memories
                  .map(
                    (m) => `
            <div class="card memory-card">
              <div class="memory-title">${m.extractedTitle}</div>
              <div class="memory-raw">${m.rawText}</div>
              ${m.extractedTags.length ? `<div class="chip-row">${m.extractedTags.map((t) => `<span class="chip chip--static">${t}</span>`).join('')}</div>` : ''}
              <button class="link-btn" data-delete-memory="${m.id}">Delete</button>
            </div>`
                  )
                  .join('')
              : `<div class="empty-hint">Nothing saved yet.</div>`
          }
        </div>
        <button class="btn btn-secondary" id="add-memory">+ Add a memory</button>
      </div>

      <div class="section">
        <div class="section-title">Upcoming</div>
        ${
          !isGroup && entity.upcomingDates.length
            ? entity.upcomingDates
                .map(
                  (d) => `
          <div class="card">
            <div class="upcoming-icon">${d.type === 'Birthday' ? '🎂' : '📅'}</div>
            <div class="person-card-body">
              <div class="person-card-name">${d.label}</div>
              <div class="person-card-sub">${formatDate(d.date)}</div>
            </div>
          </div>`
                )
                .join('')
            : `<div class="empty-hint">No upcoming dates.</div>`
        }
      </div>
    </div>
  `;

  container.querySelector('#back-btn').addEventListener('click', () => navigate('/people'));

  container.querySelector('#freq-select').addEventListener('change', (e) => {
    if (!isGroup) updatePerson(entity.id, { connectionFrequency: e.target.value });
  });

  container.querySelector('#reach-out').addEventListener('click', () => {
    connectFlow({ ...entity, isGroup });
  });

  container.querySelector('#log-interaction').addEventListener('click', () => {
    interactionConfirmFlow({ ...entity, isGroup });
  });

  container.querySelector('#plan-meetup').addEventListener('click', () => {
    meetupFlow({ ...entity, isGroup });
  });

  container.querySelector('#add-memory').addEventListener('click', () => {
    memoryCaptureFlow({ ...entity, isGroup });
  });

  container.querySelectorAll('[data-delete-memory]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteMemory(entity.id, isGroup, btn.dataset.deleteMemory);
      rerenderCurrent();
    });
  });
}
