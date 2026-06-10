// copy-files.js
const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'app.js',
  'db.js',
  'config.js',
  'styles.css',
  'excel_import.json'
];

const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

files.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to www/`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});
console.log('Build folder "www" prepared successfully!');
