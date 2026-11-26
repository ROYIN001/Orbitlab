/**
 * Every dictionary in memory at once, by static import, for the unit tests
 * (vitest `setupFiles`) and tools that run outside the app. The app never
 * imports this module: it loads Russian and Thai through `./loader`.
 */
import { registerDict } from './index';
import { ru } from './ru';
import { th } from './th';

registerDict('ru', ru);
registerDict('th', th);
