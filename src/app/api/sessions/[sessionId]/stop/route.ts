import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    
    // Update session status in database
    const updatedSession = await db.browserSession.update({
      where: { id: sessionId },
      data: {
        status: 'stopped',
        endTime: new Date(),
      }
    })
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session stopped successfully',
      timestamp: new Date().toISOString(),
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        endTime: updatedSession.endTime?.toISOString()
      }
    })
  } catch (error) {
    console.error(`Failed to stop session ${sessionId}:`, error)
    return NextResponse.json(
      { error: 'Failed to stop session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
