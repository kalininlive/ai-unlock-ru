import { loadState, saveState } from '../lib/storage.js';

const i18n = {
  RU: {
    status: 'Статус:',
    searching: 'Поиск...',
    active: 'Активно',
    inactive: 'Выключено',
    services: 'Сервисы',
    settings: 'Настройки прокси',
    save: 'Сохранить',
    footer: 'AI SERVICE UNBLOCK v1.0.0',
    addResource: 'Добавить ресурс',
    add: 'Добавить',
    bannedResource: '🔒 Доступ к ресурсу запрещён',
  },
  EN: {
    status: 'Status:',
    searching: 'Searching...',
    active: 'Active',
    inactive: 'Off',
    services: 'Services',
    settings: 'Proxy Settings',
    save: 'Save',
    footer: 'AI SERVICE UNBLOCK v1.0.0',
    addResource: 'Add Resource',
    add: 'Add',
    bannedResource: '🔒 Access to resource is prohibited',
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
  
  if (state.enabled) {
    indicator.classList.add('active');
    statusText.textContent = texts.active;
  } else {
    indicator.classList.remove('active');
    statusText.textContent = texts.inactive;
  }

  // Update proxy fields
  if (state.proxy) {
    document.getElementById('proxy-host').value = state.proxy.host || '';
    document.getElementById('proxy-port').value = state.proxy.port || '';
    document.getElementById('proxy-user').value = state.proxy.user || '';
    document.getElementById('proxy-pass').value = state.proxy.pass || '';
  }
}

async function loadServices() {
  const res = await fetch(chrome.runtime.getURL('config/services.json'));
  const config = await res.json();
  const state = await loadState();
  
  const container = document.getElementById('services-container');
  container.innerHTML = '';

  config.services.forEach(service => {
    if (service.hidden) return;
    
    // Ensure service exists in state
    if (!state.presets[service.id]) {
      state.presets[service.id] = { enabled: service.enabled, domains: service.domains };
    }

    const item = document.createElement('div');
    item.className = 'service-item';
    
    const iconHtml = service.icon ? `<img src="../${service.icon}" class="service-icon">` : '';
    
    item.innerHTML = `
      <div class="service-info">
        ${iconHtml}
        <span class="service-name">${service.name}</span>
      </div>
      <label class="switch">
        <input type="checkbox" id="svc-${service.id}" ${state.presets[service.id].enabled ? 'checked' : ''}>
        <span class="slider round"></span>
      </label>
    `;
    container.appendChild(item);

    document.getElementById(`svc-${service.id}`).addEventListener('change', async (e) => {
      const st = await loadState();
      st.presets[service.id].enabled = e.target.checked;
      await saveState(st);
    });
  });
}

function setupEventListeners() {
  document.getElementById('lang-toggle').addEventListener('click', async () => {
    currentLang = currentLang === 'RU' ? 'EN' : 'RU';
    const state = await loadState();
    state.lang = currentLang;
    await saveState(state);
    updateUI(state);
  });

  document.getElementById('master-switch').addEventListener('change', async (e) => {
    const state = await loadState();
    state.enabled = e.target.checked;
    await saveState(state);
    updateUI(state);
  });

  document.getElementById('save-proxy').addEventListener('click', async () => {
    const host = document.getElementById('proxy-host').value;
    const port = document.getElementById('proxy-port').value;
    const user = document.getElementById('proxy-user').value;
    const pass = document.getElementById('proxy-pass').value;

    if (!host || !port) {
      alert(currentLang === 'RU' ? 'Введите хост и порт!' : 'Enter host and port!');
      return;
    }

    const state = await loadState();
    state.proxy = { host, port: parseInt(port), user, pass, scheme: 'http' };
    await saveState(state);
    
    const btn = document.getElementById('save-proxy');
    const oldText = btn.textContent;
    btn.textContent = currentLang === 'RU' ? 'Сохранено!' : 'Saved!';
    setTimeout(() => { btn.textContent = oldText; }, 1500);
  });

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
        state.customDomains.push({ value: domain, mode: 'suffix' });
        await saveState(state);
    }
    
    input.value = '';
    const oldText = document.getElementById('add-domain-btn').textContent;
    document.getElementById('add-domain-btn').textContent = currentLang === 'RU' ? 'ОК' : 'OK';
    setTimeout(() => { document.getElementById('add-domain-btn').textContent = oldText; }, 1500);
  });
}

init();
