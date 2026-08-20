import { Link } from 'react-router-dom'
import { Card, CardHeader, Badge, Button } from '../components/ui'
import { BottomTabBar } from '../layouts/BottomTabBar'

// Placeholder stats for the shell
const stats = [
  { label: 'Complaints Filed', value: '12', icon: '📋', trend: '+2 this week' },
  { label: 'In Progress', value: '4', icon: '⚙️', trend: 'Active' },
  { label: 'Resolved', value: '7', icon: '✅', trend: '58% resolution rate' },
]

const recentComplaints = [
  {
    id: 'CMP-001',
    title: 'Broken street light on MG Road',
    category: 'Street Lighting',
    status: 'in_progress' as const,
    date: 'Aug 18, 2026',
  },
  {
    id: 'CMP-002',
    title: 'Pothole near Civic Center junction',
    category: 'Road Maintenance',
    status: 'resolved' as const,
    date: 'Aug 15, 2026',
  },
  {
    id: 'CMP-003',
    title: 'Overflowing garbage bin at Park Street',
    category: 'Waste Management',
    status: 'open' as const,
    date: 'Aug 20, 2026',
  },
]

export function CitizenPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-gradient-to-r from-primary to-primary-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm font-medium mb-0.5">Good evening 👋</p>
              <h1 className="text-2xl font-bold">Welcome, Citizen</h1>
              <p className="text-primary-200 text-sm mt-1">
                Zone 4 — Ahmedabad Municipal Corporation
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl">
              👤
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur rounded-xl p-3 text-center"
              >
                <div className="text-xl mb-1" aria-hidden="true">{stat.icon}</div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-primary-200 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content — overlaps the header gradient */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 pb-24 space-y-4">
        {/* Quick actions */}
        <Card hoverable={false}>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Report Issue', icon: '🚨', color: 'bg-red-50 text-danger', to: '/citizen/report' },
              { label: 'Track Status', icon: '📍', color: 'bg-blue-50 text-primary', to: '/citizen/track' },
              { label: 'Pay Bills', icon: '💳', color: 'bg-emerald-50 text-success', to: '#' },
              { label: 'View Services', icon: '🏛️', color: 'bg-amber-50 text-warning', to: '#' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={[
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                  'transition-all duration-200 hover:scale-105 hover:shadow-sm',
                  action.color,
                ].join(' ')}
              >
                <span className="text-2xl" aria-hidden="true">{action.icon}</span>
                <span className="text-xs font-semibold">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent complaints */}
        <Card>
          <CardHeader
            title="Recent Complaints"
            subtitle="Your last 3 submissions"
            action={
              <Button variant="ghost" size="sm">
                View all
              </Button>
            }
          />
          <div className="space-y-3">
            {recentComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{complaint.id}</span>
                    <Badge variant={complaint.status} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-primary transition-colors">
                    {complaint.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {complaint.category} · {complaint.date}
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300 group-hover:text-primary shrink-0 mt-1 transition-colors" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </div>
            ))}
          </div>
        </Card>

        {/* Announcement card */}
        <Card accentColor="primary">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0 text-xl" aria-hidden="true">
              📢
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Ward 12 Water Supply Maintenance
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Water supply will be interrupted from 10 AM–2 PM on Aug 22, 2026 for pipeline maintenance.
              </p>
              <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-primary">
                Read more →
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile bottom nav */}
      <BottomTabBar />
    </div>
  )
}
