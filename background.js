import { loadState, saveState } from './lib/storage.js';
import { applyProxy, registerAuthListener } from './lib/proxy.js';
import { setIconState } from './lib/icon.js';
import { buildPacScript } from './lib/pac.js';

// 1. Auth listener
registerAuthListener();

// 2. Storage change → re-apply PAC and refresh icons.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes.state) return;
  const state = changes.state.newValue;
  await applyProxy(state);
  await refreshActiveTabIcon(state);
});

// 3. Tab activation & navigation
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const state = await loadState();
  await refreshTabIcon(tabId, state);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (changeInfo.status !== 'complete') return;
  const state = await loadState();
  await refreshTabIcon(tabId, state);
});

// 4. Initialization
(async function init() {
  const state = await loadState();
  
  // Sync services from config
  try {
    const res = await fetch(chrome.runtime.getURL('config/services.json'));
    const config = await res.json();
    
    let changed = false;
    config.services.forEach(service => {
      if (!state.presets[service.id]) {
        state.presets[service.id] = { enabled: service.enabled, domains: service.domains };
        changed = true;
      } else {
        // Update domains if they changed in config
        state.presets[service.id].domains = service.domains;
      }
    });

    if (changed) await saveState(state);
  } catch (err) {
    console.error('Failed to sync services:', err);
  }

  await applyProxy(state);
  await refreshActiveTabIcon(state);
})();

// --- helpers --------------------------------------------------------------

async function refreshActiveTabIcon(state) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await refreshTabIcon(tab.id, state);
}

async function refreshTabIcon(tabId, state) {
  if (!state || !state.enabled) {
    await setIconState(tabId, 'off');
    return;
  }
  if (!state.proxy || !state.proxy.host) {
    await setIconState(tabId, 'error', { reason: 'not configured' });
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    await setIconState(tabId, 'direct', { host: '(internal)' });
    return;
  }

  const host = new URL(tab.url).hostname;
  const isRouted = isHostRouted(host, state);
  if (isRouted) {
    await setIconState(tabId, 'routed', {
      host,
      country: state.proxy.lastTest?.country,
      latencyMs: state.proxy.lastTest?.latencyMs,
    });
  } else {
    await setIconState(tabId, 'direct', { host });
  }
}

function isHostRouted(host, state) {
  const pac = buildPacScript(state);
  if (!pac) return false;
  
  const presets = state.presets || {};
  for (const [key, p] of Object.entries(presets)) {
    if (!p.enabled) continue;
    for (const d of p.domains || []) {
      if (host === d || host.endsWith('.' + d)) return true;
    }
  }
  
  for (const e of state.customDomains || []) {
    const v = e.value;
    if (e.mode === 'wildcard') {
      if (host !== v && host.endsWith('.' + v)) return true;
    } else if (e.mode === 'exact') {
      if (host === v) return true;
    } else {
      if (host === v || host.endsWith('.' + v)) return true;
    }
  }
  return false;
}

// --- popup messaging ------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TEST_PROXY') {
    runProxyTest('https://ipinfo.io/json').then(sendResponse);
    return true; 
  }
});

async function runProxyTest(url) {
  const state = await loadState();
  if (!state.proxy?.host) return { ok: false, error: 'No proxy configured' };

  await chrome.proxy.settings.set({
    value: {
      mode: 'pac_script',
      pacScript: { data: buildAllThroughPac(state.proxy), mandatory: true },
    },
    scope: 'regular',
  });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return { ok: true, ip: data.ip, country: data.country };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    await applyProxy(state);
  }
}

function buildAllThroughPac(proxy) {
  const { scheme, host, port } = proxy;
  const directive = `${scheme.toUpperCase()} ${host}:${port}`;
  return `function FindProxyForURL(url, host) { return "${directive}"; }`;
}
