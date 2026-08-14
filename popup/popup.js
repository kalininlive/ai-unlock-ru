import { loadState, saveState } from '../lib/storage.js';
import { RU_CATEGORIES } from '../lib/ru-domains.js';

const i18n = {
  RU: {
    status: 'Статус:',
    searching: 'Поиск...',
    active: 'Активно',
    inactive: 'Выключено',
    services: 'Сервисы',
    settings: 'Настройки прокси',
    save: 'Сохранить',
    addProxy: 'Добавить',
    footer: 'AI SERVICE UNBLOCK v1.2.1',
    addResource: 'Добавить ресурс',
    add: 'Добавить',
    bannedResource: '🔒 Доступ к ресурсу запрещён',
    ruTitle: '🇷🇺 RU-сервисы',
    ruDesc: 'Эти сайты никогда не идут через ваш основной (зарубежный) прокси. Без своего RU-прокси — просто напрямую. Со своим RU-прокси — через него, чтобы сайт видел российский IP.',
    ruMaster: 'Обход для RU-сайтов',
    ruAdd: 'Добавить свой RU-сайт',
    ruDuplicate: 'Этот домен уже в списке',
    ruProxyLabel: 'Российский прокси (опционально)',
  },
  EN: {
    status: 'Status:',
    searching: 'Searching...',
    active: 'Active',
    inactive: 'Off',
    services: 'Services',
    settings: 'Proxy Settings',
    save: 'Save',
    addProxy: 'Add',
    footer: 'AI SERVICE UNBLOCK v1.2.1',
    addResource: 'Add Resource',
    add: 'Add',
    bannedResource: '🔒 Access to resource is prohibited',
    ruTitle: '🇷🇺 RU Services',
    ruDesc: 'These sites never go through your main (foreign) proxy. Without your own RU proxy — just direct. With one set — routed through it, so the site sees a Russian IP.',
    ruMaster: 'Bypass for RU sites',
    ruAdd: 'Add your own RU site',
    ruDuplicate: 'This domain is already in the list',
    ruProxyLabel: 'Russian proxy (optional)',
  }
};

const BANNED_RESOURCES = [
  'facebook.com', 'instagram.com', 'threads.net', 
  'linkedin.com', 'x.com', 'twitter.com', 
  'snapchat.com', 'discord.com', 'signal.org', 
  'viber.com', 'facetime.apple.com'
];

function isBanned(domain) {
  const lower = domain.toLowerCase();
  return BANNED_RESOURCES.some(banned => lower === banned || lower.endsWith('.' + banned));
}

let currentLang = 'RU';

async function init() {
  const state = await loadState();
  currentLang = state.lang || 'RU';
  
  updateUI(state);
  setupEventListeners();
  loadServices();
  loadRuView();
}

function updateUI(state) {
  // Update texts based on language
  const texts = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) el.textContent = texts[key];
  });

  document.getElementById('lang-toggle').textContent = currentLang === 'RU' ? 'EN' : 'RU';
  
  // Update switches
  document.getElementById('master-switch').checked = state.enabled;
  
  const indicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  indicator.className = 'indicator'; // reset
  
  const hasAnyProxy = (state.proxy && state.proxy.host) || (state.ruProxy && state.ruProxy.host);
  if (!state.enabled) {
    indicator.classList.add('idle');
    statusText.textContent = texts.inactive;
  } else if (hasAnyProxy) {
    indicator.classList.add('active');
    statusText.textContent = texts.active;
  } else {
    indicator.classList.add('error');
    statusText.textContent = texts.inactive;
  }

  // Update proxy fields
  if (state.proxy && state.proxy.host) {
    const proxyStr = `${state.proxy.host}:${state.proxy.port}${state.proxy.user ? ':' + state.proxy.user + ':' + state.proxy.pass : ''}`;
    document.getElementById('proxy-string').value = proxyStr;
  }
  if (state.ruProxy && state.ruProxy.host) {
    const ruProxyStr = `${state.ruProxy.host}:${state.ruProxy.port}${state.ruProxy.user ? ':' + state.ruProxy.user + ':' + state.ruProxy.pass : ''}`;
    document.getElementById('ru-proxy-string').value = ruProxyStr;
  }
}

