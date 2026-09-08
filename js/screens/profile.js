import { getState, updateSettings, resetAll } from '../state.js';
import { CATEGORIES, FREQUENCIES } from '../data.js';
import { openModal, closeModal, showToast } from '../components/modal.js';
import { navigate } from '../router.js';

export function render(container) {
  const s = getState();

  container.innerHTML = `
    <div class="screen profile-screen">
      <div class="screen-header">
        <div class="screen-title">Profile</div>
      </div>

      <div class="section">
        <div class="section-title">Default connection goals</div>
        ${CATEGORIES.map(
          (c) => `
          <div class="settings-row">
            <span>${c}</span>
            <select class="input input-inline" data-cat-freq="${c}">
              ${FREQUENCIES.map(
                (f) => `<option value="${f.key}" ${s.settings.defaultFrequencyByCategory[c] === f.key ? 'selected' : ''}>${f.label}</option>`
              ).join('')}
            </select>
          </div>`
        ).join('')}
      </div>

      <div class="section">
        <div class="section-title">Notifications</div>
        <div class="settings-row">
          <span>Birthdays &amp; important dates</span>
          <input type="checkbox" data-notif="birthdays" ${s.settings.notificationPrefs.birthdays ? 'checked' : ''} />
        </div>
        <div class="settings-row">
          <span>Needs attention nudges</span>
          <input type="checkbox" data-notif="needsAttention" ${s.settings.notificationPrefs.needsAttention ? 'checked' : ''} />
        </div>
        <div class="settings-row">
          <span>Planned connections</span>
          <input type="checkbox" data-notif="plans" ${s.settings.notificationPrefs.plans ? 'checked' : ''} />
        </div>
      </div>

      <div class="section">
        <button class="btn btn-secondary" id="reset-data">Reset prototype data</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-cat-freq]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const cat = sel.dataset.catFreq;
      s.settings.defaultFrequencyByCategory[cat] = e.target.value;
      updateSettings({ defaultFrequencyByCategory: s.settings.defaultFrequencyByCategory });
    });
  });

  container.querySelectorAll('[data-notif]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const key = cb.dataset.notif;
      s.settings.notificationPrefs[key] = e.target.checked;
      updateSettings({ notificationPrefs: s.settings.notificationPrefs });
    });
  });

  container.querySelector('#reset-data').addEventListener('click', () => {
    const card = openModal(`
      <div class="modal-title">Reset prototype data?</div>
      <div class="modal-sub">This clears everything and replays onboarding.</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="reset-cancel">Cancel</button>
        <button class="btn btn-primary" id="reset-confirm">Reset</button>
      </div>
    `);
    card.querySelector('#reset-cancel').addEventListener('click', closeModal);
    card.querySelector('#reset-confirm').addEventListener('click', () => {
      resetAll();
      closeModal();
      showToast('Prototype reset');
      navigate('/onboarding');
    });
  });
}
