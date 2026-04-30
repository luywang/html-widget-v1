import { useState } from 'react'
import { agentLogos } from '../shared/agentLogos'
import { contacts, currentUser } from '../data/contacts'
import { Avatar, LinkCard, PrivateDisclaimer } from './common'
import MessageActions from './MessageActions'

// Combine seeded-in-data reactions with the current user's reactions into an
// ordered list of pills. `byMe: true` → purple outline in the UI.
function buildReactionList(baseReactions, myEmojis) {
  const map = new Map()
  for (const r of baseReactions || []) {
    map.set(r.emoji, { emoji: r.emoji, count: r.count, byMe: false })
  }
  for (const emoji of myEmojis) {
    const existing = map.get(emoji)
    if (existing) {
      map.set(emoji, { ...existing, count: existing.count + 1, byMe: true })
    } else {
      map.set(emoji, { emoji, count: 1, byMe: true })
    }
  }
  return [...map.values()]
}

function ThreadReplyBadge({ reply, onClick }) {
  const ids = reply.participantIds || (reply.agentId ? [reply.agentId] : [])
  const participants = ids
    .map((id) => (id === 'me' ? currentUser : contacts.find((c) => c.id === id)))
    .filter(Boolean)
  if (!participants.length) return null
  const label = reply.count === 1 ? '1 reply' : `${reply.count} replies`
  return (
    <button type="button" className="message-thread-replies" onClick={onClick}>
      <span className="message-thread-replies-avatars">
        {participants.map((p, i) => (
          <span
            key={i}
            className="message-thread-replies-avatar"
            style={{ background: p.avatar ? 'transparent' : p.color || '#6264A7' }}
          >
            {p.avatar ? (
              <img src={p.avatar} alt="" />
            ) : p.isAgent ? (
              agentLogos[p.logo](10)
            ) : (
              p.initials
            )}
          </span>
        ))}
      </span>
      <span className="message-thread-replies-label">{label}</span>
    </button>
  )
}

