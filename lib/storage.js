// Wraps chrome.storage.local. Tested in node by mocking globalThis.chrome.

const STORAGE_KEY = 'state';

export function getDefaultState() {
  return {
    schemaVersion: 1,
    enabled: false,
    proxy: null,
    presets: {},
    customDomains: [],
    lang: 'RU'
  };
}

export async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const saved = result[STORAGE_KEY];
  if (!saved) return getDefaultState();

  // Merge: add any new presets that didn't exist when the user first installed.
  const defaults = getDefaultState();
  for (const [key, def] of Object.entries(defaults.presets)) {
    if (!saved.presets[key]) {
      saved.presets[key] = def;
    }
  }

  // Ensure custom domains have 'enabled' property
  if (saved.customDomains) {
    saved.customDomains = saved.customDomains.map(d => {
      if (typeof d === 'string') return { value: d, mode: 'suffix', enabled: true };
      if (d.enabled === undefined) d.enabled = true;
      return d;
    });
  }

  return saved;
}

export async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
