const http = require('http');
const XLSX = require('xlsx');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\sales\\Downloads\\STUPID ASS WEBSITE SCAN THAT DIDNT ACTUALLY SCAN.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header: 1});
const itemIds = data.map(row => String(row[0])).filter(id => id && id.trim());

console.log(`Testing with ${itemIds.length} items from Excel file`);

const postData = JSON.stringify({ itemIds });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/lightspeed/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending request...');
const startTime = Date.now();

const req = http.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n=== Response received after ${elapsed}s ===`);
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('\n=== Body Preview (first 500 chars) ===');
    console.log(body.substring(0, 500));
    console.log('\n=== Body Length ===');
    console.log(body.length, 'characters');
    
    // Try to parse as JSON
    console.log('\n=== Attempting JSON parse ===');
    try {
      const parsed = JSON.parse(body);
      console.log('✓ Valid JSON');
      console.log('Keys:', Object.keys(parsed));
      if (parsed.error) {
        console.log('ERROR MESSAGE:', parsed.error);
      }
      if (parsed.data) {
        console.log('Data items:', parsed.data.length);
      }
    } catch (e) {
      console.log('✗ JSON Parse Error:', e.message);
      console.log('\n=== Full Response Body ===');
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(postData);
req.end();
