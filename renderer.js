const { ipcRenderer } = require('electron');
const path = require('path');

// Unlayer Editor initialization
const editor = unlayer.createEditor({
  id: 'editor-container',
  projectId: 1234  // Replace with your actual project ID
});

let unsavedChanges = false; // Flag to track unsaved changes
let currentFilePath = null; // Track the current file path

// Detect changes in the editor (you can adjust based on how you track changes)
editor.addEventListener('design:updated', () => {
  unsavedChanges = true;
});

setTimeout(function () {
  var iframe = document.querySelector('#editor-container iframe');;
  iframe.style.width = '100%';
  iframe.style.height = '100vh';
  // console.log("resized")
}, 5000);

// Listen for "new" event sent from the main process menu
ipcRenderer.on('new', (event) => {
  currentFilePath = null;
  unsavedChanges = true;
  ipcRenderer.send('update-title', 'Untitled');
  const emptyDesign = {
    "body": {
      "rows": []
    }
  };
  editor.loadDesign(emptyDesign);
  // Enable "Save" since it's a new document, and disable "Save As"
  ipcRenderer.send('update-menu', { saveEnabled: true, saveAsEnabled: false });
});

// Listen for "load-json" event sent from the main process menu
ipcRenderer.on('load-json', (event, jsonData, filePath) => {
  currentFilePath = filePath; // Store the file path when the user loads a JSON
  unsavedChanges = false; // No unsaved changes after loading
  if (jsonData) {
    editor.loadDesign(jsonData);  // Load the design into the Unlayer editor
  }
  const fileName = path.basename(filePath); // Extract the file name
  // Update the window title with the file name
  ipcRenderer.send('update-title', fileName);

  // Enable both "Save" and "Save As"
  ipcRenderer.send('update-menu', { saveEnabled: true, saveAsEnabled: true });
});

// Listen for "save-json" event sent from the main process menu
ipcRenderer.on('save-json', () => {
  unsavedChanges = false;
  // Save to the existing file
  editor.saveDesign(async (design) => {
    const result = await ipcRenderer.invoke('save-json', design, currentFilePath); // if currentFilePath exists, take it else it will be null
    alert('Design saved as JSON!');
    // Get the file name and update the window title
    const fileName = path.basename(result);
    ipcRenderer.send('update-title', fileName);
  });
});

ipcRenderer.on('save-json-as', async () => {
  unsavedChanges = false;
  // Save to the existing file
  editor.saveDesign(async (design) => {
    const result = await ipcRenderer.invoke('save-json', design);
    if (result) {
      // Enable "Save" and "Save As" in the menu
      ipcRenderer.send('update-menu', { saveEnabled: true, saveAsEnabled: true });
      // Get the file name and update the window title
      const fileName = path.basename(result);
      ipcRenderer.send('update-title', fileName);
    }
    alert('Design saved as JSON!');
  });
});


// Listen for 'export-html' event from the main process menu
ipcRenderer.on('export-html', () => {
  // Use the Unlayer editor's exportHtml method to get the HTML output
  editor.exportHtml(async (data) => {
    const { design, html } = data;
    console.log('Exported HTML:', html);

    // Save the exported HTML to a file
    const filePath = await ipcRenderer.invoke('save-html', html);
    if (filePath) {
      alert('HTML saved to: ' + filePath);
    }
  });
});

// Before the window is closed, check for unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (unsavedChanges) {
    // Prevent the window from closing and show a dialog
    const message = 'You have unsaved changes. Are you sure you want to quit without saving?';
    e.returnValue = message; // Required for Chrome (and Electron) to show the dialog
    return message;          // For older browsers
  }
});

ipcRenderer.on('check-unsaved-changes', (event) => {
  if (unsavedChanges) {
    const response = confirm('You have unsaved changes. Are you sure you want to quit without saving?');
    if (response) {
      ipcRenderer.send('force-close'); // Tell the main process to close the window
    }
  } else {
    ipcRenderer.send('force-close'); // If no unsaved changes, allow the app to close
  }
});