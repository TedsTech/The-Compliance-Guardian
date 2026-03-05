import { useEffect, useRef } from 'react'
import './ReasoningFeed.css'

// Regex that matches bare https?:// URLs inside a message string
const URL_RE = /(https?:\/\/[^\s]+)/g
const IS_URL  = /^https?:\/\//   // non-global, safe to use inside .map()

/**
 * Render a message string, turning any URL into a clickable <a> tag.
 */
function MessageWithLinks({ text }) {
  const parts = text.split(URL_RE)
  return (
    <span className="message">
      {parts.map((part, i) =>
        IS_URL.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
               className="feed-link">{part}</a>
          : part
      )}
    </span>
  )
}

export default function ReasoningFeed({ logs, onTriggerAnalysis, loading }) {
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="reasoning-feed">
      <h2>AI Reasoning Feed</h2>
      <div className="feed-container" ref={feedRef}>
        {logs.map((log, idx) => (
          <div key={idx} className="log-entry">
            <span className="timestamp">{log.timestamp}</span>
            <MessageWithLinks text={log.message} />
          </div>
        ))}
        {loading && (
          <div className="log-entry loading">
            <span className="message">⏳ Analyzing...</span>
          </div>
        )}
      </div>
      <button 
        className="btn-ai-analysis"
        onClick={onTriggerAnalysis}
        disabled={loading}
      >
        🤖 Run AI Analysis
      </button>
    </div>
  )
}
