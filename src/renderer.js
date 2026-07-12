// --- UI要素の取得 ---
const urlbar = document.getElementById("urlbar");
const backBtn = document.getElementById("backBtn");
const forwardBtn = document.getElementById("forwardBtn");
const homeBtn = document.getElementById("homeBtn");
const newTabBtn = document.getElementById("newTabBtn");
const tabsContainer = document.getElementById("tabs");

const backHistoryBtn = document.getElementById("backHistoryBtn");
const historyPopup = document.getElementById("historyPopup");
const bookmarkBtn = document.getElementById("bookmarkBtn");
const bookmarkBar = document.getElementById("bookmarkBar");
const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsSidebar = document.getElementById("settingsSidebar");

// 設定項目の取得
const toggleBookmarkBar = document.getElementById("toggleBookmarkBar");
const toggleTabScroll = document.getElementById("toggleTabScroll");
const themeSelect = document.getElementById("themeSelect");
const tabShapeSelect = document.getElementById("tabShapeSelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const searchEngineSelect = document.getElementById("searchEngine");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");

// 自作ウィンドウ操作ボタン
const winMinimizeBtn = document.getElementById("win-minimize-btn");
const winMaximizeBtn = document.getElementById("win-maximize-btn");
const winCloseBtn = document.getElementById("win-close-btn");

/**
 * 12種類の検索エンジンルーティング
 */
function executeEngineSearch(engine, queryToken) {
    switch (engine) {
        case "startpage":  return `https://www.startpage.com/sp/search?query=${queryToken}`;
        case "brave":      return `https://search.brave.com/search?q=${queryToken}`;
        case "vivaldi":    return `https://bing.com/search?q=${queryToken}`;
        case "coccoc":     return `https://coccoc.com/search?query=${queryToken}`;
        case "konqueror":  return `https://search.yahoo.com/search?p=${queryToken}`;
        case "tor":
        case "srware":     return `https://duckduckgo.com/?q=${queryToken}`;
        case "firefox":
        case "chromium":
        case "floorp":
        case "opera":
        case "google":
        default:           return `https://www.google.com/search?q=${queryToken}`;
    }
}

/**
 * 入力された文字列をURLまたは検索クエリに正規化する
 */
function normalizeInput(input) {
    input = input.trim();
    if (!input) return "";
    
    if (input.startsWith("http://") || input.startsWith("https://")) {
        return input;
    }
    
    if (input.includes(".") && !input.includes(" ")) {
        return "https://" + input;
    }
    
    const currentEngine = localStorage.getItem("searchEngine") || "google";
    return executeEngineSearch(currentEngine, encodeURIComponent(input));
}

// ==========================================
// 1. タブ機能の実装（メインプロセスからの状態同期 ＆ ドラッグ＆ドロップ）
// ==========================================

window.electronAPI.onTabsUpdated((tabsList, activeTabId) => {
    if (!tabsContainer) return;
    tabsContainer.innerHTML = ""; 

    tabsList.forEach((tabData) => {
        const tabEl = document.createElement("div");
        tabEl.className = `tab ${tabData.id === activeTabId ? "active" : ""}`;
        tabEl.setAttribute("draggable", "true");
        tabEl.dataset.id = tabData.id;
        
        if (tabData.id === activeTabId && urlbar && !urlbar.matches(':focus')) {
            if (tabData.url.startsWith("file://") && tabData.url.includes("newtab.html")) {
                urlbar.value = "";
            } else {
                urlbar.value = tabData.url;
            }
        }

        const titleSpan = document.createElement("span");
        titleSpan.className = "tab-title";
        titleSpan.textContent = tabData.title || "新しいタブ";
        titleSpan.addEventListener("click", () => {
            window.electronAPI.switchTab(tabData.id); 
        });

        const closeBtn = document.createElement("button");
        closeBtn.className = "close-tab-btn";
        closeBtn.textContent = "✕";
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            window.electronAPI.closeTab(tabData.id); 
        });

        tabEl.appendChild(titleSpan);
        tabEl.appendChild(closeBtn);

        // タブ自体への右クリックカスタムメニュー
        tabEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.electronAPI.openTabContextMenu(tabData.id);
        });

        // ドラッグ&ドロップイベントの実装
        tabEl.addEventListener('dragstart', (e) => {
            tabEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        tabEl.addEventListener('dragend', () => {
            tabEl.classList.remove('dragging');
            const currentOrderIds = Array.from(tabsContainer.children).map(el => parseInt(el.dataset.id));
            window.electronAPI.reorderTabs(currentOrderIds);
        });

        tabsContainer.appendChild(tabEl);
    });
});

tabsContainer?.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingEl = document.querySelector('.dragging');
    if (!draggingEl) return;

    const siblings = [...tabsContainer.querySelectorAll('.tab:not(.dragging)')];
    
    const nextSibling = siblings.find(sibling => {
        const box = sibling.getBoundingClientRect();
        return e.clientX < box.left + box.width / 2;
    });
    
    tabsContainer.insertBefore(draggingEl, nextSibling);
});

// ==========================================
// 2. ブックマーク機能の実装
// ==========================================

