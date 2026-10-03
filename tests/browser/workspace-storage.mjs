/** Inspect controlled storage fixtures at the persisted profile boundary.
 * These helpers never invoke application methods or invent flight results. */
export async function workspaceBytes(page, keys, deviceKeys = []) {
  return page.evaluate(({ keys, deviceKeys }) => {
    const catalog = JSON.parse(localStorage.getItem('orbitlab.profiles.catalog.v1') ?? 'null');
    const id = sessionStorage.getItem('orbitlab.profiles.selected.v1') || catalog?.legacyId;
    const record = JSON.parse(localStorage.getItem(`orbitlab.profile.v1.${id}`) ?? 'null');
    if (!record) throw new Error('No persisted profile available for this fixture');
    return Object.fromEntries([
      ...keys.map((key) => [key, record.values[key] ?? null]),
      ...deviceKeys.map((key) => [key, localStorage.getItem(key)]),
    ]);
  }, { keys, deviceKeys });
}

export async function workspaceValue(page, key) {
  const values = await workspaceBytes(page, [key]);
  return values[key] === null ? null : JSON.parse(values[key]);
}

/** A documented fixture replaces raw saved bytes inside the current owner.
 * Identity and epoch remain fixed; normal profile mutations use the real UI. */
export async function putWorkspaceFixture(page, values) {
  await page.evaluate((values) => {
    const id = sessionStorage.getItem('orbitlab.profiles.selected.v1');
    if (!id) throw new Error('Fixture requires a selected durable profile');
    const key = `orbitlab.profile.v1.${id}`;
    const record = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!record) throw new Error('Fixture requires a persisted profile');
    Object.assign(record.values, values);
    record.revision++;
    localStorage.setItem(key, JSON.stringify(record));
  }, values);
}
