import { getState, persist, completeOnboarding, updateSettings } from '../state.js';
import { CATEGORIES, FREQUENCIES } from '../data.js';
import { navigate } from '../router.js';

let step = 0;
let contactsConnected = false;
let selectedIds = null;

function initSelection() {
  if (selectedIds === null) {
    selectedIds = new Set(getState().people.map((p) => p.id));
  }
}

function renderWelcome(container) {
  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-emoji">💛</div>
      <div class="onboarding-title">Let's help you stay close to the people who matter</div>
      <div class="onboarding-sub">We'll connect your contacts so you never have to build a profile by hand.</div>
      <button class="btn btn-primary" id="connect-contacts" ${contactsConnected ? 'disabled' : ''}>
        ${contactsConnected ? 'Contacts connected ✓' : 'Connect contacts'}
      </button>
      <div id="connect-status"></div>
      <button class="btn btn-primary onboarding-next" id="next-btn" ${contactsConnected ? '' : 'disabled'}>Continue</button>
    </div>
  `;

  container.querySelector('#connect-contacts').addEventListener('click', (e) => {
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    container.querySelector('#connect-status').innerHTML = `<div class="spinner"></div>`;
    setTimeout(() => {
      contactsConnected = true;
      renderWelcome(container);
    }, 900);
  });

  const next = container.querySelector('#next-btn');
  if (next) next.addEventListener('click', () => goToStep(container, 1));
}

function renderSelectPeople(container) {
  initSelection();
  const people = getState().people;
  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-title">Who do you want to stay close to?</div>
      <div class="onboarding-sub">We found these people — deselect anyone you'd rather leave out.</div>
      <div class="onboarding-list">
        ${people
          .map(
            (p) => `
          <label class="select-row">
            <input type="checkbox" data-person-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''} />
            <span class="avatar">${p.initials}</span>
            <span>${p.name}</span>
          </label>`
          )
          .join('')}
      </div>
      <button class="btn btn-primary onboarding-next" id="next-btn">Continue</button>
    </div>
  `;

  container.querySelectorAll('[data-person-id]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.personId);
      else selectedIds.delete(cb.dataset.personId);
    });
  });

  container.querySelector('#next-btn').addEventListener('click', () => goToStep(container, 2));
}

function renderCategories(container) {
  const people = getState().people.filter((p) => selectedIds.has(p.id));
  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-title">How do you know them?</div>
      <div class="onboarding-sub">Grouping helps us understand who's who — feel free to adjust.</div>
      <div class="onboarding-list">
        ${people
          .map(
            (p) => `
          <div class="category-row">
            <div class="category-row-name">${p.name}</div>
            <div class="chip-row">
              ${CATEGORIES.map((c) => `<button type="button" class="chip ${p.categories.includes(c) ? 'chip--active' : ''}" data-person="${p.id}" data-cat="${c}">${c}</button>`).join('')}
            </div>
          </div>`
          )
          .join('')}
      </div>
      <button class="btn btn-primary onboarding-next" id="next-btn">Continue</button>
    </div>
  `;

  container.querySelectorAll('[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const person = getState().people.find((p) => p.id === chip.dataset.person);
      const cat = chip.dataset.cat;
      if (person.categories.includes(cat)) {
        person.categories = person.categories.filter((c) => c !== cat);
        chip.classList.remove('chip--active');
      } else {
        person.categories.push(cat);
        chip.classList.add('chip--active');
      }
      persist();
    });
  });

  container.querySelector('#next-btn').addEventListener('click', () => goToStep(container, 3));
}

function renderFrequencies(container) {
  const settings = getState().settings;
  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-title">How often do you want to connect?</div>
      <div class="onboarding-sub">Set a default per group — you can fine-tune individual people any time.</div>
      <div class="onboarding-list">
        ${CATEGORIES.map(
          (c) => `
          <div class="settings-row">
            <span>${c}</span>
            <select class="input input-inline" data-cat-freq="${c}">
              ${FREQUENCIES.map((f) => `<option value="${f.key}" ${settings.defaultFrequencyByCategory[c] === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
            </select>
          </div>`
        ).join('')}
      </div>
      <button class="btn btn-primary onboarding-next" id="next-btn">Continue</button>
    </div>
  `;

  container.querySelectorAll('[data-cat-freq]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      settings.defaultFrequencyByCategory[sel.dataset.catFreq] = e.target.value;
      updateSettings({ defaultFrequencyByCategory: settings.defaultFrequencyByCategory });
    });
  });

  container.querySelector('#next-btn').addEventListener('click', () => goToStep(container, 4));
}

function renderDates(container) {
  const people = getState().people.filter((p) => selectedIds.has(p.id));
  const dates = people.flatMap((p) => p.upcomingDates.map((d) => ({ ...d, personName: p.name })));
  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-title">Important dates we found</div>
      <div class="onboarding-sub">We'll remind you before these come up.</div>
      <div class="onboarding-list">
        ${
          dates.length
            ? dates
                .map(
                  (d) => `
          <div class="card">
            <div class="upcoming-icon">🎂</div>
            <div class="person-card-body">
              <div class="person-card-name">${d.label}</div>
              <div class="person-card-sub">${d.personName}</div>
            </div>
          </div>`
                )
                .join('')
            : `<div class="empty-hint">No dates detected yet — you can add them any time.</div>`
        }
      </div>
      <button class="btn btn-primary onboarding-next" id="finish-btn">Show my social pulse</button>
    </div>
  `;

  container.querySelector('#finish-btn').addEventListener('click', () => {
    const s = getState();
    s.people = s.people.filter((p) => selectedIds.has(p.id));
    persist();
    completeOnboarding();
    navigate('/home');
  });
}

const STEPS = [renderWelcome, renderSelectPeople, renderCategories, renderFrequencies, renderDates];

function goToStep(container, n) {
  step = n;
  STEPS[step](container);
}

export function render(container) {
  container.innerHTML = `
    <div class="onboarding-progress">
      ${STEPS.map((_, i) => `<span class="progress-dot ${i <= step ? 'progress-dot--active' : ''}"></span>`).join('')}
    </div>
    <div id="onboarding-body"></div>
  `;
  STEPS[step](container.querySelector('#onboarding-body'));
}
