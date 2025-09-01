'use client'
import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react'; 

interface ChatWidgetProps {
  userName?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ userName = "there" }) => {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const query = userInput; 
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setUserInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);


  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([
        { role: 'ai', text: `Hi ${userName} 👋 I'm your friendly AI assistant from IntegraMagna, here to help you with all your creative needs! ` },
      ]);
    }
  };

  return (
    <div className="chat-widget">
      {!open && (
        <button
          onClick={handleOpen}
          className="chat-toggle"
        >
          <MessageCircle size={28} />
        </button>
      )}
      {open && (
        <div className="chat-box">
          <div className="chat-header">
            <h3>AI Assistant</h3>
            <button onClick={() => setOpen(false)} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="chat-body">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="loading">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-footer">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask me anything..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} className="send-btn">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;