"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Car, Building2, Shield, Clock, MapPin, RefreshCw } from "lucide-react"

const API_BASE = 'http://localhost:8000'

interface AlertItem {
  id: number
  title: string
  summary: string
  type?: string
  severity?: string
  timestamp: string
  location?: string
  topics?: string[]
}

interface DatabaseAlert {
  id: number
  timestamp: string
  content: string
  alert_type: string
  is_major: boolean | number
  is_active: boolean | number
}

// Fallback mock data based on actual database structure - for when API is unavailable
const mockData: {
  commuter: AlertItem[],
  city: AlertItem[],
  police: AlertItem[]
} = {
  commuter: [
    {
      id: 2,
      title: "Dumbarton Bridge Wind Advisory",
      summary: "High winds affecting both eastbound and westbound lanes of CA-84 at the Dumbarton Bridge midspan in Fremont. Some lanes are closed. The advisory has been active since June 21, still in effect today.",
      type: "traffic",
      severity: "major",
      timestamp: "2025-06-22T03:07Z",
      location: "CA-84 Dumbarton Bridge",
    },
    {
      id: 1,
      title: "BART Track Replacement",
      summary: "BART will replace decades-old track components between Walnut Creek and Concord stations. As a result, free buses will replace train service between the two stations on June 21–22.",
      type: "transit",
      severity: "minor",
      timestamp: "Jun 21, 22:29",
      location: "Walnut Creek to Concord",
    },
  ],
  city: [],
  police: [
    {
      id: 5,
      title: "Fatal Traffic Collision Investigation",
      summary: "A 79-year-old Fremont resident died several hours after a solo vehicle crash in the 40500 block of Albrae Street, February 24 at approximately 6:40 p.m.",
      type: "police_report",
      severity: "minor",
      timestamp: "February 26, 2025",
      location: "40500 block of Albrae Street",
    },
  ],
}

