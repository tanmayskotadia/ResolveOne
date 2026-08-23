import { useState, useRef } from 'react'
import { Card, Button } from '../../../components/ui'
import { supabase } from '../../../lib/supabaseClient'
import type { ComplaintRow, ComplaintStatus } from '../../../types/complaint'
import toast from 'react-hot-toast'
import { useTheme } from '../../../context/ThemeContext'

interface StatusUpdateControlProps {
  complaint: ComplaintRow
  onStatusUpdated: () => void
}

const AVAILABLE_STATUSES: { value: ComplaintStatus; label: string }[] = [
  { value: 'submitted',  label: 'Submitted'     },
  { value: 'under-review',       label: 'Under Review'  },
  { value: 'in-progress', label: 'In Progress'  },
  { value: 'resolved',   label: 'Resolved'      },
  { value: 'rejected',   label: 'Rejected'      },
]

export function StatusUpdateControl({ complaint, onStatusUpdated }: StatusUpdateControlProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status)
  const [note, setNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpdate = async () => {
    if (newStatus === complaint.status && !note.trim() && !photoFile) {
      return // Nothing to update
    }

    setIsUpdating(true)

    try {
      let resolutionPhotoUrl = complaint.resolution_photo_url

      if (newStatus === 'resolved' && !resolutionPhotoUrl && !photoFile) {
        throw new Error('A completion proof photo is required to mark this complaint as resolved.')
      }

      // Upload photo if resolved and file selected
      if (newStatus === 'resolved' && photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${complaint.id}_${Date.now()}.${fileExt}`
        const filePath = `resolution_${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('complaint-resolution-photos')
          .upload(filePath, photoFile)

        if (uploadError) {
          throw new Error('Failed to upload resolution photo: ' + uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('complaint-resolution-photos')
          .getPublicUrl(filePath)
          
        resolutionPhotoUrl = publicUrl
      }

      // 1. Update complaint status if changed or photo added
      if (newStatus !== complaint.status || resolutionPhotoUrl !== complaint.resolution_photo_url) {
        const updatePayload: Partial<ComplaintRow> = {
          status: newStatus,
          updated_at: new Date().toISOString()
        }
        if (resolutionPhotoUrl !== complaint.resolution_photo_url) {
          updatePayload.resolution_photo_url = resolutionPhotoUrl
        }

        const { error: updateError } = await supabase
          .from('complaints')
          .update(updatePayload)
          .eq('id', complaint.id)

        if (updateError) throw new Error('Failed to update complaint status: ' + updateError.message)
      }

      // 2. Insert history row (always insert if we clicked update, even if status is same but note is new)
      if (newStatus !== complaint.status || note.trim() || photoFile) {
        const { error: historyError } = await supabase
          .from('status_history')
          .insert({
            complaint_id: complaint.id,
            status: newStatus,
            note: note.trim() || null,
            changed_by: null // DEMO MODE: No Supabase user context
          })

        if (historyError) throw new Error('Failed to add history entry: ' + historyError.message)
      }

      setNote('')
      setPhotoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      toast.success('Status updated successfully')
      onStatusUpdated() // Trigger parent refresh
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'An error occurred while updating.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className={`${isDark ? 'bg-navy-950/50 border-navy-800' : 'bg-slate-50 border-slate-200'}`}>
      <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Update Status</h3>

      <div className="space-y-4">
        <div>
          <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>New Status</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_STATUSES.map(s => {
              const isSelected = newStatus === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => setNewStatus(s.value)}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border',
                    isSelected 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : (isDark ? 'bg-navy-900 text-slate-400 border-navy-700 hover:border-primary-400 hover:text-primary-400' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary')
                  ].join(' ')}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {newStatus === 'resolved' && (
          <div className="animate-fade-in">
            <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              Completion Proof Photo (Required for Resolution)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPhotoFile(file)
                  else setPhotoFile(null)
                }}
                className={`block w-full text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-xs file:font-semibold
                  ${isDark ? 'file:bg-primary-900/30 file:text-primary-300 hover:file:bg-primary-900/50' : 'file:bg-primary-50 file:text-primary hover:file:bg-primary-100'} cursor-pointer`}
              />
            </div>
            {complaint.resolution_photo_url && !photoFile && (
              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>A photo has already been uploaded for this resolution.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="note" className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            Add a Note (Optional)
          </label>
          <textarea
            id="note"
            rows={2}
            className={`w-full rounded-lg border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${isDark ? 'bg-navy-900 border-navy-700 text-white placeholder:text-navy-500' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
            placeholder="e.g., Assigned to maintenance crew..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            size="sm" 
            onClick={handleUpdate} 
            loading={isUpdating}
            disabled={(newStatus === complaint.status && !note.trim() && !photoFile) || (newStatus === 'resolved' && !complaint.resolution_photo_url && !photoFile)}
          >
            Save Update
          </Button>
        </div>
      </div>
    </Card>
  )
}
