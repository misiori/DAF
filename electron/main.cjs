// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');

// ============================================================
// DISCORD RPC — минимальный клиент без внешних зависимостей
// ============================================================

const CLIENT_ID = 1555577699723120722; // ← БЕЗ КАВЫЧЕК, это число!

// Discord IPC сокет. На Linux — $XDG_RUNTIME_DIR/discord-ipc-0,
// на Windows — named pipe, на macOS — /tmp/discord-ipc-0
function getDiscordIpcPath() {
  if (process.platform === 'win32') {
    return '\\\\?\\pipe\\discord-ipc-0';
  }
  const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp';
  return path.join(base, 'discord-ipc-0');
}

let discordSocket = null;
let discordReady = false; // true, когда получили READY от Discord

function connectToDiscord() {
  return new Promise((resolve) => {
    const ipcPath = getDiscordIpcPath();
    console.log('[Discord] Connecting to:', ipcPath);

    const socket = net.createConnection(ipcPath);

    socket.on('connect', () => {
      console.log('[Discord] Socket connected, sending handshake');
      // Handshake
      const handshake = { v: 1, client_id: CLIENT_ID };
      sendPacket(socket, 0, handshake);
    });

    socket.on('data', (data) => {
      try {
        const op = data.readInt32LE(0);
        const len = data.readInt32LE(4);
        const json = data.slice(8, 8 + len).toString('utf8');
        const payload = JSON.parse(json);

        if (payload.cmd === 'DISPATCH' && payload.evt === 'READY') {
          console.log('[Discord] READY received. User:', payload.data?.user?.username);
          discordReady = true;
          resolve(true);
        }
      } catch (e) {
        console.warn('[Discord] Failed to parse packet:', e.message);
      }
    });

    socket.on('error', (err) => {
      console.warn('[Discord] Socket error:', err.message);
      discordReady = false;
      resolve(false);
    });

    socket.on('close', () => {
      console.log('[Discord] Socket closed');
      discordReady = false;
      discordSocket = null;
    });

    discordSocket = socket;
  });
}

function sendPacket(socket, op, payload) {
  if (!socket || !socket.writable) return;
  const json = JSON.stringify(payload);
  const len = Buffer.byteLength(json);
  const buffer = Buffer.alloc(8 + len);
  buffer.writeInt32LE(op, 0);
  buffer.writeInt32LE(len, 4);
  buffer.write(json, 8);
  socket.write(buffer);
}

async function updatePresence(activity) {
  if (!discordSocket || !discordReady) {
    const ok = await connectToDiscord();
    if (!ok) return;
  }

  const payload = {
    cmd: 'SET_ACTIVITY',
    args: {
      pid: process.pid,
      activity: {
        details: activity.details || 'Playing',
        state: activity.state || 'In Game',
        timestamps: {
          start: activity.startTimestamp || Date.now(),
        },
        assets: {
          large_image: activity.largeImageKey || 'logo',
          large_text: activity.largeImageText || 'Dangerous Ant Farm',
        },
      },
    },
    nonce: Math.random().toString(36).substring(7),
  };

  console.log('[Discord] Sending activity:', payload.args.activity.state);
  sendPacket(discordSocket, 1, payload);
}

// Слушаем сообщения из React (через preload.cjs)
ipcMain.on('update-discord-rpc', async (_event, details) => {
  try {
    await updatePresence(details);
  } catch (e) {
    console.warn('[Discord] updatePresence failed:', e.message);
  }
});

// ============================================================
// ELECTRON WINDOW
// ============================================================

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