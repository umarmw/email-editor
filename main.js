const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const fs = require('fs');

app.setName('Email Builder');  // Set your app name

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    // width: 800,
    // height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.loadFile('index.html');

  // macOS specific menu adjustments
  const isMac = process.platform === 'darwin';

  // Create a custom menu
  const template = [
    // macOS application menu (first menu)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          click: async () => {
            win.webContents.send('new');
          }
        },
        {
          label: 'Load',
          click: async () => {
            // Trigger JSON loading
            const { canceled, filePaths } = await dialog.showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] });
            if (!canceled && filePaths.length > 0) {
              const filePath = filePaths[0];
              const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              win.webContents.send('load-json', jsonData);  // Send data to the renderer process
            }
          }
        },
        {
          label: 'Save',
          click: async () => {
            // Trigger JSON saving
            win.webContents.send('save-json');
          }
        },
        {
          label: 'HTML Export',
          click: () => {
            win.webContents.send('export-html');  // Send the 'export-html' event to the renderer process
          }
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' }
      ]
    },
    {
      label: 'Edit',  // Add the Edit menu
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    }
  ];

  // Set the menu to the application
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle saving JSON in the main process
ipcMain.handle('save-json', async (event, jsonData) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    return filePath;
  }
});

// Handle saving the HTML in the main process
ipcMain.handle('save-html', async (event, html) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });

  if (!canceled && filePath) {
    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
  }
  return null;
});

app.whenReady().then(createWindow);
