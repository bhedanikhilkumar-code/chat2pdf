import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Globe, XCircle, AlertTriangle, Copy, Check } from 'lucide-react';

const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentHost, setCurrentHost] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [sanityWarning, setSanityWarning] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [rawErrorDetails, setRawErrorDetails] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const supportedHosts = [
    'chatgpt.com',
    'chat.openai.com',
    'gemini.google.com',
    'claude.ai',
    'perplexity.ai',
    'groq.com',
  ];

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            const host = url.hostname.replace(/^www\./, '');
            setCurrentHost(host);
            const supported = supportedHosts.some((h) => host.includes(h));
            setIsSupported(supported);
            console.log(`[Chat2PDF] Popup initialized for host: ${host} (supported=${supported})`);

            if (tabs[0]?.id && supported) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'EXTRACT_CHAT' }, (res) => {
                if (res?.success && res.data?.messages) {
                  console.log(`[Chat2PDF] Initial DOM message count: ${res.data.messages.length}`);
                  setMessageCount(res.data.messages.length);
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

  const handleExport = async () => {
    setLoading(true);
    setStatus('Loading conversation & scrolling older messages...');
    setSanityWarning(null);
    setFriendlyError(null);
    setRawErrorDetails(null);
    setCopied(false);

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
          const { messages, title, source } = response.data;
          if (!messages || messages.length === 0) {
            console.warn('[Chat2PDF] Received empty message array from extractor');
            setFriendlyError('No conversation detected. Ensure you are on an active chat thread with loaded messages.');
            setRawErrorDetails(`[Chat2PDF Error Details]\nType: Empty Conversation\nHost: ${currentHost}\nTitle: ${title}\nTime: ${new Date().toISOString()}`);
            setLoading(false);
            return;
          }

          setMessageCount(messages.length);
          console.log(`[Chat2PDF] Full chat extracted successfully: ${messages.length} messages`);

          // Sanity check: verify plausible role alternation
          let nonAlternating = 0;
          for (let i = 1; i < messages.length; i++) {
            if (messages[i].role === messages[i - 1].role) nonAlternating++;
          }
          if (messages.length < 2) {
            setSanityWarning('Extracted only 1 message. Older messages may still be loading.');
          } else if (nonAlternating > messages.length * 0.4) {
            setSanityWarning('Unusual message role sequence detected. Some turns may have multiple parts.');
          }

          setStatus(`Successfully extracted ${messages.length} messages! Opening exporter...`);

          chrome.storage.local.set(
            {
              chat2pdf_extracted_data: {
                messages,
                title,
                source,
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

  const handleCopyErrorDetails = () => {
    if (!rawErrorDetails) return;
    try {
      navigator.clipboard.writeText(rawErrorDetails).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = rawErrorDetails;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      console.error('[Chat2PDF] Failed to copy error details', e);
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
    <div style={{ width: '360px', padding: '18px', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icons/icon32.png" alt="Chat2PDF" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Chat2PDF
          </h2>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
          Full-Chat Extraction
        </span>
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
          onClick={handleExport}
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

      {/* Sanity warning if any */}
      {sanityWarning && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            backgroundColor: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          <AlertTriangle style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0 }} />
          <span>{sanityWarning}</span>
        </div>
      )}

      {/* Friendly Error Box with Copy Error Details */}
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
          {rawErrorDetails && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={handleCopyErrorDetails}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: copied ? '#15803d' : '#b91c1c',
                  backgroundColor: '#ffffff',
                  border: copied ? '1px solid #86efac' : '1px solid #fca5a5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                <span>{copied ? 'Copied details!' : 'Copy error details'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Normal Status Message (when not error) */}
      {!friendlyError && status && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            backgroundColor: status.includes('Success') ? '#f0fdf4' : '#f8fafc',
            color: status.includes('Success') ? '#15803d' : '#475569',
            border: status.includes('Success') ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          {status.includes('Success') ? (
            <CheckCircle2 style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0 }} />
          ) : (
            <RefreshCw style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0, animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
          )}
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
