import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Globe,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  MoreVertical,
  ClipboardCheck,
} from 'lucide-react';

interface CompletenessState {
  status: 'Complete' | 'Possibly incomplete';
  foundCount: number;
  expectedCount: number;
  reason?: string;
}

const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentHost, setCurrentHost] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessState | null>(null);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [rawErrorDetails, setRawErrorDetails] = useState<string | null>(null);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any | null>(null);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  const [copiedError, setCopiedError] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const supportedHosts = [
    'chatgpt.com',
    'chat.openai.com',
    'gemini.google.com',
    'claude.ai',
    'perplexity.ai',
    'groq.com',
    'deepseek.com',
  ];

  const ensureContentScript = async (tabId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'PING' }, async (res) => {
        if (!chrome.runtime.lastError && res?.pong) {
          resolve(true);
          return;
        }
        try {
          if (chrome.scripting && chrome.scripting.executeScript) {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['content/extractor.js'],
            });
            setTimeout(() => resolve(true), 150);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.warn('[Chat2PDF] Dynamic script injection failed', err);
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            const host = url.hostname.replace(/^www\./, '');
            setCurrentHost(host);
            setCurrentPath(url.pathname);
            const supported = supportedHosts.some((h) => host.includes(h));
            setIsSupported(supported);
            console.log(`[Chat2PDF] Popup initialized for host: ${host} (supported=${supported})`);

            if (tabs[0]?.id && supported) {
              await ensureContentScript(tabs[0].id);
              chrome.tabs.sendMessage(tabs[0].id, { action: 'EXTRACT_CHAT' }, (res) => {
                if (res?.success && res.data?.messages) {
                  console.log(`[Chat2PDF] Initial DOM message count: ${res.data.messages.length}`);
                  setMessageCount((prev) => (prev === null ? res.data.messages.length : prev));
                }
              });
            }
          } catch (e) {
            console.warn('[Chat2PDF] Error parsing active tab URL', e);
          }
        }
      });

      // Listen for progressive load updates
      const listener = (msg: any) => {
        if (msg.action === 'EXTRACTION_PROGRESS') {
          console.log(`[Chat2PDF] Progress update: ${msg.count} messages - ${msg.status}`);
          setMessageCount(msg.count);
          setStatus(msg.status);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const copyToClipboard = (text: string, onSuccess: () => void) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
          fallbackCopy(text, onSuccess);
        });
      } else {
        fallbackCopy(text, onSuccess);
      }
    } catch (e) {
      fallbackCopy(text, onSuccess);
    }
  };

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onSuccess();
    } catch (err) {
      console.error('[Chat2PDF] Copy failed', err);
    }
  };

  const handleCopyDiagnostics = () => {
    let reportToCopy = diagnosticsReport;
    if (!reportToCopy) {
      reportToCopy = {
        timestamp: new Date().toISOString(),
        extensionVersion: '1.2.0',
        host: currentHost || 'unknown',
        urlPathShape: currentPath ? currentPath.replace(/[0-9a-f-]{10,}/gi, ':id') : '/',
        pipelineStages: {
          rawNodesFound: messageCount || 0,
          afterRoleClassification: messageCount || 0,
          afterCleaning: messageCount || 0,
          afterDedupe: messageCount || 0,
          afterMerge: messageCount || 0,
          final: messageCount || 0,
        },
        completeness: completeness || {
          status: 'Not evaluated',
          foundCount: messageCount || 0,
          expectedCount: messageCount || 0,
        },
      };
    }

    const jsonStr = JSON.stringify(reportToCopy, null, 2);
    copyToClipboard(jsonStr, () => {
      setCopiedDiag(true);
      setShowMenu(false);
      setTimeout(() => setCopiedDiag(false), 2500);
    });
  };

  const handleCopyErrorDetails = () => {
    if (!rawErrorDetails) return;
    copyToClipboard(rawErrorDetails, () => {
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    });
  };

  const handleExport = async (forceProceed = false) => {
    setLoading(true);
    setStatus('Loading conversation & scrolling older messages...');
    setCompleteness(null);
    setFriendlyError(null);
    setRawErrorDetails(null);
    setCopiedDiag(false);
    setCopiedError(false);

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setFriendlyError('Extension APIs not available in this environment.');
      setRawErrorDetails('chrome.tabs API is undefined');
      setLoading(false);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setFriendlyError('No active browser tab found to export from.');
        setRawErrorDetails('chrome.tabs.query returned no active tab');
        setLoading(false);
        return;
      }

      console.log(`[Chat2PDF] Ensuring content script on tab ${tab.id}`);
      await ensureContentScript(tab.id);

      console.log(`[Chat2PDF] Sending EXTRACT_FULL_CHAT request to tab ${tab.id}`);

      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_FULL_CHAT' }, (response) => {
        if (chrome.runtime.lastError) {
          const raw = chrome.runtime.lastError.message || 'Port disconnected';
          console.error('[Chat2PDF] chrome.runtime.lastError:', raw);
          setFriendlyError('Cannot connect to page. Please refresh the chat page and try again.');
          setRawErrorDetails(`[Chat2PDF Error Details]\nType: Tab Connection Error\nMessage: ${raw}\nHost: ${currentHost}\nTime: ${new Date().toISOString()}`);
          setLoading(false);
          return;
        }

        if (response?.success && response.data) {
          const { messages, title, source, diagnostics, completeness: compReport, diagnosticsReport: diagObj } = response.data;
          const diagStr = diagnostics ? `\nPipeline Diagnostics: ${diagnostics.stageDetails} (elapsed: ${diagnostics.elapsedMs}ms)` : '';

          if (diagObj) {
            setDiagnosticsReport(diagObj);
          }

          if (!messages || messages.length === 0) {
            console.warn('[Chat2PDF] Received empty message array from extractor');
            setFriendlyError('No conversation detected. Ensure you are on an active chat thread with loaded messages.');
            setRawErrorDetails(`[Chat2PDF Error Details]\nType: Empty Conversation\nHost: ${currentHost}\nTitle: ${title}${diagStr}\nTime: ${new Date().toISOString()}`);
            setLoading(false);
            return;
          }

          setMessageCount(messages.length);
          console.log(`[Chat2PDF] Full chat extracted: ${messages.length} messages.${diagStr}`);
          setRawErrorDetails(`[Chat2PDF Pipeline Info]\nHost: ${currentHost}\nExtracted: ${messages.length} messages${diagStr}\nTime: ${new Date().toISOString()}`);

          if (compReport) {
            setCompleteness({
              status: compReport.status,
              foundCount: compReport.foundCount,
              expectedCount: compReport.expectedCount,
              reason: compReport.reason,
            });
          }

          // Check completeness status
          const isIncomplete = compReport?.status === 'Possibly incomplete';

          if (isIncomplete && !forceProceed) {
            setLoading(false);
            setStatus('');
            console.warn(`[Chat2PDF] Extraction flagged as possibly incomplete (${compReport.foundCount}/${compReport.expectedCount})`);
            return;
          }

          // Complete or user forced proceed
          setStatus(`Complete: ${messages.length} messages`);

          chrome.storage.local.set(
            {
              chat2pdf_extracted_data: {
                messages,
                title,
                source,
                themeSnapshot: response.data.themeSnapshot,
                diagnosticsReport: diagObj,
              },
            },
            () => {
              const webAppUrl = chrome.runtime.getURL('web/index.html?source=extension');
              chrome.tabs.create({ url: webAppUrl });
              setLoading(false);
            }
          );
        } else {
          const raw = response?.error || 'Extraction returned falsy success response';
          console.error('[Chat2PDF] Extraction error response:', raw);
          setFriendlyError('Failed to extract chat. The page structure may have changed or the chat is still loading.');
          setRawErrorDetails(`[Chat2PDF Error Details]\nType: Extraction Failure\nMessage: ${raw}\nHost: ${currentHost}\nTime: ${new Date().toISOString()}`);
          setLoading(false);
        }
      });
    } catch (err: any) {
      const raw = err?.stack || err?.message || String(err);
      console.error('[Chat2PDF] Unexpected extraction exception:', raw);
      setFriendlyError('An unexpected error occurred during extraction. Please try refreshing the tab.');
      setRawErrorDetails(`[Chat2PDF Error Details]\nType: Exception Caught\nError: ${raw}\nHost: ${currentHost}\nTime: ${new Date().toISOString()}`);
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'CANCEL_EXTRACTION' });
      }
    }
    setLoading(false);
    setStatus('Extraction cancelled.');
    console.log('[Chat2PDF] Extraction cancelled from popup UI');
  };

  const openStandaloneExporter = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const webAppUrl = chrome.runtime.getURL('web/index.html');
      chrome.tabs.create({ url: webAppUrl });
    }
  };

  return (
    <div style={{ width: '360px', padding: '18px', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icons/icon32.png" alt="Chat2PDF" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Chat2PDF
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            Full-Chat Extraction
          </span>
          {/* Small '...' menu button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                borderRadius: '6px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <MoreVertical style={{ width: '16px', height: '16px' }} />
            </button>
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '24px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '4px',
                  zIndex: 50,
                  width: '150px',
                }}
              >
                <button
                  onClick={handleCopyDiagnostics}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '4px',
                  }}
                >
                  <Copy style={{ width: '12px', height: '12px' }} />
                  <span>Copy diagnostics</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Host Status Card */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          backgroundColor: isSupported ? '#f8fafc' : '#fffbeb',
          border: isSupported ? '1px solid #e2e8f0' : '1px solid #fef3c7',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe style={{ width: '16px', height: '16px', color: isSupported ? '#0284c7' : '#d97706' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
            {currentHost || 'Browser Page'}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: isSupported ? '#059669' : '#d97706', fontWeight: 500 }}>
          {isSupported ? (messageCount !== null ? `${messageCount} messages` : 'Ready') : 'Untested site'}
        </span>
      </div>

      {/* Primary Action Button */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => handleExport(false)}
          disabled={loading}
          style={{
            flex: 1,
            padding: '11px 16px',
            backgroundColor: loading ? '#93c5fd' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {loading ? (
            <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Download style={{ width: '16px', height: '16px' }} />
          )}
          <span>{loading ? 'Collecting...' : 'Export this chat'}</span>
        </button>

        {loading && (
          <button
            onClick={handleCancel}
            style={{
              padding: '11px 14px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <XCircle style={{ width: '15px', height: '15px' }} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Amber: "Possibly incomplete: found N, expected about M. Tap Copy diagnostics" */}
      {completeness?.status === 'Possibly incomplete' && (
        <div
          style={{
            marginTop: '12px',
            padding: '11px 12px',
            borderRadius: '10px',
            fontSize: '11.5px',
            backgroundColor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fcd34d',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#b45309' }}>
                Possibly incomplete: found {completeness.foundCount}, expected about {completeness.expectedCount}.
              </div>
              <div style={{ marginTop: '3px', color: '#78350f', fontSize: '11px' }}>
                {completeness.reason || 'Some earlier chat turns may have been missed by site virtualization.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #fde68a' }}>
            <button
              onClick={handleCopyDiagnostics}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: copiedDiag ? '#15803d' : '#92400e',
                backgroundColor: '#ffffff',
                border: copiedDiag ? '1px solid #86efac' : '1px solid #fcd34d',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {copiedDiag ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
              <span>{copiedDiag ? 'Copied diagnostics!' : 'Tap Copy diagnostics'}</span>
            </button>

            <button
              onClick={() => handleExport(true)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Export anyway
            </button>
          </div>
        </div>
      )}

      {/* Green: "Complete: N messages" */}
      {completeness?.status === 'Complete' && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '11.5px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Complete: {completeness.foundCount} messages</span>
          </div>
          <button
            onClick={handleCopyDiagnostics}
            title="Copy diagnostics for comparison"
            style={{
              background: 'none',
              border: 'none',
              color: '#16a34a',
              fontSize: '10.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'underline',
            }}
          >
            {copiedDiag ? 'Copied!' : 'Copy diagnostics'}
          </button>
        </div>
      )}

      {/* Friendly Error Box with Copy Error Details & Copy diagnostics */}
      {friendlyError && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '11.5px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px' }}>
            <AlertCircle style={{ width: '15px', height: '15px', color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontWeight: 500 }}>{friendlyError}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
            <button
              onClick={handleCopyDiagnostics}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: copiedDiag ? '#15803d' : '#991b1b',
                backgroundColor: '#ffffff',
                border: copiedDiag ? '1px solid #86efac' : '1px solid #fca5a5',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {copiedDiag ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
              <span>{copiedDiag ? 'Copied!' : 'Copy diagnostics'}</span>
            </button>
            {rawErrorDetails && (
              <button
                onClick={handleCopyErrorDetails}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: copiedError ? '#15803d' : '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {copiedError ? <Check style={{ width: '12px', height: '12px' }} /> : <ClipboardCheck style={{ width: '12px', height: '12px' }} />}
                <span>{copiedError ? 'Copied details!' : 'Copy raw error'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress Status Message during active collection */}
      {!friendlyError && !completeness && status && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            backgroundColor: '#f8fafc',
            color: '#475569',
            border: '1px solid #e2e8f0',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          <RefreshCw style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0, animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
          <span>{status}</span>
        </div>
      )}

      {/* Secondary Link to Standalone Exporter */}
      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={openStandaloneExporter}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <span>Open Standalone Exporter</span>
          <ExternalLink style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<Popup />);
}
