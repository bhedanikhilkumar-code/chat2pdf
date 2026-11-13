import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Globe, XCircle, AlertTriangle } from 'lucide-react';

const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentHost, setCurrentHost] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [sanityWarning, setSanityWarning] = useState<string | null>(null);

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

            if (tabs[0]?.id && supported) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'EXTRACT_CHAT' }, (res) => {
                if (res?.success && res.data?.messages) {
                  setMessageCount(res.data.messages.length);
                }
              });
            }
          } catch (e) {}
        }
      });

      // Listen for progressive load updates
      const listener = (msg: any) => {
        if (msg.action === 'EXTRACTION_PROGRESS') {
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

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setStatus('Error: Chrome extension APIs not available');
      setLoading(false);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus('Error: No active tab found');
        setLoading(false);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_FULL_CHAT' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('Cannot connect to page. Please refresh the chat page and try again.');
          setLoading(false);
          return;
        }

        if (response?.success && response.data) {
          const { messages, title, source } = response.data;
          if (!messages || messages.length === 0) {
            setStatus('No conversation detected. Ensure you are on an active chat thread.');
            setLoading(false);
            return;
          }

          setMessageCount(messages.length);

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
          setStatus(response?.error || 'Failed to extract messages. Check if the chat has finished loading.');
          setLoading(false);
        }
      });
    } catch (err: any) {
      setStatus('Failed: ' + (err.message || 'Unknown error'));
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

      {/* Status Message */}
      {status && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            backgroundColor: status.includes('Error') || status.includes('Cannot') || status.includes('Failed') ? '#fef2f2' : '#f0fdf4',
            color: status.includes('Error') || status.includes('Cannot') || status.includes('Failed') ? '#dc2626' : '#15803d',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          {status.includes('Error') || status.includes('Cannot') || status.includes('Failed') ? (
            <AlertCircle style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0 }} />
          ) : (
            <CheckCircle2 style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0 }} />
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
