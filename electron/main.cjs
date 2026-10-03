const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Linux Discord IPC socket path is discovered correctly (especially inside AppImage / sandbox)
if (process.platform === 'linux') {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  const candidateDirs = [
    process.env.XDG_RUNTIME_DIR,
    `/run/user/${uid}`,
    '/run/user/1000',
    path.join(process.env.HOME || '', '.config/discord'),
    `/run/user/${uid}/app/com.discordapp.Discord`,
    `/tmp/app/com.discordapp.Discord`,
    '/tmp',
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(path.join(dir, 'discord-ipc-0'))) {
        process.env.XDG_RUNTIME_DIR = dir;
        console.log('[Discord] Auto-detected discord-ipc-0 socket at:', dir);
        break;
      }
    } catch (_) {}
  }

  if (!process.env.XDG_RUNTIME_DIR) {
    const fallbackDir = `/run/user/${uid}`;
    if (fs.existsSync(fallbackDir)) {
      process.env.XDG_RUNTIME_DIR = fallbackDir;
    }
  }
}

const DiscordRPC = require('discord-rpc');

// Application ID provided by user as string to prevent 64-bit float precision loss
const CLIENT_ID = '1555851785812316180';

let rpc = null;
let rpcReady = false;
let reconnectTimer = null;
let lastPresence = null;

function initDiscordRPC() {
  if (rpc) {
    try {
      rpc.destroy();
    } catch (_) {}
  }

  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    console.log('[Discord] RPC connected. User:', rpc.user ? rpc.user.username : 'Unknown');
    rpcReady = true;
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
    // If a presence update was queued before ready, send it now
    if (lastPresence) {
      sendActivity(lastPresence);
    }
  });

  rpc.on('disconnected', () => {
    console.warn('[Discord] RPC disconnected.');
    rpcReady = false;
    scheduleReconnect();
  });

  rpc.on('error', (err) => {
    console.warn('[Discord] RPC client error:', err ? err.message : err);
    rpcReady = false;
  });

  rpc.login({ clientId: CLIENT_ID }).catch((err) => {
    console.warn('[Discord] Login failed:', err ? err.message : err);
    rpcReady = false;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (!rpcReady) {
      console.log('[Discord] Attempting to reconnect RPC...');
      initDiscordRPC();
    }
  }, 15000);
}

async function sendActivity(details) {
  if (!rpc || !rpcReady) return;
  try {
    const activity = {
      details: details.details || 'Idle',
      state: details.state || 'in the menu',
      startTimestamp: details.startTimestamp ? Math.floor(details.startTimestamp) : Math.floor(Date.now()),
      instance: false,
    };

    if (details.largeImageKey) {
      activity.largeImageKey = details.largeImageKey;
      activity.largeImageText = details.largeImageText || 'Dangerous Ant Farm';
    }
    if (details.smallImageKey) {
      activity.smallImageKey = details.smallImageKey;
      activity.smallImageText = details.smallImageText;
    }

    try {
      await rpc.setActivity(activity);
      console.log('[Discord] Activity updated:', activity.state);
    } catch (actErr) {
      // If setting activity failed due to missing image key in Discord portal, retry without it
      if (activity.largeImageKey) {
        delete activity.largeImageKey;
        delete activity.largeImageText;
        await rpc.setActivity(activity);
        console.log('[Discord] Activity updated (fallback without image):', activity.state);
      } else {
        throw actErr;
      }
    }
  } catch (e) {
    console.warn('[Discord] setActivity failed:', e ? e.message : e);
  }
}

ipcMain.on('update-discord-rpc', (_event, details) => {
  lastPresence = details;
  if (rpcReady) {
    sendActivity(details);
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

app.whenReady().then(() => {
  initDiscordRPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
