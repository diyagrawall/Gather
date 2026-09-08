import { getUpcomingItems, getEntity } from '../state.js';
import { connectFlow } from '../components/flows.js';
import { navigate } from '../router.js';

function bucketLabel(daysUntil) {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil <= 7) return 'This week';
  if (daysUntil <= 30) return 'This month';
  return 'Later';
}

export function render(container) {
  const items = getUpcomingItems(90);
  const buckets = { Today: [], 'This week': [], 'This month': [], Later: [] };
  items.forEach((item) => buckets[bucketLabel(item.daysUntil)].push(item));

  container.innerHTML = `
    <div class="screen calendar-screen">
      <div class="screen-header">
        <div class="screen-title">Calendar</div>
      </div>
      ${Object.entries(buckets)
        .filter(([, list]) => list.length)
        .map(
          ([label, list]) => `
        <div class="section">
          <div class="section-title">${label}</div>
          ${list
            .map(
              (u) => `
            <div class="card" data-person-id="${u.personId}" data-is-group="${u.isGroup}" data-type="${u.type}">
              <div class="upcoming-icon">${u.type === 'Birthday' ? '🎂' : '📅'}</div>
              <div class="person-card-body">
                <div class="person-card-name">${u.label}</div>
                <div class="person-card-sub">${new Date(u.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
              <button class="pill-action" data-cal-action="${u.personId}" data-is-group="${u.isGroup}" data-type="${u.type}">Draft</button>
            </div>`
            )
            .join('')}
        </div>`
        )
        .join('') || `<div class="empty-hint">Nothing on the calendar yet.</div>`}
    </div>
  `;

  container.querySelectorAll('[data-cal-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entity = getEntity(btn.dataset.calAction, btn.dataset.isGroup === 'true');
      if (!entity) return;
      const occasion = btn.dataset.type === 'Birthday' ? 'birthday' : 'catchup';
      connectFlow({ ...entity, isGroup: btn.dataset.isGroup === 'true' }, { occasion });
    });
  });

  container.querySelectorAll('.card[data-person-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const isGroup = card.dataset.isGroup === 'true';
      if (!isGroup) navigate(`/people/${card.dataset.personId}`);
      else navigate('/people');
    });
  });
}
