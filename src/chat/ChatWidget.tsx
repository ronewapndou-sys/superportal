import { useEffect, useRef, useState } from 'react';
import { ChatIcon, CloseIcon } from '../ui';
import { CheckStatusMessage } from './CheckMessages';
import { useChat } from './ChatContext';
import { FpzBookingForm, FpzBookingList } from './FpzMessages';
import { AdviceMessage, ProductRequestMessage } from './ProductMessages';
import { TicketForm, TicketList } from './TicketMessages';
import './chat.css';

const SUGGESTIONS = ['Log a support ticket', 'What should I add?', 'My support tickets', 'How far are my checks?'];

/** Floating assistant button and panel. `context` is the name of the page being viewed. */
export function ChatWidget({ context }: { context: string }) {
  const { open, setOpen, messages, typing, ask } = useChat();
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.scrim')) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <section className="chat" role="dialog" aria-label="Support assistant">
          <div className="chat-head">
            <div className="chat-id">
              <span className="chat-avatar" aria-hidden="true" />
              <div>
                <div className="chat-title">Support assistant</div>
                <div className="chat-sub">XDS and MIE help, any time</div>
              </div>
            </div>
            <button
              className="icon-btn"
              type="button"
              aria-label="Close assistant"
              onClick={() => {
                setOpen(false);
                fabRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="chat-log" ref={logRef} aria-live="polite">
            <span className="context">Viewing: {context}</span>
            {messages.map((m) =>
              m.kind === 'ticket-form' ? (
                <div key={m.id} className="msg bot wide">
                  <TicketForm messageId={m.id} draft={m.draft} submitted={m.submitted} cancelled={m.cancelled} />
                </div>
              ) : m.kind === 'ticket-list' ? (
                <div key={m.id} className="msg bot wide">
                  <TicketList />
                </div>
              ) : m.kind === 'advice' ? (
                <div key={m.id} className="msg bot wide">
                  <AdviceMessage />
                </div>
              ) : m.kind === 'product-request' ? (
                <div key={m.id} className="msg bot wide">
                  <ProductRequestMessage suite={m.suite} />
                </div>
              ) : m.kind === 'check-status' ? (
                <div key={m.id} className="msg bot wide">
                  <CheckStatusMessage />
                </div>
              ) : m.kind === 'fpz-form' ? (
                <div key={m.id} className="msg bot wide">
                  <FpzBookingForm messageId={m.id} submitted={m.submitted} cancelled={m.cancelled} />
                </div>
              ) : m.kind === 'fpz-list' ? (
                <div key={m.id} className="msg bot wide">
                  <FpzBookingList />
                </div>
              ) : (
                <div key={m.id} className={`msg ${m.from}`}>
                  <div className="who">{m.from === 'user' ? 'You' : 'Assistant'}</div>
                  {m.content}
                </div>
              ),
            )}
            {typing && (
              <div className="msg bot typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" type="button" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
              setDraft('');
            }}
          >
            <input
              ref={inputRef}
              className="field"
              type="text"
              placeholder="Ask a question…"
              aria-label="Message"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn primary" type="submit">
              Send
            </button>
          </form>
          <div className="disclaimer">Guidance only. For account changes, raise a case.</div>
        </section>
      )}
      <button
        ref={fabRef}
        className="chat-fab"
        type="button"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ChatIcon />
      </button>
    </>
  );
}
