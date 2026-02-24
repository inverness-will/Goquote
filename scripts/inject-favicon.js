const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const faviconTag = '    <link rel="icon" href="/favicon.ico" />';
if (html.includes('rel="icon"')) {
  console.log('Favicon link already present in index.html');
} else {
  html = html.replace('</head>', `${faviconTag}\n  </head>`);
  fs.writeFileSync(indexPath, html);
  console.log('Injected favicon link into dist/index.html');
}
