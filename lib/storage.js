// Wraps chrome.storage.local. Tested in node by mocking globalThis.chrome.

const STORAGE_KEY = 'state';

export function getDefaultState() {
  return {
    schemaVersion: 1,
    enabled: false,
    proxy: null,
    presets: {},
    customDomains: [],
    // RU-services bypass: built-in categories (lib/ru-domains.js) always
    // routed DIRECT, plus user-added domains — see lib/pac.js.
    ruBypass: { enabled: true, categories: {} },
    customRuDomains: [],
    lang: 'RU'
  };
}

function normalizeDomainList(list) {
  if (!list) return [];
  return list.map(d => {
    if (typeof d === 'string') return { value: d, mode: 'suffix', enabled: true };
    if (d.enabled === undefined) d.enabled = true;
    return d;
  });
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
  saved.customDomains = normalizeDomainList(saved.customDomains);

  // Migrate in RU-services bypass fields for state saved before this feature existed.
  if (!saved.ruBypass) saved.ruBypass = { enabled: true, categories: {} };
  if (!saved.ruBypass.categories) saved.ruBypass.categories = {};
  saved.customRuDomains = normalizeDomainList(saved.customRuDomains);

  return saved;
}

export async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
