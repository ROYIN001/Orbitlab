/**
 * The settings a lesson locks, greyed out in the setup panel (roadmap E03).
 *
 * The panel rebuilds its controls on almost every edit, so the locks are
 * re-applied whenever its contents change (a MutationObserver) rather than by
 * the panel itself: the panel does not know lessons exist. A locked value can
 * still be changed from outside (a mission link, WebMCP); the grader checks
 * the flight kept it, so that only fails the lesson, it cannot pass it.
 */
import { t } from '../../i18n';
import type { LockKey } from '../../lessons/types';

/** The controls of each lockable setting, as selectors inside the setup panel. */
function selectors(key: LockKey): string[] {
  const label = (k: string) => `[aria-label="${CSS.escape(t(k))}"]`;
  switch (key) {
    case 'setup.vehicle': return [label('setup.vehicle')];
    case 'setup.site': return [label('setup.site')];
    case 'setup.satellite': return [label('setup.satellite')];
    case 'setup.payloadMass': return [label('setup.payloadMass')];
    case 'setup.orbit': return ['.orbit-presets button', ...['setup.perigee', 'setup.apogee', 'setup.inclination', 'setup.argPerigee', 'setup.raanMode', 'setup.raan', 'setup.ltan', 'setup.rendezvous', 'setup.rendezvousPort'].map(label)];
    case 'setup.launchTime': return [label('setup.launchTime'), '#launch-windows button'];
    case 'setup.failure': return ['details[data-section="failure"] select', 'details[data-section="failure"] input'];
    case 'setup.dynamics.model': return [label('setup.dynamics.model')];
    case 'setup.guidance': return ['details[data-section="guidance"] input', 'details[data-section="guidance"] button', 'details[data-section="explicit"] select', 'details[data-section="explicit"] input'];
    case 'setup.boosterRecovery': return ['details[data-section="options"] input', 'details[data-section="options"] select'];
    case 'setup.faults': return ['details[data-section="faults"] select', 'details[data-section="faults"] input:not([data-lesson-fdir])', 'details[data-section="faults"] button'];
  }
}

export class PanelLocks {
  private locks: readonly LockKey[] = [];
  private readonly observer: MutationObserver;
  private applying = false;

  constructor(private readonly root: HTMLElement) {
    this.observer = new MutationObserver(() => { if (!this.applying) this.apply(); });
  }

  set(locks: readonly LockKey[]): void {
    this.locks = locks;
    this.observer.disconnect();
    if (locks.length) this.observer.observe(this.root, { childList: true, subtree: true });
    this.apply();
  }

  /** Grey out the locked controls, and the quick starts that would replace the lesson's mission. */
  apply(): void {
    this.applying = true;
    try {
      this.root.querySelectorAll('.lesson-locked').forEach((el) => el.classList.remove('lesson-locked'));
      if (!this.locks.length) return;
      // The FDIR switch stays the student's to choose, even with the failures locked.
      this.root.querySelectorAll<HTMLInputElement>('details[data-section="faults"] label.checkbox input').forEach((box) => {
        if (box.parentElement?.textContent?.includes(t('setup.faults.fdir'))) box.dataset.lessonFdir = '1';
      });
      const title = t('lesson.locked');
      const lockOne = (el: HTMLElement): void => {
        (el as HTMLInputElement).disabled = true;
        el.title = title;
        (el.closest('label') ?? el).classList.add('lesson-locked');
      };
      for (const key of this.locks) for (const sel of selectors(key)) this.root.querySelectorAll<HTMLElement>(sel).forEach(lockOne);
      this.root.querySelectorAll<HTMLElement>('#quickstart-missions button').forEach(lockOne);
    } finally {
      // the observer's own records of these attribute changes are not childList ones
      this.applying = false;
    }
  }
}
