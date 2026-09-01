# Order Analysis JSON Parsing Error - Root Cause & Fix

## Problem Summary
When scanning 279 items and clicking "Analyze", the system threw this error:
```
Unexpected token 'A', "An error o"... is not valid JSON
```

## Root Cause Analysis

### Issue #1: Poor Error Handling in Frontend
The frontend code was calling `await resp.json()` **before** checking if the response was actually JSON. When the server encountered an error and returned an HTML error page or plain text, the JSON parser failed with a cryptic error message.

**Location:** `app/ordering/page.tsx` lines 426, 575, and in `handleAddItem`

**Original Code:**
```typescript
const resp = await fetch('/api/lightspeed/analyze', {...})
const data = await resp.json()  // ❌ Crashes if response isn't JSON
if (!resp.ok) throw new Error(data.error || 'Analysis failed')
```

**Fixed Code:**
```typescript
const resp = await fetch('/api/lightspeed/analyze', {...})

// Check if response is JSON before parsing
const contentType = resp.headers.get('content-type')
if (!contentType || !contentType.includes('application/json')) {
  const text = await resp.text()
  throw new Error(`Server returned non-JSON response (${resp.status}): ${text.substring(0, 200)}`)
}

const data = await resp.json()
if (!resp.ok) throw new Error(data.error || 'Analysis failed')
```

### Issue #2: Unhandled Database Errors in Backend
The `analyzeItemsFromSupabase` function in `lib/lightspeed.ts` was making multiple database queries without proper error handling. When a query failed (due to timeout, connection issues, or data problems), the error would bubble up and crash the API route, causing Next.js to return an HTML error page instead of JSON.

**Location:** `lib/lightspeed.ts` - item lookup and inventory log queries

**Problems:**
1. No try-catch blocks around critical database queries
2. Errors were only logged to console, not thrown properly
3. When processing 279 items, the system makes hundreds of queries:
   - Query by `item_id`
   - Query by `system_sku` for unmatched items
   - Query by `upc` for barcode-scanned items
   - Query by stripped SKU (check digit fallback)
   - Query by stripped UPC (check digit fallback)
   - Query inventory log for all matched items

**Fixed:** Added try-catch blocks around all database queries to ensure errors are properly caught and returned as JSON error responses instead of crashing the API route.

## What Was Fixed

### Frontend Changes (`app/ordering/page.tsx`)
1. ✅ Added content-type checking before parsing JSON in `handleAnalyze`
2. ✅ Added content-type checking before parsing JSON in `handleAnalyzeScanned`
3. ✅ Added content-type checking before parsing JSON in `handleAddItem`
4. ✅ Error messages now show the actual server response (first 200 chars) when JSON parsing fails

### Backend Changes (`lib/lightspeed.ts`)
1. ✅ Wrapped item lookup queries in try-catch blocks
2. ✅ Wrapped inventory log queries in try-catch blocks
3. ✅ Improved error messages to include specific failure reasons
4. ✅ Ensured all errors are thrown properly so they reach the API route's error handler

### API Route Changes (`app/api/lightspeed/analyze/route.ts`)
1. ✅ Added `maxDuration = 300` (5 minutes) to handle long-running analysis
2. ✅ Added `dynamic = 'force-dynamic'` to prevent caching issues

## Testing Recommendations

1. **Start the dev server** and try analyzing the 279 items from the Excel file again
2. **Check the server console** for detailed error logs if it still fails
3. **Look at the error message** in the UI - it will now show the actual server error instead of "Unexpected token"

## Next Steps If Issues Persist

If you still get errors after these fixes, the error message will now be readable and will tell you exactly what failed:
- Database connection timeout
- Supabase query limit exceeded
- Missing data in database
- API timeout
- Memory issues

The error will appear in the red error box on the ordering page with the actual error message from the server.
