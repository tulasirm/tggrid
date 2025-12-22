import { NextRequest, NextResponse } from 'next/server'
import { cdpClient } from '@/lib/cdp-client'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const body = await request.json()
    const { action, ...args } = body
    
    // Get session info
    const session = cdpClient.getSessionInfo(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Create commands interface
    const commands = {
      navigate: async (url: string) => {
        return await cdpClient.navigate(sessionId, url)
      },
      
      click: async (selector: string) => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.click?.(selector)
      },
      
      type: async (selector: string, text: string) => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.type?.(selector, text)
      },
      
      screenshot: async (options = {}) => {
        return await cdpClient.takeScreenshot(sessionId, options)
      },
      
      evaluate: async (script: string) => {
        return await cdpClient.executeScript(sessionId, script)
      },
      
      waitForSelector: async (selector: string, timeout = 30000) => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.waitForSelector?.(selector, timeout)
      },
      
      getHTML: async () => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.getHTML?.()
      },
      
      getTitle: async () => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.getTitle?.()
      },
      
      getUrl: async () => {
        const session = await cdpClient.getSessionInfo(sessionId)
        if (!session) throw new Error('Session not found')
        return await session.commands?.getUrl?.()
      }
    }
    
    // Execute action
    if (!commands[action]) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }
    
    const startTime = Date.now()
    const result = await commands[action](...Object.values(args))
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      action,
      result,
      executionTime,
      sessionId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`Failed to execute action for session ${params.sessionId}:`, error)
    return NextResponse.json(
      { error: 'Failed to execute action', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    
    // Close CDP session
    await cdpClient.closeSession(sessionId)
    
    // Release browser back to pool
    const BROWSER_POOL_URL = process.env.BROWSER_POOL_URL || 'http://localhost:3002'
    await fetch(`${BROWSER_POOL_URL}/browser/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session closed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`Failed to close session ${params.sessionId}:`, error)
    return NextResponse.json(
      { error: 'Failed to close session', details: error.message },
      { status: 500 }
    )
  }
}