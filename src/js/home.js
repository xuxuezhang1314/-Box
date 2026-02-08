// 云box Mobile - 主控制器
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@capacitor/navigation-bar';

class CloudBox {
  constructor() {
    this.tabs = [];
    this.activeTab = null;
    this.settings = {
      searchEngine: 'https://www.google.com/search?q=',
      shortcuts: [
        { name: 'GitHub', url: 'https://github.com', icon: '◈' },
        { name: 'B站', url: 'https://bilibili.com', icon: '▣' },
        { name: 'Google', url: 'https://google.com', icon: '◉' },
        { name: 'YouTube', url: 'https://youtube.com', icon: '▶' },
        { name: 'Twitter', url: 'https://twitter.com', icon: '◇' },
        { name: 'Reddit', url: 'https://reddit.com', icon: '●' },
        { name: '知乎', url: 'https://zhihu.com', icon: '◐' },
        { name: '添加', url: '#add', icon: '+' }
      ]
    };
    
    this.init();
  }

  async init() {
    // 初始化原生插件
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    await StatusBar.setStyle({ style: 'Dark' });
    await NavigationBar.setColor({ color: '#0a0a0a' });

    // 监听返回键
    App.addListener('backButton', () => this.handleBackButton());

    this.loadSettings();
    this.initUI();
    this.startClock();
    this.updateBattery();
  }

