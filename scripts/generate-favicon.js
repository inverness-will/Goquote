const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/favicon.svg');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function main() {
  const svg = fs.readFileSync(svgPath);
  const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
  const ico = await toIco([png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
  console.log('Favicon generated: public/favicon.ico, public/favicon-32x32.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
