const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.copyFileSync(path.join(root, 'public/js/landing/core.js'), path.join(root, 'functions/core.js'));
