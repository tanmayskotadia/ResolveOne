import { useState, useRef, useEffect } from 'react'
import { Card, Button } from '../../../components/ui'
import type { ComplaintData } from '../../../types/complaint'

interface Step3Props {
  data: ComplaintData
  onChange: (updates: Partial<ComplaintData>) => void
  onNext: () => void
  onBack: () => void
}

export function Step3Photo({ data, onChange, onNext, onBack }: Step3Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate local preview URL
  useEffect(() => {
    if (data.photoFile) {
      const objectUrl = URL.createObjectURL(data.photoFile)
      setPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setPreview(null)
    }
  }, [data.photoFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.')
        return
      }
      onChange({ photoFile: file })
    }
  }

  const handleRemove = () => {
    onChange({ photoFile: null })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Add a Photo <span className="text-danger">*</span></h3>
              <p className="text-xs text-slate-500 mt-0.5">Required to proceed.</p>
            </div>
            {preview && (
              <Button variant="ghost" size="sm" onClick={handleRemove} className="text-danger hover:text-red-700 hover:bg-red-50">
                Remove
              </Button>
            )}
          </div>

          <div 
            className={[
              'relative w-full rounded-xl border-2 border-dashed transition-colors',
              preview 
                ? 'border-transparent' 
                : 'border-slate-200 hover:border-primary-300 bg-slate-50 hover:bg-primary-50 cursor-pointer flex flex-col items-center justify-center p-8'
            ].join(' ')}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-sm group">
                <img src={preview} alt="Complaint preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}>
                    Change Photo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700">Tap to upload a photo</span>
                <span className="text-xs text-slate-400 mt-1">JPEG, PNG up to 5MB</span>
              </>
            )}
            
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!preview}>
          Next Step
        </Button>
      </div>
    </div>
  )
}
