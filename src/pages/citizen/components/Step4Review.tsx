import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '../../../components/ui'
import type { ComplaintData } from '../../../types/complaint'
import { supabase } from '../../../lib/supabaseClient'
import { useCitizen } from '../../../context/CitizenContext'
import { useTheme } from '../../../context/ThemeContext'
import toast from 'react-hot-toast'
import { photoError } from '../../../lib/complaintLogic'

interface Step4Props {
  submissionId: string
  data: ComplaintData
  onBack: () => void
}

export function Step4Review({ data, submissionId, onBack }: Step4Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { citizenHash } = useCitizen()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const submitLock = useRef(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    const url = data.photoFile ? URL.createObjectURL(data.photoFile) : null
    setPreviewUrl(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [data.photoFile])

  const handleSubmit = async () => {
    if (submitLock.current) return
    if (!citizenHash) {
      toast.error('Identity verification required. Please go back and verify.')
      return
    }
    submitLock.current = true
    setIsSubmitting(true)
    setError(null)

    try {
      if (!data.photoFile) throw new Error('Add a photo before submitting your complaint.')
      const invalid = photoError(data.photoFile)
      if (invalid) throw new Error(invalid)
      const fileExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[data.photoFile.type]
      const fileName = `complaint_${submissionId}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('complaint-photos').upload(fileName, data.photoFile)
      // A retry uses the same immutable object and request ID.
      if (uploadError && String(uploadError.statusCode) !== '409') {
        throw new Error('Photo upload failed. Please retry. ' + uploadError.message)
      }
      const { data: publicUrlData } = supabase.storage.from('complaint-photos').getPublicUrl(fileName)
      const photo_url = publicUrlData.publicUrl

      // Insert and return this exact complaint's code in one idempotent transaction.
      const { data: code, error: dbError } = await supabase.rpc('submit_complaint', {
        p_id: submissionId, p_hash: citizenHash,
        p_report: {
          description: data.description,
          category: data.category,
          source: data.source,
          lat: data.lat,
          lng: data.lng,
          address: data.address,
          photo_url,
        },
      })

      if (dbError) throw new Error('Failed to submit complaint. ' + dbError.message)

      if (!code) {
        throw new Error('The tracking code was not received. Retry safely to recover it; your report will not be duplicated.')
      }

      toast.success('Your complaint has been submitted successfully!')
      setSuccessId(code)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      toast.error(err.message || 'Failed to submit complaint.')
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  if (successId) {
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in text-center space-y-6">
        <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
          </svg>
        </div>

        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Complaint Submitted Successfully!</h2>
          <p className={`mt-2 text-sm max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your issue has been reported to the municipal authorities. You can track its progress anytime.
          </p>
        </div>

        <div className={`border rounded-xl p-4 w-full max-w-sm ${isDark ? 'bg-primary-950/50 border-primary-900/50' : 'bg-primary-50 border-primary-200'}`}>
          <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider mb-1">Your Complaint ID</p>
          <p className="text-2xl font-mono font-bold text-primary">{successId}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Save this ID to track your complaint status</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <Link to={`/citizen/track?id=${successId}`} className="block w-full">
            <Button fullWidth size="lg" variant="primary">
              🔍 Track This Complaint
            </Button>
          </Link>
          <Link to="/citizen" className="block w-full">
            <Button fullWidth variant="secondary">
              Report Another Issue
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div role="alert" className={`p-3 text-sm rounded-lg border ${isDark ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-red-50 text-danger border-red-200'}`}>{error}</div>
      )}

      <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Review & Submit</h3>

      <Card noPadding className={`divide-y ${isDark ? '!bg-navy-900 !border-navy-800 divide-navy-800' : 'divide-slate-100'}`}>
        <div className="p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Category & Source</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" size="sm">{data.category}</Badge>
            {data.source === 'voice' && <Badge variant="pending" size="sm" dot={false}>🎙️ Voice Input</Badge>}
          </div>
        </div>
        <div className="p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Description</p>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.description}</p>
        </div>
        <div className="p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Location</p>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data.address || (data.lat !== null && data.lng !== null ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}` : 'Not set')}</p>
        </div>
        {previewUrl && (
          <div className="p-4">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Photo</p>
            <div className={`w-24 h-24 rounded-lg overflow-hidden border shadow-sm ${isDark ? 'border-navy-700' : 'border-slate-200'}`}>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </Card>


      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
        </Button>
      </div>
    </div>
  )
}
