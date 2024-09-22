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
          accelerator: 'CmdOrCtrl+N', // Shortcut key for new file
          click: async () => {
            win.webContents.send('new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O', // Shortcut key for opening a file
          click: async () => {
            // Trigger JSON loading
            const { canceled, filePaths } = await dialog.showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] });
            if (!canceled && filePaths.length > 0) {
              const filePath = filePaths[0];
              const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              win.webContents.send('load-json', jsonData, filePath);  // Send both the JSON data and file path to the renderer
            }
          }
        },
        {
          label: 'Save',
          id: 'save',  // Add an ID to reference the menu item
          enabled: false,  // Initially disabled
          accelerator: 'CmdOrCtrl+S', // Add the shortcut key for Save
          click: () => {
            win.webContents.send('save-json');
          }
        },
        {
          label: 'Save As',
          id: 'saveAs',  // Add an ID to reference the menu item
          enabled: true, // Initially enabled (for new files)
          accelerator: 'CmdOrCtrl+Shift+S', // Add the shortcut key for Save As
          click: () => {
            win.webContents.send('save-json-as');
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
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            win.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I', // Shortcut for Developer Tools
          click: () => {
            win.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  // Set the menu to the application
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Prevent the window from closing if there are unsaved changes
  win.on('close', (e) => {
    // Send a message to the renderer to check if there are unsaved changes
    e.preventDefault(); // Prevent the window from closing
    win.webContents.send('check-unsaved-changes');
  });

}

//listen for the update-menu event sent from the renderer process and update the "Save" and "Save As" menu items dynamically.
ipcMain.on('update-menu', (event, { saveEnabled, saveAsEnabled }) => {
  const menu = Menu.getApplicationMenu();

  // Update "Save" and "Save As" menu items
  const saveItem = menu.getMenuItemById('save');
  const saveAsItem = menu.getMenuItemById('saveAs');

  saveItem.enabled = saveEnabled;
  saveAsItem.enabled = saveAsEnabled;

  // Set the updated menu
  Menu.setApplicationMenu(menu);
});

//  handler to invoke the save dialog:
ipcMain.handle('show-save-dialog', async (event, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(options);
  return { canceled, filePath };
});

// Handle saving JSON in the main process
ipcMain.handle('save-json', async (event, jsonData, saveTopath) => {
  if(saveTopath){
    fs.writeFileSync(saveTopath, JSON.stringify(jsonData, null, 2), 'utf-8');
    return saveTopath;
  } else {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!canceled && filePath) {
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
      return filePath;
    }
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

ipcMain.on('force-close', (event) => {
  const win = BrowserWindow.getFocusedWindow();
  win.destroy(); // Force the window to close
});

ipcMain.on('update-title', (event, fileName) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setTitle(`Email Builder - ${fileName}`); // Update the title with the file name
  }
});

app.whenReady().then(createWindow);
