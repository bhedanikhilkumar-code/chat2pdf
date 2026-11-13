import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import StepIndicator from './components/StepIndicator';
import { InputStep } from './components/InputStep';
import { PreviewStep } from './components/PreviewStep';
import { ExportStep } from './components/ExportStep';
import { useExport } from './hooks/useExport';
import { parseExtracted } from '../core/parser/parseText';
import type { Conversation, FilterMode, ExportOptions } from '../core/parser/types';

export default function App() {
  // StepIndicator uses 0-based indexing: 0 = Import, 1 = Preview, 2 = Export
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const { runExport, loading } = useExport();

  // Check URL query parameters or localStorage for data passed from the Chrome extension
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const isFromExt = searchParams.get('source') === 'extension';

      if (isFromExt) {
        const stored = localStorage.getItem('chatexport_extracted_data');
        if (stored) {
          const parsedData = JSON.parse(stored);
          if (Array.isArray(parsedData.messages) && parsedData.messages.length > 0) {
            const conv = parseExtracted(
              parsedData.messages,
              parsedData.source || 'extension',
              parsedData.title
            );
            setConversation(conv);
            setCurrentStep(1);
            localStorage.removeItem('chatexport_extracted_data');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse extension payload from storage/URL', e);
    }
  }, []);

  const handleParsed = (conv: Conversation) => {
    setConversation(conv);
    setCurrentStep(1);
  };

  const handleExport = async (options: ExportOptions) => {
    if (!conversation) return;
    await runExport(conversation, options);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <StepIndicator currentStep={currentStep} />

        <div className="transition-all duration-200">
          {currentStep === 0 && (
            <InputStep onParsed={handleParsed} />
          )}

          {currentStep === 1 && conversation && (
            <PreviewStep
              conversation={conversation}
              filterMode={filterMode}
              onFilterChange={setFilterMode}
              onBack={() => setCurrentStep(0)}
              onContinue={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && conversation && (
            <ExportStep
              conversation={conversation}
              filterMode={filterMode}
              onBack={() => setCurrentStep(1)}
              onExport={handleExport}
              isExporting={loading}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
