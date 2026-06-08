"use client";

import { useEffect, useRef, useState } from "react";
import { aiApi, ApiError } from "@/lib/api";
import type { AIChatMessage } from "@/lib/types";

const QUICK_QUESTIONS = [
  "Quỹ còn bao nhiêu?",
  "Tuần rồi chơi ngày nào?",
  "Ai sắp hết quỹ?",
];

export function AIBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: "assistant",
      content: "Bạn hỏi mình về quỹ, lịch chơi, số dư hoặc giao dịch nhé.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  async function sendMessage(text = input) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: AIChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await aiApi.chat({
        message: trimmed,
        history: messages.filter((message) => message.content !== messages[0]?.content).slice(-10),
      });
      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.message },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không hỏi AI được");
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-widget">
      {open && (
        <section className="ai-panel" aria-label="Trợ lý AI">
          <div className="ai-head">
            <div>
              <div className="ai-title">Trợ lý quỹ</div>
              <div className="ai-sub">Chỉ hỏi đáp, không ghi dữ liệu</div>
            </div>
            <button
              type="button"
              className="ai-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng trợ lý AI"
            >
              x
            </button>
          </div>

          <div className="ai-messages" ref={messageListRef}>
            {messages.map((message, index) => (
              <div
                className={`ai-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.content}
              </div>
            ))}
            {loading && <div className="ai-message assistant muted">Đang trả lời...</div>}
          </div>

          {messages.length === 1 && (
            <div className="ai-quick">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  type="button"
                  className="ai-chip"
                  key={question}
                  onClick={() => void sendMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {error && <p className="ai-error">{error}</p>}

          <form
            className="ai-form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Hỏi về quỹ hoặc lịch chơi..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Gửi
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="ai-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
      >
        AI
      </button>
    </div>
  );
}
