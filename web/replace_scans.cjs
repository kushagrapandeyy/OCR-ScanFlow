const fs = require('fs');

const files = [
  'src/pages/AllCards.jsx',
  'src/pages/CardDetail.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/ExportPage.jsx',
  'src/pages/ScanCards.jsx',
  'src/pages/CRMSettings.jsx',
  'src/components/layout/AppLayout.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace store properties
  content = content.replace(/s\.cards/g, 's.scans');
  content = content.replace(/updateCard/g, 'updateScan');
  content = content.replace(/deleteCard\b/g, 'deleteScan'); 
  content = content.replace(/deleteCards/g, 'deleteScans');
  content = content.replace(/archiveCards/g, 'archiveScans');
  content = content.replace(/syncCards/g, 'syncScans');
  content = content.replace(/addCard\b/g, 'addScan');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated ' + file);
});
