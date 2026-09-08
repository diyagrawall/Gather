import { openModal, closeModal } from './modal.js';
import { mountDraftCard } from './draftCard.js';
import { interactionConfirmFlow } from './flows.js';
import { updatePlannedAction } from '../state.js';

const ACTIVITY_META = {
  bowling: { emoji: '🎳', label: 'Bowling' },
  cafe: { emoji: '☕', label: 'Cafe' },
  movie: { emoji: '🎬', label: 'Movie' },
  other: { emoji: '✨', label: 'Something else' },
};

const VENUES = {
  bowling: [
    { name: 'Strike Zone Lanes', blurb: '0.8 mi away · 4.4★' },
    { name: 'Pinwheel Bowl', blurb: '1.2 mi away · 4.1★' },
    { name: 'Alley Cats', blurb: '2.0 mi away · 4.6★' },
  ],
  cafe: [
    { name: 'The Grind House', blurb: '0.3 mi away · 4.5★' },
    { name: 'Corner Bean', blurb: '0.6 mi away · 4.2★' },
    { name: 'Brew & Co.', blurb: '1.1 mi away · 4.7★' },
  ],
  movie: [
    { name: 'Downtown Cinema', blurb: '1.5 mi away · now showing' },
    { name: 'Riverside Multiplex', blurb: '2.3 mi away · now showing' },
  ],
};

const BOOKING_LINKS = {
  bowling: 'https://www.google.com/maps/search/bowling+alley+near+me',
  cafe: 'https://www.google.com/maps/search/cafes+near+me',
  movie: 'https://www.google.com/search?q=movie+showtimes+near+me',
};

export function meetupFlow(entity, { time = 'soon', plannedActionId } = {}) {
  const card = openModal(`<div id="meetup-body"></div>`);
  const body = card.querySelector('#meetup-body');
  renderActivityPicker(body, entity, time, plannedActionId);
}

function renderActivityPicker(body, entity, time, plannedActionId) {
  body.innerHTML = `
    <div class="modal-title">Meetup with ${entity.name}? 🎉</div>
    <div class="modal-sub">What do you want to do together?</div>
    <div class="activity-grid">
      ${Object.entries(ACTIVITY_META)
        .map(
          ([key, meta]) => `
        <button type="button" class="activity-tile" data-activity="${key}">
          <span class="activity-emoji">${meta.emoji}</span>
          <span>${meta.label}</span>
        </button>`
        )
        .join('')}
    </div>
  `;

  body.querySelectorAll('[data-activity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const activity = btn.dataset.activity;
      if (VENUES[activity]) renderVenueList(body, entity, time, activity, plannedActionId);
      else renderDraftStep(body, entity, time, activity, plannedActionId);
    });
  });
}

function renderVenueList(body, entity, time, activity, plannedActionId) {
  const meta = ACTIVITY_META[activity];
  const venues = VENUES[activity] || [];
  body.innerHTML = `
    <button type="button" class="link-btn" id="meetup-back">← Back</button>
    <div class="modal-title">${meta.emoji} ${meta.label} spots nearby</div>
    <div class="modal-sub">Illustrative picks for the prototype — tap Book to search real options nearby.</div>
    ${venues
      .map(
        (v) => `
      <div class="card venue-card">
        <div class="person-card-body">
          <div class="person-card-name">${v.name}</div>
          <div class="person-card-sub">${v.blurb}</div>
        </div>
        <button type="button" class="pill-action" data-book="${activity}">Book</button>
      </div>`
      )
      .join('')}
    <button type="button" class="btn btn-primary btn-block" id="meetup-continue">Continue — plan the invite</button>
  `;

  body.querySelector('#meetup-back').addEventListener('click', () => renderActivityPicker(body, entity, time, plannedActionId));
  body.querySelectorAll('[data-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.open(BOOKING_LINKS[activity], '_blank', 'noopener');
    });
  });
  body.querySelector('#meetup-continue').addEventListener('click', () => renderDraftStep(body, entity, time, activity, plannedActionId));
}

function renderDraftStep(body, entity, time, activity, plannedActionId) {
  const meta = ACTIVITY_META[activity] || ACTIVITY_META.other;
  body.innerHTML = `
    <button type="button" class="link-btn" id="meetup-back">← Back</button>
    <div class="modal-title">Invite ${entity.name}</div>
    <div id="meetup-draft-mount"></div>
  `;

  body.querySelector('#meetup-back').addEventListener('click', () => {
    if (VENUES[activity]) renderVenueList(body, entity, time, activity, plannedActionId);
    else renderActivityPicker(body, entity, time, plannedActionId);
  });

  mountDraftCard(body.querySelector('#meetup-draft-mount'), {
    entity,
    occasion: 'meetup',
    time,
    activityLabel: meta.label.toLowerCase(),
    onDone: () => {
      closeModal();
      if (plannedActionId) updatePlannedAction(plannedActionId, { status: 'done' });
      interactionConfirmFlow(entity);
    },
  });
}