  loadSettings() {
    const saved = localStorage.getItem('cloudbox_settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  saveSettings() {
    localStorage.setItem('cloudbox_settings', JSON.stringify(this.settings));
  }

  initUI() {
    // 渲染快捷方式
    this.renderShortcuts();
    
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.addEventListener('click', () => this.handleSearch());
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    // 底部导航
    document.getElementById('nav-home').addEventListener('click', () => this.showHome());
    document.getElementById('nav-tabs').addEventListener('click', () => this.showTabsDrawer());
    document.getElementById('nav-menu').addEventListener('click', () => this.showSettings());

    // 标签页抽屉
    document.getElementById('btn-done').addEventListener('click', () => this.hideTabsDrawer());
    document.getElementById('btn-new-tab').addEventListener('click', () => {
      this.hideTabsDrawer();
      this.showHome();
    });

    // 网页视图控制
    document.getElementById('btn-home').addEventListener('click', () => this.showHome());
    document.getElementById('btn-back').addEventListener('click', () => this.goBack());
    document.getElementById('web-back').addEventListener('click', () => this.showHome());
    document.getElementById('btn-tabs').addEventListener('click', () => this.showTabsDrawer());

    // 设置面板
    document.getElementById('btn-close-settings').addEventListener('click', () => this.hideSettings());
    document.getElementById('overlay').addEventListener('click', () => {
      this.hideTabsDrawer();
      this.hideSettings();
    });

    // 搜索引擎选择
    document.querySelectorAll('input[name="engine"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.settings.searchEngine = e.target.value;
        this.saveSettings();
        this.showToast('搜索引擎已更改');
      });
    });

    // 添加快捷方式
    document.getElementById('btn-add-shortcut').addEventListener('click', () => this.addShortcut());

    // 滑动打开标签页
    let touchStartY = 0;
    const homeView = document.getElementById('home-view');
    homeView.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });
    homeView.addEventListener('touchend', (e) => {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (diff > 100 && touchStartY > window.innerHeight * 0.7) {
        this.showTabsDrawer();
      }
    });
  }

  renderShortcuts() {
    const grid = document.getElementById('shortcuts-grid');
    const manageList = document.getElementById('shortcuts-manage');
    
    grid.innerHTML = '';
    if (manageList) manageList.innerHTML = '';

    this.settings.shortcuts.forEach((item, index) => {
      // 主页网格
      const div = document.createElement('div');
      div.className = 'shortcut-item fade-in';
      div.style.animationDelay = `${index * 0.05}s`;
      div.innerHTML = `
        <div class="shortcut-icon">${item.icon}</div>
        <div class="shortcut-name">${item.name}</div>
      `;
      div.addEventListener('click', () => {
        if (item.url === '#add') {
          this.addShortcut();
        } else {
          this.openUrl(item.url);
        }
      });
      grid.appendChild(div);

      // 设置列表
      if (manageList) {
        const manageItem = document.createElement('div');
        manageItem.className = 'manage-item';
        manageItem.innerHTML = `
          <div class="manage-icon">${item.icon}</div>
          <div class="manage-info">
            <div class="manage-name">${item.name}</div>
            <div class="manage-url">${item.url}</div>
          </div>
          <button class="manage-delete" data-index="${index}">×</button>
        `;
        manageItem.querySelector('.manage-delete').addEventListener('click', () => {
          this.removeShortcut(index);
        });
        manageList.appendChild(manageItem);
      }
    });
  }

  async handleSearch() {
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
    
    input.value = '';
    await this.openUrl(url);
  }

  async openUrl(url) {
    // 使用 Capacitor Browser 打开（原生体验）
    try {
      await Browser.open({ url, presentationStyle: 'fullscreen' });
      this.addTab(url);
    } catch (e) {
      // 降级：使用 iframe
      this.openInApp(url);
    }
  }

  openInApp(url) {
    // 在应用内打开（备用方案）
    const webView = document.getElementById('web-view');
    const webContent = document.getElementById('web-content');
    const addressBar = document.getElementById('address-bar');
    
    // 创建 iframe
    webContent.innerHTML = `<iframe src="${url}" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>`;
    addressBar.textContent = url;
    
    document.getElementById('home-view').classList.add('hidden');
    webView.classList.add('active');
    
    this.addTab(url);
  }

  addTab(url) {
    const id = Date.now().toString(36);
    const tab = {
      id,
      url,
      title: '新标签页',
      icon: this.getFavicon(url)
    };
    
    this.tabs.push(tab);
    this.activeTab = id;
    this.updateTabCount();
    this.renderTabsList();
  }

  getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '◈';
    }
  }

  renderTabsList() {
    const list = document.getElementById('tabs-list');
    list.innerHTML = '';
    
    this.tabs.forEach(tab => {
      const card = document.createElement('div');
      card.className = `tab-card ${tab.id === this.activeTab ? 'active' : ''}`;
      card.innerHTML = `
        <div class="tab-preview">${tab.icon}</div>
        <div class="tab-info">
          <div class="tab-title">${tab.title}</div>
          <div class="tab-url">${tab.url}</div>
        </div>
        <button class="tab-close" data-id="${tab.id}">×</button>
      `;
      
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.switchTab(tab.id);
          this.hideTabsDrawer();
        }
      });
      
      card.querySelector('.tab-close').addEventListener('click', () => {
        this.closeTab(tab.id);
      });
      
      list.appendChild(card);
    });
  }

  switchTab(id) {
    this.activeTab = id;
    this.renderTabsList();
    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      this.openInApp(tab.url);
    }
  }

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx > -1) {
      this.tabs.splice(idx, 1);
      if (this.activeTab === id) {
        this.activeTab = this.tabs.length > 0 ? this.tabs[0].id : null;
      }
      this.updateTabCount();
      this.renderTabsList();
      
      if (this.tabs.length === 0) {
        this.showHome();
      }
    }
  }

  updateTabCount() {
    const count = this.tabs.length;
    document.getElementById('tab-count').textContent = count || '1';
    document.getElementById('tab-badge').textContent = count || '';
    document.getElementById('tab-badge').style.display = count > 0 ? 'flex' : 'none';
  }

  showHome() {
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('web-view').classList.remove('active');
    document.getElementById('search-input').focus();
  }

  showTabsDrawer() {
    this.renderTabsList();
    document.getElementById('tabs-drawer').classList.add('active');
    document.getElementById('overlay').classList.add('active');
  }

  hideTabsDrawer() {
    document.getElementById('tabs-drawer').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
  }

  showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    this.renderShortcuts();
  }

  hideSettings() {
    document.getElementById('settings-modal').classList.remove('active');
  }

  addShortcut() {
    const name = prompt('名称：');
    if (!name) return;
    const url = prompt('网址（包含 https://）：');
    if (!url) return;
    const icon = prompt('图标（emoji 或字符）：') || '◈';
    
    // 替换"添加"按钮
    const addIndex = this.settings.shortcuts.findIndex(s => s.url === '#add');
    if (addIndex > -1) {
      this.settings.shortcuts.splice(addIndex, 0, { name, url, icon });
    } else {
      this.settings.shortcuts.push({ name, url, icon });
    }
    
    this.saveSettings();
    this.renderShortcuts();
    this.showToast('快捷方式已添加');
  }

  removeShortcut(index) {
    if (confirm('确定删除这个快捷方式？')) {
      this.settings.shortcuts.splice(index, 1);
      this.saveSettings();
      this.renderShortcuts();
    }
  }

  handleBackButton() {
    const webView = document.getElementById('web-view');
    if (webView.classList.contains('active')) {
      this.showHome();
    } else if (document.getElementById('settings-modal').classList.contains('active')) {
      this.hideSettings();
    } else if (document.getElementById('tabs-drawer').classList.contains('active')) {
      this.hideTabsDrawer();
    } else if (this.tabs.length > 0) {
      this.showTabsDrawer();
    } else {
      App.exitApp();
    }
  }

  startClock() {
    const update = () => {
      const now = new Date();
      document.getElementById('clock').textContent = 
        now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };
    update();
    setInterval(update, 1000);
  }

  async updateBattery() {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      const update = () => {
        document.getElementById('battery').textContent = Math.round(battery.level * 100) + '%';
      };
      update();
      battery.addEventListener('levelchange', update);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  goBack() {
    // 在 Browser 中无法直接控制，提示用户
    this.showToast('请使用系统返回手势');
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  window.cloudBox = new CloudBox();
});
