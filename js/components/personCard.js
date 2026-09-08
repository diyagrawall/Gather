import { daysSince } from '../ai-sim.js';

export function personCard(entity, { subtitle, actionLabel, actionRoute } = {}) {
  const days = daysSince(entity.lastContactDate);
  const sub = subtitle || `${days} day${days === 1 ? '' : 's'} since you connected`;
  const href = entity.isGroup ? `#/people` : `#/people/${entity.id}`;
  return `
    <a class="card person-card" href="${href}">
      <div class="avatar">${entity.isGroup ? '👥' : entity.initials}</div>
      <div class="person-card-body">
        <div class="person-card-name">${entity.name}</div>
        <div class="person-card-sub">${sub}</div>
      </div>
      ${actionLabel ? `<span class="pill-action" data-action-route="${actionRoute || ''}">${actionLabel}</span>` : ''}
    </a>`;
}
