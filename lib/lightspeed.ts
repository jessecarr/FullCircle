import https from 'https'

const ACCOUNT_ID = process.env.LIGHTSPEED_ACCOUNT_ID!
const CLIENT_ID = process.env.LIGHTSPEED_CLIENT_ID!
const CLIENT_SECRET = process.env.LIGHTSPEED_CLIENT_SECRET!
let ACCESS_TOKEN = process.env.LIGHTSPEED_ACCESS_TOKEN!
const REFRESH_TOKEN = process.env.LIGHTSPEED_REFRESH_TOKEN!

const BASE_URL = `https://api.lightspeedapp.com/API/V3/Account/${ACCOUNT_ID}`
const TOKEN_URL = 'https://cloud.lightspeedapp.com/oauth/access_token.php'

let tokenRefreshed = false

function httpsRequest(urlStr: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: Record<string, string>; data: any }> {
  return new Promise((resolve, reject) => {
    // Parse URL manually to avoid new URL() re-encoding query parameters
    const protocolEnd = urlStr.indexOf('://') + 3
    const pathStart = urlStr.indexOf('/', protocolEnd)
    const hostname = pathStart === -1 ? urlStr.substring(protocolEnd) : urlStr.substring(protocolEnd, pathStart)
    const path = pathStart === -1 ? '/' : urlStr.substring(pathStart)

    const reqOptions: https.RequestOptions = {
      hostname,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
    }
    const req = https.request(reqOptions, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => body += chunk.toString())
      res.on('end', () => {
        let data: any
        try { data = JSON.parse(body) } catch { data = body }
        resolve({
          status: res.statusCode || 0,
          headers: (res.headers || {}) as Record<string, string>,
          data,
        })
      })
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function refreshToken(): Promise<boolean> {
  console.log('[LS] Refreshing access token...')
  const body = `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token`

  const resp = await httpsRequest(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(body)),
    },
    body,
  })

  if (resp.data.access_token) {
    ACCESS_TOKEN = resp.data.access_token
    tokenRefreshed = true
    console.log('[LS] Token refreshed successfully')
    return true
  }
  console.error('[LS] Failed to refresh token:', resp.data)
  return false
}

async function ensureToken(): Promise<void> {
  if (!tokenRefreshed) {
    await refreshToken()
  }
}

async function apiGet(url: string, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const resp = await httpsRequest(url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    })

    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers['retry-after'] || '3')
      console.log(`[LS] Rate limited, waiting ${retryAfter}s...`)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      continue
    }

    if (resp.status === 401) {
      console.log('[LS] 401 - refreshing token...')
      const refreshed = await refreshToken()
      if (refreshed) continue
    }

    return resp.data
  }

  const resp = await httpsRequest(url, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  return resp.data
}

export interface LightspeedItem {
  itemID: string
  systemSku: string
  description: string
  defaultCost: string
  avgCost: string
  upc: string
  customSku: string
  manufacturerSku: string
  archived: string
  ItemShops?: {
    ItemShop: Array<{ qoh: string; shopID: string; itemID: string }> | { qoh: string; shopID: string; itemID: string }
  }
  Prices?: {
    ItemPrice: Array<{ amount: string; useType: string }> | { amount: string; useType: string }
  }
}

export interface OrderRecommendation {
  itemID: string
  systemSku: string
  description: string
  manufacturerSku: string
  upc: string
  currentQty: number
  avgMonthlySales: number
  monthsOfStockLeft: number
  recommendedOrderQty: number
  defaultCost: number
  retailPrice: number
  estimatedOrderCost: number
  notes: string[]
}

