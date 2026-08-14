// Pure module — no chrome.* APIs allowed.

import { RU_CATEGORIES } from './ru-domains.js';

function pacDirective(scheme, host, port) {
  switch (scheme) {
    case 'http':   return `PROXY ${host}:${port}`;
    case 'https':  return `HTTPS ${host}:${port}`;
    case 'socks5': return `SOCKS5 ${host}:${port}; SOCKS ${host}:${port}`;
    case 'socks4': return `SOCKS ${host}:${port}`;
    case 'auto':   return `PROXY ${host}:${port}`;
    default:       throw new Error(`Unknown proxy scheme: ${scheme}`);
  }
}

function collectDomains(state) {
  const suffixes = [];
  const wildcards = [];
  const exacts = [];

  const presets = state.presets || {};

  for (const [key, preset] of Object.entries(presets)) {
    if (!preset.enabled) continue;
    for (const d of preset.domains || []) suffixes.push(d);
  }

  for (const entry of state.customDomains || []) {
    if (!entry || !entry.value || entry.enabled === false) continue;
    if (entry.mode === 'wildcard') wildcards.push(entry.value);
    else if (entry.mode === 'exact') exacts.push(entry.value);
    else suffixes.push(entry.value);
  }

  return { suffixes, wildcards, exacts };
}

/**
 * Collect the "always DIRECT" RU-services bypass list: built-in categories
 * (unless individually disabled) plus user-added custom RU domains. This is
 * checked before proxy routing so it wins even if a domain also happens to
 * match an AI preset/custom entry.
 */
function collectRuBypass(state) {
  const rb = state.ruBypass || {};
  const suffixes = [];
  const wildcards = [];
  const exacts = [];

  if (rb.enabled !== false) {
    const categories = rb.categories || {};
    for (const cat of RU_CATEGORIES) {
      if (categories[cat.id] === false) continue;
      for (const d of cat.domains) suffixes.push(d);
    }
  }

  for (const entry of state.customRuDomains || []) {
    if (!entry || !entry.value || entry.enabled === false) continue;
    if (entry.mode === 'wildcard') wildcards.push(entry.value);
    else if (entry.mode === 'exact') exacts.push(entry.value);
    else suffixes.push(entry.value);
  }

  return { suffixes, wildcards, exacts };
}

/**
 * Build a PAC script string from extension state. Returns null if the extension
 * is disabled or no proxy is configured — the caller should clear chrome.proxy
 * settings in that case.
 *
 * The script does NOT include a "; DIRECT" fallback after the proxy directive.
 * If the proxy fails, the request fails — never silently leak through the user's
 * real IP. See spec §13.
 */
export function buildPacScript(state) {
  if (!state || !state.enabled) return null;
  if (!state.proxy || !state.proxy.host || !state.proxy.port) return null;

  const directive = pacDirective(state.proxy.scheme, state.proxy.host, state.proxy.port);
  const { suffixes, wildcards, exacts } = collectDomains(state);

  if (suffixes.length === 0 && wildcards.length === 0 && exacts.length === 0) {
    return null;
  }

  const banned = [
    'facebook.com', 'instagram.com', 'threads.net',
    'linkedin.com', 'x.com', 'twitter.com',
    'snapchat.com', 'discord.com', 'signal.org',
    'viber.com', 'facetime.apple.com'
  ];

  const ru = collectRuBypass(state);

  const directiveJson = JSON.stringify(directive);

  return [
    'function FindProxyForURL(url, host) {',
    `  var banned = ${JSON.stringify(banned)};`,
    '  for (var i = 0; i < banned.length; i++) {',
    '    if (host === banned[i] || dnsDomainIs(host, "." + banned[i])) return "DIRECT";',
    '  }',
    `  var ruSuffixes = ${JSON.stringify(ru.suffixes)};`,
    '  for (var i = 0; i < ruSuffixes.length; i++) {',
    '    if (dnsDomainIs(host, ruSuffixes[i])) return "DIRECT";',
    '  }',
    `  var ruWildcards = ${JSON.stringify(ru.wildcards)};`,
    '  for (var i = 0; i < ruWildcards.length; i++) {',
    '    if (host !== ruWildcards[i] && dnsDomainIs(host, ruWildcards[i])) return "DIRECT";',
    '  }',
    `  var ruExacts = ${JSON.stringify(ru.exacts)};`,
    '  for (var i = 0; i < ruExacts.length; i++) {',
    '    if (host === ruExacts[i]) return "DIRECT";',
    '  }',
    `  var suffixes = ${JSON.stringify(suffixes)};`,
    '  for (var i = 0; i < suffixes.length; i++) {',
    `    if (dnsDomainIs(host, suffixes[i])) return ${directiveJson};`,
    '  }',
    `  var wildcards = ${JSON.stringify(wildcards)};`,
    '  for (var i = 0; i < wildcards.length; i++) {',
    `    if (host !== wildcards[i] && dnsDomainIs(host, wildcards[i])) return ${directiveJson};`,
    '  }',
    `  var exacts = ${JSON.stringify(exacts)};`,
    '  for (var i = 0; i < exacts.length; i++) {',
    `    if (host === exacts[i]) return ${directiveJson};`,
    '  }',
    '  return "DIRECT";',
    '}',
  ].join('\n');
}