export default function MessageRow({ message, activeContact, onOpenThread }) {
  const isMe = message.senderId === 'me'
  const isMultiParty = activeContact.isGroup || activeContact.isChannel
  const sender = isMe
    ? currentUser
    : isMultiParty
      ? contacts.find(c => c.id === message.senderId)
      : activeContact

  const [myReactions, setMyReactions] = useState(() => new Set())
  const toggleReaction = (emoji) => {
    setMyReactions(prev => {
      const next = new Set(prev)
      if (next.has(emoji)) next.delete(emoji)
      else next.add(emoji)
      return next
    })
  }
  const reactions = buildReactionList(message.reactions, myReactions)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const handleExpandClick = (e) => {
    e.stopPropagation()
    setIsModalOpen(true)
  }

  const [carouselIndex, setCarouselIndex] = useState(0)
  const handleCarouselPrev = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1))
  }
  const handleCarouselNext = (maxIndex) => {
    setCarouselIndex(prev => Math.min(maxIndex, prev + 1))
  }

  return (
    <div
      className={`message-row ${isMe ? 'message-mine' : ''}`}
      data-message-id={message.id}
    >
      {!isMe && (
        <div className="message-avatar-col">
          <Avatar contact={sender} size={32} />
        </div>
      )}
      <div className="message-content-wrap">
        <div className="message-meta">
          {!isMe && <span className="message-sender-name">{sender.name}</span>}
          <span className="message-timestamp">{message.time}</span>
        </div>
        <div className={`message-bubble ${message.isPrivate ? 'message-bubble-private' : ''}`}>
          <MessageActions onReact={toggleReaction} />
          {message.isPrivate && <PrivateDisclaimer />}
          {message.forwardedFrom && (
            <div className="forwarded-message">
              <div className="forwarded-sender">{message.forwardedFrom.sender}</div>
              <div className="forwarded-text">{message.forwardedFrom.text}</div>
            </div>
          )}
          {message.subject && <div className="message-subject">{message.subject}</div>}
          {Array.isArray(message.text)
            ? message.text.map((part, i) =>
                typeof part === 'string' ? part : <span key={i} className="mention">{part.name}</span>
              )
            : message.text}
          {message.link && <LinkCard link={message.link} />}
          {message.cards && (
            <div className="message-cards">
              {message.cards.map((card, i) => (
                <div key={i} className="adaptive-card" style={{ borderLeftColor: card.accentColor }}>
                  <div className="card-title">{card.title}</div>
                  <div className="card-facts">
                    {card.facts.map((fact, j) => (
                      <span key={j} className="card-fact">
                        <span className="card-fact-label">{fact.label}:</span> {fact.value}
                      </span>
                    ))}
                  </div>
                  {card.actions && (
                    <div className="card-actions">
                      {card.actions.map((action, j) => (
                        <button key={j} className="card-action-btn">{action}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {message.htmlWidget && message.htmlWidget.type === 'video-preview' && (
            <>
              <div className="html-widget video-preview-widget">
                <div className="video-preview-thumbnail">
                  <img src={message.htmlWidget.thumbnail} alt="Course video" />
                  <div className="video-play-overlay">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="24" fill="rgba(255, 255, 255, 0.95)" />
                      <path d="M19 15L33 24L19 33V15Z" fill="#0056D2" />
                    </svg>
                  </div>
                  <div className="video-expand-trigger" onClick={handleExpandClick} />
                </div>
              </div>
              {isModalOpen && (
                <div className="video-modal-overlay" onClick={() => setIsModalOpen(false)}>
                  <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                    <button className="video-modal-close" onClick={() => setIsModalOpen(false)}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <img src={message.htmlWidget.thumbnail} alt="Course video" />
                  </div>
                </div>
              )}
            </>
          )}
          {message.htmlWidget && message.htmlWidget.type === 'course-carousel' && (
            <div className="html-widget course-carousel-widget">
              <div className="carousel-container">
                <div
                  className="carousel-track"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                >
                  {message.htmlWidget.courses.map((course, idx) => (
                    <div key={idx} className="carousel-card">
                      <div className="carousel-card-thumbnail">
                        <img src={course.thumbnail} alt={course.title} />
                      </div>
                      <div className="carousel-card-content">
                        <h4 className="carousel-card-title">{course.title}</h4>
                        <p className="carousel-card-description">{course.description}</p>
                        <span className="carousel-card-provider">{course.provider}</span>
                        <button
                          className="carousel-card-button"
                          onClick={() => window.open('https://www.coursera.org/specializations/data-science-statistics-machine-learning', '_blank')}
                        >
                          Open in Coursera
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {carouselIndex > 0 && (
                  <button className="carousel-nav carousel-nav-prev" onClick={handleCarouselPrev}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4L6 10l6 6" />
                    </svg>
                  </button>
                )}
                {carouselIndex < message.htmlWidget.courses.length - 1 && (
                  <button className="carousel-nav carousel-nav-next" onClick={() => handleCarouselNext(message.htmlWidget.courses.length - 1)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 4l6 6-6 6" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="carousel-dots">
                {message.htmlWidget.courses.map((_, idx) => (
                  <button
                    key={idx}
                    className={`carousel-dot ${idx === carouselIndex ? 'carousel-dot-active' : ''}`}
                    onClick={() => setCarouselIndex(idx)}
                    aria-label={`Go to course ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {reactions.length > 0 && (
          <div className="message-reactions-bar">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={`reaction-pill ${r.byMe ? 'reaction-pill-mine' : ''}`}
                onClick={() => toggleReaction(r.emoji)}
                aria-label={`${r.byMe ? 'Remove' : 'Add'} reaction ${r.emoji}`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {r.count > 1 && <span className="reaction-pill-count">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
        {message.threadReply && (
          <ThreadReplyBadge
            reply={message.threadReply}
            onClick={() => onOpenThread?.(message)}
          />
        )}
      </div>
      {isMe && isMultiParty && (
        <div className="message-avatar-col">
          <Avatar contact={currentUser} size={32} />
        </div>
      )}
    </div>
  )
}
