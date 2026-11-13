interface StepIndicatorProps {
  currentStep: number; // 0, 1, 2
}

const steps = [
  { label: 'Import', number: 1 },
  { label: 'Preview', number: 2 },
  { label: 'Export', number: 3 },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={step.number} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? 'bg-blue-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCompleted
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 transition-colors ${
                  isCompleted ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
