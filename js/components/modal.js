let overlayEl = null;

export function openModal(innerHTML, { onMount } = {}) {
  closeModal();
  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `<div class="modal-card">${innerHTML}</div>`;
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });
  document.body.appendChild(overlayEl);
  if (onMount) onMount(overlayEl.querySelector('.modal-card'));
  return overlayEl.querySelector('.modal-card');
}

export function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}
