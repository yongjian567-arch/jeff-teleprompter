const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseFileBuffer } = require('./src/parse');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'Jeff 提词器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 拖入文件:渲染进程把文件名 + 字节内容发过来解析
ipcMain.handle('parse-file', async (_e, payload) => {
  try {
    const { name, data } = payload || {};
    const buffer = Buffer.from(data);
    const result = await parseFileBuffer(name, buffer);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// 点击「打开文件」按钮:弹出系统选择框,读文件并解析
ipcMain.handle('open-dialog', async () => {
  try {
    const res = await dialog.showOpenDialog(win, {
      title: '打开文案',
      filters: [
        { name: '支持的文案', extensions: ['txt', 'docx'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'Word 文档', extensions: ['docx'] },
      ],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const filePath = res.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    const name = path.basename(filePath);
    const result = await parseFileBuffer(name, buffer);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// 全屏切换
ipcMain.handle('toggle-fullscreen', () => {
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return win.isFullScreen();
});
