// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// --- НАЧАЛО КОДА ДЛЯ DISCORD ---
let rpcClient = null;
try {
  // Пытаемся подключить встроенный клиент Discord (не требует установки)
  // В Electron он может быть доступен через require, но лучше использовать встроенный ipc
  // Однако для простоты мы будем использовать чистый IPC протокол Electron для Discord.
  // Но для этого нужен клиент. Попробуем самый простой способ без внешних зависимостей:
  // Используем нативный модуль Node.js для связи с Discord через его IPC сокет.
  
  // Простейший самописный клиент для Discord RPC (без библиотек)
  const net = require('net');
  const path = require('path');
  
  const DISCORD_IPC_PATH = process.platform === 'win32' 
    ? '\\\\?\\pipe\\discord-ipc-0' 
    : path.join(process.env.XDG_RUNTIME_DIR || '/tmp', 'discord-ipc-0');

  let socket = null;
  let isConnected = false;

  function connectToDiscord(clientId) {
    return new Promise((resolve) => {
      socket = net.createConnection(DISCORD_IPC_PATH);
      
      socket.on('connect', () => {
        isConnected = true;
        // Отправляем рукопожатие (handshake)
        const handshake = { v: 1, client_id: clientId };
        sendPacket(0, handshake);
        resolve(true);
      });

      socket.on('error', () => {
        isConnected = false;
        resolve(false);
      });
    });
  }

  function sendPacket(op, payload) {
    if (!socket || !isConnected) return;
    
    const json = JSON.stringify(payload);
    const len = Buffer.byteLength(json);
    const buffer = Buffer.alloc(8 + len);
    
    buffer.writeInt32LE(op, 0);
    buffer.writeInt32LE(len, 4);
    buffer.write(json, 8);
    
    socket.write(buffer);
  }

  // Функция обновления статуса
  async function updatePresence(clientId, activity) {
    if (!isConnected) {
      const connected = await connectToDiscord(clientId);
      if (!connected) return;
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
            large_image: activity.largeImageKey || 'logo', // Убедись, что ключ 'logo' добавлен в Discord Developer Portal
            large_text: activity.largeImageText || 'Dangerous Ant Farm',
          },
        },
      },
      nonce: Math.random().toString(36).substring(7),
    };
    
    sendPacket(1, payload);
  }
  // --- КОНЕЦ КОДА ДЛЯ DISCORD ---

  // Слушаем сообщения из React (из preload.cjs)
  ipcMain.on('update-discord-rpc', async (event, details) => {
    const clientId = '1555577699723120722'; // ЗАМЕНИ ЭТО на свой Application ID из Discord Dev Portal
    await updatePresence(clientId, details);
  });

} catch (e) {
  console.warn('Discord RPC не подключен:', e.message);
}
// --- КОНЕЦ ЛОГИКИ DISCORD ---


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // <-- ВАЖНО! Указываем наш новый preload
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