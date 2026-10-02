const { contextBridge, ipcRenderer } = require('electron');

// Мы создаём безопасный мост, который React сможет вызывать
contextBridge.exposeInMainWorld('electronAPI', {
  // Эта функция отправляет данные для Discord в главный процесс
  updateDiscordPresence: (details) => {
    // Отправляем сообщение в main.cjs по каналу 'update-discord-rpc'
    ipcRenderer.send('update-discord-rpc', details);
  },
});