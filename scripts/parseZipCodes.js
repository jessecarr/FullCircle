const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '..', 'Untitled spreadsheet - ZIP_DETAIL.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');
const zipCodeMap = {};

// Skip header row
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const columns = line.split(',');
  
  // Column indices based on header:
  // 0: AREA NAME, 1: AREA CODE, 2: DISTRICT NAME, 3: DISTRICT NO, 
  // 4: DELIVERY ZIPCODE, 5: LOCALE NAME, 6: PHYSICAL DELV ADDR, 
  // 7: PHYSICAL CITY, 8: PHYSICAL STATE, 9: PHYSICAL ZIP, 10: PHYSICAL ZIP 4
  
  const zipCode = columns[4]?.trim();
  const city = columns[5]?.trim();
  const state = columns[8]?.trim();
  
  // Only process valid US zip codes (5 digits, not PR)
  if (zipCode && zipCode.length === 5 && /^\d{5}$/.test(zipCode) && state !== 'PR') {
    // Use the first occurrence of each zip code
    if (!zipCodeMap[zipCode]) {
      zipCodeMap[zipCode] = {
        city: city,
        state: state
      };
    }
  }
}

// Generate TypeScript file
const tsContent = `// Auto-generated zip code lookup data from ZIP_DETAIL.csv
// Generated on: ${new Date().toISOString()}

export interface ZipCodeData {
  city: string;
  state: string;
}

export const zipCodeDatabase: Record<string, ZipCodeData> = ${JSON.stringify(zipCodeMap, null, 2)};

export const lookupZipCode = (zip: string): ZipCodeData | null => {
  const cleanZip = zip.replace(/\\D/g, '');
  if (cleanZip.length !== 5) {
    return null;
  }
  return zipCodeDatabase[cleanZip] || null;
};

export const isValidZipCode = (zip: string): boolean => {
  const cleanZip = zip.replace(/\\D/g, '');
  return cleanZip.length === 5 && /^\\d{5}$/.test(cleanZip);
};
`;

// Write the TypeScript file
const outputPath = path.join(__dirname, '..', 'lib', 'zipLookup.ts');
fs.writeFileSync(outputPath, tsContent, 'utf-8');

console.log(`✅ Generated zipLookup.ts with ${Object.keys(zipCodeMap).length} zip codes`);
console.log(`📍 Test: 63301 -> ${JSON.stringify(zipCodeMap['63301'])}`);
