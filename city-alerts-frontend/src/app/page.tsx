'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface Alert {
  id: number
  timestamp: string
  content: string
  alert_type: string
  is_major: boolean
  is_active: boolean
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [alertTypes, setAlertTypes] = useState<string[]>([])

  const API_BASE = 'http://localhost:8000' // Your FastAPI server

  useEffect(() => {
    fetchAlertTypes()
    fetchAlerts()
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [selectedType])

  const fetchAlertTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/alerts/types`)
      setAlertTypes(response.data)
    } catch (error) {
      console.error('Error fetching alert types:', error)
    }
  }

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const url = selectedType === 'all' 
        ? `${API_BASE}/api/alerts`
        : `${API_BASE}/api/alerts?alert_type=${selectedType}`
      
      const response = await axios.get(url)
      setAlerts(response.data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    const colors = {
      'transit': 'bg-blue-100 text-blue-800 border-blue-200',
      'traffic': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'police_report': 'bg-red-100 text-red-800 border-red-200',
      'city_council': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatAlertType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            City Alerts Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time updates on transportation, traffic, and city services
          </p>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by type:</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {alertTypes.map(type => (
                <option key={type} value={type}>
                  {formatAlertType(type)}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={fetchAlerts}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Alerts</h3>
            <p className="text-3xl font-bold text-blue-600">{alerts.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Major Alerts</h3>
            <p className="text-3xl font-bold text-red-600">
              {alerts.filter(a => a.is_major).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Active Now</h3>
            <p className="text-3xl font-bold text-green-600">
              {alerts.filter(a => a.is_active).length}
            </p>
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading alerts...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No alerts found</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    alert.is_major ? 'border-red-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(alert.alert_type)}`}>
                        {formatAlertType(alert.alert_type)}
                      </span>
                      {alert.is_major && (
                        <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full border border-red-200">
                          MAJOR
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 font-mono">
                      {alert.timestamp}
                    </span>
                  </div>
                  
                  <div className="text-gray-800 leading-relaxed">
                    {alert.content.split('\n').map((line, index) => (
                      <p key={index} className={index > 0 ? 'mt-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}