/**
 * The Build section's vehicle picker: a list of the catalogue's rockets,
 * today's fleet and the historical ones (and, from D02 on, the user's own
 * designs), with a button either side to step through them. The thin DOM
 * part of src/design/vehicle-picker.ts; the Watch level uses it to choose the
 * rocket it takes apart, and the builders will reuse it to choose the one to
 * start from.
 */
import { t } from '../../i18n';
import { PICKER_GROUPS, stepEntry, type PickerEntry, type PickerGroup } from '../../design/vehicle-picker';
import { button, el } from '../orbit/dom';

const GROUP_KEY: Record<PickerGroup, string> = {
  current: 'build.pick.current',
  historical: 'build.pick.historical',
  design: 'build.pick.design',
};

export class VehiclePicker {
  readonly root = el('div', 'bs-picker');
  private readonly select = el('select', 'bs-picker-select');
  private readonly prev: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private id = '';

  constructor(private entries: readonly PickerEntry[], private readonly onPick: (id: string) => void) {
    const label = el('label', 'bs-picker-label');
    label.htmlFor = 'bs-picker-select';
    this.select.id = 'bs-picker-select';
    this.select.addEventListener('change', () => this.choose(this.select.value));
    this.prev = button('bs-step', '‹', () => this.choose(stepEntry(this.entries, this.id, -1)));
    this.next = button('bs-step', '›', () => this.choose(stepEntry(this.entries, this.id, 1)));
    const row = el('div', 'bs-picker-row');
    row.append(this.prev, this.select, this.next);
    this.root.append(label, row);
    this.render();
  }

  /** Show `id` as chosen, without telling the owner. */
  set(id: string): void {
    this.id = id;
    this.select.value = id;
  }

  setEntries(entries: readonly PickerEntry[]): void {
    this.entries = entries;
    this.render();
  }

  /** Redraw in the interface language. */
  render(): void {
    const label = this.root.querySelector('label')!;
    label.textContent = t('setup.vehicle');
    this.prev.title = t('build.pick.prev');
    this.prev.setAttribute('aria-label', this.prev.title);
    this.next.title = t('build.pick.next');
    this.next.setAttribute('aria-label', this.next.title);
    this.select.replaceChildren(...PICKER_GROUPS.flatMap((g) => {
      const members = this.entries.filter((e) => e.group === g);
      if (!members.length) return [];
      const group = el('optgroup');
      group.label = t(GROUP_KEY[g]);
      group.append(...members.map((e) => {
        const o = el('option', undefined, e.label);
        o.value = e.id;
        return o;
      }));
      return [group];
    }));
    if (this.id) this.select.value = this.id;
  }

  private choose(id: string): void {
    this.set(id);
    this.onPick(id);
  }
}
