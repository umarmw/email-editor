const { ipcRenderer } = require('electron');

// Unlayer Editor initialization
const editor = unlayer.createEditor({
  id: 'editor-container',
  projectId: 1234  // Replace with your actual project ID
});


setTimeout(function () {
  var iframe = document.querySelector('#editor-container iframe');;
  iframe.style.width = '100%';
  iframe.style.height = '100vh';
  console.log("resized")
}, 5000);

// Listen for "new" event sent from the main process menu
ipcRenderer.on('new', (event) => {
  const emptyDesign = {
    "body": {
      "rows": []
    }
  };
  editor.loadDesign(emptyDesign);  
});

// Listen for "load-json" event sent from the main process menu
ipcRenderer.on('load-json', (event, jsonData) => {
  if (jsonData) {
    editor.loadDesign(jsonData);  // Load the design into the Unlayer editor
  }
});

// Listen for "save-json" event sent from the main process menu
ipcRenderer.on('save-json', () => {
  editor.saveDesign(async (design) => {
    await ipcRenderer.invoke('save-json', design);
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