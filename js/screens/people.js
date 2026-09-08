import { getState, addPerson } from '../state.js';
import { daysSince } from '../ai-sim.js';
import { CATEGORIES, FREQUENCIES } from '../data.js';
import { openModal, closeModal, showToast } from '../components/modal.js';
import { rerenderCurrent, navigate } from '../router.js';

let activeFilter = 'All';
let searchTerm = '';

export function render(container) {
  const s = getState();
  const filters = ['All', ...CATEGORIES];

  let people = s.people;
  if (activeFilter !== 'All') {
    people = people.filter((p) => p.categories.includes(activeFilter));
  }
  if (searchTerm) {
    people = people.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const groups = activeFilter === 'All' && !searchTerm ? s.groups : [];

  container.innerHTML = `
    <div class="screen people-screen">
      <div class="screen-header">
        <div class="screen-title">People</div>
        <button class="btn btn-small" id="add-person">+ Add</button>
      </div>
      <input class="input" id="people-search" placeholder="Search people..." value="${searchTerm}" />
      <div class="chip-row">
        ${filters.map((f) => `<button class="chip ${f === activeFilter ? 'chip--active' : ''}" data-filter="${f}">${f}</button>`).join('')}
      </div>
      <div class="section">
        ${groups
          .map(
            (g) => `
          <a class="card person-card" href="#/people" data-group-id="${g.id}">
            <div class="avatar">👥</div>
            <div class="person-card-body">
              <div class="person-card-name">${g.name}</div>
              <div class="person-card-sub">${daysSince(g.lastGroupContactDate)} days since group catch-up</div>
            </div>
          </a>`
          )
          .join('')}
        ${people
          .map(
            (p) => `
          <a class="card person-card" href="#/people/${p.id}">
            <div class="avatar">${p.initials}</div>
            <div class="person-card-body">
              <div class="person-card-name">${p.name}</div>
              <div class="person-card-sub">${p.categories.join(' · ')} — ${daysSince(p.lastContactDate)}d</div>
            </div>
          </a>`
          )
          .join('')}
        ${!people.length && !groups.length ? `<div class="empty-hint">No one here yet.</div>` : ''}
      </div>
    </div>
  `;

  container.querySelectorAll('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      rerenderCurrent();
    });
  });

  container.querySelector('#people-search').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    rerenderCurrent();
  });

  container.querySelectorAll('[data-group-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`/people/group-${el.dataset.groupId}`);
    });
  });

  container.querySelector('#add-person').addEventListener('click', openAddPersonModal);
}

function openAddPersonModal() {
  const card = openModal(`
    <div class="modal-title">Add someone</div>
    <label class="field-label">Name</label>
    <input class="input" id="new-name" placeholder="Their name" />
    <label class="field-label">Categories</label>
    <div class="chip-row" id="new-categories">
      ${CATEGORIES.map((c) => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}
    </div>
    <label class="field-label">How often do you want to connect?</label>
    <select class="input" id="new-frequency">
      ${FREQUENCIES.map((f) => `<option value="${f.key}">${f.label}</option>`).join('')}
    </select>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-add">Cancel</button>
      <button class="btn btn-primary" id="confirm-add">Add person</button>
    </div>
  `);

  const selectedCats = new Set();
  card.querySelectorAll('[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      if (selectedCats.has(cat)) {
        selectedCats.delete(cat);
        chip.classList.remove('chip--active');
      } else {
        selectedCats.add(cat);
        chip.classList.add('chip--active');
      }
    });
  });

  card.querySelector('#cancel-add').addEventListener('click', closeModal);
  card.querySelector('#confirm-add').addEventListener('click', () => {
    const name = card.querySelector('#new-name').value.trim();
    if (!name) return;
    const categories = selectedCats.size ? Array.from(selectedCats) : ['Other'];
    const connectionFrequency = card.querySelector('#new-frequency').value;
    addPerson({ name, categories, connectionFrequency });
    closeModal();
    showToast(`${name} added`);
    rerenderCurrent();
  });
}
