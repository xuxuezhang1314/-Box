// 云box - 主进程逻辑
const App = {
  tabs: [],
  activeTab: null,
  settings: {
    searchEngine: 'https://www.google.com/search?q=',
    shortcuts: [
      { name: 'GITHUB', url: 'https://github.com', icon: '◈' },
      { name: 'BILIBILI', url: 'https://bilibili.com', icon: '▣' },
      { name: 'PIXIV', url: 'https://pixiv.net', icon: '✦' },
      { name: 'X', url: 'https://twitter.com', icon: '◇' },
      { name: 'YOUTUBE', url: 'https://youtube.com', icon: '▶' },
      { name: 'REDDIT', url: 'https://reddit.com', icon: '●' }
    ]
  },

  init() {
    this.loadSettings();
    this.initUI();
    this.initShortcuts();
    this.initEventListeners();
    this.updateSystemInfo();
    this.log('SYSTEM_INITIALIZED');
  },

  loadSettings() {
    const saved = window.cloudbox?.storage?.getObject('cloudbox_settings');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
  },

  saveSettings() {
    window.cloudbox?.storage?.setObject('cloudbox_settings', this.settings);
  },

  initUI() {
    // 设置版本号
    window.cloudbox?.getAppInfo().then(info => {
      document.getElementById('version').textContent = info.version;
      document.getElementById('about-version').textContent = info.version;
    });

    // 设置搜索引擎
    document.getElementById('engine-select').value = this.settings.searchEngine;
  },

  initShortcuts() {
    const container = document.getElementById('shortcuts');
    container.innerHTML = '';
    
    this.settings.shortcuts.forEach((item, index) => {
      const a = document.createElement('a');
      a.className = 'shortcut';
      a.innerHTML = `
        <div class="shortcut-icon">${item.icon}</div>
        <span>${item.name}</span>
      `;
      a.onclick = (e) => {
        e.preventDefault();
        this.createTab(item.url);
      };
      container.appendChild(a);
    });

    this.renderSettingsShortcuts();
  },

  renderSettingsShortcuts() {
    const list = document.getElementById('shortcuts-list');
    if (!list) return;
    
    list.innerHTML = this.settings.shortcuts.map((item, idx) => `
      <div class="shortcut-item">
        <span class="name">${item.icon} ${item.name}</span>
        <span class="url">${item.url}</span>
        <button onclick="App.removeShortcut(${idx})">×</button>
      </div>
    `).join('');
  },

  initEventListeners() {
    // 搜索
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.onclick = () => this.handleSearch();
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') this.handleSearch();
    };

    // 导航按钮
    document.getElementById('btn-home').onclick = () => this.showHome();
    document.getElementById('btn-back').onclick = () => this.goBack();
    document.getElementById('btn-forward').onclick = () => this.goForward();
    document.getElementById('btn-reload').onclick = () => this.reload();
    document.getElementById('btn-new-tab').onclick = () => this.showHome();
    document.getElementById('btn-close-tab').onclick = () => this.closeCurrentTab();
    document.getElementById('btn-menu').onclick = () => this.toggleSettings();

    // 设置面板
    document.getElementById('close-settings').onclick = () => this.toggleSettings(false);
    document.getElementById('overlay').onclick = () => this.toggleSettings(false);
    
    document.getElementById('engine-select').onchange = (e) => {
      this.settings.searchEngine = e.target.value;
      this.saveSettings();
    };

    document.getElementById('btn-import-theme').onclick = () => {
      window.cloudbox?.selectTheme().then(path => {
        if (path) {
          this.injectCustomTheme(path);
          this.log('THEME_IMPORTED: ' + path);
        }
      });
    };

    document.getElementById('btn-add-shortcut').onclick = () => {
      const name = prompt('快捷方式名称:');
      if (!name) return;
      const url = prompt('网址 (包含 https://):');
      if (!url) return;
      const icon = prompt('图标 (单个字符或 emoji):') || '◈';
      
      this.settings.shortcuts.push({ name: name.toUpperCase(), url, icon });
      this.saveSettings();
      this.initShortcuts();
      this.log('SHORTCUT_ADDED: ' + name);
    };

    // 监听新标签页请求（来自 preload）
    window.cloudbox?.onNewTab?.(url => this.createTab(url));

    // 键盘快捷键
    document.onkeydown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case 't':
            e.preventDefault();
            this.showHome();
            break;
          case 'w':
            e.preventDefault();
            this.closeCurrentTab();
            break;
          case 'l':
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
            break;
          case ',':
            e.preventDefault();
            this.toggleSettings();
            break;
        }
      }
    };
  },

  handleSearch() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    
    if (!query) return;
    
    let url;
    if (query.match(/^https?:\/\//)) {
      url = query;
    } else if (query.includes('.') && !query.includes(' ')) {
      url = 'https://' + query;
    } else {
      url = this.settings.searchEngine + encodeURIComponent(query);
    }
    
    this.createTab(url);
    input.value = '';
    this.log('NAVIGATE: ' + url);
  },

  createTab(url) {
    const id = Date.now().toString(36);
    const webview = document.createElement('webview');
    webview.id = `webview-${id}`;
    webview.src = url;
    webview.style.display = 'none';
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');
    
    // 加载事件
    webview.addEventListener('did-start-loading', () => {
      this.log('LOADING: ' + url);
    });
    
    webview.addEventListener('did-stop-loading', () => {
      this.log('LOADED: ' + webview.getTitle());
    });

    webview.addEventListener('did-navigate', (e) => {
      if (this.activeTab === id) {
        this.updateNavigationState();
      }
    });

    document.getElementById('webview-stack').appendChild(webview);
    
    this.tabs.push({ id, webview, url, title: 'Loading...' });
    this.switchTab(id);
    this.showWebview();
  },

  switchTab(id) {
    this.tabs.forEach(tab => {
      tab.webview.style.display = tab.id === id ? 'flex' : 'none';
    });
    this.activeTab = id;
    this.updateTabCount();
    this.updateNavigationState();
  },

  closeCurrentTab() {
    if (!this.activeTab) {
      this.showHome();
      return;
    }
    
    const idx = this.tabs.findIndex(t => t.id === this.activeTab);
    if (idx === -1) return;
    
    const tab = this.tabs[idx];
    tab.webview.remove();
    this.tabs.splice(idx, 1);
    
    if (this.tabs.length === 0) {
      this.showHome();
    } else {
      const newIdx = Math.max(0, idx - 1);
      this.switchTab(this.tabs[newIdx].id);
    }
  },

  showHome() {
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('webview-stack').classList.remove('active');
    this.tabs.forEach(tab => tab.webview.style.display = 'none');
    this.activeTab = null;
    this.updateTabCount();
    document.getElementById('search-input').focus();
    this.log('RETURN_HOME');
  },

  showWebview() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('webview-stack').classList.add('active');
  },

  goBack() {
    const tab = this.getActiveTab();
    if (tab && tab.webview.canGoBack()) {
      tab.webview.goBack();
    }
  },

  goForward() {
    const tab = this.getActiveTab();
    if (tab && tab.webview.canGoForward()) {
      tab.webview.goForward();
    }
  },

  reload() {
    const tab = this.getActiveTab();
    if (tab) {
      tab.webview.reload();
    } else {
      location.reload();
    }
  },

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTab);
  },

  updateTabCount() {
    const count = this.tabs.length;
    const el = document.getElementById('tab-count');
    el.textContent = count.toString().padStart(2, '0');
    el.style.opacity = count > 0 ? '1' : '0.3';
  },

  updateNavigationState() {
    const tab = this.getActiveTab();
    const backBtn = document.getElementById('btn-back');
    const forwardBtn = document.getElementById('btn-forward');
    
    if (tab) {
      backBtn.disabled = !tab.webview.canGoBack();
      forwardBtn.disabled = !tab.webview.canGoForward();
    } else {
      backBtn.disabled = true;
      forwardBtn.disabled = true;
    }
  },

  toggleSettings(show) {
    const panel = document.getElementById('settings-panel');
    const overlay = document.getElementById('overlay');
    const isActive = panel.classList.contains('active');
    const shouldShow = show !== undefined ? show : !isActive;
    
    panel.classList.toggle('active', shouldShow);
    overlay.classList.toggle('active', shouldShow);
  },

  removeShortcut(index) {
    this.settings.shortcuts.splice(index, 1);
    this.saveSettings();
    this.initShortcuts();
  },

  injectCustomTheme(cssPath) {
    // 移除旧主题
    const old = document.getElementById('custom-theme');
    if (old) old.remove();
    
    // 读取并注入新主题（这里简化处理，实际应用可能需要 fs 读取）
    const link = document.createElement('link');
    link.id = 'custom-theme';
    link.rel = 'stylesheet';
    link.href = cssPath;
    document.head.appendChild(link);
  },

  updateSystemInfo() {
    // 更新内存使用（模拟）
    setInterval(() => {
      const mem = Math.floor(Math.random() * 2000 + 4000);
      document.getElementById('mem-usage').textContent = mem + 'MB';
    }, 3000);

    // 更新延迟（模拟）
    setInterval(() => {
      const latency = Math.floor(Math.random() * 20 + 5);
      document.getElementById('latency').textContent = latency;
    }, 2000);
  },

  log(message) {
    const consoleEl = document.getElementById('console-log');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    consoleEl.innerHTML = `
      <div>> ${message}</div>
      <div>> READY_ [${time}]</div>
    `;
    console.log(`[云box] ${message}`);
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());

// 暴露全局 API 供插件使用
window.CloudBoxAPI = {
  createTab: (url) => App.createTab(url),
  showHome: () => App.showHome(),
  getSettings: () => App.settings,
  setSettings: (settings) => {
    App.settings = { ...App.settings, ...settings };
    App.saveSettings();
  },
  log: (msg) => App.log(msg)
};

