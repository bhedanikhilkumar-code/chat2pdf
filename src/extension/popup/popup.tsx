import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to extract');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentHost, setCurrentHost] = useState<string>('');

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentHost(url.hostname.replace(/^www\./, ''));
          } catch (e) {}
        }
      });
    }
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setStatus('Extracting messages from page...');

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

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_CHAT' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('Cannot extract: Please make sure you are on a supported AI chat page.');
          setLoading(false);
          return;
        }

        if (response?.success && response.data) {
          const { messages, title, source } = response.data;
          if (!messages || messages.length === 0) {
            setStatus('No conversation messages detected on this page.');
            setLoading(false);
            return;
          }

          setStatus(`Found ${messages.length} messages! Opening exporter...`);

          // Store in chrome.storage.local
          chrome.storage.local.set(
            {
              chat2pdf_extracted_data: {
                messages,
                title,
                source,
              },
            },
            () => {
              // Open web app page
              const webAppUrl = chrome.runtime.getURL('web/index.html?source=extension');
              chrome.tabs.create({ url: webAppUrl });
              setLoading(false);
            }
          );
        } else {
          setStatus(response?.error || 'Failed to extract messages.');
          setLoading(false);
        }
      });
    } catch (err: any) {
      setStatus('Failed: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
          Chat2PDF
        </h2>
      </div>

      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
        Directly export your active conversation into PDF, Slides, Word, Markdown, or Handwritten notes.
      </p>

      {currentHost && (
        <div
          style={{
            marginBottom: '12px',
            padding: '6px 10px',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#1d4ed8',
            display: 'inline-block',
          }}
        >
          Active Site: <strong>{currentHost}</strong>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: loading ? '#93c5fd' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span>📥</span>
        <span>{loading ? 'Extracting...' : 'Export this chat'}</span>
      </button>

      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          color: status.includes('Error') || status.includes('Cannot') || status.includes('No conversation') ? '#dc2626' : '#4b5563',
          textAlign: 'center',
          minHeight: '16px',
        }}
      >
        {status}
      </div>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<Popup />);
}
