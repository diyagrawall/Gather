import { openModal, closeModal, showToast } from './modal.js';
import { logInteraction, addMemoryFromText, updateMemory } from '../state.js';
import { extractMemory, daysSince } from '../ai-sim.js';
import { rerenderCurrent } from '../router.js';
import { mountDraftCard } from './draftCard.js';

export function memoryCaptureFlow(entity, { prefill = '' } = {}) {
  const card = openModal(`
    <div class="modal-title">Anything worth remembering?</div>
    <div class="modal-sub">Jot it down in your own words — we'll figure out the rest.</div>
    <textarea class="input textarea" id="memory-input" placeholder="e.g. Sarah's interview is next Thursday">${prefill}</textarea>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="memory-skip">Skip</button>
      <button class="btn btn-primary" id="memory-extract">Continue</button>
    </div>
  `);

  card.querySelector('#memory-skip').addEventListener('click', closeModal);
  card.querySelector('#memory-extract').addEventListener('click', () => {
    const text = card.querySelector('#memory-input').value.trim();
    if (!text) return closeModal();
    showExtractionPreview(entity, text);
  });
}

function showExtractionPreview(entity, rawText) {
  const extracted = extractMemory(rawText);
  const card = openModal(`
    <div class="modal-title">Here's what I picked up</div>
    <div class="extraction-preview">
      <label class="field-label">Title</label>
      <input class="input" id="ext-title" value="${extracted.extractedTitle}" />
      <label class="field-label">Tags</label>
      <input class="input" id="ext-tags" value="${extracted.extractedTags.join(', ')}" />
      <label class="field-label">Next time, ask...</label>
      <input class="input" id="ext-question" value="${extracted.suggestedQuestion}" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="ext-cancel">Cancel</button>
      <button class="btn btn-primary" id="ext-confirm">Save memory</button>
    </div>
  `);

  card.querySelector('#ext-cancel').addEventListener('click', closeModal);
  card.querySelector('#ext-confirm').addEventListener('click', () => {
    const title = card.querySelector('#ext-title').value.trim() || extracted.extractedTitle;
    const tags = card
      .querySelector('#ext-tags')
      .value.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const question = card.querySelector('#ext-question').value.trim();
    const saved = addMemoryFromText(entity.id, !!entity.isGroup, rawText);
    if (saved) {
      updateMemory(entity.id, !!entity.isGroup, saved.id, {
        extractedTitle: title,
        extractedTags: tags,
        suggestedQuestion: question,
      });
    }
    closeModal();
    showToast('Memory saved 💛');
    rerenderCurrent();
  });
}

export function connectFlow(entity, { occasion = 'catchup', time = 'soon', memoryHook } = {}) {
  const memories = entity.memories || [];
  const contextHTML = memories.length
    ? `
      <div class="context-panel">
        <div class="context-panel-label">Remember</div>
        <ul class="context-list">
          ${memories
            .slice(-3)
            .map((m) => `<li>${m.extractedTitle}${m.rawText ? ` — <span class="context-raw">${m.rawText}</span>` : ''}</li>`)
            .join('')}
        </ul>
        <div class="context-suggestion">You could ask: "${memories[memories.length - 1].suggestedQuestion}"</div>
      </div>`
    : '';

  const days = daysSince(entity.lastContactDate || entity.lastGroupContactDate);

  const card = openModal(`
    <div class="modal-title">${occasion === 'birthday' ? `Send ${entity.name} a birthday message` : `Reach out to ${entity.name}`}</div>
    <div class="modal-sub">${days} day${days === 1 ? '' : 's'} since you last connected</div>
    ${contextHTML}
    <div id="draft-mount"></div>
  `);
  const mountPoint = card.querySelector('#draft-mount');
  mountDraftCard(mountPoint, {
    entity,
    occasion,
    time,
    memoryHook: memoryHook || (memories.length ? memories[memories.length - 1].extractedTitle.toLowerCase() : undefined),
    onDone: () => {
      closeModal();
      interactionConfirmFlow(entity, { offerMemory: occasion !== 'birthday' });
    },
  });
}

export function interactionConfirmFlow(entity, { afterLog, offerMemory = true } = {}) {
  const card = openModal(`
    <div class="modal-title">How did it go?</div>
    <div class="modal-sub">with ${entity.name}</div>
    <div class="outcome-row">
      <button class="btn btn-secondary outcome-btn" data-outcome="Great">😄 Great</button>
      <button class="btn btn-secondary outcome-btn" data-outcome="Good">🙂 Good</button>
      <button class="btn btn-secondary outcome-btn" data-outcome="Didn't happen">😕 Didn't happen</button>
    </div>
  `);

  card.querySelectorAll('.outcome-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const outcome = btn.dataset.outcome;
      logInteraction(entity.id, !!entity.isGroup, outcome);
      closeModal();
      rerenderCurrent();
      if (afterLog) afterLog(outcome);
      if (outcome !== "Didn't happen" && offerMemory) {
        setTimeout(() => memoryCaptureFlow(entity), 200);
      }
    });
  });
}
