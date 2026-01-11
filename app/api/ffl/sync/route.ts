import { NextRequest, NextResponse } from 'next/server'
import { FFLSyncService } from '@/lib/fflSyncService'

export async function POST(request: NextRequest) {
  try {
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
      
      const buffer = await file.arrayBuffer()
      const syncService = new FFLSyncService()
      const result = await syncService.syncFromUploadedFile(buffer)
      
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
