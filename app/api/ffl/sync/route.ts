import { NextRequest, NextResponse } from 'next/server'
import { FFLSyncService } from '@/lib/fflSyncService'
import { supabaseAdmin } from '@/lib/supabase'

// Rate limiting: track last upload time per user
const uploadRateLimit = new Map<string, number>()
const RATE_LIMIT_MS = 60000 // 1 minute between uploads

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

// Log audit event
async function logAuditEvent(
  action: string,
  resourceType: string,
  details: Record<string, unknown>,
  request: NextRequest
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      resource_type: resourceType,
      details,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check using IP address
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    const lastUpload = uploadRateLimit.get(clientIp)
    const now = Date.now()
    
    if (lastUpload && (now - lastUpload) < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastUpload)) / 1000)
      await logAuditEvent(
        'ffl_upload_rate_limited',
        'ffl_contacts',
        { wait_time_seconds: waitTime, ip: clientIp },
        request
      )
      return NextResponse.json(
        { success: false, error: `Rate limited. Please wait ${waitTime} seconds before uploading again.` },
        { status: 429 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    
    // Check if this is a file upload or a website sync request
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }
      
      // Server-side file validation
      if (file.size > MAX_FILE_SIZE) {
        await logAuditEvent(
          'ffl_upload_rejected',
          'ffl_contacts',
          { reason: 'file_too_large', size: file.size },
          request
        )
        return NextResponse.json(
          { success: false, error: 'File size exceeds 50MB limit' },
          { status: 400 }
        )
      }
      
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        await logAuditEvent(
          'ffl_upload_rejected',
          'ffl_contacts',
          { reason: 'invalid_extension', extension },
          request
        )
        return NextResponse.json(
          { success: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        )
      }
      
      // Update rate limit
      uploadRateLimit.set(clientIp, now)
      
      const buffer = await file.arrayBuffer()
      const syncService = new FFLSyncService()
      const result = await syncService.syncFromUploadedFile(buffer)
      
      // Log successful upload
      await logAuditEvent(
        'ffl_upload_success',
        'ffl_contacts',
        { 
          file_name: file.name,
          file_size: file.size,
          records_processed: result.totalProcessed,
          added: result.added,
          updated: result.updated
        },
        request
      )
      
      return NextResponse.json(result)
      
    } else {
      // Handle website download sync
      const syncService = new FFLSyncService()
      const result = await syncService.syncFromATFWebsite()
      
      return NextResponse.json(result)
    }
    
  } catch (error) {
    console.error('FFL sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Sync failed: ${(error as Error).message}`,
        added: 0,
        updated: 0,
        unchanged: 0,
        errors: [(error as Error).message],
        totalProcessed: 0,
        syncedAt: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const syncService = new FFLSyncService()
    const stats = await syncService.getSyncStats()
    
    return NextResponse.json({
      success: true,
      ...stats
    })
    
  } catch (error) {
    console.error('FFL stats error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
