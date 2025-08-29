/**
 * Memory Monitor Component
 * Development tool to monitor Monaco Editor memory usage
 */

import { useState, useEffect } from 'react'
import { memoryManager, formatBytes, getMemoryPressureLevel } from '../../utils/monaco/memoryManager'
import { monacoInstanceManager } from '../../utils/monaco/monacoInstanceManager'

interface MemoryMonitorProps {
  show?: boolean
}

const MemoryMonitor = ({ show = false }: MemoryMonitorProps) => {
  const [memoryStats, setMemoryStats] = useState<any>(null)
  const [instanceStats, setInstanceStats] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!show) return

    const updateStats = () => {
      const memory = memoryManager.getCurrentMemoryStats()
      const instances = monacoInstanceManager.getStats()
      setMemoryStats(memory)
      setInstanceStats(instances)
    }

    // Initial update
    updateStats()

    // Subscribe to memory changes
    const unsubscribe = memoryManager.onMemoryChange(updateStats)

    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [show])

  if (!show || !memoryStats) return null

  const systemMemory = memoryStats.system
  const monacoMemory = memoryStats.monaco
  const systemPressure = systemMemory ? systemMemory.usedJSHeapSize / systemMemory.jsHeapSizeLimit : 0
  const monacoPressure = instanceStats?.memoryPressure || 0

  const systemPressureLevel = getMemoryPressureLevel(systemPressure)
  const monacoPressureLevel = getMemoryPressureLevel(monacoPressure)

  const getPressureColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-lg">
      <div 
        className="p-3 border-b border-gray-200 cursor-pointer bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">Memory Monitor</h3>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs ${getPressureColor(systemPressureLevel)}`}>
              System: {Math.round(systemPressure * 100)}%
            </span>
            <span className={`px-2 py-1 rounded text-xs ${getPressureColor(monacoPressureLevel)}`}>
              Monaco: {Math.round(monacoPressure * 100)}%
            </span>
            <button className="text-gray-500 hover:text-gray-700">
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 max-h-96 overflow-y-auto">
          {/* System Memory */}
          {systemMemory && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">System Memory</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{formatBytes(systemMemory.usedJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{formatBytes(systemMemory.totalJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span>{formatBytes(systemMemory.jsHeapSizeLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pressure:</span>
                  <span className={getPressureColor(systemPressureLevel).split(' ')[0]}>
                    {Math.round(systemPressure * 100)}% ({systemPressureLevel})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trend:</span>
                  <span className={
                    memoryStats.trend === 'increasing' ? 'text-red-600' :
                    memoryStats.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                  }>
                    {memoryStats.trend}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monaco Memory */}
          {instanceStats && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Monaco Memory
                <button 
                  className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  onClick={() => monacoInstanceManager.forceCleanup()}
                >
                  Force Cleanup
                </button>
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{formatBytes(instanceStats.totalMemoryUsage)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span>{formatBytes(instanceStats.memoryLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pressure:</span>
                  <span className={getPressureColor(monacoPressureLevel).split(' ')[0]}>
                    {Math.round(monacoPressure * 100)}% ({monacoPressureLevel})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Instances:</span>
                  <span>{instanceStats.activeInstances}/{instanceStats.totalInstances}</span>
                </div>
              </div>
            </div>
          )}

          {/* Instance Details */}
          {instanceStats?.instances && instanceStats.instances.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Instances</h4>
              <div className="space-y-2">
                {instanceStats.instances.map((instance: any) => (
                  <div key={instance.language} className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{instance.language}</span>
                      <div className="flex gap-2">
                        <span className={`px-1 rounded ${instance.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {instance.active ? 'Active' : 'Idle'}
                        </span>
                        <span>{instance.memoryMB}MB</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Age:</span>
                        <span>{Math.round(instance.age / 1000)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Access Count:</span>
                        <span>{instance.accessCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              <button 
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                onClick={() => {
                  memoryManager.forceCleanup()
                  monacoInstanceManager.forceCleanup()
                }}
              >
                Force Full Cleanup
              </button>
              <button 
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gc) {
                    try {
                      ;(window as any).gc()
                      console.log('Manual GC triggered')
                    } catch (error) {
                      console.warn('GC not available')
                    }
                  }
                }}
              >
                Force GC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemoryMonitor