const TABS = [
  { route: 'home', label: 'Home', icon: '🏠' },
  { route: 'people', label: 'People', icon: '👥' },
  { route: 'calendar', label: 'Calendar', icon: '📅' },
  { route: 'ai', label: 'AI', icon: '✨' },
  { route: 'profile', label: 'Profile', icon: '👤' },
];

export function renderTabBar(activeRoute) {
  const el = document.getElementById('tab-bar');
  el.innerHTML = TABS.map(
    (t) => `
    <a class="tab ${t.route === activeRoute ? 'tab--active' : ''}" href="#/${t.route}">
      <span class="tab-icon">${t.icon}</span>
      <span class="tab-label">${t.label}</span>
    </a>`
  ).join('');
}
