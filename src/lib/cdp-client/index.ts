import CDP from 'chrome-remote-interface'
import { v4 as uuidv4 } from 'uuid'

export interface BrowserSession {
  id: string
  cdp: any
  target: any
  port: number
  startTime: number
  lastActivity: number
}

export interface CDPCommands {
  navigate: (url: string) => Promise<any>
  click: (selector: string) => Promise<any>
  type: (selector: string, text: string) => Promise<any>
  screenshot: (options?: any) => Promise<string>
  evaluate: (script: string) => Promise<any>
  waitForSelector: (selector: string, timeout?: number) => Promise<any>
  getHTML: () => Promise<string>
  getTitle: () => Promise<string>
  getUrl: () => Promise<string>
}

export class UltraFastCDPClient {
  private sessions: Map<string, BrowserSession> = new Map()
  private connectionPool: Map<string, any> = new Map()

  async createSession(port: number): Promise<BrowserSession & { commands: CDPCommands }> {
    const sessionId = uuidv4()
    const startTime = Date.now()
    
    try {
      // Connect to CDP endpoint
      const cdp = await CDP({ host: 'localhost', port })
      
      // Get the default target (page)
      const { Page, Runtime, Network, Input, DOM } = cdp
      await Promise.all([Page.enable(), Runtime.enable(), Network.enable(), DOM.enable()])
      
      // Create session object
      const session: BrowserSession = {
        id: sessionId,
        cdp,
        target: cdp.target,
        port,
        startTime,
        lastActivity: Date.now()
      }
      
      // Store session
      this.sessions.set(sessionId, session)
      
      // Create command interface
      const commands: CDPCommands = {
        navigate: async (url: string) => {
          session.lastActivity = Date.now()
          return await Page.navigate({ url })
        },
        
        click: async (selector: string) => {
          session.lastActivity = Date.now()
          const { nodeId } = await DOM.querySelector({ nodeId: 1, selector })
          if (!nodeId) throw new Error(`Element not found: ${selector}`)
          
          const { model } = await DOM.getBoxModel({ nodeId })
          const x = model.content[0] + model.content[2] / 2
          const y = model.content[1] + model.content[5] / 2
          
          return await Input.dispatchMouseEvent({
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            clickCount: 1
          })
        },
        
        type: async (selector: string, text: string) => {
          session.lastActivity = Date.now()
          await commands.click(selector)
          
          for (const char of text) {
            await Input.dispatchKeyEvent({
              type: 'char',
              text: char
            })
          }
        },
        
        screenshot: async (options = {}) => {
          session.lastActivity = Date.now()
          const { data } = await Page.captureScreenshot({
            format: options.format || 'png',
            quality: options.quality || 90
          })
          return `data:image/png;base64,${data}`
        },
        
        evaluate: async (script: string) => {
          session.lastActivity = Date.now()
          const { result } = await Runtime.evaluate({
            expression: script,
            returnByValue: true
          })
          return result.value
        },
        
        waitForSelector: async (selector: string, timeout = 30000) => {
          session.lastActivity = Date.now()
          const startTime = Date.now()
          
          while (Date.now() - startTime < timeout) {
            try {
              const { nodeId } = await DOM.querySelector({ nodeId: 1, selector })
              if (nodeId) return true
            } catch (error) {
              // Element not found yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          throw new Error(`Timeout waiting for selector: ${selector}`)
        },
        
        getHTML: async () => {
          session.lastActivity = Date.now()
          const { root } = await DOM.getDocument()
          const { outerHTML } = await DOM.getOuterHTML({ nodeId: root.nodeId })
          return outerHTML
        },
        
        getTitle: async () => {
          session.lastActivity = Date.now()
          const result = await Runtime.evaluate({
            expression: 'document.title'
          })
          return result.result.value
        },
        
        getUrl: async () => {
          session.lastActivity = Date.now()
          const result = await Runtime.evaluate({
            expression: 'window.location.href'
          })
          return result.result.value
        }
      }
      
      console.log(`⚡ Created ultra-fast CDP session ${sessionId} in ${Date.now() - startTime}ms`)
      
      return { ...session, commands }
    } catch (error) {
      console.error(`Failed to create CDP session:`, error)
      throw error
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    try {
      await session.cdp.close()
      this.sessions.delete(sessionId)
      console.log(`🔌 Closed CDP session ${sessionId}`)
    } catch (error) {
      console.error(`Failed to close session ${sessionId}:`, error)
    }
  }

  async executeScript(sessionId: string, script: string): Promise<any> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    session.lastActivity = Date.now()
    const { Runtime } = session.cdp
    const { result } = await Runtime.evaluate({
      expression: script,
      returnByValue: true
    })
    return result.value
  }

  async takeScreenshot(sessionId: string, options?: any): Promise<string> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    session.lastActivity = Date.now()
    const { Page } = session.cdp
    const { data } = await Page.captureScreenshot({
      format: options?.format || 'png',
      quality: options?.quality || 90
    })
    return `data:image/png;base64,${data}`
  }

  async navigate(sessionId: string, url: string): Promise<any> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    session.lastActivity = Date.now()
    const { Page } = session.cdp
    return await Page.navigate({ url })
  }

  getSessionInfo(sessionId: string): BrowserSession | null {
    return this.sessions.get(sessionId) || null
  }

  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values())
  }

  async cleanupInactiveSessions(maxInactiveTime = 30 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const sessionsToClose: string[] = []
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxInactiveTime) {
        sessionsToClose.push(sessionId)
      }
    }
    
    for (const sessionId of sessionsToClose) {
      await this.closeSession(sessionId)
    }
    
    if (sessionsToClose.length > 0) {
      console.log(`🧹 Cleaned up ${sessionsToClose.length} inactive sessions`)
    }
  }

  getMetrics() {
    const sessions = Array.from(this.sessions.values())
    const now = Date.now()
    
    return {
      totalSessions: sessions.length,
      avgSessionDuration: sessions.reduce((sum, s) => sum + (now - s.startTime), 0) / sessions.length,
      oldestSession: Math.min(...sessions.map(s => now - s.startTime)),
      newestSession: Math.min(...sessions.map(s => now - s.startTime))
    }
  }
}

// Singleton instance
export const cdpClient = new UltraFastCDPClient()

// Auto-cleanup inactive sessions every 5 minutes
setInterval(() => {
  cdpClient.cleanupInactiveSessions()
}, 5 * 60 * 1000)