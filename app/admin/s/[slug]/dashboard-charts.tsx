'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

interface DashboardData {
  survey: {
    id: string
    slug: string
    title: string
  }
  data: Array<{
    questionId: string
    questionSlug: string
    questionText: string
    thirtyDay: {
      counts: Record<string, number>
      total: number
    }
    ninetyDay: {
      counts: Record<string, number>
      total: number
    }
    timeseries: Array<{
      date: string
      data: {
        counts: Record<string, number>
        total: number
        mean?: number
      }
    }>
  }>
  lastUpdated: string
}

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const calculatePercentages = (counts: Record<string, number>) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / total) * 100).toFixed(1)
    }))
  }

  const formatTimeSeries = (timeseries: DashboardData['data'][0]['timeseries']) => {
    return timeseries.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...item.data.counts,
      total: item.data.total
    }))
  }

  const getTimeRangeData = (timeseries: DashboardData['data'][0]['timeseries'], days: number) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return timeseries.filter(item => new Date(item.date) >= cutoff)
  }

  return (
    <div className="space-y-8">
      {data.data.map((question) => {
        const pieData30 = calculatePercentages(question.thirtyDay.counts)
        const pieData90 = calculatePercentages(question.ninetyDay.counts)
        const timeSeriesData30 = formatTimeSeries(getTimeRangeData(question.timeseries, 30))
        const timeSeriesData90 = formatTimeSeries(getTimeRangeData(question.timeseries, 90))

        return (
          <div key={question.questionId} className="space-y-4">
            <h2 className="text-xl font-semibold">{question.questionText}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* 30-day pie chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Last 30 Days</CardTitle>
                  <CardDescription>
                    Total responses: {question.thirtyDay.total}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData30}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData30.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 90-day pie chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Last 90 Days</CardTitle>
                  <CardDescription>
                    Total responses: {question.ninetyDay.total}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData90}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData90.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Time series charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* 30-day time series */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">30-Day Trend</CardTitle>
                  <CardDescription>Daily response distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData30}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(question.thirtyDay.counts).map((option, index) => (
                        <Line
                          key={option}
                          type="monotone"
                          dataKey={option}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 90-day time series */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">90-Day Trend</CardTitle>
                  <CardDescription>Daily response distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData90}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(question.ninetyDay.counts).map((option, index) => (
                        <Line
                          key={option}
                          type="monotone"
                          dataKey={option}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })}
    </div>
  )
}