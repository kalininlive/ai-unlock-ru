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
    footer: 'AI SERVICE UNBLOCK v1.1.0',
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
    footer: 'AI SERVICE UNBLOCK v1.1.0',
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
  
  indicator.className = 'indicator'; // reset
  
  if (!state.enabled) {
    indicator.classList.add('idle');
    statusText.textContent = texts.inactive;
  } else if (state.proxy && state.proxy.host) {
    indicator.classList.add('active');
    statusText.textContent = texts.active;
  } else {
    indicator.classList.add('error');
    statusText.textContent = texts.inactive;
  }

  // Update proxy fields with masking
  if (state.proxy && state.proxy.host) {
    let proxyStr = `${state.proxy.host}:${state.proxy.port}`;
    if (state.proxy.user && state.proxy.pass) {
      proxyStr += `:${state.proxy.user}:****`; // Mask password
    }
    document.getElementById('proxy-string').value = proxyStr;
    document.getElementById('proxy-string').dataset.fullValue = `${state.proxy.host}:${state.proxy.port}${state.proxy.user ? ':' + state.proxy.user + ':' + state.proxy.pass : ''}`;
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
            }
        });
        container.appendChild(item);
    });
  }
}

function renderServiceItem({ id, name, icon, enabled, onChange }) {
    const item = document.createElement('div');
    item.className = 'service-item';
    
    const iconHtml = icon ? `<img src="${icon}" class="service-icon" onerror="this.src='../icons/off-16.png'">` : '';
    
    item.innerHTML = `
      <div class="service-info">
        ${iconHtml}
        <span class="service-name">${name}</span>
      </div>
      <label class="switch">
        <input type="checkbox" id="${id}" ${enabled ? 'checked' : ''}>
        <span class="slider round"></span>
      </label>
    `;
    
    item.querySelector('input').addEventListener('change', (e) => onChange(e.target.checked));
    return item;
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
    const proxyStr = document.getElementById('proxy-string').value.trim();
    const state = await loadState();

    if (!proxyStr) {
      state.proxy = null;
      await saveState(state);
      const btn = document.getElementById('save-proxy');
      const oldText = btn.textContent;
      btn.textContent = currentLang === 'RU' ? 'Очищено!' : 'Cleared!';
      setTimeout(() => { btn.textContent = oldText; }, 1500);
      return;
    }

    const parts = proxyStr.split(':');
    let host = '', port = '', user = '', pass = '';

    if (parts.length === 2) {
      host = parts[0];
      port = parts[1];
    } else if (parts.length === 4) {
      host = parts[0];
      port = parts[1];
      user = parts[2];
      pass = parts[3];
    } else {
      alert(currentLang === 'RU' ? 'Неверный формат прокси! Используйте IP:PORT или IP:PORT:USER:PASS' : 'Invalid proxy format! Use IP:PORT or IP:PORT:USER:PASS');
      return;
    }

    if (!host || !port || isNaN(parseInt(port))) {
      alert(currentLang === 'RU' ? 'Неверный формат хоста или порта!' : 'Invalid host or port format!');
      return;
    }

    state.proxy = { host, port: parseInt(port), user, pass, scheme: 'http' };
    await saveState(state);
    
    const btn = document.getElementById('save-proxy');
    const oldText = btn.textContent;
    btn.textContent = currentLang === 'RU' ? 'Сохранено!' : 'Saved!';
    setTimeout(() => { btn.textContent = oldText; }, 1500);
  });

  const proxyInput = document.getElementById('proxy-string');
  proxyInput.addEventListener('focus', () => {
    if (proxyInput.dataset.fullValue) {
        proxyInput.value = proxyInput.dataset.fullValue;
    }
  });

  proxyInput.addEventListener('blur', async () => {
    const state = await loadState();
    if (state.proxy && state.proxy.host) {
        let proxyStr = `${state.proxy.host}:${state.proxy.port}`;
        if (state.proxy.user && state.proxy.pass) {
            proxyStr += `:${state.proxy.user}:****`;
        }
        proxyInput.value = proxyStr;
    }
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
