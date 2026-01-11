const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const libDir = path.join(__dirname, '..', 'lib');

const logo = fs.readFileSync(path.join(publicDir, 'company-logo.png')).toString('base64');
const ffl = fs.readFileSync(path.join(publicDir, 'company-ffl.png')).toString('base64');

const content = `// Auto-generated image constants - DO NOT EDIT
// Generated from public/company-logo.png and public/company-ffl.png
// Run: node scripts/generateImageConstants.js

export const COMPANY_LOGO_BASE64 = 'data:image/png;base64,${logo}';

export const COMPANY_FFL_BASE64 = 'data:image/png;base64,${ffl}';
`;

fs.writeFileSync(path.join(libDir, 'imageConstants.ts'), content);
console.log('Created lib/imageConstants.ts');
console.log('Logo size:', logo.length, 'characters');
console.log('FFL size:', ffl.length, 'characters');
