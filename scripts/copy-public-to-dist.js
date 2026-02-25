const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');

if (!fs.existsSync(publicDir)) {
  console.log('No public folder, skipping copy');
  process.exit(0);
}
if (!fs.existsSync(distDir)) {
  console.warn('dist folder not found, skipping copy');
  process.exit(0);
}

const files = fs.readdirSync(publicDir);
for (const file of files) {
  const src = path.join(publicDir, file);
  if (!fs.statSync(src).isFile()) continue;
  const dest = path.join(distDir, file);
  fs.copyFileSync(src, dest);
  console.log('Copied public/' + file + ' -> dist/');
}
