import { registerScreen, startRouter } from './router.js';
import * as onboarding from './screens/onboarding.js';
import * as home from './screens/home.js';
import * as people from './screens/people.js';
import * as personDetail from './screens/personDetail.js';
import * as calendar from './screens/calendar.js';
import * as ai from './screens/ai.js';
import * as profile from './screens/profile.js';

registerScreen('onboarding', onboarding);
registerScreen('home', home);
registerScreen('people', {
  render: (container, params) => (params.id ? personDetail.render(container, params) : people.render(container, params)),
});
registerScreen('calendar', calendar);
registerScreen('ai', ai);
registerScreen('profile', profile);

startRouter();