async function getItemsWithInventory(itemIds: string[]): Promise<LightspeedItem[]> {
  await ensureToken()
  const items: LightspeedItem[] = []
  const relParam = encodeURIComponent('["ItemShops"]')

  for (let i = 0; i < itemIds.length; i++) {
    const id = itemIds[i]
    try {
      const url = `${BASE_URL}/Item/${id}.json?load_relations=${relParam}`
      const data = await apiGet(url)
      if (data.Item) {
        items.push(data.Item)
      }
    } catch (e) {
      console.error(`[LS] Failed to fetch item ${id}:`, e)
    }
    if (i % 50 === 0 && i > 0) {
      console.log(`[LS] Fetched ${i}/${itemIds.length} items...`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[LS] Fetched ${items.length}/${itemIds.length} items with inventory`)
  return items
}

async function getSalesDataBatched(itemIds: string[], monthsBack: number): Promise<Record<string, number>> {
  await ensureToken()
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack)
  const dateStr = cutoffDate.toISOString().split('T')[0]
  const dateFilter = encodeURIComponent(`>,${dateStr}T00:00:00+00:00`)

  const salesMap: Record<string, number> = {}
  let totalSaleLines = 0

  // Batch items in groups of 20 for the IN filter
  const batchSize = 20
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    const inFilter = encodeURIComponent(`IN,[${batch.join(',')}]`)

    try {
      let url = `${BASE_URL}/SaleLine.json?limit=100&itemID=${inFilter}&timeStamp=${dateFilter}`
      if (i === 0) {
        console.log(`[LS] First sales URL: ${url}`)
      }
      let hasMore = true
      let pageCount = 0

      while (hasMore) {
        const data = await apiGet(url)
        if (i === 0 && pageCount === 0) {
          console.log(`[LS] First batch response keys:`, Object.keys(data))
          console.log(`[LS] First batch @attributes:`, JSON.stringify(data['@attributes']))
          if (data.SaleLine) {
            const sample = Array.isArray(data.SaleLine) ? data.SaleLine[0] : data.SaleLine
            console.log(`[LS] Sample SaleLine keys:`, Object.keys(sample || {}))
          } else {
            console.log(`[LS] No SaleLine key. Full response (truncated):`, JSON.stringify(data).substring(0, 500))
          }
        }
        const lines = data.SaleLine
        pageCount++

        if (lines) {
          const arr = Array.isArray(lines) ? lines : [lines]
          totalSaleLines += arr.length
          for (const sl of arr) {
            if (!sl.itemID || sl.itemID === '0') continue
            if (!salesMap[sl.itemID]) salesMap[sl.itemID] = 0
            salesMap[sl.itemID] += parseInt(sl.unitQuantity || '0')
          }
        }

        const nextUrl = data['@attributes']?.next
        if (nextUrl) {
          url = nextUrl
          await new Promise(r => setTimeout(r, 300))
        } else {
          hasMore = false
        }
      }

      if (i === 0) {
        console.log(`[LS] First batch: ${pageCount} pages, ${totalSaleLines} sale lines so far`)
      }
    } catch (e) {
      console.error(`[LS] Failed to fetch sales for batch starting at ${i}:`, e)
    }

    if ((i + batchSize) % 100 === 0 || i + batchSize >= itemIds.length) {
      console.log(`[LS] Sales progress: ${Math.min(i + batchSize, itemIds.length)}/${itemIds.length} items, ${totalSaleLines} sale lines found`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[LS] Sales complete: ${totalSaleLines} total sale lines, ${Object.keys(salesMap).length} items with sales`)
  return salesMap
}

// --------------- Sync: Lightspeed → Supabase ---------------

export async function syncSaleLines(
  onBatch: (records: { sale_line_id: string; sale_id: string; item_id: string; unit_quantity: number; unit_price: number; sold_at: string }[]) => Promise<void>,
  sinceTimestamp?: string
): Promise<{ totalLines: number; totalPages: number }> {
  await ensureToken()

  let url: string
  if (sinceTimestamp) {
    const dateFilter = encodeURIComponent(`>,${sinceTimestamp}`)
    url = `${BASE_URL}/SaleLine.json?limit=100&timeStamp=${dateFilter}`
  } else {
    url = `${BASE_URL}/SaleLine.json?limit=100`
  }

  let totalLines = 0
  let totalPages = 0

  while (url) {
    const data = await apiGet(url)
    totalPages++

    const lines = data.SaleLine
    if (lines) {
      const arr = Array.isArray(lines) ? lines : [lines]
      const records = arr
        .filter((sl: any) => sl.saleLineID && sl.itemID && sl.itemID !== '0')
        .map((sl: any) => ({
          sale_line_id: sl.saleLineID,
          sale_id: sl.saleID || '',
          item_id: sl.itemID,
          unit_quantity: parseInt(sl.unitQuantity || '0'),
          unit_price: parseFloat(sl.unitPrice || '0'),
          sold_at: sl.timeStamp,
        }))

      if (records.length > 0) {
        await onBatch(records)
        totalLines += records.length
      }
    }

    const nextUrl = data['@attributes']?.next
    if (nextUrl && nextUrl !== '') {
      url = nextUrl
      await new Promise(r => setTimeout(r, 500))
    } else {
      break
    }

    if (totalPages % 10 === 0) {
      console.log(`[LS Sync] Processed ${totalPages} pages, ${totalLines} sale lines`)
    }
  }

  console.log(`[LS Sync] Complete: ${totalPages} pages, ${totalLines} sale lines`)
  return { totalLines, totalPages }
}

// --------------- Sync InventoryLog: Lightspeed → Supabase ---------------

export async function syncInventoryLog(
  onBatch: (records: { inventory_log_id: string; shop_id: string; item_id: string; qoh_change: number; reason: string; sale_id: string; order_id: string; transfer_id: string; create_time: string }[]) => Promise<void>,
  sinceTimestamp?: string
): Promise<{ totalLines: number; totalPages: number }> {
  await ensureToken()

  let url: string
  if (sinceTimestamp) {
    const dateFilter = encodeURIComponent(`>,${sinceTimestamp}`)
    url = `${BASE_URL}/InventoryLog.json?limit=100&createTime=${dateFilter}`
  } else {
    url = `${BASE_URL}/InventoryLog.json?limit=100`
  }

  let totalLines = 0
  let totalPages = 0

  while (url) {
    const data = await apiGet(url)
    totalPages++

    const logs = data.InventoryLog
    if (logs) {
      const arr = Array.isArray(logs) ? logs : [logs]
      const records = arr
        .filter((log: any) => log.inventoryLogID && log.itemID && log.itemID !== '0')
        .map((log: any) => ({
          inventory_log_id: log.inventoryLogID,
          shop_id: log.shopID || '0',
          item_id: log.itemID,
          qoh_change: parseInt(log.qohChange || '0'),
          reason: log.reason || '',
          sale_id: log.saleID || '0',
          order_id: log.orderID || '0',
          transfer_id: log.transferID || '0',
          create_time: log.createTime,
        }))

      if (records.length > 0) {
        await onBatch(records)
        totalLines += records.length
      }
    }

    const nextUrl = data['@attributes']?.next
    if (nextUrl && nextUrl !== '') {
      url = nextUrl
      await new Promise(r => setTimeout(r, 500))
    } else {
      break
    }

    if (totalPages % 10 === 0) {
      console.log(`[LS Sync] InventoryLog: ${totalPages} pages, ${totalLines} entries`)
    }
  }

  console.log(`[LS Sync] InventoryLog complete: ${totalPages} pages, ${totalLines} entries`)
  return { totalLines, totalPages }
}

// --------------- Smart Analysis (InventoryLog-backed) ---------------

// Reasons that represent actual customer sales
const SALE_REASONS = new Set([
  'removeInventoryForTransaction',
  'removeInventoryForLayaway',
  'removeInventoryForSpecialOrder',
  'removeInventoryForWorkorder',
])

interface InventoryLogEntry {
  qoh_change: number
  reason: string
  create_time: string
}

function analyzeItemHistory(
  logs: InventoryLogEntry[],
  currentQOH: number = 0
): { avgMonthlySales: number; totalSold: number; outOfStockMonths: number; seasonalFactor: number; hotItem: boolean; recentVsAvgRatio: number } {
  if (logs.length === 0) return { avgMonthlySales: 0, totalSold: 0, outOfStockMonths: 0, seasonalFactor: 1, hotItem: false, recentVsAvgRatio: 1 }

  const sorted = [...logs].sort((a, b) =>
    new Date(a.create_time).getTime() - new Date(b.create_time).getTime()
  )

  const firstEvent = new Date(sorted[0].create_time)
  const now = new Date()
  const totalDays = (now.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24)
  const totalMonths = totalDays / 30.44

  // Calculate true initial stock: currentQOH = initialStock + sum(all changes)
  const sumChanges = sorted.reduce((sum, l) => sum + l.qoh_change, 0)
  const initialStock = currentQOH - sumChanges

  // --- OOS TRACKING + SALE EXTRACTION ---
  let stock = initialStock
  let outOfStockDays = 0
  let lastEventTime = firstEvent
  let wasOutOfStock = initialStock <= 0
  const salesEvents: { date: Date; qty: number }[] = []

  for (const log of sorted) {
    const eventTime = new Date(log.create_time)

    if (wasOutOfStock) {
      const daysSince = (eventTime.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24)
      outOfStockDays += daysSince
    }

    stock += log.qoh_change

    if (SALE_REASONS.has(log.reason) && log.qoh_change < 0) {
      salesEvents.push({ date: eventTime, qty: Math.abs(log.qoh_change) })
    }

    wasOutOfStock = stock <= 0
    lastEventTime = eventTime
  }

  if (wasOutOfStock) {
    const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24)
    outOfStockDays += daysSinceLastEvent
  }

  const outOfStockMonths = Math.round((outOfStockDays / 30.44) * 10) / 10
  const totalSold = salesEvents.reduce((sum, s) => sum + s.qty, 0)

  if (totalSold === 0) return { avgMonthlySales: 0, totalSold: 0, outOfStockMonths, seasonalFactor: 1, hotItem: false, recentVsAvgRatio: 1 }

  if (totalDays < 1) {
    return { avgMonthlySales: totalSold, totalSold, outOfStockMonths: 0, seasonalFactor: 1, hotItem: false, recentVsAvgRatio: 1 }
  }

  // --- RECENT WEIGHTED TREND ---
  // Weight recent sales more: last 3mo = 3x, 3-6mo = 2x, 6-12mo = 1x
  const m3ago = new Date(now); m3ago.setMonth(m3ago.getMonth() - 3)
  const m6ago = new Date(now); m6ago.setMonth(m6ago.getMonth() - 6)
  const m12ago = new Date(now); m12ago.setMonth(m12ago.getMonth() - 12)

  let sales0to3 = 0, sales3to6 = 0, sales6to12 = 0
  for (const s of salesEvents) {
    if (s.date >= m3ago) sales0to3 += s.qty
    else if (s.date >= m6ago) sales3to6 += s.qty
    else if (s.date >= m12ago) sales6to12 += s.qty
  }

  const recentSalesTotal = sales0to3 + sales3to6 + sales6to12
  let recentRate: number

  if (totalMonths < 3) {
    // Very new item — use simple average of all data
    recentRate = totalSold / Math.max(totalMonths, 1)
  } else if (recentSalesTotal === 0 && totalSold > 0) {
    // No sales in last 12 months but has older sales — use all-time rate with OOS guardrails
    const inStockDays = totalDays - outOfStockDays
    let effectiveDays = Math.max(inStockDays, Math.min(totalDays, 90))
    if (totalSold <= 5) effectiveDays = Math.max(effectiveDays, totalDays * 0.25)
    recentRate = totalSold / (effectiveDays / 30.44)
  } else {
    // Normal case: weighted recent trend
    const months0to3 = Math.min(3, totalMonths)
    const months3to6 = Math.min(3, Math.max(0, totalMonths - 3))
    const months6to12 = Math.min(6, Math.max(0, totalMonths - 6))

    const wSales = sales0to3 * 3 + sales3to6 * 2 + sales6to12 * 1
    const wMonths = months0to3 * 3 + months3to6 * 2 + months6to12 * 1

    recentRate = wMonths > 0 ? wSales / wMonths : 0
  }

  // --- SEASONAL ADJUSTMENT ---
  // Compare current time-of-year historical sales to overall average
  let seasonalFactor = 1.0

  if (totalMonths >= 12 && totalSold >= 6) {
    const currentMonth = now.getMonth()
    const nextMonth = (currentMonth + 1) % 12

    // Group all historical sales by calendar month
    const salesByMonth = new Array(12).fill(0)
    for (const s of salesEvents) {
      salesByMonth[s.date.getMonth()] += s.qty
    }

    // Count how many times each calendar month appears in tracking period
    const monthOccurrences = new Array(12).fill(0)
    const cursor = new Date(firstEvent.getFullYear(), firstEvent.getMonth(), 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    while (cursor <= endMonth) {
      monthOccurrences[cursor.getMonth()]++
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const overallAvg = totalSold / totalMonths

    if (overallAvg > 0) {
      // Blend current and next month to cover 2-week order window
      const curAvg = monthOccurrences[currentMonth] > 0
        ? salesByMonth[currentMonth] / monthOccurrences[currentMonth] : overallAvg
      const nxtAvg = monthOccurrences[nextMonth] > 0
        ? salesByMonth[nextMonth] / monthOccurrences[nextMonth] : overallAvg
      const blendedAvg = (curAvg + nxtAvg) / 2

      const rawFactor = blendedAvg / overallAvg

      // Dampen toward 1.0 — full confidence requires 3+ years of data
      const yearsOfData = totalMonths / 12
      const confidence = Math.min(yearsOfData / 3, 1)
      seasonalFactor = 1 + (rawFactor - 1) * confidence

      // Clamp to reasonable range (0.3x to 3x)
      seasonalFactor = Math.max(0.3, Math.min(3.0, seasonalFactor))
    }
  }

  // --- HOT ITEM DETECTION ---
  // Compare last 3 months rate vs 6-12 month rate — if recent is 1.5x+ higher, it's trending hot
  const last3moRate = sales0to3 / Math.min(3, totalMonths)
  const older6to12Rate = totalMonths > 6 && sales6to12 > 0 ? sales6to12 / Math.min(6, Math.max(0, totalMonths - 6)) : recentRate
  const recentVsAvgRatio = older6to12Rate > 0 ? last3moRate / older6to12Rate : 1
  const hotItem = recentVsAvgRatio >= 1.5 && sales0to3 >= 3

  // --- FINAL ADJUSTED RATE ---
  const avgMonthlySales = recentRate * seasonalFactor

  return {
    avgMonthlySales,
    totalSold,
    outOfStockMonths,
    seasonalFactor,
    hotItem,
    recentVsAvgRatio: Math.round(recentVsAvgRatio * 100) / 100,
  }
}

export async function analyzeItemsFromSupabase(
  itemIds: string[],
  supabase: any
): Promise<OrderRecommendation[]> {
  console.log(`[LS] Starting inventory-log-backed analysis for ${itemIds.length} items`)

  // Step 1: Fetch items with real-time inventory from Lightspeed
  console.log('[LS] Step 1: Fetching items with inventory from Lightspeed...')
  const items = await getItemsWithInventory(itemIds)
  const actualItemIds = items.map(item => item.itemID)
  console.log(`[LS] Got ${items.length} items. Sample CSV ID: ${itemIds[0]}, Actual ID: ${actualItemIds[0]}`)

  // Step 2: Query all inventory log entries from Supabase for these items (shop 1 only)
  // Paginate to avoid PostgREST row limit (default 1000)
  console.log('[LS] Step 2: Querying inventory log from Supabase...')
  const logsByItem: Record<string, InventoryLogEntry[]> = {}
  let totalLogRows = 0
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const { data: page, error } = await supabase
      .from('lightspeed_inventory_log')
      .select('item_id, qoh_change, reason, create_time')
      .in('item_id', actualItemIds)
      .eq('shop_id', '1')
      .order('create_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('[LS] Supabase query error:', error)
      throw new Error('Failed to query inventory log from Supabase')
    }

    if (!page || page.length === 0) break

    for (const log of page) {
      if (!logsByItem[log.item_id]) logsByItem[log.item_id] = []
      logsByItem[log.item_id].push(log)
    }
    totalLogRows += page.length

    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  console.log(`[LS] Found ${totalLogRows} inventory log entries across ${Object.keys(logsByItem).length} items`)

  // Step 3: Build recommendations using full stock reconstruction
  console.log('[LS] Step 3: Building recommendations with stock-reconstructed averages...')
  const recommendations: OrderRecommendation[] = []

  for (const item of items) {
    let currentQty = 0
    if (item.ItemShops?.ItemShop) {
      const shops = Array.isArray(item.ItemShops.ItemShop)
        ? item.ItemShops.ItemShop
        : [item.ItemShops.ItemShop]
      const mainShop = shops.find(s => s.shopID === '1')
      if (mainShop) {
        currentQty = parseFloat(mainShop.qoh || '0')
      }
    }

    const itemLogs = logsByItem[item.itemID] || []
    const { avgMonthlySales, seasonalFactor, hotItem, recentVsAvgRatio } = analyzeItemHistory(itemLogs, currentQty)

    const monthsOfStockLeft = avgMonthlySales > 0 ? currentQty / avgMonthlySales : currentQty > 0 ? 999 : 0
    const targetStock = Math.ceil(avgMonthlySales * 1)
    const recommendedOrderQty = Math.max(0, targetStock - currentQty)
    const defaultCost = parseFloat(item.defaultCost || '0')

    let retailPrice = 0
    if (item.Prices?.ItemPrice) {
      const prices = Array.isArray(item.Prices.ItemPrice) ? item.Prices.ItemPrice : [item.Prices.ItemPrice]
      const defaultPrice = prices.find(p => p.useType === 'Default')
      if (defaultPrice) retailPrice = parseFloat(defaultPrice.amount || '0')
    }

    // Generate notes
    const notes: string[] = []
    if (seasonalFactor >= 1.2) {
      const pct = Math.round((seasonalFactor - 1) * 100)
      notes.push(`Seasonal bump: this item typically sells ~${pct}% more this time of year. Suggested quantity is adjusted upward.`)
    } else if (seasonalFactor <= 0.8) {
      const pct = Math.round((1 - seasonalFactor) * 100)
      notes.push(`Seasonal dip: this item typically sells ~${pct}% less this time of year. Suggested quantity is adjusted downward.`)
    }
    if (hotItem) {
      notes.push(`Hot seller: recent sales are ${recentVsAvgRatio}x higher than the prior trend. Consider ordering extra to keep up with demand.`)
    }
    if (avgMonthlySales > 0 && monthsOfStockLeft < 0.5 && currentQty > 0) {
      notes.push(`At current sell rate, stock will run out before your next 2-week order window.`)
    }

    recommendations.push({
      itemID: item.itemID,
      systemSku: item.systemSku,
      description: item.description,
      manufacturerSku: item.manufacturerSku || '',
      upc: item.upc || '',
      currentQty,
      avgMonthlySales: Math.round(avgMonthlySales * 10) / 10,
      monthsOfStockLeft: Math.round(monthsOfStockLeft * 10) / 10,
      recommendedOrderQty,
      defaultCost,
      retailPrice,
      estimatedOrderCost: Math.round(recommendedOrderQty * defaultCost * 100) / 100,
      notes,
    })
  }

  recommendations.sort((a, b) => a.monthsOfStockLeft - b.monthsOfStockLeft)

  console.log(`[LS] Analysis complete: ${recommendations.length} items, ${recommendations.filter(r => r.recommendedOrderQty > 0).length} need reorder`)
  return recommendations
}