async function loadServices() {
  const res = await fetch(chrome.runtime.getURL('config/services.json'));
  const config = await res.json();
  const state = await loadState();
  
  const container = document.getElementById('services-container');
  container.innerHTML = '';

  // Render presets
  config.services.forEach(service => {
    if (service.hidden) return;
    
    if (!state.presets[service.id]) {
      state.presets[service.id] = { enabled: service.enabled, domains: service.domains };
    }

    const item = renderServiceItem({
        id: `svc-${service.id}`,
        name: service.name,
        icon: `../${service.icon}`,
        enabled: state.presets[service.id].enabled,
        onChange: async (checked) => {
            const st = await loadState();
            st.presets[service.id].enabled = checked;
            await saveState(st);
        }
    });
    container.appendChild(item);
  });

  // Render custom domains
  if (state.customDomains && state.customDomains.length > 0) {
    state.customDomains.forEach((domain, index) => {
        const item = renderServiceItem({
            id: `custom-${index}`,
            name: domain.value,
            icon: `https://www.google.com/s2/favicons?domain=${domain.value}&sz=32`,
            enabled: domain.enabled,
            onChange: async (checked) => {
                const st = await loadState();
                st.customDomains[index].enabled = checked;
                await saveState(st);
            },
            onDelete: async () => {
                const st = await loadState();
                st.customDomains.splice(index, 1);
                await saveState(st);
                loadServices(); // Refresh list
            }
        });
        container.appendChild(item);
    });
  }
}

function renderServiceItem({ id, name, icon, enabled, onChange, onDelete }) {
    const item = document.createElement('div');
    item.className = 'service-item';
    
    const iconHtml = icon ? `<img src="${icon}" class="service-icon" onerror="this.src='../icons/off-16.png'">` : '';
    const deleteBtnHtml = onDelete ? `<button class="delete-btn" title="Delete">×</button>` : '';
    
    item.innerHTML = `
      <div class="service-info">
        ${iconHtml}
        <span class="service-name">${name}</span>
      </div>
      <div class="service-actions">
        ${deleteBtnHtml}
        <label class="switch">
          <input type="checkbox" id="${id}" ${enabled ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>
    `;
    
    item.querySelector('input').addEventListener('change', (e) => onChange(e.target.checked));
    if (onDelete) {
        item.querySelector('.delete-btn').addEventListener('click', () => onDelete());
    }
    return item;
}

async function loadRuView() {
  const state = await loadState();
  const rb = state.ruBypass || { enabled: true, categories: {} };

  document.getElementById('ru-master-switch').checked = rb.enabled !== false;

  const catContainer = document.getElementById('ru-categories-container');
  catContainer.innerHTML = '';

  RU_CATEGORIES.forEach((cat) => {
    const label = currentLang === 'RU' ? cat.label : cat.labelEn;
    const item = renderServiceItem({
      id: `ru-cat-${cat.id}`,
      name: `${cat.icon} ${label} <span class="ru-cat-count">(${cat.domains.length})</span>`,
      icon: null,
      enabled: rb.categories?.[cat.id] !== false,
      onChange: async (checked) => {
        const st = await loadState();
        if (!st.ruBypass) st.ruBypass = { enabled: true, categories: {} };
        if (!st.ruBypass.categories) st.ruBypass.categories = {};
        st.ruBypass.categories[cat.id] = checked;
        await saveState(st);
      }
    });
    catContainer.appendChild(item);
  });

  const listContainer = document.getElementById('ru-custom-list');
  listContainer.innerHTML = '';
  (state.customRuDomains || []).forEach((domain, index) => {
    const item = renderServiceItem({
      id: `ru-custom-${index}`,
      name: domain.value,
      icon: `https://www.google.com/s2/favicons?domain=${domain.value}&sz=32`,
      enabled: domain.enabled,
      onChange: async (checked) => {
        const st = await loadState();
        st.customRuDomains[index].enabled = checked;
        await saveState(st);
      },
      onDelete: async () => {
        const st = await loadState();
        st.customRuDomains.splice(index, 1);
        await saveState(st);
        loadRuView();
      }
    });
    listContainer.appendChild(item);
  });
}

function showView(name) {
  document.getElementById('main-view').style.display = name === 'main' ? 'flex' : 'none';
  document.getElementById('settings-view').style.display = name === 'settings' ? 'flex' : 'none';
  document.getElementById('ru-view').style.display = name === 'ru' ? 'flex' : 'none';
}

// Parses "IP:PORT" or "IP:PORT:USER:PASS" into a proxy object, or throws a
// user-facing message string. Empty input means "clear the proxy" (null).
function parseProxyString(raw) {
  const proxyStr = raw.trim();
  if (!proxyStr) return null;

  const parts = proxyStr.split(':');
  let host = '', port = '', user = '', pass = '';

  if (parts.length === 2) {
    [host, port] = parts;
  } else if (parts.length === 4) {
    [host, port, user, pass] = parts;
  } else {
    throw currentLang === 'RU'
      ? 'Неверный формат прокси! Используйте IP:PORT или IP:PORT:USER:PASS'
      : 'Invalid proxy format! Use IP:PORT or IP:PORT:USER:PASS';
  }

  if (!host || !port || isNaN(parseInt(port))) {
    throw currentLang === 'RU' ? 'Неверный формат хоста или порта!' : 'Invalid host or port format!';
  }

  return { host, port: parseInt(port), user, pass, scheme: 'http' };
}

