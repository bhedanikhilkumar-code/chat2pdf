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
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const { runExport, loading } = useExport();

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const isFromExt = searchParams.get('source') === 'extension';

      if (isFromExt) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['chat2pdf_extracted_data'], (result) => {
            const data = result?.chat2pdf_extracted_data;
            if (data && Array.isArray(data.messages) && data.messages.length > 0) {
              const conv = parseExtracted(
                data.messages,
                data.source || 'extension',
                data.title
              );
              setConversation(conv);
              setCurrentStep(1);
            }
          });
        }

        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem('chat2pdf_extracted_data');
          if (stored) {
            try {
              const parsedData = JSON.parse(stored);
              if (Array.isArray(parsedData.messages) && parsedData.messages.length > 0) {
                const conv = parseExtracted(
                  parsedData.messages,
                  parsedData.source || 'extension',
                  parsedData.title
                );
                setConversation(conv);
                setCurrentStep(1);
                localStorage.removeItem('chat2pdf_extracted_data');
              }
            } catch (err) {}
          }
        }
      }
    } catch (e: any) {
      console.warn('Failed to parse extension payload from storage/URL', e);
      setLoadError(e?.message || 'Error loading conversation data');
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

        {loadError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}

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
