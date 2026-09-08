import { generateDraft } from '../ai-sim.js';
import { showToast } from './modal.js';

export function mountDraftCard(container, { entity, occasion = 'catchup', time = 'soon', memoryHook, onDone }) {
  let tone = 'warm';
  let text = generateDraft({ name: entity.name, isGroup: entity.isGroup, tone, occasion, time, memoryHook });

  const el = document.createElement('div');
  el.className = 'card draft-card';
  container.appendChild(el);

  function renderInner() {
    el.innerHTML = `
      <div class="draft-card-label">Here's a message you could send</div>
      <div class="draft-card-text">${text}</div>
      <div class="draft-card-tones">
        <button class="chip" data-tone="short">Shorter</button>
        <button class="chip" data-tone="casual">More casual</button>
        <button class="chip" data-tone="funny">Funnier</button>
        <button class="chip" data-regen="1">🔁 Regenerate</button>
      </div>
      <div class="draft-card-actions">
        <button class="btn btn-secondary" data-copy="1">Copy</button>
        ${onDone ? '<button class="btn btn-primary" data-done="1">Mark as done</button>' : ''}
      </div>
    `;

    el.querySelectorAll('[data-tone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tone = btn.dataset.tone;
        text = generateDraft({ name: entity.name, isGroup: entity.isGroup, tone, occasion, time, memoryHook });
        renderInner();
      });
    });
    el.querySelector('[data-regen]').addEventListener('click', () => {
      text = generateDraft({ name: entity.name, isGroup: entity.isGroup, tone, occasion, time, memoryHook });
      renderInner();
    });
    el.querySelector('[data-copy]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        // clipboard may be unavailable in some contexts; fail silently for the demo
      }
      showToast('Message copied');
    });
    const doneBtn = el.querySelector('[data-done]');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => onDone(text));
    }
  }

  renderInner();
  return el;
}