function bindProxySave({ inputId, btnId, setProxy }) {
  document.getElementById(btnId).addEventListener('click', async () => {
    const state = await loadState();
    const btn = document.getElementById(btnId);
    const oldText = btn.textContent;

    let proxy;
    try {
      proxy = parseProxyString(document.getElementById(inputId).value);
    } catch (message) {
      alert(message);
      return;
    }

    setProxy(state, proxy);
    await saveState(state);
    updateUI(state);

    btn.textContent = proxy
      ? (currentLang === 'RU' ? 'Сохранено!' : 'Saved!')
      : (currentLang === 'RU' ? 'Очищено!' : 'Cleared!');
    setTimeout(() => { btn.textContent = oldText; }, 1500);
  });
}

function bindPasswordToggle(inputId, btnId, iconId) {
  const input = document.getElementById(inputId);
  const toggleBtn = document.getElementById(btnId);

  toggleBtn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const eyeIcon = `
      <svg id="${iconId}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`;
    const eyeOffIcon = `
      <svg id="${iconId}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>`;

    toggleBtn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
  });
}

function setupEventListeners() {
  document.getElementById('settings-toggle').addEventListener('click', () => showView('settings'));
  document.getElementById('close-settings').addEventListener('click', () => showView('main'));

  document.getElementById('ru-toggle').addEventListener('click', () => {
    showView('ru');
    loadRuView();
  });
  document.getElementById('close-ru').addEventListener('click', () => showView('main'));

  document.getElementById('ru-master-switch').addEventListener('change', async (e) => {
    const state = await loadState();
    if (!state.ruBypass) state.ruBypass = { enabled: true, categories: {} };
    state.ruBypass.enabled = e.target.checked;
    await saveState(state);
  });

  document.getElementById('ru-add-domain-btn').addEventListener('click', async () => {
    const input = document.getElementById('ru-custom-domain');
    const domain = input.value.trim().toLowerCase();
    const errorEl = document.getElementById('ru-domain-error');

    if (!domain) return;

    errorEl.classList.remove('show');
    await new Promise(r => setTimeout(r, 50));

    const state = await loadState();
    if (!state.customRuDomains) state.customRuDomains = [];

    if (state.customRuDomains.find(d => d.value === domain)) {
      errorEl.textContent = i18n[currentLang].ruDuplicate;
      errorEl.classList.add('show');
      return;
    }

    state.customRuDomains.push({ value: domain, mode: 'suffix', enabled: true });
    await saveState(state);

    input.value = '';
    loadRuView();
    const btn = document.getElementById('ru-add-domain-btn');
    const oldText = btn.textContent;
    btn.textContent = currentLang === 'RU' ? 'ОК' : 'OK';
    setTimeout(() => { btn.textContent = oldText; }, 1500);
  });

  document.getElementById('lang-toggle').addEventListener('click', async () => {
    currentLang = currentLang === 'RU' ? 'EN' : 'RU';
    const state = await loadState();
    state.lang = currentLang;
    await saveState(state);
    updateUI(state);
    loadRuView();
  });

  document.getElementById('master-switch').addEventListener('change', async (e) => {
    const state = await loadState();
    state.enabled = e.target.checked;
    await saveState(state);
    updateUI(state);
  });

  bindProxySave({
    inputId: 'proxy-string',
    btnId: 'save-proxy',
    setProxy: (state, proxy) => { state.proxy = proxy; },
  });

  bindProxySave({
    inputId: 'ru-proxy-string',
    btnId: 'save-ru-proxy',
    setProxy: (state, proxy) => { state.ruProxy = proxy; },
  });

  bindPasswordToggle('proxy-string', 'toggle-password', 'eye-icon');
  bindPasswordToggle('ru-proxy-string', 'ru-toggle-password', 'ru-eye-icon');

  document.getElementById('add-domain-btn').addEventListener('click', async () => {
    const input = document.getElementById('custom-domain');
    const domain = input.value.trim();
    const errorEl = document.getElementById('domain-error');
    
    if (!domain) return;
    
    // Скрываем ошибку
    errorEl.classList.remove('show');
    // Небольшая задержка для перезапуска анимации
    await new Promise(r => setTimeout(r, 50));
    
    if (isBanned(domain)) {
      errorEl.textContent = i18n[currentLang].bannedResource;
      errorEl.classList.add('show');
      return;
    }
    
    const state = await loadState();
    if (!state.customDomains) state.customDomains = [];
    
    if (!state.customDomains.find(d => d.value === domain)) {
        state.customDomains.push({ value: domain, mode: 'suffix', enabled: true });
        await saveState(state);
    }
    
    input.value = '';
    loadServices(); // Refresh list
    const oldText = document.getElementById('add-domain-btn').textContent;
    document.getElementById('add-domain-btn').textContent = currentLang === 'RU' ? 'ОК' : 'OK';
    setTimeout(() => { document.getElementById('add-domain-btn').textContent = oldText; }, 1500);
  });
}

init();
