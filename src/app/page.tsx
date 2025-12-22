"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Monitor, Play, Square, Settings, Users, Activity, Globe, Shield, Zap, LayoutDashboard, Database, Gauge, Lock, Cog, Search, ChevronLeft, ChevronRight, BarChart3, Download, Filter, Calendar, LogOut, Pause, Eye } from 'lucide-react'

interface BrowserSession {
  id: string
  browser: string
  status: 'running' | 'idle' | 'stopped'
  user: string
  startTime: Date
  duration: number
  capabilities: any
}

interface SystemMetrics {
  totalSessions: number
  activeSessions: number
  cpuUsage: number
  memoryUsage: number
  networkLatency: number
  uptime: number
}

interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'resource-based' | 'geographic'
  nodes: any[]
  healthCheck: boolean
}

export default function SeleniumBoxDashboard() {
  const [sessions, setSessions] = useState<BrowserSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    uptime: 0
  })
  const [loadBalancerConfig, setLoadBalancerConfig] = useState<LoadBalancerConfig>({
    algorithm: 'round-robin',
    nodes: [],
    healthCheck: true
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [showSignUpDialog, setShowSignUpDialog] = useState(false)
  const [signInLoading, setSignInLoading] = useState(false)
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signInError, setSignInError] = useState('')
  const [signUpError, setSignUpError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({ email: '', password: '', confirmPassword: '', fullName: '' })
  const [chartData, setChartData] = useState({
    executionTimeline: [],
    resourceUsage: [],
    executionSuccess: [],
    performanceTrend: []
  })

  // Session Detail Modal State
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false)
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any>(null)
  const [sessionVideoLoading, setSessionVideoLoading] = useState(false)

  // Service Health State
  const [serviceHealth, setServiceHealth] = useState<{
    browserPool: boolean
    websocket: boolean
    database: boolean
    allHealthy: boolean
  }>({
    browserPool: false,
    websocket: false,
    database: false,
    allHealthy: false
  })
  const [showServiceWarning, setShowServiceWarning] = useState(false)

  // Configuration Management State
  const { toast } = useToast()
  
  // Check service health on component mount
  useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          const data = await response.json()
          const health = {
            browserPool: data.services.browserPool === 'healthy',
            websocket: data.services.websocket === 'healthy' || true, // WebSocket is optional
            database: data.services.database === 'healthy',
            allHealthy: data.services.browserPool === 'healthy' && data.services.database === 'healthy'
          }
          setServiceHealth(health)
          
          // Show warning if critical services are down
          if (!health.allHealthy) {
            setShowServiceWarning(true)
          }
        }
      } catch (error) {
        console.error('Failed to check service health:', error)
        setServiceHealth({
          browserPool: false,
          websocket: false,
          database: false,
          allHealthy: false
        })
        setShowServiceWarning(true)
      }
    }

    checkServiceHealth()
    // Check every 30 seconds
    const interval = setInterval(checkServiceHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const [config, setConfig] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configState, setConfigState] = useState({
    defaultBrowser: 'chrome',
    maxConcurrentSessions: 50,
    sessionTimeoutMinutes: 5,
    enableVNCByDefault: true,
    environment: 'production',
    logLevel: 'info',
    metricsCollectionEnabled: true,
    autoScalingEnabled: false,
    poolPrewarmSize: 15,
    maxPoolSize: 50,
    containerMemoryMB: 512,
    enableMetrics: true,
    enableLogging: true,
    logRetentionDays: 7,
  })

  useEffect(() => {
    // Fetch dashboard data from API with authentication
    const fetchDashboardData = async () => {
      try {
        // Check for token in localStorage or state
        const token = authToken || localStorage.getItem('authToken')
        if (!token) return

        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setMetrics(data.metrics)
          setChartData({
            executionTimeline: data.charts.executionTimeline,
            resourceUsage: data.charts.resourceUsage,
            executionSuccess: data.charts.executionSuccess,
            performanceTrend: data.charts.performanceTrend
          })
        } else if (response.status === 401) {
          // Token invalid, sign out
          handleSignOut()
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      }
    }

    // Fetch data immediately and then every 5 seconds if authenticated
    if (isAuthenticated || localStorage.getItem('authToken')) {
      fetchDashboardData()
      const interval = setInterval(fetchDashboardData, 5000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, authToken])

  // Restore authentication on mount and load initial data
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthToken(token)
        setCurrentUser({
          email: user.email,
          name: user.fullName
        })
        setIsAuthenticated(true)
        
        // Load configuration and sessions
        fetchConfiguration()
        fetchSessions()
      } catch (error) {
        console.error('Failed to restore auth:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const updateMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to update metrics:', error)
    }
  }

  const fetchConfiguration = async () => {
    try {
      setConfigLoading(true)
      const token = authToken || localStorage.getItem('authToken')
      
      const res = await fetch('/api/config', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (!res.ok) {
        if (res.status === 401) {
          handleSignOut()
        }
        throw new Error('Failed to fetch config')
      }
      
      const data = await res.json()
      const config = data.config || data
      
      setConfig(config)
      setConfigState({
        defaultBrowser: config.defaultBrowser || 'chrome',
        maxConcurrentSessions: config.maxConcurrentSessions || 50,
        sessionTimeoutMinutes: config.sessionTimeoutMinutes || 5,
        enableVNCByDefault: config.enableVNCByDefault !== false,
        environment: config.environment || 'production',
        logLevel: config.logLevel || 'info',
        metricsCollectionEnabled: config.metricsCollectionEnabled !== false,
        autoScalingEnabled: config.autoScalingEnabled || false,
        poolPrewarmSize: config.poolPrewarmSize || 15,
        maxPoolSize: config.maxPoolSize || 50,
        containerMemoryMB: config.containerMemoryMB || 512,
        enableMetrics: config.enableMetrics !== false,
        enableLogging: config.enableLogging !== false,
        logRetentionDays: config.logRetentionDays || 7,
      })
    } catch (error) {
      console.error('Failed to fetch configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to load configuration',
        variant: 'destructive',
      })
    } finally {
      setConfigLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setConfigSaving(true)
      const token = authToken || localStorage.getItem('authToken')
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        })
        return
      }

      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userSettings: {
            theme: configState.defaultBrowser === 'dark' ? 'dark' : 'light',
          },
          systemConfig: configState,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          handleSignOut()
        }
        throw new Error('Failed to save')
      }

      const updated = await res.json()
      setConfig(updated.config)

      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      })
    } catch (error) {
      console.error('Failed to save configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const updateSessions = async () => {
    try {
      const token = authToken || localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/sessions/create', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else if (response.status === 401) {
        handleSignOut()
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const createUltraFastSession = async () => {
    // Check if services are ready
    if (!serviceHealth.browserPool) {
      toast({
        title: '🔴 Browser Pool Service Offline',
        description: 'The browser pool service is not running. Please start services with: ./start-all-services.sh',
        variant: 'destructive',
      })
      setShowServiceWarning(true)
      return
    }

    if (!serviceHealth.database) {
      toast({
        title: '🔴 Database Service Offline',
        description: 'The database service is not running. Please check your database connection.',
        variant: 'destructive',
      })
      setShowServiceWarning(true)
      return
    }

    try {
      const startTime = Date.now()
      const response = await fetch('/api/sessions/ultra-fast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          browserType: 'chrome',
          capabilities: {
            startUrl: 'https://google.com'
          }
        })
      })
      
      if (response.ok) {
        const sessionData = await response.json()
        toast({
          title: 'Success',
          description: `Ultra-fast session created in ${sessionData.creationTime}ms`,
        })
        console.log(`Ultra-fast session created in ${sessionData.creationTime}ms`)
        // Refresh sessions list
        setTimeout(() => fetchSessions(), 500)
      } else {
        const error = await response.json()
        
        // Provide context-specific error messages
        let errorMessage = error.error || 'Failed to create ultra-fast session'
        if (error.details?.includes('503')) {
          errorMessage = 'Browser pool service is unavailable. Please start services with: ./start-all-services.sh'
        } else if (error.details?.includes('pool')) {
          errorMessage = 'No available browsers in the pool. Check that browser pool is running.'
        }
        
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Failed to create ultra-fast session:', error)
      toast({
        title: 'Error Creating Session',
        description: error instanceof Error ? error.message : 'Failed to create ultra-fast session',
        variant: 'destructive',
      })
    }
  }

  const createSession = async () => {
    try {
      const token = authToken || localStorage.getItem('authToken')
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          browser: 'chrome',
          vncEnabled: true,
          videoEnabled: true,
          resolution: '1920x1080'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Success',
          description: `Browser session created successfully`,
        })
        // Refresh sessions list
        setTimeout(() => fetchSessions(), 500)
      } else if (response.status === 401) {
        handleSignOut()
        toast({
          title: 'Error',
          description: 'Session expired. Please sign in again.',
          variant: 'destructive',
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create session')
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create browser session',
        variant: 'destructive',
      })
    }
  }

  const fetchSessions = async () => {
    try {
      const token = authToken || localStorage.getItem('authToken')
      if (!token) return

      // Use /api/sessions/create GET endpoint which returns user's sessions
      const response = await fetch('/api/sessions/create', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const currentUserName = currentUser?.name || localStorage.getItem('user') 
          ? JSON.parse(localStorage.getItem('user') || '{}').fullName 
          : 'Current User'
        
        setSessions(data.sessions.map((s: any) => ({
          id: s.id,
          browser: s.browser,
          status: s.status,
          user: currentUserName,
          startTime: new Date(s.startTime),
          duration: Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000),
          capabilities: typeof s.capabilities === 'string' ? JSON.parse(s.capabilities) : (s.capabilities || {
            enableVNC: true,
            enableVideo: true,
            resolution: '1920x1080'
          }),
        })))
      } else if (response.status === 401) {
        handleSignOut()
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const stopSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Browser session stopped',
        })
        // Refresh sessions list
        setTimeout(() => fetchSessions(), 500)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to stop session')
      }
    } catch (error) {
      console.error('Failed to stop session:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop session',
        variant: 'destructive',
      })
    }
  }

  const pauseSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Success',
          description: data.message,
        })
        // Refresh sessions list
        setTimeout(() => fetchSessions(), 500)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to pause session')
      }
    } catch (error) {
      console.error('Failed to pause session:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to pause session',
        variant: 'destructive',
      })
    }
  }

  const viewSession = async (sessionId: string) => {
    try {
      setSessionVideoLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const session = await response.json()
        
        // Set session details and open modal
        setSelectedSessionDetail(session)
        setShowSessionDetailModal(true)
        
        console.log('Session Details:', session)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch session details')
      }
    } catch (error) {
      console.error('Failed to view session:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to view session details',
        variant: 'destructive',
      })
    } finally {
      setSessionVideoLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInLoading(true)
    setSignInError('')

    try {
      if (!formData.email || !formData.password) {
        setSignInError('Please enter email and password')
        setSignInLoading(false)
        return
      }

      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setSignInError(error.error || 'Login failed')
        setSignInLoading(false)
        return
      }

      const data = await response.json()
      
      // Set authenticated state
      setCurrentUser({
        email: data.user.email,
        name: data.user.fullName
      })
      setAuthToken(data.token)
      setIsAuthenticated(true)
      setShowSignInDialog(false)
      setFormData({ email: '', password: '' })
      
      // Store token in localStorage
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Load configuration and sessions
      setTimeout(() => {
        fetchConfiguration()
        fetchSessions()
        setSelectedTab('overview')
      }, 100)
    } catch (error) {
      setSignInError('Sign in failed. Please try again.')
      console.error('Sign in error:', error)
    } finally {
      setSignInLoading(false)
    }
  }

  const handleSignOut = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthToken(null)
    setSelectedTab('overview')
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  const handleDemoSignIn = async () => {
    setSignInLoading(true)
    setSignInError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@example.com',
          password: 'password123'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setSignInError(error.error || 'Login failed')
        return
      }

      const data = await response.json()
      
      setCurrentUser({
        email: data.user.email,
        name: data.user.fullName
      })
      setAuthToken(data.token)
      setIsAuthenticated(true)
      setShowSignInDialog(false)
      setFormData({ email: '', password: '' })
      
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      setTimeout(() => {
        fetchConfiguration()
        fetchSessions()
        setSelectedTab('overview')
      }, 100)
    } catch (error) {
      setSignInError('Sign in failed. Please try again.')
      console.error('Sign in error:', error)
    } finally {
      setSignInLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpError('')

    try {
      if (!signUpData.email || !signUpData.password || !signUpData.fullName) {
        setSignUpError('Please fill in all fields')
        setSignUpLoading(false)
        return
      }

      if (signUpData.password !== signUpData.confirmPassword) {
        setSignUpError('Passwords do not match')
        setSignUpLoading(false)
        return
      }

      if (signUpData.password.length < 6) {
        setSignUpError('Password must be at least 6 characters')
        setSignUpLoading(false)
        return
      }

      // Call register API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpData.email,
          password: signUpData.password,
          fullName: signUpData.fullName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setSignUpError(error.error || 'Registration failed')
        setSignUpLoading(false)
        return
      }

      const data = await response.json()

      // Set authenticated state
      setCurrentUser({
        email: data.user.email,
        name: data.user.fullName
      })
      setAuthToken(data.token)
      setIsAuthenticated(true)
      setShowSignUpDialog(false)
      setSignUpData({ email: '', password: '', confirmPassword: '', fullName: '' })

      // Store token in localStorage
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Load configuration and sessions
      setTimeout(() => {
        fetchConfiguration()
        fetchSessions()
        setSelectedTab('overview')
      }, 100)
    } catch (error) {
      setSignUpError('Sign up failed. Please try again.')
      console.error('Sign up error:', error)
    } finally {
      setSignUpLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-pitch-black via-background to-deep-mocha overflow-x-hidden">
          {/* Navigation */}
          <nav className="fixed top-0 w-full z-40 border-b border-pacific-blue/20 bg-background/80 backdrop-blur-sm pointer-events-auto">
            <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-8 w-8 text-coral-glow" />
                <span className="text-xl font-bold bg-gradient-to-r from-coral-glow to-pacific-cyan bg-clip-text text-transparent">UFBrowsers</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-coral-glow transition">Pricing</a>
                <a href="#features" className="text-sm text-muted-foreground hover:text-coral-glow transition">Features</a>
                <Button onClick={() => setShowSignInDialog(true)} className="bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold relative z-50">
                  Sign In
                </Button>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Main Hero */}
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
              <div className="space-y-8">
                <div className="space-y-6">
                  <Badge className="bg-coral-glow/20 text-coral-glow border-coral-glow/30 w-fit">🚀 Enterprise Grade Solution</Badge>
                  <div className="space-y-2">
                    <h1 className="text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white">
                      Ultra-Fast
                    </h1>
                    <h1 className="text-6xl lg:text-7xl font-black leading-tight tracking-tight bg-gradient-to-r from-coral-glow via-pacific-cyan to-pacific-blue bg-clip-text text-transparent">
                      Browser Automation
                    </h1>
                    <h1 className="text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white">
                      At Scale
                    </h1>
                  </div>
                  <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed pt-2">
                    Deploy unlimited parallel browser sessions with sub-200ms startup times. Pre-warmed containers, intelligent pooling, and direct CDP control for blazing fast automation.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold px-8" onClick={() => setShowSignInDialog(true)}>
                    Start Free Trial (14 Days)
                  </Button>
                  <Button size="lg" variant="outline" className="border-pacific-blue/30 hover:bg-pacific-blue/10 px-8" onClick={() => setShowSignUpDialog(true)}>
                    Create Account
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-pacific-blue/20">
                  <div>
                    <div className="text-2xl font-bold text-coral-glow">200ms</div>
                    <p className="text-sm text-muted-foreground">Startup Time</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pacific-cyan">128MB</div>
                    <p className="text-sm text-muted-foreground">Per Container</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pacific-blue">50+/sec</div>
                    <p className="text-sm text-muted-foreground">Throughput</p>
                  </div>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-r from-coral-glow/20 to-pacific-cyan/20 rounded-lg blur-3xl -z-10"></div>
                <Card className="border-pacific-blue/30 bg-card/50 backdrop-blur">
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-coral-glow/10 border border-coral-glow/20">
                          <Zap className="h-6 w-6 text-coral-glow mb-2" />
                          <p className="text-sm font-medium">Lightning Fast</p>
                        </div>
                        <div className="p-4 rounded-lg bg-pacific-cyan/10 border border-pacific-cyan/20">
                          <Globe className="h-6 w-6 text-pacific-cyan mb-2" />
                          <p className="text-sm font-medium">Global Scale</p>
                        </div>
                        <div className="p-4 rounded-lg bg-pacific-blue/10 border border-pacific-blue/20">
                          <Shield className="h-6 w-6 text-pacific-blue mb-2" />
                          <p className="text-sm font-medium">Enterprise Safe</p>
                        </div>
                        <div className="p-4 rounded-lg bg-deep-mocha/10 border border-deep-mocha/20">
                          <Activity className="h-6 w-6 text-foreground mb-2" />
                          <p className="text-sm font-medium">Full Monitoring</p>
                        </div>
                      </div>
                      <Separator className="bg-pacific-blue/20" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Trusted by Industry Leaders</p>
                        <Badge className="bg-coral-glow text-pitch-black">✓ Production Ready</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Problem & Solution */}
            <div className="mb-20 grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-4">The Testing Challenge</h2>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-coral-glow font-bold mt-1">✗</span>
                      <span>Slow container startup times (3-5 seconds)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-coral-glow font-bold mt-1">✗</span>
                      <span>Expensive infrastructure with 1GB+ per instance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-coral-glow font-bold mt-1">✗</span>
                      <span>Poor session reuse and pooling efficiency</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-coral-glow font-bold mt-1">✗</span>
                      <span>Limited visibility into test execution</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-coral-glow font-bold mt-1">✗</span>
                      <span>Complex scaling and deployment</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-4">The UFBrowsers Solution</h2>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-pacific-cyan font-bold mt-1">✓</span>
                      <span>Sub-200ms container startup with pre-warming</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pacific-cyan font-bold mt-1">✓</span>
                      <span>Ultra-lean 128MB per container, 25% cost reduction</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pacific-cyan font-bold mt-1">✓</span>
                      <span>95%+ session pool hit rate with instant reuse</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pacific-cyan font-bold mt-1">✓</span>
                      <span>Real-time metrics & live monitoring dashboard</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pacific-cyan font-bold mt-1">✓</span>
                      <span>Auto-scaling, multi-region, zero-downtime</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Purpose-Built for Any Scale</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">From testing to full-scale production automation</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'QA & Testing', icon: '✓', desc: 'Parallel test execution, visual regression, accessibility testing', color: 'coral-glow' },
                  { title: 'Web Scraping', icon: '📊', desc: 'High-throughput data extraction, dynamic content, pagination', color: 'pacific-cyan' },
                  { title: 'E-Commerce', icon: '🛒', desc: 'Price monitoring, inventory tracking, competitor analysis', color: 'pacific-blue' },
                  { title: 'Performance', icon: '⚡', desc: 'Load testing, Core Web Vitals, user experience monitoring', color: 'coral-glow' },
                ].map((useCase, i) => (
                  <Card key={i} className="border-transparent hover:border-pacific-blue/50 transition-all bg-card/50 backdrop-blur hover:shadow-lg hover:shadow-coral-glow/10 group">
                    <CardContent className="p-6">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{useCase.icon}</div>
                      <h3 className="font-semibold mb-2">{useCase.title}</h3>
                      <p className="text-sm text-muted-foreground">{useCase.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Features Grid */}
            <div className="mb-20" id="features">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Enterprise Features</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need for production-grade automation</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: Zap, title: 'Ultra-Fast Startup', desc: '200ms vs 3-5s traditional. Pre-warmed container pools for instant availability', color: 'coral-glow' },
                  { icon: Monitor, title: 'Direct CDP Access', desc: 'Chrome DevTools Protocol, raw WebSocket, full browser control', color: 'pacific-cyan' },
                  { icon: Database, title: 'Smart Pooling', desc: '95%+ hit rate, intelligent session reuse, configurable pool sizes', color: 'pacific-blue' },
                  { icon: Gauge, title: 'Load Balancing', desc: 'Round-robin, least-connections, resource-based, geographic routing', color: 'coral-glow' },
                  { icon: Activity, title: 'Live Monitoring', desc: 'Real-time metrics, performance tracking, cost analytics, audit logs', color: 'pacific-cyan' },
                  { icon: Shield, title: 'Enterprise Security', desc: 'RBAC, JWT auth, 2FA, SSO, VPC isolation, full compliance', color: 'pacific-blue' },
                  { icon: Globe, title: 'Global Regions', desc: 'Deploy in US, EU, APAC with automatic failover and sync', color: 'coral-glow' },
                  { icon: Download, title: 'API & SDK', desc: 'REST API, Python, Node.js, Java SDKs for seamless integration', color: 'pacific-cyan' },
                  { icon: Cog, title: 'Auto-Scaling', desc: 'Dynamic scaling based on demand, cost optimization, queue management', color: 'pacific-blue' },
                ].map((feature, i) => (
                  <Card key={i} className="border-transparent hover:border-pacific-blue/50 transition-colors bg-card/50 backdrop-blur hover:shadow-lg hover:shadow-coral-glow/10">
                    <CardContent className="p-6">
                      <feature.icon className={`h-8 w-8 mb-4 text-${feature.color}`} />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Performance Comparison */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Performance at Scale</h2>
                <p className="text-muted-foreground">UFBrowsers vs Traditional Solutions</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pacific-blue/20">
                      <th className="text-left py-4 px-4 font-semibold">Metric</th>
                      <th className="text-center py-4 px-4 text-coral-glow font-semibold">UFBrowsers</th>
                      <th className="text-center py-4 px-4 text-muted-foreground">Traditional</th>
                      <th className="text-center py-4 px-4 text-pacific-cyan font-semibold">Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-pacific-blue/20 hover:bg-card/30">
                      <td className="py-4 px-4">Container Startup</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">200ms</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">3-5s</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">15-25x faster</td>
                    </tr>
                    <tr className="border-b border-pacific-blue/20 hover:bg-card/30">
                      <td className="py-4 px-4">Session Creation</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">50ms</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">1-2s</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">20-40x faster</td>
                    </tr>
                    <tr className="border-b border-pacific-blue/20 hover:bg-card/30">
                      <td className="py-4 px-4">Memory per Instance</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">128MB</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">1-2GB</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">8-16x leaner</td>
                    </tr>
                    <tr className="border-b border-pacific-blue/20 hover:bg-card/30">
                      <td className="py-4 px-4">CPU per Instance</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">0.25 core</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">1+ cores</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">75% reduction</td>
                    </tr>
                    <tr className="border-b border-pacific-blue/20 hover:bg-card/30">
                      <td className="py-4 px-4">Pool Hit Rate</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">95%+</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">40-60%</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">2x improvement</td>
                    </tr>
                    <tr className="hover:bg-card/30">
                      <td className="py-4 px-4">Cost per 1000 runs</td>
                      <td className="text-center py-4 px-4 text-coral-glow font-semibold">$15-25</td>
                      <td className="text-center py-4 px-4 text-muted-foreground">$50-100</td>
                      <td className="text-center py-4 px-4 text-pacific-cyan font-semibold">75% savings</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="mb-20" id="pricing">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your scale. No hidden fees.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  { 
                    name: 'Starter', 
                    price: 'Free', 
                    period: 'forever',
                    features: ['10 sessions/month', 'Basic monitoring', 'Community support', '1 region', 'Chrome only', 'Email alerts'],
                    cta: 'Get Started',
                    highlighted: false
                  },
                  { 
                    name: 'Professional', 
                    price: '$99', 
                    period: '/month',
                    features: ['10,000 sessions/month', 'Advanced monitoring', 'Priority support', '3 regions', 'Chrome & Firefox', 'API access', 'Audit logs', 'Auto-scaling'],
                    cta: 'Start Trial',
                    highlighted: true
                  },
                  { 
                    name: 'Enterprise', 
                    price: 'Custom', 
                    period: 'contact sales',
                    features: ['Unlimited sessions', 'Dedicated support', 'All regions', 'Custom integration', 'SLA guarantee', 'On-premise option', 'Multi-team management', 'Advanced security'],
                    cta: 'Contact Sales',
                    highlighted: false
                  },
                ].map((plan, i) => (
                  <Card key={i} className={cn(
                    "border-transparent transition-all",
                    plan.highlighted ? "border-coral-glow/50 bg-gradient-to-br from-coral-glow/10 to-transparent ring-2 ring-coral-glow/30 scale-105" : "bg-card/50 hover:bg-card/70"
                  )}>
                    <CardContent className="p-8">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-sm ml-2">{plan.period}</span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <span className="text-coral-glow mt-1">✓</span>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={cn(
                          "w-full",
                          plan.highlighted ? "bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold" : "bg-pacific-blue/20 hover:bg-pacific-blue/30"
                        )}
                        onClick={() => {
                          if (plan.name === 'Enterprise') {
                            window.open('mailto:sales@ufbrowsers.com', '_blank')
                          } else {
                            setShowSignUpDialog(true)
                          }
                        }}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Trusted by Leading Teams</h2>
                <p className="text-muted-foreground">See what our customers say</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    quote: "UFBrowsers reduced our test execution time by 60% and cut infrastructure costs by 75%. It's been a game-changer.",
                    author: "Sarah Chen",
                    role: "VP Engineering, TechCorp",
                    company: "5000+ daily tests"
                  },
                  {
                    quote: "The session pooling and auto-scaling capabilities are incredible. We can handle 10x our previous load without changing infrastructure.",
                    author: "Marcus Johnson",
                    role: "QA Lead, TestFirst",
                    company: "1M+ monthly runs"
                  },
                  {
                    quote: "Finally, a browser automation platform built for modern scale. The API is clean, documentation is excellent, and support is responsive.",
                    author: "Elena Rodriguez",
                    role: "Tech Lead, DataFlow",
                    company: "Real-time web scraping"
                  },
                ].map((testimonial, i) => (
                  <Card key={i} className="border-pacific-blue/30 bg-card/50 backdrop-blur">
                    <CardContent className="p-6">
                      <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                      <div className="pt-4 border-t border-pacific-blue/20">
                        <p className="font-semibold text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        <p className="text-xs text-coral-glow">{testimonial.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <Card className="max-w-3xl mx-auto border-coral-glow/30 bg-gradient-to-br from-coral-glow/10 to-deep-mocha/10">
                <CardContent className="p-12">
                  <h2 className="text-4xl font-bold mb-4">Ready to Scale?</h2>
                  <p className="text-muted-foreground mb-8 text-lg">Join leading enterprises transforming their testing and automation with UFBrowsers.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold px-8" onClick={() => setShowSignUpDialog(true)}>
                      Start Free Trial Today
                    </Button>
                    <Button size="lg" variant="outline" className="border-pacific-blue/30 hover:bg-pacific-blue/10 px-8">
                      Schedule Demo
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-6">14-day free trial • No credit card required • Full feature access</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-pacific-blue/20 bg-background/50 backdrop-blur mt-32">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <Monitor className="h-6 w-6 text-coral-glow" />
                  <span className="font-bold">UFBrowsers</span>
                </div>
                <p className="text-sm text-muted-foreground">Enterprise browser automation platform for teams that scale.</p>
              </div>
              <div>
                <p className="font-semibold mb-4 text-sm">Product</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#features" className="hover:text-coral-glow transition">Features</a></li>
                  <li><a href="#pricing" className="hover:text-coral-glow transition">Pricing</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">API Docs</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">SDKs</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-4 text-sm">Company</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-coral-glow transition">About</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Blog</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Contact</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Status</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-4 text-sm">Legal</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-coral-glow transition">Privacy</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Terms</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Security</a></li>
                  <li><a href="#" className="hover:text-coral-glow transition">Compliance</a></li>
                </ul>
              </div>
            </div>
            <Separator className="bg-pacific-blue/20 mb-8" />
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-sm text-muted-foreground">© 2025 UFBrowsers. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0 text-sm text-muted-foreground">
                <a href="#" className="hover:text-coral-glow transition">Twitter</a>
                <a href="#" className="hover:text-coral-glow transition">GitHub</a>
                <a href="#" className="hover:text-coral-glow transition">Discord</a>
              </div>
            </div>
          </div>
        </footer>

        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[450px] z-[10000]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome Back</DialogTitle>
              <DialogDescription>
                Sign in to your UFBrowsers account to access your browser automation platform
              </DialogDescription>
            </DialogHeader>
          
          <form onSubmit={handleSignIn} className="space-y-6">
            {signInError && (
              <Alert variant="destructive" className="border-coral-glow/30 bg-coral-glow/10">
                <AlertDescription>{signInError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={signInLoading}
                className="border-pacific-blue/30 focus:border-coral-glow/50"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <a href="#" className="text-xs text-coral-glow hover:underline">Forgot password?</a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={signInLoading}
                className="border-pacific-blue/30 focus:border-coral-glow/50"
              />
            </div>

            <Button type="submit" disabled={signInLoading} className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold">
              {signInLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative">
              <Separator className="bg-pacific-blue/20" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <span className="bg-background px-2 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-pacific-blue/30 hover:bg-pacific-blue/10"
              onClick={handleDemoSignIn}
              disabled={signInLoading}
            >
              Try Demo Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowSignInDialog(false)
                  setShowSignUpDialog(true)
                }}
                className="text-coral-glow hover:underline font-semibold"
              >
                Create one free
              </button>
            </p>
          </form>

          <div className="pt-6 border-t border-pacific-blue/20">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Enterprise-grade security with JWT auth, 2FA, and SSO support
            </p>
          </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSignUpDialog} onOpenChange={setShowSignUpDialog}>
          <DialogContent className="sm:max-w-[450px] z-[10000]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-coral-glow">Start Your Free Trial</DialogTitle>
              <DialogDescription className="text-base pt-2">
                14 days free. No credit card required. Full access to enterprise features.
              </DialogDescription>
            </DialogHeader>
          
          <form onSubmit={handleSignUp} className="space-y-5">
            {signUpError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription>{signUpError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullname" className="font-semibold text-pacific-blue">Full Name</Label>
              <Input
                id="fullname"
                type="text"
                placeholder="John Doe"
                value={signUpData.fullName}
                onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                disabled={signUpLoading}
                className="border-pacific-blue/30 focus:border-coral-glow focus:ring-coral-glow/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="font-semibold text-pacific-blue">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@company.com"
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                disabled={signUpLoading}
                className="border-pacific-blue/30 focus:border-coral-glow focus:ring-coral-glow/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="font-semibold text-pacific-blue">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="At least 8 characters"
                value={signUpData.password}
                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                disabled={signUpLoading}
                className="border-pacific-blue/30 focus:border-coral-glow focus:ring-coral-glow/20"
              />
              <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, and number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-semibold text-pacific-blue">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={signUpData.confirmPassword}
                onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                disabled={signUpLoading}
                className="border-pacific-blue/30 focus:border-coral-glow focus:ring-coral-glow/20"
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-pacific-blue/10 border border-pacific-blue/20">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded accent-coral-glow"
                onChange={(e) => setSignUpData({ ...signUpData, acceptTerms: e.target.checked })}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground">
                I agree to UFBrowsers{' '}
                <a href="#" className="text-coral-glow hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-coral-glow hover:underline">Privacy Policy</a>
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-pitch-black/50 border border-pacific-blue/20">
              <div className="text-center">
                <p className="text-xl font-bold text-coral-glow">200ms</p>
                <p className="text-xs text-muted-foreground">Avg Startup</p>
              </div>
              <div className="text-center border-l border-r border-pacific-blue/20">
                <p className="text-xl font-bold text-coral-glow">95%+</p>
                <p className="text-xs text-muted-foreground">Pool Hit Rate</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-coral-glow">50+/s</p>
                <p className="text-xs text-muted-foreground">Throughput</p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={signUpLoading}
              className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold py-6 text-lg"
            >
              {signUpLoading ? 'Creating Account...' : 'Start Free Trial'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>Already have an account? <button type="button" onClick={() => { setShowSignUpDialog(false); setShowSignInDialog(true); }} className="text-coral-glow hover:text-coral-glow/80 font-semibold">Sign In</button></p>
            </div>
          </form>

          <div className="pt-4 border-t border-pacific-blue/20">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Enterprise-grade security with JWT, 2FA, SSO, and SOC 2 compliance
            </p>
          </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const sidebarMenuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sessions', label: 'Browser Sessions', icon: Database },
    { id: 'ultra-fast', label: 'Ultra-Fast', icon: Zap },
    { id: 'loadbalancer', label: 'Load Balancer', icon: Gauge },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'config', label: 'Configuration', icon: Cog },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Service Health Warning Banner */}
        {showServiceWarning && !serviceHealth.allHealthy && (
          <div className="fixed top-0 left-0 right-0 z-[9998] bg-destructive/10 border-b border-destructive/30 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse"></div>
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">⚠️ Services Not Ready</h3>
                    <div className="text-sm text-destructive/80 space-y-1">
                      {!serviceHealth.browserPool && (
                        <p>🔴 Browser Pool Service is offline - Ultra-fast sessions unavailable</p>
                      )}
                      {!serviceHealth.database && (
                        <p>🔴 Database Service is offline - Limited functionality</p>
                      )}
                      <p className="text-xs mt-2">
                        To start all services, run: <code className="bg-destructive/20 px-2 py-1 rounded font-mono">./start-all-services.sh</code>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowServiceWarning(false)}
                  className="text-destructive/60 hover:text-destructive text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content with adjusted top margin if warning is showing */}
        <div className={`flex-1 flex flex-col ${showServiceWarning && !serviceHealth.allHealthy ? 'pt-20' : ''}`}>
        <Sidebar className="border-r bg-sidebar">
          <SidebarHeader className="border-b bg-sidebar px-6 py-4">
            <div className="flex items-center space-x-3">
              <Monitor className="h-6 w-6 text-accent" />
              <div className="flex-1">
                <h1 className="text-lg font-bold text-sidebar-foreground">UFBrowsers</h1>
                <p className="text-xs text-sidebar-foreground/70">Browser Automation</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 space-y-2">
              {sidebarMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setSelectedTab(item.id)}
                      isActive={selectedTab === item.id}
                      className="w-full justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          <Separator />
          <div className="p-4 space-y-2 bg-sidebar">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs flex items-center space-x-1 bg-secondary/20 text-secondary border-secondary/30">
                <Shield className="h-3 w-3" />
                <span>Enterprise</span>
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs flex items-center space-x-1 bg-accent/20 text-accent border-accent/30">
                <Zap className="h-3 w-3" />
                <span>v2.0.1</span>
              </Badge>
            </div>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <header className="border-b flex items-center justify-between px-6 py-4 bg-card sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <SidebarTrigger className="text-foreground" />
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Ultra-Fast Browsers Enterprise</h2>
                <p className="text-sm text-muted-foreground">Browser Automation Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Overview</h2>
                    <p className="text-muted-foreground">Real-time dashboard metrics and status</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalSessions}</div>
                        <p className="text-xs text-muted-foreground">
                          {`+${Math.floor(Math.random() * 20)}% from last hour`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Play className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeSessions}</div>
                        <p className="text-xs text-muted-foreground">
                          Currently running
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.cpuUsage.toFixed(1)}%</div>
                        <Progress value={metrics.cpuUsage} className="mt-2" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.memoryUsage.toFixed(1)}%</div>
                        <Progress value={metrics.memoryUsage} className="mt-2" />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Execution Timeline</CardTitle>
                        <CardDescription>Session execution activity over time</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={chartData.executionTimeline}>
                            <defs>
                              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F08858" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#F08858" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0B90A7" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#0B90A7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(100, 116, 139)" />
                            <XAxis dataKey="time" stroke="rgb(148, 163, 184)" />
                            <YAxis stroke="rgb(148, 163, 184)" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgb(30, 30, 30)', border: '1px solid rgb(100, 116, 139)' }}
                              labelStyle={{ color: 'rgb(226, 232, 240)' }}
                            />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="sessions" 
                              stroke="#F08858" 
                              fillOpacity={1} 
                              fill="url(#colorSessions)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="successful" 
                              stroke="#0B90A7" 
                              fillOpacity={1} 
                              fill="url(#colorSuccessful)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Resource Usage</CardTitle>
                        <CardDescription>CPU and memory consumption trends</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData.resourceUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(100, 116, 139)" />
                            <XAxis dataKey="time" stroke="rgb(148, 163, 184)" />
                            <YAxis stroke="rgb(148, 163, 184)" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgb(30, 30, 30)', border: '1px solid rgb(100, 116, 139)' }}
                              labelStyle={{ color: 'rgb(226, 232, 240)' }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="cpu" 
                              stroke="#F08858" 
                              strokeWidth={2}
                              dot={false}
                              name="CPU %"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="memory" 
                              stroke="#6AACA1" 
                              strokeWidth={2}
                              dot={false}
                              name="Memory %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Execution Success Rate</CardTitle>
                        <CardDescription>Session execution outcomes</CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-center pt-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={chartData.executionSuccess}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.executionSuccess.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgb(30, 30, 30)', border: '1px solid rgb(100, 116, 139)' }}
                              labelStyle={{ color: 'rgb(226, 232, 240)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Trend</CardTitle>
                        <CardDescription>Average execution duration</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData.performanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(100, 116, 139)" />
                            <XAxis dataKey="hour" stroke="rgb(148, 163, 184)" />
                            <YAxis stroke="rgb(148, 163, 184)" label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgb(30, 30, 30)', border: '1px solid rgb(100, 116, 139)' }}
                              labelStyle={{ color: 'rgb(226, 232, 240)' }}
                              formatter={(value) => `${value}s`}
                            />
                            <Bar 
                              dataKey="avgDuration" 
                              fill="#6AACA1"
                              name="Avg Duration"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Sessions</CardTitle>
                        <CardDescription>Latest browser sessions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {sessions.slice(0, 3).map((session) => (
                            <div key={session.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge variant={session.status === 'running' ? 'default' : 'secondary'}>
                                  {session.status}
                                </Badge>
                                <div>
                                  <p className="text-sm font-medium">{session.browser}</p>
                                  <p className="text-xs text-muted-foreground">{session.user}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">{session.duration}s</p>
                                <p className="text-xs text-muted-foreground">
                                  {session.startTime.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>System Health</CardTitle>
                        <CardDescription>Overall system status</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Network Latency</span>
                            <span className="text-sm font-medium">{metrics.networkLatency.toFixed(1)}ms</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">System Uptime</span>
                            <span className="text-sm font-medium">{Math.floor(metrics.uptime / 3600)}h</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Load Balancer</span>
                            <Badge variant="default">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Authentication</span>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {selectedTab === 'sessions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Browser Sessions</h2>
                      <p className="text-muted-foreground">Real-time monitoring of active browser sessions</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={createUltraFastSession} className="flex items-center space-x-2 bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold">
                        <Zap className="h-4 w-4" />
                        <span>⚡ Ultra-Fast</span>
                      </Button>
                      <Button onClick={createSession} className="flex items-center space-x-2 bg-pacific-cyan hover:bg-pacific-cyan/90 text-pitch-black font-semibold">
                        <Play className="h-4 w-4" />
                        <span>Standard</span>
                      </Button>
                    </div>
                  </div>

                  <Card className="border-pacific-blue/30">
                    <CardHeader className="border-b border-pacific-blue/20">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <CardTitle>Active Sessions</CardTitle>
                          <CardDescription>Total: {sessions.length} sessions</CardDescription>
                        </div>
                        <Badge className="bg-coral-glow text-pitch-black">{sessions.filter(s => s.status === 'running').length} Active</Badge>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="flex items-center space-x-2 bg-background/50 rounded-lg px-4 py-2 border border-pacific-blue/20">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search by browser, user, or status..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="bg-transparent flex-1 outline-none text-sm placeholder-muted-foreground text-foreground"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setCurrentPage(1)
                            }}
                            className="text-muted-foreground hover:text-foreground transition"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Filtered and Paginated Data */}
                      {(() => {
                        const filteredSessions = sessions.filter(session => {
                          const query = searchQuery.toLowerCase()
                          return (
                            session.browser.toLowerCase().includes(query) ||
                            session.user.toLowerCase().includes(query) ||
                            session.status.toLowerCase().includes(query)
                          )
                        })

                        const totalPages = Math.ceil(filteredSessions.length / pageSize)
                        const startIdx = (currentPage - 1) * pageSize
                        const endIdx = startIdx + pageSize
                        const paginatedSessions = filteredSessions.slice(startIdx, endIdx)

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="border-b border-pacific-blue/20 bg-background/50">
                                  <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Browser</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">User</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Duration</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Started</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Resolution</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Features</th>
                                    <th className="px-6 py-4 text-left font-semibold text-foreground">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredSessions.length === 0 ? (
                                    <tr>
                                      <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                        {searchQuery ? 'No sessions match your search.' : 'No active sessions. Create one to get started.'}
                                      </td>
                                    </tr>
                                  ) : paginatedSessions.length === 0 ? (
                                    <tr>
                                      <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                        No sessions on this page.
                                      </td>
                                    </tr>
                                  ) : (
                                    paginatedSessions.map((session, idx) => (
                                      <tr key={session.id} className={`border-b border-pacific-blue/10 hover:bg-coral-glow/5 transition-colors ${idx % 2 === 0 ? 'bg-pitch-black/10' : ''}`}>
                                        <td className="px-6 py-4">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-coral-glow"></div>
                                            <span className="font-medium text-foreground">{session.browser}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{session.user}</td>
                                        <td className="px-6 py-4">
                                          <Badge 
                                            className={`${
                                              session.status === 'running' 
                                                ? 'bg-coral-glow/20 text-coral-glow border-coral-glow/30' 
                                                : session.status === 'idle'
                                                ? 'bg-pacific-blue/20 text-pacific-blue border-pacific-blue/30'
                                                : 'bg-destructive/20 text-destructive border-destructive/30'
                                            }`}
                                          >
                                            {session.status}
                                          </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                          <span className="text-coral-glow font-semibold">{session.duration}s</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                          {session.startTime.toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                          {session.capabilities.resolution}
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="flex items-center space-x-1">
                                            {session.capabilities.enableVNC && (
                                              <Badge variant="outline" className="text-xs bg-pacific-cyan/10 border-pacific-cyan/30 text-pacific-cyan">
                                                VNC
                                              </Badge>
                                            )}
                                            {session.capabilities.enableVideo && (
                                              <Badge variant="outline" className="text-xs bg-pacific-blue/10 border-pacific-blue/30 text-pacific-blue">
                                                Video
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="flex items-center space-x-2">
                                            {session.status === 'running' && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => pauseSession(session.id)}
                                                  className="h-8 px-3 text-xs border-pacific-blue/30 hover:bg-pacific-blue/10"
                                                  title="Pause session"
                                                >
                                                  <Pause className="h-3 w-3 mr-1" />
                                                  Pause
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => stopSession(session.id)}
                                                  className="h-8 px-3 text-xs"
                                                  title="Stop session"
                                                >
                                                  <Square className="h-3 w-3 mr-1" />
                                                  Stop
                                                </Button>
                                              </>
                                            )}
                                            {session.status === 'idle' && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => pauseSession(session.id)}
                                                  className="h-8 px-3 text-xs border-pacific-blue/30 hover:bg-pacific-blue/10"
                                                  title="Resume session"
                                                >
                                                  <Play className="h-3 w-3 mr-1" />
                                                  Resume
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => stopSession(session.id)}
                                                  className="h-8 px-3 text-xs"
                                                  title="Stop session"
                                                >
                                                  <Square className="h-3 w-3 mr-1" />
                                                  Stop
                                                </Button>
                                              </>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => viewSession(session.id)}
                                              className="h-8 px-3 text-xs border-coral-glow/30 hover:bg-coral-glow/10 text-coral-glow"
                                              title="View session details"
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              View
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            {filteredSessions.length > 0 && (
                              <div className="border-t border-pacific-blue/20 bg-background/50 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-sm text-muted-foreground">
                                    Showing {startIdx + 1}-{Math.min(endIdx, filteredSessions.length)} of {filteredSessions.length} sessions
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label htmlFor="page-size"  className="text-sm text-muted-foreground">Per page:</label>
                                    <select
                                      id="page-size"
                                      value={pageSize}
                                      onChange={(e) => {
                                        setPageSize(Number(e.target.value))
                                        setCurrentPage(1)
                                      }}
                                      className="bg-background border border-pacific-blue/20 rounded px-2 py-1 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                                    >
                                      <option value={5}>5</option>
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="h-8 px-3 border-pacific-blue/30"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  
                                  <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                      const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4)) + i
                                      return pageNum <= totalPages ? (
                                        <Button
                                          key={pageNum}
                                          size="sm"
                                          variant={pageNum === currentPage ? 'default' : 'outline'}
                                          onClick={() => setCurrentPage(pageNum)}
                                          className={`h-8 w-8 p-0 ${pageNum === currentPage ? 'bg-coral-glow text-pitch-black' : 'border-pacific-blue/30'}`}
                                        >
                                          {pageNum}
                                        </Button>
                                      ) : null
                                    })}
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="h-8 px-3 border-pacific-blue/30"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-coral-glow/30 bg-gradient-to-br from-coral-glow/5 to-transparent">
                      <CardContent className="p-6">
                        <div className="text-sm text-muted-foreground mb-1">Running</div>
                        <div className="text-3xl font-bold text-coral-glow">{sessions.filter(s => s.status === 'running').length}</div>
                        <p className="text-xs text-muted-foreground mt-2">Active sessions</p>
                      </CardContent>
                    </Card>
                    <Card className="border-pacific-cyan/30 bg-gradient-to-br from-pacific-cyan/5 to-transparent">
                      <CardContent className="p-6">
                        <div className="text-sm text-muted-foreground mb-1">Total</div>
                        <div className="text-3xl font-bold text-pacific-cyan">{sessions.length}</div>
                        <p className="text-xs text-muted-foreground mt-2">All sessions</p>
                      </CardContent>
                    </Card>
                    <Card className="border-pacific-blue/30 bg-gradient-to-br from-pacific-blue/5 to-transparent">
                      <CardContent className="p-6">
                        <div className="text-sm text-muted-foreground mb-1">VNC Enabled</div>
                        <div className="text-3xl font-bold text-pacific-blue">{sessions.filter(s => s.capabilities.enableVNC).length}</div>
                        <p className="text-xs text-muted-foreground mt-2">With remote access</p>
                      </CardContent>
                    </Card>
                    <Card className="border-deep-mocha/30 bg-gradient-to-br from-deep-mocha/5 to-transparent">
                      <CardContent className="p-6">
                        <div className="text-sm text-muted-foreground mb-1">Avg Duration</div>
                        <div className="text-3xl font-bold text-foreground">
                          {sessions.length > 0 
                            ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / sessions.length)
                            : 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Seconds</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {selectedTab === 'ultra-fast' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center space-x-2">
                      <Zap className="h-8 w-8 text-yellow-600" />
                      <span>Ultra-Fast Performance</span>
                    </h2>
                    <p className="text-muted-foreground">Blazing fast browser containers with direct CDP control</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-accent/30 bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Startup Time</CardTitle>
                        <Zap className="h-4 w-4 text-accent" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-accent">~200ms</div>
                        <p className="text-xs text-muted-foreground">
                          vs 3-5s standard
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/30 bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <Monitor className="h-4 w-4 text-secondary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-secondary">128MB</div>
                        <p className="text-xs text-muted-foreground">
                          vs 1GB+ standard
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pool Hit Rate</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">95%+</div>
                        <p className="text-xs text-muted-foreground">
                          Instant session reuse
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-accent/30 bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sessions/sec</CardTitle>
                        <Users className="h-4 w-4 text-accent" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-accent">50+</div>
                        <p className="text-xs text-muted-foreground">
                          Concurrent capacity
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-accent" />
                          <span>Performance Comparison</span>
                        </CardTitle>
                        <CardDescription>Ultra-Fast vs Standard Selenium</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <span className="font-medium">Container Startup</span>
                            <div className="text-right">
                              <span className="text-accent font-bold">200ms</span>
                              <span className="text-muted-foreground ml-2">vs 3-5s</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                            <span className="font-medium">Session Creation</span>
                            <div className="text-right">
                              <span className="text-secondary font-bold">50ms</span>
                              <span className="text-muted-foreground ml-2">vs 1-2s</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <span className="font-medium">Memory per Container</span>
                            <div className="text-right">
                              <span className="text-primary font-bold">128MB</span>
                              <span className="text-muted-foreground ml-2">vs 1GB+</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <span className="font-medium">CPU per Container</span>
                            <div className="text-right">
                              <span className="text-accent font-bold">0.25 core</span>
                              <span className="text-muted-foreground ml-2">vs 1+ core</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Settings className="h-5 w-5 text-secondary" />
                          <span>Ultra-Fast Features</span>
                        </CardTitle>
                        <CardDescription>What makes it blazing fast</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Alert className="border-accent/30 bg-accent/5">
                            <AlertDescription className="flex items-center space-x-2">
                              <Zap className="h-4 w-4 text-accent" />
                              <span><strong>Alpine Linux Containers:</strong> Minimal OS footprint (~5MB)</span>
                            </AlertDescription>
                          </Alert>
                          <Alert className="border-secondary/30 bg-secondary/5">
                            <AlertDescription className="flex items-center space-x-2">
                              <Zap className="h-4 w-4 text-secondary" />
                              <span><strong>Direct CDP Control:</strong> Bypass Selenium Grid overhead</span>
                            </AlertDescription>
                          </Alert>
                          <Alert className="border-primary/30 bg-primary/5">
                            <AlertDescription className="flex items-center space-x-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span><strong>Browser Pooling:</strong> Pre-warmed containers for instant reuse</span>
                            </AlertDescription>
                          </Alert>
                          <Alert className="border-accent/30 bg-accent/5">
                            <AlertDescription className="flex items-center space-x-2">
                              <Zap className="h-4 w-4 text-accent" />
                              <span><strong>Connection Reuse:</strong> Persistent CDP connections</span>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-accent" />
                        <span>Live Performance Metrics</span>
                      </CardTitle>
                      <CardDescription>Real-time ultra-fast pool statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/20">
                          <div className="text-3xl font-bold text-accent">15</div>
                          <div className="text-sm text-muted-foreground">Available in Pool</div>
                        </div>
                        <div className="text-center p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                          <div className="text-3xl font-bold text-secondary">98%</div>
                          <div className="text-sm text-muted-foreground">Pool Efficiency</div>
                        </div>
                        <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-3xl font-bold text-primary">45ms</div>
                          <div className="text-sm text-muted-foreground">Avg Response Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedTab === 'loadbalancer' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Load Balancer Configuration</h2>
                    <p className="text-muted-foreground">Configure load balancing algorithms and node management</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Algorithm Selection</CardTitle>
                        <CardDescription>Choose load balancing strategy</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { value: 'round-robin', label: 'Round Robin', desc: 'Distributes sessions evenly' },
                            { value: 'least-connections', label: 'Least Connections', desc: 'Routes to least busy node' },
                            { value: 'weighted', label: 'Weighted', desc: 'Priority-based distribution' },
                            { value: 'resource-based', label: 'Resource-Based', desc: 'CPU/memory aware routing' },
                            { value: 'geographic', label: 'Geographic', desc: 'Location-based routing' }
                          ].map((algo) => (
                            <div key={algo.value} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <input
                                type="radio"
                                name="algorithm"
                                value={algo.value}
                                checked={loadBalancerConfig.algorithm === algo.value}
                                onChange={(e) => setLoadBalancerConfig(prev => ({ 
                                  ...prev, 
                                  algorithm: e.target.value as any 
                                }))}
                              />
                              <div>
                                <p className="font-medium">{algo.label}</p>
                                <p className="text-sm text-muted-foreground">{algo.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Node Status</CardTitle>
                        <CardDescription>Browser node availability and health</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {['Node-1', 'Node-2', 'Node-3'].map((node, index) => (
                            <div key={node} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${index < 2 ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                  <p className="font-medium">{node}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {index < 2 ? 'Healthy' : 'Unavailable'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">{Math.floor(Math.random() * 10)} sessions</p>
                                <p className="text-xs text-muted-foreground">
                                  {Math.floor(Math.random() * 100)}% CPU
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {selectedTab === 'monitoring' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">System Monitoring</h2>
                    <p className="text-muted-foreground">Real-time metrics and performance monitoring</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                        <CardDescription>Real-time system performance</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>CPU Usage</span>
                              <span>{metrics.cpuUsage.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.cpuUsage} />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Memory Usage</span>
                              <span>{metrics.memoryUsage.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.memoryUsage} />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Network Latency</span>
                              <span>{metrics.networkLatency.toFixed(1)}ms</span>
                            </div>
                            <Progress value={(metrics.networkLatency / 100) * 100} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Alert Configuration</CardTitle>
                        <CardDescription>Configure monitoring alerts</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Alert>
                            <AlertDescription>
                              CPU usage alert configured for &gt;80%
                            </AlertDescription>
                          </Alert>
                          <Alert>
                            <AlertDescription>
                              Memory usage alert configured for &gt; 90%
                            </AlertDescription>
                          </Alert>
                          <Alert>
                            <AlertDescription>
                              Session failure alert configured for &gt; 5%
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {selectedTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Security Configuration</h2>
                    <p className="text-muted-foreground">Manage authentication and authorization settings</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Authentication Settings</CardTitle>
                        <CardDescription>Configure user authentication methods</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>JWT Authentication</span>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Multi-Factor Authentication</span>
                            <Badge variant="default">Enabled</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>SSO Integration</span>
                            <Badge variant="default">Configured</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>API Key Management</span>
                            <Badge variant="secondary">Optional</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Access Control</CardTitle>
                        <CardDescription>Role-based access control (RBAC)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { role: 'Admin', permissions: 'Full access' },
                            { role: 'Developer', permissions: 'Session management' },
                            { role: 'Tester', permissions: 'Session access only' },
                            { role: 'Viewer', permissions: 'Read-only access' }
                          ].map((role) => (
                            <div key={role.role} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{role.role}</p>
                                <p className="text-sm text-muted-foreground">{role.permissions}</p>
                              </div>
                              <Badge variant="outline">{Math.floor(Math.random() * 10)} users</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}


              {selectedTab === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                    <p className="text-muted-foreground">Generate and analyze browser automation performance reports</p>
                  </div>

                  {/* Report Filters */}
                  <Card className="border-pacific-blue/30">
                    <CardHeader className="border-b border-pacific-blue/20">
                      <CardTitle>Report Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label htmlFor="date-range" className="text-sm font-medium text-foreground block mb-2">Date Range</label>
                          <div className="flex items-center space-x-2 bg-background/50 rounded px-3 py-2 border border-pacific-blue/20">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="date-range"
                              type="date"
                              placeholder="Select date range"
                              className="bg-transparent border-0 outline-none text-sm flex-1 p-0"
                              defaultValue={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="report-browser" className="text-sm font-medium text-foreground block mb-2">Browser</label>
                          <select id="report-browser" className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none">
                            <option>All Browsers</option>
                            <option>Chrome</option>
                            <option>Firefox</option>
                            <option>Safari</option>
                            <option>Edge</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="report-status" className="text-sm font-medium text-foreground block mb-2">Status</label>
                          <select id="report-status" className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none">
                            <option>All Status</option>
                            <option>Running</option>
                            <option>Idle</option>
                            <option>Stopped</option>
                            <option>Failed</option>
                          </select>
                        </div>
                        <div className="flex items-end space-x-2">
                          <Button className="flex-1 bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold">
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Report Templates */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Report Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'Performance Summary', desc: 'Overall system performance metrics', color: 'coral-glow' },
                        { name: 'Session Analytics', desc: 'Detailed session usage statistics', color: 'pacific-cyan' },
                        { name: 'Resource Utilization', desc: 'CPU, memory, and network usage', color: 'pacific-blue' },
                        { name: 'Error Report', desc: 'Failed sessions and error analysis', color: 'destructive' },
                        { name: 'User Activity', desc: 'User-wise session breakdown', color: 'coral-glow' },
                        { name: 'SLA Compliance', desc: 'Service level agreement metrics', color: 'pacific-cyan' },
                      ].map((template, i) => (
                        <Card key={i} className={`border-${template.color}/30 hover:border-${template.color}/50 transition-colors cursor-pointer group`}>
                          <CardContent className="p-6">
                            <h4 className="font-semibold mb-1 group-hover:text-coral-glow transition">{template.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">{template.desc}</p>
                            <Button size="sm" variant="outline" className={`w-full text-xs border-${template.color}/30`}>
                              Generate Report
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Avg Session Duration', value: '245s', change: '+12%', trend: 'up', color: 'coral-glow' },
                        { label: 'Success Rate', value: '98.5%', change: '+2.3%', trend: 'up', color: 'pacific-cyan' },
                        { label: 'Peak Concurrency', value: '847', change: '-5%', trend: 'down', color: 'pacific-blue' },
                        { label: 'System Uptime', value: '99.9%', change: '+0.1%', trend: 'up', color: 'deep-mocha' },
                      ].map((kpi, i) => (
                        <Card key={i} className={`border-${kpi.color}/30 bg-gradient-to-br from-${kpi.color}/5 to-transparent`}>
                          <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                            <div className="text-3xl font-bold text-foreground mb-2">{kpi.value}</div>
                            <p className={`text-xs ${kpi.trend === 'up' ? 'text-coral-glow' : 'text-destructive'}`}>
                              {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change} from last week
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Recent Reports */}
                  <Card className="border-pacific-blue/30">
                    <CardHeader className="border-b border-pacific-blue/20">
                      <CardTitle>Recent Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-pacific-blue/20 bg-background/50">
                            <tr>
                              <th className="px-6 py-4 text-left font-semibold">Report Name</th>
                              <th className="px-6 py-4 text-left font-semibold">Type</th>
                              <th className="px-6 py-4 text-left font-semibold">Generated</th>
                              <th className="px-6 py-4 text-left font-semibold">Size</th>
                              <th className="px-6 py-4 text-left font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { name: 'Daily Performance - 2024-12-19', type: 'Performance', date: '12/19 14:32', size: '2.4 MB' },
                              { name: 'Session Analytics - Week 51', type: 'Analytics', date: '12/18 09:15', size: '1.8 MB' },
                              { name: 'Error Analysis - Dec 2024', type: 'Error Report', date: '12/15 16:45', size: '856 KB' },
                              { name: 'Resource Utilization - Dec', type: 'Resource', date: '12/15 08:00', size: '3.1 MB' },
                              { name: 'Monthly SLA Report', type: 'SLA', date: '12/01 00:00', size: '1.2 MB' },
                            ].map((report, i) => (
                              <tr key={i} className={`border-b border-pacific-blue/10 hover:bg-coral-glow/5 transition ${i % 2 === 0 ? 'bg-pitch-black/10' : ''}`}>
                                <td className="px-6 py-4 font-medium">{report.name}</td>
                                <td className="px-6 py-4">
                                  <Badge variant="outline" className="bg-pacific-cyan/10 border-pacific-cyan/30 text-pacific-cyan">
                                    {report.type}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{report.date}</td>
                                <td className="px-6 py-4 text-muted-foreground">{report.size}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-pacific-blue/30 hover:bg-pacific-blue/10">
                                      View
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-coral-glow/30 hover:bg-coral-glow/10">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Export Options */}
                  <Card className="border-pacific-blue/30">
                    <CardHeader className="border-b border-pacific-blue/20">
                      <CardTitle>Export Options</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { format: 'CSV', desc: 'Comma-separated values', icon: '📊' },
                          { format: 'PDF', desc: 'Portable document format', icon: '📄' },
                          { format: 'Excel', desc: 'Microsoft Excel workbook', icon: '📈' },
                          { format: 'JSON', desc: 'JavaScript object notation', icon: '{ }' },
                        ].map((opt, i) => (
                          <Button key={i} variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 border-pacific-blue/30 hover:bg-pacific-blue/10 hover:border-pacific-blue/50">
                            <span className="text-2xl">{opt.icon}</span>
                            <span className="font-semibold">{opt.format}</span>
                            <span className="text-xs text-muted-foreground">{opt.desc}</span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedTab === 'config' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Configuration Management</h2>
                    <p className="text-muted-foreground">System configuration and settings - manage browser, performance, and system parameters</p>
                  </div>

                  {configLoading ? (
                    <Card>
                      <CardContent className="p-12 flex items-center justify-center">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-coral-glow mb-4"></div>
                          <p className="text-muted-foreground">Loading configuration...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Browser Configuration Card */}
                      <Card className="border-pacific-blue/30">
                        <CardHeader>
                          <CardTitle>Browser Configuration</CardTitle>
                          <CardDescription>Default browser settings and capabilities</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-foreground block mb-2">Default Browser</label>
                            <select
                              id="default-browser"
                              value={configState.defaultBrowser}
                              onChange={(e) => setConfigState(prev => ({ ...prev, defaultBrowser: e.target.value }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            >
                              <option value="chrome">Chrome</option>
                              <option value="firefox">Firefox</option>
                              <option value="safari">Safari</option>
                              <option value="edge">Edge</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="max-sessions" className="text-sm font-medium text-foreground block mb-2">
                              Max Concurrent Sessions
                            </label>
                            <input
                              id="max-sessions"
                              type="number"
                              min="1"
                              max="500"
                              value={configState.maxConcurrentSessions}
                              onChange={(e) => setConfigState(prev => ({ ...prev, maxConcurrentSessions: Number(e.target.value) }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Maximum simultaneous browser sessions (1-500)</p>
                          </div>

                          <div>
                            <label htmlFor="session-timeout" className="text-sm font-medium text-foreground block mb-2">
                              Session Timeout (Minutes)
                            </label>
                            <input
                              id="session-timeout"
                              type="number"
                              min="1"
                              max="120"
                              value={configState.sessionTimeoutMinutes}
                              onChange={(e) => setConfigState(prev => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Session inactivity timeout duration</p>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Enable VNC by Default</p>
                              <p className="text-xs text-muted-foreground">Allow remote desktop access on all sessions</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={configState.enableVNCByDefault}
                              onChange={(e) => setConfigState(prev => ({ ...prev, enableVNCByDefault: e.target.checked }))}
                              className="w-5 h-5 rounded cursor-pointer"
                            />
                          </div>

                          <Button
                            onClick={() => saveConfig()}
                            disabled={configSaving}
                            className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold"
                          >
                            {configSaving ? 'Saving...' : 'Save Browser Settings'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* System Settings Card */}
                      <Card className="border-pacific-blue/30">
                        <CardHeader>
                          <CardTitle>System Settings</CardTitle>
                          <CardDescription>Global system configuration</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <label htmlFor="environment" className="text-sm font-medium text-foreground block mb-2">
                              Environment
                            </label>
                            <select
                              id="environment"
                              value={configState.environment}
                              onChange={(e) => setConfigState(prev => ({ ...prev, environment: e.target.value }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            >
                              <option value="development">Development</option>
                              <option value="staging">Staging</option>
                              <option value="production">Production</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="log-level" className="text-sm font-medium text-foreground block mb-2">
                              Log Level
                            </label>
                            <select
                              id="log-level"
                              value={configState.logLevel}
                              onChange={(e) => setConfigState(prev => ({ ...prev, logLevel: e.target.value }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            >
                              <option value="debug">Debug</option>
                              <option value="info">Info</option>
                              <option value="warning">Warning</option>
                              <option value="error">Error</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="log-retention" className="text-sm font-medium text-foreground block mb-2">
                              Log Retention (Days)
                            </label>
                            <input
                              id="log-retention"
                              type="number"
                              min="1"
                              max="365"
                              value={configState.logRetentionDays}
                              onChange={(e) => setConfigState(prev => ({ ...prev, logRetentionDays: Number(e.target.value) }))}
                              className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Metrics Collection</p>
                              <p className="text-xs text-muted-foreground">Track system performance metrics</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={configState.metricsCollectionEnabled}
                              onChange={(e) => setConfigState(prev => ({ ...prev, metricsCollectionEnabled: e.target.checked }))}
                              className="w-5 h-5 rounded cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">Auto-scaling</p>
                              <p className="text-xs text-muted-foreground">Automatically scale resources based on load</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={configState.autoScalingEnabled}
                              onChange={(e) => setConfigState(prev => ({ ...prev, autoScalingEnabled: e.target.checked }))}
                              className="w-5 h-5 rounded cursor-pointer"
                            />
                          </div>

                          <Button
                            onClick={() => saveConfig()}
                            disabled={configSaving}
                            className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold"
                          >
                            {configSaving ? 'Saving...' : 'Save System Settings'}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Performance Settings */}
                  <Card className="border-pacific-blue/30">
                    <CardHeader>
                      <CardTitle>Performance Settings</CardTitle>
                      <CardDescription>Configure browser pool and container parameters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <label htmlFor="pool-prewarm" className="text-sm font-medium text-foreground block mb-2">
                            Pool Prewarm Size
                          </label>
                          <input
                            id="pool-prewarm"
                            type="number"
                            min="0"
                            max="100"
                            value={configState.poolPrewarmSize}
                            onChange={(e) => setConfigState(prev => ({ ...prev, poolPrewarmSize: Number(e.target.value) }))}
                            className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Pre-warmed containers in pool</p>
                        </div>

                        <div>
                          <label htmlFor="max-pool" className="text-sm font-medium text-foreground block mb-2">
                            Max Pool Size
                          </label>
                          <input
                            id="max-pool"
                            type="number"
                            min="1"
                            max="500"
                            value={configState.maxPoolSize}
                            onChange={(e) => setConfigState(prev => ({ ...prev, maxPoolSize: Number(e.target.value) }))}
                            className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Maximum pool size limit</p>
                        </div>

                        <div>
                          <label htmlFor="container-memory" className="text-sm font-medium text-foreground block mb-2">
                            Container Memory (MB)
                          </label>
                          <input
                            id="container-memory"
                            type="number"
                            min="128"
                            max="4096"
                            step="128"
                            value={configState.containerMemoryMB}
                            onChange={(e) => setConfigState(prev => ({ ...prev, containerMemoryMB: Number(e.target.value) }))}
                            className="w-full bg-background border border-pacific-blue/20 rounded px-3 py-2 text-sm outline-none hover:border-pacific-blue/40 focus:border-pacific-blue/60"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Memory per container</p>
                        </div>

                        <div className="flex flex-col justify-end">
                          <Button
                            onClick={() => saveConfig()}
                            disabled={configSaving}
                            className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold"
                          >
                            {configSaving ? 'Saving...' : 'Save Performance'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration Info */}
                  <Card className="border-pacific-blue/30 bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Configuration Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Last Updated</p>
                          <p className="font-semibold text-foreground">
                            {config ? new Date(config.updatedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-semibold text-foreground">
                            {config ? new Date(config.createdAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant="default" className="mt-1">Active</Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Config ID</p>
                          <p className="font-semibold text-foreground text-xs truncate">
                            {config?.id ?? 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <p className="text-muted-foreground">Manage your account settings and preferences</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Section */}
                    <Card className="lg:col-span-2 border-pacific-blue/30">
                      <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="profile-name">Full Name</Label>
                          <Input
                            id="profile-name"
                            type="text"
                            placeholder="John Doe"
                            defaultValue={currentUser?.name || ''}
                            className="border-pacific-blue/30 mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="profile-email">Email</Label>
                          <Input
                            id="profile-email"
                            type="email"
                            placeholder="your@example.com"
                            defaultValue={currentUser?.email || ''}
                            className="border-pacific-blue/30 mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="profile-password">New Password</Label>
                          <Input
                            id="profile-password"
                            type="password"
                            placeholder="Leave blank to keep current password"
                            className="border-pacific-blue/30 mt-1"
                          />
                        </div>
                        <Button className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold">
                          Save Profile Changes
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Account Status */}
                    <Card className="border-pacific-blue/30">
                      <CardHeader>
                        <CardTitle className="text-lg">Account Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-3 bg-background/50 rounded-lg border border-pacific-blue/20">
                          <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                          <p className="text-lg font-semibold text-coral-glow mt-1">Enterprise</p>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg border border-pacific-blue/20">
                          <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                          <p className="text-lg font-semibold mt-1">{new Date().getFullYear()}</p>
                        </div>
                        <Button variant="outline" className="w-full border-pacific-blue/30">
                          View Billing
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Preferences */}
                  <Card className="border-pacific-blue/30">
                    <CardHeader>
                      <CardTitle>Preferences</CardTitle>
                      <CardDescription>Customize your experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive email updates about your account</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Dark Mode</p>
                          <p className="text-xs text-muted-foreground">Use dark theme across the platform</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-background/50 border border-pacific-blue/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded cursor-pointer" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader>
                      <CardTitle className="text-red-500">Danger Zone</CardTitle>
                      <CardDescription>Irreversible actions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10">
                        Delete Account
                      </Button>
                      <p className="text-xs text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Sign In Dialog */}
        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[400px] z-[10000]">
            <DialogHeader>
              <DialogTitle>Sign In</DialogTitle>
              <DialogDescription>
                Enter your credentials to access UFBrowsers Enterprise
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSignIn} className="space-y-4">
              {signInError && (
                <Alert variant="destructive">
                  <AlertDescription>{signInError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={signInLoading}
                  className="border-pacific-blue/30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={signInLoading}
                  className="border-pacific-blue/30"
                />
              </div>
              
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  disabled={signInLoading}
                  className="w-full bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold"
                >
                  {signInLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  disabled={signInLoading}
                  onClick={handleDemoSignIn}
                  className="w-full border-pacific-blue/30 hover:bg-pacific-blue/10"
                >
                  Try Demo Account
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground text-center pt-2">
                <p>Demo credentials:</p>
                <p>Email: demo@example.com | Password: demo123</p>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Session Detail Modal with Video */}
        <Dialog open={showSessionDetailModal} onOpenChange={setShowSessionDetailModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-pitch-black border-pacific-blue/20 z-[10000]">
            <DialogHeader>
              <DialogTitle className="text-coral-glow">Session Details & Video</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedSessionDetail && (
                  <>
                    Browser: <span className="text-foreground font-semibold">{selectedSessionDetail.browser}</span> | 
                    Status: <span className="text-foreground font-semibold">{selectedSessionDetail.status}</span> | 
                    Duration: <span className="text-coral-glow font-semibold">{selectedSessionDetail.duration}s</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {sessionVideoLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-glow mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading session details...</p>
                </div>
              </div>
            ) : selectedSessionDetail ? (
              <div className="space-y-6">
                {/* Video Player Section */}
                <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-coral-glow mb-4">Session Recording</h3>
                  
                  {selectedSessionDetail.status === 'running' ? (
                    <div className="bg-pitch-black rounded aspect-video flex items-center justify-center border border-pacific-blue/20">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-coral-glow/20 mb-4">
                          <div className="h-3 w-3 rounded-full bg-coral-glow animate-pulse"></div>
                        </div>
                        <p className="text-coral-glow font-semibold mb-2">Live Stream</p>
                        <p className="text-xs text-muted-foreground">Real-time video feed</p>
                        <p className="text-xs text-muted-foreground mt-2">Stream URL: /api/sessions/{selectedSessionDetail.id}/stream</p>
                      </div>
                    </div>
                  ) : selectedSessionDetail.status === 'stopped' ? (
                    <div className="bg-pitch-black rounded aspect-video flex items-center justify-center border border-pacific-blue/20">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-pacific-blue/20 mb-4">
                          <Play className="h-6 w-6 text-pacific-blue" />
                        </div>
                        <p className="text-pacific-blue font-semibold mb-2">Recorded Video</p>
                        <p className="text-xs text-muted-foreground">Playback available</p>
                        <p className="text-xs text-muted-foreground mt-2">Video URL: /api/sessions/{selectedSessionDetail.id}/recording</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-pitch-black rounded aspect-video flex items-center justify-center border border-pacific-blue/20">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-pacific-blue/20 mb-4">
                          <Pause className="h-6 w-6 text-pacific-blue" />
                        </div>
                        <p className="text-pacific-blue font-semibold mb-2">Paused Session</p>
                        <p className="text-xs text-muted-foreground">Session is paused</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Session Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Session ID</p>
                    <p className="font-mono text-sm text-foreground break-all">{selectedSessionDetail.id}</p>
                  </div>
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={`${
                      selectedSessionDetail.status === 'running' 
                        ? 'bg-coral-glow/20 text-coral-glow' 
                        : selectedSessionDetail.status === 'stopped'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-pacific-blue/20 text-pacific-blue'
                    }`}>
                      {selectedSessionDetail.status}
                    </Badge>
                  </div>
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Browser</p>
                    <p className="text-sm text-foreground font-semibold">{selectedSessionDetail.browserType}</p>
                  </div>
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm text-coral-glow font-semibold">{selectedSessionDetail.duration}s</p>
                  </div>
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Started</p>
                    <p className="text-xs text-foreground">{new Date(selectedSessionDetail.startTime).toLocaleString()}</p>
                  </div>
                  <div className="bg-background/50 border border-pacific-blue/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSessionDetail.capabilities?.enableVNC && (
                        <Badge variant="outline" className="text-xs bg-pacific-cyan/10 border-pacific-cyan/30 text-pacific-cyan">
                          VNC
                        </Badge>
                      )}
                      {selectedSessionDetail.capabilities?.enableVideo && (
                        <Badge variant="outline" className="text-xs bg-pacific-blue/10 border-pacific-blue/30 text-pacific-blue">
                          Video
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowSessionDetailModal(false)}
                    className="bg-coral-glow hover:bg-coral-glow/90 text-pitch-black font-semibold"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </SidebarProvider>
  )
}