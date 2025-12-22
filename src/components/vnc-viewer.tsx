'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Minimize2, RefreshCw, MonitorStop } from 'lucide-react';

interface VncViewerProps {
  sessionId: string;
  vncUrl?: string;
  onClose?: () => void;
}

export function VncViewer({ sessionId, vncUrl, onClose }: VncViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!vncUrl) {
      setError('VNC URL not provided');
      return;
    }

    // In production, use noVNC library for full VNC client
    // For now, show placeholder with connection info
    connectToVnc();

    return () => {
      disconnectVnc();
    };
  }, [vncUrl, sessionId]);

  const connectToVnc = async () => {
    try {
      setError(null);
      
      // Fetch VNC connection details
      const response = await fetch(`/api/sessions/${sessionId}/vnc`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to VNC');
      }

      // In production, initialize noVNC RFB client here
      // Example (requires noVNC library):
      // const rfb = new RFB(canvasRef.current, data.wsUrl);
      // rfb.addEventListener('connect', () => setConnected(true));
      // rfb.addEventListener('disconnect', () => setConnected(false));
      
      setConnected(true);
      console.log('VNC connection info:', data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMsg);
      console.error('VNC connection error:', err);
    }
  };

  const disconnectVnc = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  const handleReconnect = () => {
    disconnectVnc();
    connectToVnc();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <MonitorStop className="h-5 w-5" />
          Live Browser View
          {connected && (
            <Badge variant="default" className="ml-2">
              Connected
            </Badge>
          )}
          {!connected && !error && (
            <Badge variant="secondary" className="ml-2">
              Connecting...
            </Badge>
          )}
          {error && (
            <Badge variant="destructive" className="ml-2">
              Disconnected
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={!error}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reconnect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button variant="destructive" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <MonitorStop className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <p className="text-lg font-semibold mb-2">VNC Connection Error</p>
                <p className="text-sm text-gray-400 mb-4">{error}</p>
                <Button onClick={handleReconnect} variant="secondary">
                  Try Again
                </Button>
              </div>
            </div>
          ) : !connected ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Connecting to browser...</p>
                <p className="text-sm text-gray-400 mt-2">Session: {sessionId}</p>
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-md">
                <p className="text-xs text-white">
                  Session: {sessionId.slice(0, 8)}...
                </p>
              </div>
              {vncUrl && (
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-md">
                  <p className="text-xs text-white font-mono">
                    {vncUrl}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>VNC Live Viewing:</strong> Watch your browser session in real-time. 
            Use this to debug test scripts, inspect UI elements, or monitor test execution.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Note:</strong> VNC requires the browser containers to be built with VNC support. 
            Use <code className="bg-background px-1 rounded">chrome-alpine-vnc</code> or{' '}
            <code className="bg-background px-1 rounded">firefox-alpine-vnc</code> images.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
