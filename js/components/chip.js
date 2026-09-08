export function chip(label, { active = false, dataAttrs = {} } = {}) {
  const attrs = Object.entries(dataAttrs)
    .map(([k, v]) => `data-${k}="${v}"`)
    .join(' ');
  return `<button class="chip ${active ? 'chip--active' : ''}" ${attrs}>${label}</button>`;
}
