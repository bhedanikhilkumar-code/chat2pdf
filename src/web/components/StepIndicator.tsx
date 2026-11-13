import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const steps = [
  { label: 'Import', number: 1 },
  { label: 'Preview', number: 2 },
  { label: 'Export', number: 3 },
];

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = onStepClick && isCompleted;

        return (
          <div key={step.number} className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(index)}
              className={`flex items-center gap-2 group transition-all ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.number}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : isCompleted
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 transition-colors ${
                  isCompleted ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
