import { useState, useMemo } from 'react'
import { Card, Badge, Input } from '../../../components/ui'
import { shortCode } from '../../citizen/components/ComplaintCard'
import type { ComplaintRow } from '../../../types/complaint'

interface AuthorityComplaintsListProps {
  complaints: ComplaintRow[]
  onSelect: (complaint: ComplaintRow) => void
}

const STATUS_FILTERS = ['All', 'Submitted', 'In Progress', 'Resolved', 'Rejected']
const CATEGORY_FILTERS = ['All', 'Garbage/Waste', 'Road Damage/Potholes', 'Streetlights', 'Water Leakage/Supply', 'Drainage/Sewage', 'Electricity', 'Public Infrastructure', 'Other']

const statusBadgeMap: Record<string, any> = {
  submitted: 'pending',
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  rejected: 'rejected',
}

export function AuthorityComplaintsList({ complaints, onSelect }: AuthorityComplaintsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Search by ID or Description
      const searchMatch = search === '' || 
        shortCode(c.id).toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())

      // Status Filter
      const statusMap: Record<string, string> = {
        'Submitted': 'submitted',
        'In Progress': 'in_progress',
        'Resolved': 'resolved',
        'Rejected': 'rejected'
      }
      const statusMatch = statusFilter === 'All' || c.status === statusMap[statusFilter]

      // Category Filter
      const categoryMatch = categoryFilter === 'All' || c.category === categoryFilter

      return searchMatch && statusMatch && categoryMatch
    })
  }, [complaints, search, statusFilter, categoryFilter])

  return (
    <div className="space-y-4 animate-fade-in">
      <Card noPadding className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-64">
          <Input 
            id="search" 
            placeholder="Search CMP-ID or text..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="rounded-lg border border-slate-200 p-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none flex-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map(f => <option key={f} value={f}>{f} Status</option>)}
          </select>
          <select 
            className="rounded-lg border border-slate-200 p-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none flex-1"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORY_FILTERS.map(f => <option key={f} value={f}>{f === 'All' ? 'All Categories' : f}</option>)}
          </select>
        </div>
      </Card>

      <div className="space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-xl shadow-sm border border-slate-100">
            No complaints found matching the current filters.
          </div>
        ) : (
          filteredComplaints.map(c => (
            <div 
              key={c.id}
              onClick={() => onSelect(c)}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-primary-200 hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {shortCode(c.id)}
                  </span>
                  <Badge variant={statusBadgeMap[c.status] || 'default'} size="sm" />
                  <span className="text-xs font-semibold text-slate-600">{c.category}</span>
                </div>
                
                <p className="text-sm text-slate-700 line-clamp-2 mt-2 leading-relaxed">
                  {c.description}
                </p>

                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                    </svg>
                    {new Date(c.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {c.address && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                        <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">{c.address}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 bg-primary-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
