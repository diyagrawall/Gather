import { getAllEntities, getUpcomingItems, getEntity, updatePlannedAction } from '../state.js';
import { rankNeedsAttention, rankDoingWell } from '../ai-sim.js';
import { connectFlow } from '../components/flows.js';
import { meetupFlow } from '../components/meetupFlow.js';
import { navigate } from '../router.js';

function isMeetup(item) {
  return (item.type || '').toLowerCase() === 'meetup';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatUpcomingDate(iso) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export function render(container) {
  const entities = getAllEntities();
  const needsAttention = rankNeedsAttention(entities, 4);
  const doingWell = rankDoingWell(entities, 3);
  const allUpcoming = getUpcomingItems(14);
  const todayPlans = allUpcoming.filter((u) => u.daysUntil <= 0);
  const upcoming = allUpcoming.filter((u) => u.daysUntil > 0).slice(0, 4);

  container.innerHTML = `
    <div class="screen home-screen">
      <div class="screen-header">
        <div class="greeting">${greeting()} 💛</div>
        <div class="greeting-sub">Here's your social pulse</div>
      </div>

      <div class="minutes-row">
        <div class="section-title">I have a few minutes</div>
        <div class="minutes-buttons">
          <button class="minute-btn" data-minutes="5">5 min</button>
          <button class="minute-btn" data-minutes="15">15 min</button>
          <button class="minute-btn" data-minutes="30">30 min</button>
          <button class="minute-btn" data-minutes="60">1 hr+</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Needs attention</div>
        ${
          needsAttention.length
            ? needsAttention
                .map(
                  (r) => `
          <div class="card attention-card" data-entity-id="${r.entity.id}" data-is-group="${r.entity.isGroup}">
            <div class="avatar">${r.entity.isGroup ? '👥' : r.entity.initials}</div>
            <div class="person-card-body">
              <div class="person-card-name">${r.entity.name}</div>
              <div class="person-card-sub">${r.days} days since ${r.entity.isGroup ? 'you last caught up' : 'connection'}</div>
            </div>
            <button class="pill-action" data-connect="${r.entity.id}" data-is-group="${r.entity.isGroup}">Reach out</button>
          </div>`
                )
                .join('')
            : `<div class="empty-hint">You're all caught up 💛</div>`
        }
      </div>

      ${
        todayPlans.length
          ? `<div class="section">
        <div class="section-title">Today's plans</div>
        ${todayPlans
          .map(
            (u) => `
          <div class="card plan-card" data-plan-id="${u.isPlannedAction ? u.id : ''}" data-person-id="${u.personId}" data-is-group="${u.isGroup}">
            <div class="upcoming-icon">${u.type === 'Birthday' ? '🎂' : isMeetup(u) ? '🎉' : '❤️'}</div>
            <div class="person-card-body">
              <div class="person-card-name">${isMeetup(u) ? `Meetup with ${u.personName}` : u.label}</div>
              <div class="person-card-sub">${u.daysUntil === 0 ? 'today' : 'overdue'}</div>
            </div>
            <button class="pill-action" data-plan-action="${u.isPlannedAction ? u.id : ''}" data-person-id="${u.personId}" data-is-group="${u.isGroup}" data-type="${u.type}">${isMeetup(u) ? 'Meetup?' : 'Open'}</button>
          </div>`
          )
          .join('')}
      </div>`
          : ''
      }

      <div class="section">
        <div class="section-title">Coming up</div>
        ${
          upcoming.length
            ? upcoming
                .map(
                  (u) => `
          <div class="card upcoming-card" data-person-id="${u.personId}" data-is-group="${u.isGroup}" data-item-type="${u.type}">
            <div class="upcoming-icon">${u.type === 'Birthday' ? '🎂' : isMeetup(u) ? '🎉' : '📅'}</div>
            <div class="person-card-body">
              <div class="person-card-name">${isMeetup(u) ? `Meetup with ${u.personName}` : u.label}</div>
              <div class="person-card-sub">${formatUpcomingDate(u.date)}</div>
            </div>
            ${
              isMeetup(u)
                ? `<button class="pill-action" data-plan-action="${u.isPlannedAction ? u.id : ''}" data-person-id="${u.personId}" data-is-group="${u.isGroup}" data-type="${u.type}">Meetup?</button>`
                : ''
            }
          </div>`
                )
                .join('')
            : `<div class="empty-hint">Nothing on the horizon yet.</div>`
        }
      </div>

      <div class="section">
        <div class="section-title">Doing well</div>
        ${doingWell
          .map(
            (r) => `
          <div class="card doing-well-card">
            <div class="avatar">${r.entity.isGroup ? '👥' : r.entity.initials}</div>
            <div class="person-card-body">
              <div class="person-card-name">${r.entity.name}</div>
              <div class="person-card-sub">Connected recently 💛</div>
            </div>
          </div>`
          )
          .join('')}
      </div>

      <button class="fab-ai" id="go-ai">✨ Ask the assistant</button>
    </div>
  `;

  container.querySelectorAll('.minute-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate(`/ai`);
      sessionStorage.setItem('pending_minutes', btn.dataset.minutes);
    });
  });

  container.querySelectorAll('[data-connect]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.connect;
      const isGroup = btn.dataset.isGroup === 'true';
      const entities2 = getAllEntities();
      const entity = entities2.find((en) => en.id === id && en.isGroup === isGroup);
      if (entity) connectFlow(entity);
    });
  });

  container.querySelectorAll('.attention-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.entityId;
      const isGroup = card.dataset.isGroup === 'true';
      if (!isGroup) navigate(`/people/${id}`);
      else navigate('/people');
    });
  });

  container.querySelectorAll('.upcoming-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.personId;
      const isGroup = card.dataset.isGroup === 'true';
      if (!isGroup) navigate(`/people/${id}`);
      else navigate('/people');
    });
  });

  container.querySelectorAll('[data-plan-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const personId = btn.dataset.personId;
      const isGroup = btn.dataset.isGroup === 'true';
      const planId = btn.dataset.planAction;
      const entity = getEntity(personId, isGroup);
      if (!entity) return;
      if ((btn.dataset.type || '').toLowerCase() === 'meetup') {
        meetupFlow({ ...entity, isGroup }, { plannedActionId: planId || undefined });
        return;
      }
      const occasion = btn.dataset.type === 'Birthday' ? 'birthday' : 'catchup';
      connectFlow({ ...entity, isGroup }, { occasion });
      if (planId) updatePlannedAction(planId, { status: 'done' });
    });
  });

  container.querySelectorAll('.plan-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.personId;
      const isGroup = card.dataset.isGroup === 'true';
      if (!isGroup) navigate(`/people/${id}`);
      else navigate('/people');
    });
  });

  container.querySelector('#go-ai').addEventListener('click', () => navigate('/ai'));
}