async function updateBookmarkBar() {
    if (!bookmarkBar) return;
    bookmarkBar.innerHTML = "";
    const bookmarks = await window.electronAPI.getBookmarks();
    
    bookmarks.forEach(b => {
        const btn = document.createElement("button");
        btn.className = "bookmark-item";
        btn.textContent = b.title || b.url;
        btn.title = b.url;
        
        btn.addEventListener("click", () => {
            window.electronAPI.navigate(b.url);
        });
        
        btn.addEventListener("contextmenu", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // パッケージ環境（.exe）でも確実に動くダイアログを呼び出す
            const titleText = b.title || b.url || "不明なブックマーク";
const shouldDelete = await window.electronAPI.confirmDeleteBookmark(String(titleText));
            
            if (shouldDelete) {
                await window.electronAPI.removeBookmark(b.url);
                updateBookmarkBar();
            }
        });
        
        bookmarkBar.appendChild(btn);
    });
}

bookmarkBtn?.addEventListener("click", async () => {
    const success = await window.electronAPI.addBookmark();
    if (success) updateBookmarkBar();
});

// ==========================================
// 3. 履歴機能の実装
// ==========================================

backHistoryBtn?.addEventListener("click", async (e) => {
    e.stopPropagation(); 
    if (!historyPopup) return;

    if (!historyPopup.classList.contains("hidden")) {
        historyPopup.classList.add("hidden");
        return;
    }

    const historyItems = await window.electronAPI.getHistory();
    historyPopup.innerHTML = "";
    
    if (!historyItems || historyItems.length === 0) {
        historyPopup.innerHTML = "<div class='history-item empty'>履歴はありません</div>";
    } else {
        historyItems.forEach(item => {
            const itemEl = document.createElement("div");
            itemEl.className = "history-item";
            itemEl.textContent = item.title || item.url;
            itemEl.title = item.url; 
            
            itemEl.addEventListener("click", () => {
                window.electronAPI.navigate(item.url);
                historyPopup.classList.add("hidden");
            });
            historyPopup.appendChild(itemEl);
        });
    }
    historyPopup.classList.remove("hidden");
});

document.addEventListener("click", () => {
    historyPopup?.classList.add("hidden");
});

// ==========================================
// 4. ナビゲーション基本イベント
// ==========================================

urlbar?.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const normalizedUrl = normalizeInput(urlbar.value);
    if (normalizedUrl) {
        window.electronAPI.navigate(normalizedUrl);
    }
    urlbar.blur();
});

backBtn?.addEventListener("click", () => { window.electronAPI.goBack(); });
forwardBtn?.addEventListener("click", () => { window.electronAPI.goForward(); });
homeBtn?.addEventListener("click", () => { window.electronAPI.goHome(); });
newTabBtn?.addEventListener("click", () => { window.electronAPI.newTab(); });

// ==========================================
// 5. 設定サイドバー・カスタム関連のイベント
// ==========================================

settingsBtn?.addEventListener("click", () => {
    settingsSidebar?.classList.add("open");
    window.electronAPI.setSidebarStatus(true);
});

closeSettingsBtn?.addEventListener("click", () => {
    settingsSidebar?.classList.remove("open");
    window.electronAPI.setSidebarStatus(false);
});

toggleBookmarkBar?.addEventListener("change", (e) => {
    const isOpen = e.target.checked;
    if (bookmarkBar) bookmarkBar.style.display = isOpen ? "flex" : "none";
    window.electronAPI.setBookmarkBarStatus(isOpen);
});

toggleTabScroll?.addEventListener("change", (e) => {
    if (e.target.checked) {
        document.body.classList.remove("no-tab-scroll");
    } else {
        document.body.classList.add("no-tab-scroll");
    }
});

themeSelect?.addEventListener('change', (e) => {
  if (e.target.value === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
  }
});

fontSizeSelect?.addEventListener('change', (e) => {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${e.target.value}`);
});

tabShapeSelect?.addEventListener("change", (e) => {
    const selectedShape = e.target.value;
    document.body.classList.remove("chrome-tabs", "square-tabs");
    document.body.classList.add(`${selectedShape}-tabs`);
});

searchEngineSelect?.addEventListener('change', (e) => {
    localStorage.setItem('searchEngine', e.target.value);
});

resetSettingsBtn?.addEventListener("click", () => {
    if (confirm("履歴などのデータを初期化しますか？")) {
        window.electronAPI.clearHistory(); 
        if (historyPopup) historyPopup.innerHTML = "";
    }
});

document.getElementById('bgUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            localStorage.setItem('set_bg', base64Data);
            const bgEl = document.getElementById('browser-bg');
            if (bgEl) bgEl.style.backgroundImage = `url(${base64Data})`;
        };
        reader.readAsDataURL(file);
    }
});

// アプリケーションフレーム（UI外枠）の右クリック制御
window.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    window.electronAPI.openBrowserUiContextMenu();
});

// 自作ウィンドウ操作ボタンイベント
winMinimizeBtn?.addEventListener("click", () => { window.electronAPI.minimize(); });
winMaximizeBtn?.addEventListener("click", () => { window.electronAPI.maximize(); });
winCloseBtn?.addEventListener("click", () => { window.electronAPI.close(); });

// ==========================================
// 7. 起動時初期化
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    updateBookmarkBar();
    
    if (searchEngineSelect) {
        searchEngineSelect.value = localStorage.getItem("searchEngine") || "google";
    }

    let parentBg = localStorage.getItem('set_bg');
    if (!parentBg) {
        parentBg = "https://cdn.pakutaso.com/shared/img/thumb/YAT20314032_TP_V.jpg";
        localStorage.setItem('set_bg', parentBg);
    }

    const bgEl = document.getElementById('browser-bg');
    if (parentBg && bgEl) {
        bgEl.style.backgroundImage = `url(${parentBg})`;
    }
});
