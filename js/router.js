import { getState } from './state.js';
import { renderTabBar } from './components/tabBar.js';

const screenModules = {};

export function registerScreen(name, mod) {
  screenModules[name] = mod;
}

function parseHash() {
  const hash = (location.hash || '#/home').slice(1);
  const parts = hash.split('/').filter(Boolean);
  return parts.length ? parts : ['home'];
}

export function navigate(path) {
  location.hash = path.startsWith('/') ? path : `/${path}`;
}

export function rerenderCurrent() {
  render();
}

function render() {
  const container = document.getElementById('app-content');
  const settings = getState().settings;
  const parts = parseHash();
  let [root, subId] = parts;

  if (!settings.onboardingComplete && root !== 'onboarding') {
    location.hash = '#/onboarding';
    return;
  }
  if (settings.onboardingComplete && root === 'onboarding') {
    root = 'home';
  }

  const tabBarEl = document.getElementById('tab-bar');
  if (root === 'onboarding') {
    tabBarEl.hidden = true;
  } else {
    tabBarEl.hidden = false;
    renderTabBar(root);
  }

  container.scrollTop = 0;

  const mod = screenModules[root];
  if (!mod) {
    container.innerHTML = `<div class="empty-state">Screen not found.</div>`;
    return;
  }
  mod.render(container, { id: subId });
}

window.addEventListener('hashchange', render);

export function startRouter() {
  render();
}
