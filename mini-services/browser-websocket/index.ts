import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const PORT = process.env.WEBSOCKET_PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create HTTP server
const server = createServer()

// Configure Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Middleware
if (NODE_ENV === 'production') {
  server.use(helmet())
}

// Store active connections and sessions
const activeConnections = new Map()
const activeSessions = new Map()

// Metrics storage
let metrics = {
  totalConnections: 0,
  activeConnections: 0,
  totalSessions: 0,
  activeSessions: 0,
  messagesSent: 0,
  startTime: new Date()
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  
  // Update connection metrics
  activeConnections.set(socket.id, {
    connectedAt: new Date(),
    lastActivity: new Date()
  })
  
  metrics.activeConnections = activeConnections.size
  metrics.totalConnections++

  // Send initial data to client
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date(),
    metrics
  })

  // Handle session creation
  socket.on('session:create', (data) => {
    console.log(`Session creation requested:`, data)
    
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const sessionData = {
      id: sessionId,
      browser: data.browser || 'chrome',
      status: 'starting',
      user: data.user || 'Anonymous',
      createdAt: new Date(),
      capabilities: data.capabilities || {},
      node: selectBestNode()
    }

    activeSessions.set(sessionId, sessionData)
    metrics.activeSessions = activeSessions.size
    metrics.totalSessions++

    // Broadcast to all clients
    io.emit('session:created', sessionData)
    
    // Simulate session startup
    setTimeout(() => {
      sessionData.status = 'running'
      sessionData.webdriverUrl = `http://localhost:4444/wd/hub/session/${sessionId}`
      sessionData.vncUrl = `ws://localhost:3001/vnc/${sessionId}`
      
      io.emit('session:updated', sessionData)
      socket.emit('session:ready', sessionData)
    }, 2000)
  })

  // Handle session stop
  socket.on('session:stop', (data) => {
    const { sessionId } = data
    const session = activeSessions.get(sessionId)
    
    if (session) {
      session.status = 'stopped'
      session.stoppedAt = new Date()
      
      io.emit('session:stopped', session)
      activeSessions.delete(sessionId)
      metrics.activeSessions = activeSessions.size
    }
  })

  // Handle session monitoring
  socket.on('session:monitor', (data) => {
    const { sessionId } = data
    const session = activeSessions.get(sessionId)
    
    if (session) {
      // Join session-specific room
      socket.join(`session:${sessionId}`)
      
      // Send session updates
      socket.emit('session:status', session)
    }
  })

  // Handle metrics request
  socket.on('metrics:request', () => {
    socket.emit('metrics:update', {
      ...metrics,
      uptime: Date.now() - metrics.startTime.getTime(),
      memoryUsage: process.memoryUsage(),
      activeNodes: getActiveNodes()
    })
  })

  // Handle load balancer updates
  socket.on('loadbalancer:update', (data) => {
    console.log('Load balancer configuration updated:', data)
    io.emit('loadbalancer:updated', data)
  })

  // Handle browser events
  socket.on('browser:event', (data) => {
    const { sessionId, event, payload } = data
    
    io.emit('browser:event', {
      sessionId,
      event,
      payload,
      timestamp: new Date()
    })
  })

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
    
    activeConnections.delete(socket.id)
    metrics.activeConnections = activeConnections.size
    
    // Clean up any sessions associated with this connection
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.socketId === socket.id) {
        session.status = 'disconnected'
        io.emit('session:disconnected', session)
        activeSessions.delete(sessionId)
        metrics.activeSessions = activeSessions.size
      }
    }
  })

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error)
  })
})

// Helper functions
function selectBestNode() {
  // Simple round-robin for now
  // In production, this would implement actual load balancing logic
  const nodes = ['node-1', 'node-2', 'node-3']
  return nodes[Math.floor(Math.random() * nodes.length)]
}

function getActiveNodes() {
  // Simulate node status
  return [
    { id: 'node-1', status: 'healthy', sessions: 3, cpu: 45, memory: 60 },
    { id: 'node-2', status: 'healthy', sessions: 2, cpu: 30, memory: 45 },
    { id: 'node-3', status: 'unhealthy', sessions: 0, cpu: 0, memory: 0 }
  ]
}

// Broadcast metrics every 5 seconds
setInterval(() => {
  const metricsUpdate = {
    ...metrics,
    uptime: Date.now() - metrics.startTime.getTime(),
    memoryUsage: process.memoryUsage(),
    activeNodes: getActiveNodes(),
    timestamp: new Date()
  }
  
  io.emit('metrics:update', metricsUpdate)
  metrics.messagesSent++
}, 5000)

// Simulate random events for demo
setInterval(() => {
  if (Math.random() > 0.7) {
    const events = ['page:load', 'click', 'scroll', 'screenshot', 'error']
    const event = events[Math.floor(Math.random() * events.length)]
    
    io.emit('system:event', {
      event,
      timestamp: new Date(),
      severity: event === 'error' ? 'warning' : 'info'
    })
  }
}, 10000)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Browser WebSocket Service running on port ${PORT}`)
  console.log(`📊 Environment: ${NODE_ENV}`)
  console.log(`🔗 WebSocket URL: ws://localhost:${PORT}`)
  console.log(`🌐 CORS enabled for: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}`)
  console.log('')
  console.log('Available events:')
  console.log('  • session:create - Create new browser session')
  console.log('  • session:stop - Stop browser session')
  console.log('  • session:monitor - Monitor session activity')
  console.log('  • metrics:request - Request system metrics')
  console.log('  • loadbalancer:update - Update load balancer config')
  console.log('  • browser:event - Browser-specific events')
  console.log('')
})

export default server