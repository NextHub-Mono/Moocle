const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTabsUpdated: (callback) => ipcRenderer.on('tabs-updated', (event, tabs, activeTabId) => callback(tabs, activeTabId)),
  
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('goBack'),
  goForward: () => ipcRenderer.invoke('goForward'),
  reload: () => ipcRenderer.invoke('reload'),
  goHome: () => ipcRenderer.invoke('goHome'),
  newTab: () => ipcRenderer.invoke('newTab'),
  switchTab: (id) => ipcRenderer.invoke('switchTab', id),
  closeTab: (id) => ipcRenderer.invoke('closeTab', id),
  reorderTabs: (ids) => ipcRenderer.invoke('reorder-tabs', ids),
  
  setSidebarStatus: (isOpen) => ipcRenderer.invoke('set-sidebar-status', isOpen),
  setBookmarkBarStatus: (isOpen) => ipcRenderer.invoke('set-bookmark-bar-status', isOpen),
  
  addBookmark: () => ipcRenderer.invoke('addBookmark'),
  getBookmarks: () => ipcRenderer.invoke('getBookmarks'),
  removeBookmark: (url) => ipcRenderer.invoke('removeBookmark'),
  getHistory: () => ipcRenderer.invoke('getHistory'),
  clearHistory: () => ipcRenderer.invoke('clearHistory'),

  confirmDeleteBookmark: (title) => ipcRenderer.invoke('confirm-delete-bookmark', title),

  openTabContextMenu: (tabId) => ipcRenderer.send('open-tab-context-menu', tabId),
  openBrowserUiContextMenu: () => ipcRenderer.send('open-browser-ui-context-menu'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
