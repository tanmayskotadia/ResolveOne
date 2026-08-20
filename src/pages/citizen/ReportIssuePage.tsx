import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { StepIndicator, type Step } from './components/StepIndicator'
import { Step1Description } from './components/Step1Description'
import { Step2Location } from './components/Step2Location'
import { Step3Photo } from './components/Step3Photo'
import { Step4Review } from './components/Step4Review'
import type { ComplaintData } from '../../types/complaint'
import { useCitizen } from '../../context/CitizenContext'

const STEPS: Step[] = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Photo' },
  { id: 4, label: 'Review' },
]

export function ReportIssuePage() {
  const { isVerified } = useCitizen()
  const [currentStep, setCurrentStep] = useState(1)
  const [complaintData, setComplaintData] = useState<ComplaintData>({
    language: 'English',
    description: '',
    category: '',
    source: 'text',
    lat: null,
    lng: null,
    address: '',
    photoFile: null,
    photoUrl: null,
  })

  // If not verified, redirect to Aadhaar verification first
  if (!isVerified) {
    return <Navigate to="/citizen/verify" replace />
  }

  const updateData = (updates: Partial<ComplaintData>) => {
    setComplaintData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Report an Issue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Help us improve your city by reporting civic problems.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Description data={complaintData} onChange={updateData} onNext={nextStep} />
        )}
        {currentStep === 2 && (
          <Step2Location data={complaintData} onChange={updateData} onNext={nextStep} onBack={prevStep} />
        )}
        {currentStep === 3 && (
          <Step3Photo data={complaintData} onChange={updateData} onNext={nextStep} onBack={prevStep} />
        )}
        {currentStep === 4 && (
          <Step4Review data={complaintData} onBack={prevStep} />
        )}
      </div>
    </div>
  )
}
