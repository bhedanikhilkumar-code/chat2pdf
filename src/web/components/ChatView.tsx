import React from 'react';
import type { Conversation, ChatMessage, PageStyle } from '../../core/parser/types';
import { resolveTheme } from '../../core/theme/resolveTheme';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface ChatViewProps {
  conversation: Conversation;
  messagesOverride?: ChatMessage[];
  pageStyle?: PageStyle;
  className?: string;
  style?: React.CSSProperties;
  maxHeight?: string | number;
  showWatermark?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  messagesOverride,
  pageStyle = 'match',
  className = '',
  style = {},
  maxHeight,
  showWatermark = false,
}) => {
  const resolved = resolveTheme(conversation.themeSnapshot, pageStyle, conversation.source);
  const messages = messagesOverride || conversation.messages;

  const renderContent = (msg: ChatMessage) => {
    if (msg.htmlContent) {
      return { __html: DOMPurify.sanitize(msg.htmlContent) };
    }
    const raw = marked.parse(msg.content, { breaks: true, gfm: true }) as string;
    return { __html: DOMPurify.sanitize(raw) };
  };

  const getSiteDisplayName = (src: string) => {
    switch (src) {
      case 'chatgpt':
        return 'ChatGPT';
      case 'claude':
        return 'Claude';
      case 'gemini':
        return 'Gemini';
      case 'perplexity':
        return 'Perplexity';
      case 'groq':
        return 'Groq';
      default:
        return 'AI Assistant';
    }
  };

  const getAssistantInitial = (src: string) => {
    switch (src) {
      case 'chatgpt':
        return 'GPT';
      case 'claude':
        return 'C';
      case 'gemini':
        return 'G';
      case 'perplexity':
        return 'P';
      case 'groq':
        return 'Gr';
      default:
        return 'AI';
    }
  };

  return (
    <div
      className={`chat-view-container ${className}`}
      style={{
        backgroundColor: resolved.pageBackground,
        color: resolved.textColor,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.6,
        padding: '24px 16px',
        boxSizing: 'border-box',
        maxHeight: maxHeight || undefined,
        overflowY: maxHeight ? 'auto' : undefined,
        position: 'relative',
        ...style,
      }}
    >
      <style>{`
        .chat-view-prose p { margin: 0.5rem 0; }
        .chat-view-prose p:first-child { margin-top: 0; }
        .chat-view-prose p:last-child { margin-bottom: 0; }
        .chat-view-prose h1, .chat-view-prose h2, .chat-view-prose h3 { margin: 1rem 0 0.5rem; font-weight: 700; }
        .chat-view-prose ul, .chat-view-prose ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        .chat-view-prose li { margin: 0.25rem 0; }
        .chat-view-prose pre {
          background-color: ${resolved.codeBlockBackground};
          border: 1px solid ${resolved.borderColor};
          border-radius: 10px;
          padding: 12px 14px;
          margin: 12px 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.45;
          position: relative;
        }
        .chat-view-prose pre[data-lang]::before {
          content: attr(data-lang);
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: ${resolved.mutedText};
          margin-bottom: 8px;
          border-bottom: 1px solid ${resolved.borderColor};
          padding-bottom: 4px;
        }
        .chat-view-prose code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .chat-view-prose table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
          font-size: 13.5px;
        }
        .chat-view-prose th, .chat-view-prose td {
          border: 1px solid ${resolved.borderColor};
          padding: 7px 10px;
          text-align: left;
        }
        .chat-view-prose th {
          background-color: ${resolved.userBubbleBackground};
          font-weight: 600;
        }
        .chat-view-prose blockquote {
          border-left: 3px solid ${resolved.borderColor};
          padding-left: 12px;
          margin: 8px 0;
          color: ${resolved.mutedText};
          font-style: italic;
        }
        .chat-view-prose a {
          color: ${resolved.linkColor};
          text-decoration: underline;
        }
        .chat-view-prose hr {
          border: 0;
          border-top: 1px solid ${resolved.borderColor};
          margin: 16px 0;
        }
      `}</style>

      {/* Centered Conversation Column */}
      <div style={{ maxWidth: '768px', margin: '0 auto', width: '100%' }}>
        {/* Chat Header */}
        {conversation.title && (
          <div
            style={{
              paddingBottom: '16px',
              marginBottom: '24px',
              borderBottom: `1px solid ${resolved.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: resolved.textColor,
                  letterSpacing: '-0.01em',
                }}
              >
                {conversation.title}
              </h2>
              <div style={{ fontSize: '12px', color: resolved.mutedText, marginTop: '2px' }}>
                {getSiteDisplayName(resolved.source)} conversation
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '8px',
                border: `1px solid ${resolved.borderColor}`,
                backgroundColor: resolved.userBubbleBackground,
                color: resolved.textColor,
              }}
            >
              {getSiteDisplayName(resolved.source)}
            </span>
          </div>
        )}

        {/* Message Turns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';

            if (isUser) {
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      backgroundColor: resolved.userBubbleBackground,
                      color: resolved.userBubbleText,
                      padding: '12px 18px',
                      borderRadius: '20px',
                      borderBottomRightRadius: '4px',
                      fontSize: '14.5px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div
                      className="chat-view-prose"
                      dangerouslySetInnerHTML={renderContent(m)}
                    />

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${resolved.borderColor}`,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        {m.attachments.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              backgroundColor: resolved.pageBackground,
                              border: `1px solid ${resolved.borderColor}`,
                              fontSize: '11.5px',
                              color: resolved.textColor,
                            }}
                          >
                            {att.thumbnail ? (
                              <img
                                src={att.thumbnail}
                                alt={att.name}
                                style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : (
                              <span>📎</span>
                            )}
                            <span style={{ fontWeight: 500 }}>{att.name}</span>
                            {att.size && (
                              <span style={{ color: resolved.mutedText, fontSize: '10px' }}>
                                ({att.size})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Assistant Turn
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                }}
              >
                {/* Neutral Avatar & Label */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: resolved.userBubbleBackground,
                      border: `1px solid ${resolved.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: resolved.textColor,
                    }}
                  >
                    {getAssistantInitial(resolved.source)}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: resolved.textColor,
                    }}
                  >
                    {getSiteDisplayName(resolved.source)}
                  </span>
                </div>

                {/* Assistant Content: Flat text spanning the column */}
                <div
                  style={{
                    width: '100%',
                    fontSize: '14.5px',
                    color: resolved.textColor,
                    paddingLeft: '34px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    className="chat-view-prose"
                    dangerouslySetInnerHTML={renderContent(m)}
                  />

                  {/* Assistant Attachments if any */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      {m.attachments.map((att, aIdx) => (
                        <div
                          key={aIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            backgroundColor: resolved.userBubbleBackground,
                            border: `1px solid ${resolved.borderColor}`,
                            fontSize: '11.5px',
                            color: resolved.textColor,
                          }}
                        >
                          {att.thumbnail ? (
                            <img
                              src={att.thumbnail}
                              alt={att.name}
                              style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <span>📎</span>
                          )}
                          <span style={{ fontWeight: 500 }}>{att.name}</span>
                          {att.size && (
                            <span style={{ color: resolved.mutedText, fontSize: '10px' }}>
                              ({att.size})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Watermark */}
        {showWatermark && (
          <div
            style={{
              marginTop: '40px',
              paddingTop: '16px',
              borderTop: `1px solid ${resolved.borderColor}`,
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '11px',
              color: resolved.mutedText,
            }}
          >
            <span>Exported with Chat2PDF • chat2pdf.app</span>
          </div>
        )}
      </div>
    </div>
  );
};