export default function MyCityPortal() {
  const [activeTab, setActiveTab] = useState("commuter")
  const [data, setData] = useState(mockData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    fetchAllData()
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Test if backend is available
      const typesResponse = await fetch(`${API_BASE}/api/alerts/types`)
      if (!typesResponse.ok) throw new Error('Backend unavailable')

      setIsOnline(true)

      // Fetch all alert types
      const alertTypes = await typesResponse.json()
      console.log('Available alert types:', alertTypes)

      const newData: {
        commuter: AlertItem[],
        city: AlertItem[],
        police: AlertItem[]
      } = {
        commuter: [],
        city: [],
        police: []
      }

      // Fetch alerts for each type
      for (const type of alertTypes) {
        try {
          const response = await fetch(`${API_BASE}/api/alerts?alert_type=${type}`)
          if (response.ok) {
            const alerts = await response.json()

            // Transform backend data to match frontend structure
            const transformedAlerts = transformAlertsForType(alerts)

            // Categorize alerts
            if (type === 'traffic' || type === 'transit') {
              newData.commuter.push(...transformedAlerts)
            } else if (type === 'city_council') {
              newData.city.push(...transformedAlerts)
            } else if (type === 'police_report') {
              newData.police.push(...transformedAlerts)
            }
          }
        } catch (err) {
          console.error(`Error fetching ${type} alerts:`, err)
        }
      }

      // If we got data from the API, use it
      if (newData.commuter.length > 0 || newData.city.length > 0 || newData.police.length > 0) {
        setData(newData)
        setError(null)
      } else {
        // Fallback to mock data if no real data
        setData(mockData)
        setError('No alerts from API - showing demo data')
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setIsOnline(false)
      setData(mockData)
      setError('Backend unavailable - showing demo data')
    } finally {
      setLoading(false)
    }
  }

  const transformAlertsForType = (alerts: DatabaseAlert[]): AlertItem[] => {
    if (!Array.isArray(alerts)) {
      // If single alert object, wrap in array
      alerts = [alerts]
    }

    return alerts.map(alert => ({
      id: alert.id,
      title: generateTitleFromContent(alert.content),
      summary: alert.content,
      type: alert.alert_type,
      severity: alert.is_major ? 'major' : 'minor',
      timestamp: formatTimestamp(alert.timestamp),
      location: extractLocationFromContent(alert.content),
      topics: []
    }))
  }

  const generateTitleFromContent = (content: string): string => {
    // For better titles, look for meaningful sentence breaks
    const sentences = content.split('. ')
    
    // Take the first complete sentence
    let title = sentences[0]
    
    // If the first sentence is too short and there's a second one, combine them
    if (title.length < 40 && sentences.length > 1) {
      title = sentences[0] + '. ' + sentences[1]
    }
    
    // Ensure proper sentence ending
    if (!title.endsWith('.') && !title.endsWith('!') && !title.endsWith('?')) {
      title += '.'
    }
    
    // Cap at reasonable length
    if (title.length > 120) {
      title = title.substring(0, 117) + '...'
    }
    
    return title
  }

  const extractLocationFromContent = (content: string): string => {
    // Basic location extraction - look for common patterns
    const locationPatterns = [
      /at (\d+[^,.\n]*)/i,
      /near ([^,.\n]*)/i,
      /on ([A-Z][^,.\n]*(?:Street|Boulevard|Avenue|Road|Highway))/i,
      /in the ([^,.\n]* block)/i
    ]
    
    for (const pattern of locationPatterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return 'Location not specified'
  }

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return 'Recently'

    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      } else {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return `${Math.max(1, diffMins)} minute${diffMins > 1 ? 's' : ''} ago`
      }
    } catch {
      return 'Recently'
    }
  }

  const getSeverityIcon = (severity?: string) => {
    if (severity === "major") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "traffic":
        return <Car className="h-4 w-4 text-blue-500" />
      case "transit":
        return <MapPin className="h-4 w-4 text-green-500" />
      case "police_report":
        return <Shield className="h-4 w-4 text-red-500" />
      case "city_council":
        return <Building2 className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const handleRefresh = () => {
    fetchAllData()
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-center relative">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">MyCity Fremont: Local Updates</h1>
            <p className="text-sm text-gray-600">Fremont, CA</p>
          </div>
          <div className="absolute right-0 flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-xs text-gray-500">{isOnline ? 'Live' : 'Demo'}</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-center">
            <Badge variant="outline" className="text-xs text-yellow-700 bg-yellow-50">
              {error}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-green-50">
            <TabsTrigger
              value="commuter"
              className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
            >
              <Car className="h-4 w-4" />
              Commuter
            </TabsTrigger>
            <TabsTrigger
              value="city"
              className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
            >
              <Building2 className="h-4 w-4" />
              City
            </TabsTrigger>
            <TabsTrigger
              value="police"
              className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
            >
              <Shield className="h-4 w-4" />
              Police
            </TabsTrigger>
          </TabsList>

          <TabsContent value="commuter" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Traffic & Transit Updates</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {data.commuter.length} alerts
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4">
                {loading && data.commuter.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-500 mb-2" />
                    <p className="text-gray-500">Loading traffic updates...</p>
                  </div>
                ) : data.commuter.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No traffic alerts at this time</p>
                  </div>
                ) : (
                  data.commuter.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-green-400">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            {getSeverityIcon(item.severity)}
                          </div>
                          <span className="text-xs text-gray-500">{item.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{item.summary}</CardDescription>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="city" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">City Council Updates</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {data.city.length} updates
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4">
                {loading && data.city.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-500 mb-2" />
                    <p className="text-gray-500">Loading city updates...</p>
                  </div>
                ) : data.city.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No city council updates at this time</p>
                  </div>
                ) : (
                  data.city.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <span className="text-xs text-gray-500">{item.timestamp}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed mb-3">{item.summary}</CardDescription>
                        {item.topics && item.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.topics.map((topic, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="police" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Police Updates</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {data.police.length} updates
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4">
                {loading && data.police.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-500 mb-2" />
                    <p className="text-gray-500">Loading police updates...</p>
                  </div>
                ) : data.police.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No police updates at this time</p>
                  </div>
                ) : (
                  data.police.map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-green-600">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            {getSeverityIcon(item.severity)}
                          </div>
                          <span className="text-xs text-gray-500">{item.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{item.summary}</CardDescription>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}