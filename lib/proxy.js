// Wraps chrome.proxy.settings.set/clear and chrome.webRequest.onAuthRequired.
// Listener registration is at the top level so it survives service-worker
// sleep — see spec §17.

import { loadState } from './storage.js';
import { buildPacScript } from './pac.js';

/**
 * Apply the current state to chrome.proxy. Pushes a generated PAC script when
 * one is producible, otherwise clears proxy settings entirely.
 */
export async function applyProxy(state) {
  const pac = buildPacScript(state);
  if (pac === null) {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    return { applied: false };
  }
  await chrome.proxy.settings.set({
    value: { mode: 'pac_script', pacScript: { data: pac, mandatory: true } },
    scope: 'regular',
  });
  return { applied: true };
}

/**
 * Top-level registration of the proxy auth listener. Runs every time the
 * service worker starts (on install, on browser launch, on wake from sleep).
 * Reads credentials from storage at fire time so updates are picked up live.
 *
 * Two independent proxies (state.proxy, state.ruProxy) can be active in the
 * same PAC script, so the challenging host:port is matched against both to
 * pick the right credentials.
 */
export function registerAuthListener() {
  // asyncBlocking requires explicit callback invocation — returning from async
  // function is NOT reliable in MV3 service workers.
  chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
      if (!details.isProxy) { callback({}); return; }
      loadState()
        .then((state) => {
          const candidates = [state?.proxy, state?.ruProxy].filter((p) => p && p.host && p.port);
          const challenger = details.challenger;
          const match = (challenger && candidates.find(
            (p) => p.host === challenger.host && String(p.port) === String(challenger.port)
          )) || candidates[0];

          if (!match?.user) { callback({}); return; }
          callback({ authCredentials: { username: match.user, password: match.pass || '' } });
        })
        .catch(() => callback({}));
    },
    { urls: ['<all_urls>'] },
    ['asyncBlocking']
  );
}
