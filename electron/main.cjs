const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');

const CLIENT_ID = 1555577699723120722;
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let rpcReady = false;

rpc.on('ready', () => {
  console.log('[Discord] READY. User:', rpc.user.username);
  rpcReady = true;
});

rpc.login({ clientId: CLIENT_ID }).catch((err) => {
  console.warn('[Discord] Login failed:', err.message);
});

ipcMain.on('update-discord-rpc', async (_event, details) => {
  if (!rpcReady) return;
  try {
    await rpc.setActivity({
      details: details.details || 'Idle',
      state: details.state || 'in the menu',
      startTimestamp: details.startTimestamp || Date.now(),
      largeImageKey: details.largeImageKey || 'logo',
      largeImageText: details.largeImageText || 'Dangerous Ant Farm',
      instance: false,
    });
    console.log('[Discord] SET_ACTIVITY:', details.state);
  } catch (e) {
    console.warn('[Discord] setActivity failed:', e.message);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});