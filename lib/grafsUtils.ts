import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Determines the correct Grafs delivery date for a new order.
 *
 * Rules:
 * - Deliveries every 2 weeks on Thursday
 * - Cutoff: 2 days before delivery Thursday at noon CST (Tuesday at noon)
 * - Orders placed before cutoff → assigned to that Thursday's delivery
 * - Orders placed after cutoff → assigned to the next delivery (2 weeks later)
 * - If no next delivery date exists in the schedule → auto-create it
 *
 * Uses America/Chicago timezone to handle CST/CDT automatically.
 */
export async function getGrafsDeliveryDate(supabaseClient: SupabaseClient): Promise<string | null> {
  const now = new Date()

  // Get current date and hour in CST/CDT (America/Chicago handles DST)
  const cstParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const cstYear = parseInt(cstParts.find(p => p.type === 'year')!.value)
  const cstMonth = parseInt(cstParts.find(p => p.type === 'month')!.value)
  const cstDay = parseInt(cstParts.find(p => p.type === 'day')!.value)
  const cstHour = parseInt(cstParts.find(p => p.type === 'hour')!.value)
  const cstDateStr = `${cstYear}-${String(cstMonth).padStart(2, '0')}-${String(cstDay).padStart(2, '0')}`

  // Get ALL scheduled delivery dates (need past dates too for auto-generation base)
  const { data: deliveryDates } = await supabaseClient
    .from('grafs_delivery_schedule')
    .select('delivery_date')
    .order('delivery_date', { ascending: true })

  if (!deliveryDates || deliveryDates.length === 0) {
    return null // No schedule exists at all
  }

  // Helper: format a local Date as YYYY-MM-DD
  const formatDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Helper: check if the cutoff has passed for a given delivery date string
  // Cutoff = 2 days before delivery at noon CST
  const isCutoffPassed = (deliveryDateStr: string): boolean => {
    const [year, month, day] = deliveryDateStr.split('-').map(Number)
    const cutoff = new Date(year, month - 1, day)
    cutoff.setDate(cutoff.getDate() - 2)
    const cutoffStr = formatDate(cutoff)

    // Before cutoff day → not passed
    if (cstDateStr < cutoffStr) return false
    // On cutoff day but before noon CST → not passed
    if (cstDateStr === cutoffStr && cstHour < 12) return false
    // Otherwise → passed
    return true
  }

  // Find the first scheduled delivery date whose cutoff hasn't passed
  for (const dd of deliveryDates) {
    if (!isCutoffPassed(dd.delivery_date)) {
      return dd.delivery_date
    }
  }

  // All scheduled dates are past their cutoff — auto-generate new dates
  // Start from the last scheduled date and keep adding 14 days until we
  // find one whose cutoff hasn't passed yet
  let lastDateStr = deliveryDates[deliveryDates.length - 1].delivery_date

  // Safety limit to prevent infinite loop (max ~2 years out)
  for (let i = 0; i < 52; i++) {
    const [year, month, day] = lastDateStr.split('-').map(Number)
    const nextDate = new Date(year, month - 1, day)
    nextDate.setDate(nextDate.getDate() + 14)
    const nextDateStr = formatDate(nextDate)

    // Insert the new date into the schedule
    await supabaseClient
      .from('grafs_delivery_schedule')
      .insert({ delivery_date: nextDateStr })

    if (!isCutoffPassed(nextDateStr)) {
      return nextDateStr
    }

    lastDateStr = nextDateStr
  }

  return null // Should never reach here
}
