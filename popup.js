// Discord Decoration Grabber - Popup Script
(function () {
  'use strict';

  // ===== State =====
  let currentTab = 'decorations';
  let allDecorations = [];
  let allEffects = [];
  let allNameplates = [];
  let collectedItems = [];
  let discordToken = null;

  // ===== Discord API Endpoints =====
  const API_BASE = 'https://discord.com/api/v9';
  const ENDPOINTS = {
    collectiblesCategories: `${API_BASE}/collectibles-categories`,
    userProfileEffects: `${API_BASE}/user-profile-effects`,
    avatarDecorations: `${API_BASE}/avatar-decorations`,
    userProfile: (userId) => `${API_BASE}/users/${userId}/profile`,
    currentUser: `${API_BASE}/users/@me`,
  };

  // ===== DOM Elements =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const statusDot = $('#statusDot');
  const statusText = $('#statusText');
  const fetchBtn = $('#fetchBtn');
  const downloadAllBtn = $('#downloadAllBtn');
  const counter = $('#counter');
  const loading = $('#loading');
  const loadingText = $('#loadingText');
  const error = $('#error');
  const errorText = $('#errorText');
  const retryBtn = $('#retryBtn');
  const content = $('#content');
  const emptyState = $('#emptyState');
  const grid = $('#grid');

  // ===== Initialize =====
  init();

  async function init() {
    setupTabs();
    setupButtons();
    await checkConnection();
    loadStoredData();
  }

  // ===== Tab Navigation =====
  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderContent();
      });
    });
  }

  // ===== Button Handlers =====
  function setupButtons() {
    fetchBtn.addEventListener('click', fetchAllData);
    downloadAllBtn.addEventListener('click', downloadAll);
    retryBtn.addEventListener('click', fetchAllData);
  }

  // ===== Check Discord Connection =====
  async function checkConnection() {
    try {
      const stored = await chrome.storage.local.get('discordToken');
      if (stored.discordToken) {
        discordToken = stored.discordToken;
        setStatus('connected', 'Đã kết nối');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && (tab.url.includes('discord.com'))) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TOKEN' });
          if (response && response.token) {
            discordToken = response.token;
            chrome.storage.local.set({ discordToken: response.token });
            setStatus('connected', 'Đã kết nối');
            return;
          }
        } catch (e) {
          console.log('Could not get token from content script:', e);
        }
      }

      setStatus('error', 'Chưa kết nối - Mở Discord trước');
    } catch (e) {
      setStatus('error', 'Lỗi kết nối');
    }
  }

  function setStatus(type, text) {
    statusDot.className = 'status-dot ' + type;
    statusText.textContent = text;
  }

  // ===== Fetch All Data =====
  async function fetchAllData() {
    if (!discordToken) {
      await checkConnection();
      if (!discordToken) {
        showError('Không tìm thấy token Discord. Hãy mở Discord trong trình duyệt và thử lại.');
        return;
      }
    }

    showLoading('Đang tải dữ liệu từ Discord...');
    hideError();

    try {
      showLoading('Đang tải Avatar Decorations...');
      const categories = await fetchAPI(ENDPOINTS.collectiblesCategories);

      if (categories && Array.isArray(categories)) {
        allDecorations = [];
        allEffects = [];
        allNameplates = [];
        categories.forEach(category => {
          if (category.products) {
            category.products.forEach(product => {
              const items = product.items || [];
              items.forEach(item => {
                if (item.type === 0 || item.type === 'AVATAR_DECORATION') {
                  allDecorations.push({
                    id: item.id,
                    skuId: product.sku_id,
                    name: product.name,
                    categoryName: category.name,
                    type: 'decoration',
                    asset: item.asset,
                    label: item.label || product.name,
                    previewUrl: getDecorationUrl(item.asset),
                    animated: item.asset ? item.asset.endsWith('a_') || false : false
                  });
                } else if (item.type === 1 || item.type === 'PROFILE_EFFECT') {
                  allEffects.push({
                    id: item.id,
                    skuId: product.sku_id,
                    name: product.name,
                    categoryName: category.name,
                    type: 'effect',
                    asset: item.asset,
                    label: item.label || product.name,
                    previewUrl: item.asset,
                    effects: item.effects || []
                  });
                } else if (item.type === 2 || item.type === 'COLLECTIBLES_NAMEPLATE') {
                  const nameplatePreview = getNameplatePreviewUrl(item, product);
                  allNameplates.push({
                    id: item.id,
                    skuId: product.sku_id,
                    name: product.name,
                    categoryName: category.name,
                    type: 'nameplate',
                    asset: item.asset,
                    label: item.label || product.name,
                    previewUrl: nameplatePreview,
                    styles: item.styles || product.styles || []
                  });
                }
              });
            });
          }
        });
      }

      showLoading('Đang tải Profile Effects...');
      try {
        const effects = await fetchAPI(ENDPOINTS.userProfileEffects);
        if (effects && effects.profile_effect_configs) {
          effects.profile_effect_configs.forEach(effect => {
            const exists = allEffects.some(e => e.id === effect.id);
            if (!exists) {
              allEffects.push({
                id: effect.id,
                skuId: effect.sku_id,
                name: effect.title || 'Unknown Effect',
                type: 'effect',
                label: effect.title || 'Unknown',
                description: effect.description,
                previewUrl: effect.thumbnailPreviewSrc || effect.reducedMotionSrc,
                thumbnailPreviewSrc: effect.thumbnailPreviewSrc,
                reducedMotionSrc: effect.reducedMotionSrc,
                effects: effect.effects || [],
                accessibilityLabel: effect.accessibilityLabel
              });
            }
          });
        }
      } catch (e) {
        console.log('Could not fetch profile effects directly:', e);
      }

      try {
        const avatarDecs = await fetchAPI(ENDPOINTS.avatarDecorations);
        if (avatarDecs && Array.isArray(avatarDecs)) {
          avatarDecs.forEach(dec => {
            const exists = allDecorations.some(d => d.id === dec.id || d.skuId === dec.sku_id);
            if (!exists) {
              allDecorations.push({
                id: dec.id,
                skuId: dec.sku_id,
                name: dec.label || dec.name || 'Unknown Decoration',
                type: 'decoration',
                asset: dec.asset,
                label: dec.label || dec.name || 'Unknown',
                previewUrl: getDecorationUrl(dec.asset),
              });
            }
          });
        }
      } catch (e) {
        console.log('Could not fetch avatar decorations directly:', e);
      }

      collectedItems = [...allDecorations, ...allEffects, ...allNameplates];
      await chrome.storage.local.set({
        allDecorations,
        allEffects,
        allNameplates,
        collectedItems,
        lastFetch: Date.now()
      });

      hideLoading();
      updateCounter();
      renderContent();
      downloadAllBtn.disabled = collectedItems.length === 0;
      showToast(`${allDecorations.length} decorations, ${allEffects.length} effects, ${allNameplates.length} nameplates!`, 'success');

    } catch (e) {
      hideLoading();
      showError(`Lỗi: ${e.message}`);
      console.error('Fetch error:', e);
    }
  }

  // ===== API Fetch =====
  async function fetchAPI(url) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url.includes('discord.com')) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'FETCH_API',
          url: url
        });
        if (response && response.success) {
          return response.data;
        }
      } catch (e) {
        console.log('Content script fetch failed, trying direct:', e);
      }
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': discordToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        discordToken = null;
        chrome.storage.local.remove('discordToken');
        setStatus('error', 'Token hết hạn');
        throw new Error('Token Discord đã hết hạn. Hãy làm mới trang Discord và thử lại.');
      }
      throw new Error(`API trả về lỗi ${response.status}`);
    }

    return await response.json();
  }

  // ===== URL Helpers =====
  function getDecorationUrl(asset) {
    if (!asset) return '';
    return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=240&passthrough=true`;
  }

  // Nameplate CDN base
  const NAMEPLATE_CDN = 'https://cdn.discordapp.com/assets/collectibles/';

  function getNameplateUrl(asset) {
    if (!asset) return '';
    // Asset path ví dụ: "nameplates/zodiac/cancer/" 
    // File thật: .../nameplates/zodiac/cancer/asset.webm
    let path = asset;
    // Bỏ trailing slash nếu có
    if (path.endsWith('/')) path = path.slice(0, -1);
    return `${NAMEPLATE_CDN}${path}/asset.webm`;
  }

  function getNameplatePreviewImg(asset) {
    if (!asset) return '';
    let path = asset;
    if (path.endsWith('/')) path = path.slice(0, -1);
    // Thử static.png cho preview (nhẹ hơn webm)
    return `${NAMEPLATE_CDN}${path}/static.png`;
  }

  function getNameplateAllUrls(asset) {
    if (!asset) return [];
    let path = asset;
    if (path.endsWith('/')) path = path.slice(0, -1);
    // Tải cả webm (animated) và static png
    return [
      `${NAMEPLATE_CDN}${path}/asset.webm`,
      `${NAMEPLATE_CDN}${path}/static.png`
    ];
  }

  function getNameplatePreviewUrl(item, product) {
    // Ưu tiên static.png cho preview
    if (item.asset) {
      return getNameplatePreviewImg(item.asset);
    }
    if (product && product.bundled_products) {
      for (const bp of product.bundled_products) {
        if (bp.items) {
          for (const bpItem of bp.items) {
            if (bpItem.asset && (bpItem.type === 2 || bpItem.type === 'COLLECTIBLES_NAMEPLATE')) {
              return getNameplatePreviewImg(bpItem.asset);
            }
          }
        }
      }
    }
    return '';
  }

  function getEffectPreviewUrl(effect) {
    if (effect.thumbnailPreviewSrc) return effect.thumbnailPreviewSrc;
    if (effect.reducedMotionSrc) return effect.reducedMotionSrc;
    if (effect.previewUrl) return effect.previewUrl;
    if (effect.effects && effect.effects.length > 0) {
      const firstEffect = effect.effects[0];
      return firstEffect.src || firstEffect.thumbnailSrc || '';
    }
    return '';
  }

  // ===== Render Content =====
  function renderContent() {
    let items = [];

    switch (currentTab) {
      case 'decorations':
        items = allDecorations;
        break;
      case 'effects':
        items = allEffects;
        break;
      case 'nameplates':
        items = allNameplates;
        break;
      case 'collected':
        items = collectedItems;
        break;
    }

    if (items.length === 0) {
      emptyState.style.display = '';
      grid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '';

    const groups = {};
    items.forEach(item => {
      const cat = item.categoryName || item.type || 'Khác';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    Object.entries(groups).forEach(([category, categoryItems]) => {
      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <h3>${category}</h3>
        <span class="count">${categoryItems.length}</span>
      `;
      grid.appendChild(header);

      categoryItems.forEach((item, idx) => {
        const card = createCard(item, idx);
        grid.appendChild(card);
      });
    });

    updateCounter();
  }

  function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${index * 0.03}s`;

    let previewUrl = item.previewUrl || '';
    if (item.type === 'effect') {
      previewUrl = getEffectPreviewUrl(item);
    } else if (item.type === 'nameplate' && !previewUrl && item.asset) {
      previewUrl = getNameplatePreviewImg(item.asset);
    }

    card.innerHTML = `
      <div class="card-preview">
        ${previewUrl ?
        `<img src="${previewUrl}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">` :
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#72767d" stroke-width="1.5">
            <rect x="4" y="4" width="24" height="24" rx="4"/>
            <circle cx="16" cy="14" r="4"/>
            <path d="M8 26c0-4 4-7 8-7s8 3 8 7"/>
          </svg>`
      }
      </div>
      <div class="card-info">
        <div class="name" title="${item.name}">${item.name}</div>
        <span class="type-badge">${item.type === 'effect' ? 'Effect' : item.type === 'nameplate' ? 'Nameplate' : 'Decoration'}</span>
      </div>
      <div class="card-actions">
        <button class="card-btn download-btn" title="Tải xuống">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M7 2v7M4 6l3 3 3-3M2 11h10"/>
          </svg>
        </button>
        <button class="card-btn preview-btn" title="Xem trước">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="7" cy="7" r="5"/>
            <circle cx="7" cy="7" r="2"/>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.download-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadItem(item);
    });

    card.querySelector('.preview-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showPreview(item);
    });

    card.addEventListener('click', () => showPreview(item));

    return card;
  }

  // ===== Preview Modal =====
  function showPreview(item) {
    const previewUrl = item.type === 'effect' ?
      getEffectPreviewUrl(item) :
      item.previewUrl;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const allUrls = [];
    if (item.previewUrl) allUrls.push(item.previewUrl);
    if (item.thumbnailPreviewSrc) allUrls.push(item.thumbnailPreviewSrc);
    if (item.reducedMotionSrc) allUrls.push(item.reducedMotionSrc);
    if (item.effects) {
      item.effects.forEach(eff => {
        if (eff.src) allUrls.push(eff.src);
      });
    }

    overlay.innerHTML = `
      <div class="modal">
        ${previewUrl ?
        `<img src="${previewUrl}" alt="${item.name}">` :
        `<p style="color: var(--text-muted); padding: 40px;">Không có preview</p>`
      }
        <div class="name">${item.name}</div>
        <div class="sku">SKU: ${item.skuId || 'N/A'} | ID: ${item.id || 'N/A'}</div>
        ${allUrls.length > 0 ? `<div class="sku">Assets: ${allUrls.length} file(s)</div>` : ''}
        <div class="modal-actions">
          <button class="btn btn-primary download-modal-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7 2v7M4 6l3 3 3-3M2 11h10"/>
            </svg>
            Tải xuống
          </button>
          <button class="btn btn-secondary close-modal-btn">Đóng</button>
        </div>
      </div>
    `;

    overlay.querySelector('.close-modal-btn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.download-modal-btn').addEventListener('click', () => {
      downloadItem(item);
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // ===== Download Single Item =====
  function downloadItem(item) {
    const urls = getDownloadUrls(item);
    if (urls.length === 0) {
      showToast('Không có file để tải', 'error');
      return;
    }

    const safeName = (item.name || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');

    urls.forEach((url, idx) => {
      const ext = getExtFromUrl(url);
      const filename = `discord_decorations/${item.type}/${safeName}${urls.length > 1 ? `_${idx + 1}` : ''}.${ext}`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          window.open(url, '_blank');
          showToast(`Đã mở trong tab mới: ${item.name}`, 'success');
        } else {
          showToast(`Đã tải: ${item.name}`, 'success');
        }
      });
    });
  }

  function getDownloadUrls(item) {
    const urls = new Set();

    if (item.type === 'decoration') {
      if (item.asset) {
        urls.add(`https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=1024&passthrough=true`);
      }
      if (item.previewUrl) {
        urls.add(item.previewUrl.replace('size=240', 'size=1024'));
      }
    } else if (item.type === 'effect') {
      if (item.thumbnailPreviewSrc) urls.add(item.thumbnailPreviewSrc);
      if (item.reducedMotionSrc) urls.add(item.reducedMotionSrc);
      if (item.effects) {
        item.effects.forEach(eff => {
          if (eff.src) urls.add(eff.src);
          if (eff.thumbnailSrc) urls.add(eff.thumbnailSrc);
        });
      }
    } else if (item.type === 'nameplate') {
      if (item.asset) {
        getNameplateAllUrls(item.asset).forEach(u => urls.add(u));
      }
      if (item.styles && item.styles.length > 0) {
        item.styles.forEach(style => {
          if (style.asset) {
            getNameplateAllUrls(style.asset).forEach(u => urls.add(u));
          }
        });
      }
    }

    if (item.previewUrl && urls.size === 0) {
      urls.add(item.previewUrl);
    }

    return [...urls];
  }

  function getExtFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop();
      if (['png', 'gif', 'webp', 'jpg', 'jpeg', 'mp4', 'webm', 'json'].includes(ext)) {
        return ext;
      }
    } catch (e) { }
    return 'png';
  }

  // ===== Download All as ZIP =====
  async function downloadAll() {
    let items = [];
    let zipName = 'discord_decorations';
    switch (currentTab) {
      case 'decorations':
        items = allDecorations;
        zipName = 'discord_avatar_decorations';
        break;
      case 'effects':
        items = allEffects;
        zipName = 'discord_profile_effects';
        break;
      case 'nameplates':
        items = allNameplates;
        zipName = 'discord_nameplates';
        break;
      case 'collected':
        items = collectedItems;
        zipName = 'discord_all_decorations';
        break;
    }

    if (items.length === 0) {
      showToast('Không có items để tải', 'error');
      return;
    }

    // Hiện dialog hỏi chia file hay không
    showDownloadDialog(items, zipName);
  }

  function showDownloadDialog(items, zipName) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="text-align:center; padding:24px;">
        <div class="name" style="font-size:16px; margin-bottom:4px;">📦 Tải ${items.length} items</div>
        <div class="sku" style="margin-bottom:16px;">Chọn cách tải xuống:</div>
        <div class="modal-actions" style="flex-direction:column; gap:10px;">
          <button class="btn btn-primary" id="dlSingle" style="width:100%;">
            📄 1 file ZIP duy nhất
          </button>
          <button class="btn btn-secondary" id="dlSplit" style="width:100%;">
            📂 Chia nhỏ (~500MB / file)
          </button>
          <button class="btn btn-secondary" id="dlCancel" style="width:100%; opacity:0.7;">
            ❌ Hủy
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('#dlCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#dlSingle').addEventListener('click', () => {
      overlay.remove();
      startDownload(items, zipName, false);
    });

    overlay.querySelector('#dlSplit').addEventListener('click', () => {
      overlay.remove();
      startDownload(items, zipName, true);
    });

    document.body.appendChild(overlay);
  }

  function getOriginalFilename(url) {
    try {
      const pathname = new URL(url).pathname;
      // Lấy file name gốc từ URL
      const parts = pathname.split('/').filter(p => p);
      const lastPart = parts[parts.length - 1];
      // Nếu lastPart có extension → dùng luôn
      if (lastPart && lastPart.includes('.')) {
        return lastPart;
      }
      // Nếu không có extension, ghép path
      return parts.slice(-2).join('_') || 'file';
    } catch (e) {
      return 'file';
    }
  }

  function startDownload(items, zipName, splitEnabled) {
    // Thu thập danh sách file
    const fileList = [];
    items.forEach(item => {
      const urls = getDownloadUrls(item);
      const itemName = (item.name || 'unknown').replace(/[\\/:*?"<>|]/g, '_');
      const category = (item.categoryName || item.type || 'other').replace(/[\\/:*?"<>|]/g, '_');

      urls.forEach((url, idx) => {
        const originalFile = getOriginalFilename(url);
        let filename;
        if (urls.length === 1) {
          // 1 URL → dùng tên item + extension gốc
          const ext = originalFile.includes('.') ? originalFile.split('.').pop() : getExtFromUrl(url);
          filename = `${category}/${itemName}.${ext}`;
        } else {
          // Nhiều URL → dùng tên item + tên file gốc
          filename = `${category}/${itemName}_${originalFile}`;
        }
        fileList.push({ url, filename, name: item.name });
      });
    });

    // Lưu vào storage và mở tab download
    const timestamp = new Date().toISOString().slice(0, 10);
    const zipFilename = `${zipName}_${timestamp}.zip`;

    chrome.storage.local.set({
      zipJob: {
        fileList,
        zipFilename,
        splitEnabled,
        timestamp: Date.now()
      }
    }, () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('download.html')
      });
    });
  }

  // ===== Load Stored Data =====
  async function loadStoredData() {
    try {
      const stored = await chrome.storage.local.get(['allDecorations', 'allEffects', 'allNameplates', 'collectedItems']);
      if (stored.allDecorations) allDecorations = stored.allDecorations;
      if (stored.allEffects) allEffects = stored.allEffects;
      if (stored.allNameplates) allNameplates = stored.allNameplates;
      if (stored.collectedItems) collectedItems = stored.collectedItems;

      if (collectedItems.length > 0) {
        renderContent();
        downloadAllBtn.disabled = false;
        updateCounter();
      }
    } catch (e) {
      console.log('No stored data found');
    }
  }

  // ===== UI Helpers =====
  function showLoading(text) {
    loading.style.display = '';
    loadingText.textContent = text || 'Đang tải...';
    content.style.display = 'none';
    error.style.display = 'none';
  }

  function hideLoading() {
    loading.style.display = 'none';
    content.style.display = '';
  }

  function showError(text) {
    error.style.display = '';
    errorText.textContent = text;
  }

  function hideError() {
    error.style.display = 'none';
  }

  function updateCounter() {
    let count = 0;
    switch (currentTab) {
      case 'decorations': count = allDecorations.length; break;
      case 'effects': count = allEffects.length; break;
      case 'nameplates': count = allNameplates.length; break;
      case 'collected': count = collectedItems.length; break;
    }
    counter.textContent = `${count} items`;
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

})();
