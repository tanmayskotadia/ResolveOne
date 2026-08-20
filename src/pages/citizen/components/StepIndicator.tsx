import { useTheme } from '../../../context/ThemeContext'

export interface Step {
  id: number
  label: string
}

interface StepIndicatorProps {
  currentStep: number
  steps: Step[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 rounded-full ${isDark ? 'bg-navy-800' : 'bg-slate-200'}`} />
        
        {/* Active progress line */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-300" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isActive = step.id === currentStep
          const isCompleted = step.id < currentStep

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-300',
                  isActive ? 'border-primary bg-primary text-white shadow-md' : '',
                  isCompleted ? 'border-primary bg-primary text-white' : '',
                  !isActive && !isCompleted ? (isDark ? 'border-navy-700 bg-navy-900 text-slate-500' : 'border-slate-300 bg-white text-slate-400') : ''
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className={[
                'absolute top-10 text-[10px] font-medium whitespace-nowrap hidden sm:block',
                isActive ? (isDark ? 'text-primary-400' : 'text-primary') : (isDark ? 'text-slate-500' : 'text-slate-500')
              ].join(' ')}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
