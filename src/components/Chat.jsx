import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaSearch, FaCopy } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function CodeBlock({ code }) {
    const copyToClipboard = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code)
            .then(() => {
              toast.success("Código copiado!", { autoClose: 2000 });
            })
            .catch((error) => {
              console.error("Erro ao copiar para a área de transferência:", error);
              toast.error("Erro ao copiar o código. Por favor, tente novamente.");
            });
        } else {
          // Fallback para navegadores que não suportam navigator.clipboard
          console.error("A API navigator.clipboard não é suportada neste navegador.");
          toast.error("Não foi possível copiar o código. Tente novamente ou utilize Ctrl+C.");
        }
      };

  return (
    <div style={styles.codeBlock}>
      <pre style={styles.pre}>{code}</pre>
      <button style={styles.copyButton} onClick={copyToClipboard}>
        <FaCopy />
      </button>
    </div>
  );
}

function renderMessageContent(msg) {
  // Regex para encontrar trechos de código markdown (``` ... ```)
  const codeRegex = /```([\s\S]*?)```/g;
  let match;
  const parts = [];
  let lastIndex = 0;

  while ((match = codeRegex.exec(msg.content)) !== null) {
    if (match.index > lastIndex) {
      // Trecho de texto comum (fora do bloco de código)
      parts.push({
        type: "text",
        content: msg.content.slice(lastIndex, match.index),
      });
    }
    // Trecho de código (dentro de ```...```)
    parts.push({ type: "code", content: match[1] });
    lastIndex = codeRegex.lastIndex;
  }

  // Se ainda sobrou texto após o último bloco de código
  if (lastIndex < msg.content.length) {
    parts.push({
      type: "text",
      content: msg.content.slice(lastIndex),
    });
  }

  // Renderizar cada parte
  return parts.map((part, i) => {
    if (part.type === "text") {
      // Substituir quebras de linha por <br/> para criar espaçamento/ parágrafos
      const withLineBreaks = part.content
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\n\n+/g, "\n\n") // normalizar parágrafos
        .split("\n\n")
        .map((paragraph, idx) => (
          <p key={`p-${idx}`} style={{ marginBottom: "8px" }}>
            {paragraph.split("\n").map((line, lineIdx) => (
              <React.Fragment key={`line-${lineIdx}`}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
        ));

      return <React.Fragment key={i}>{withLineBreaks}</React.Fragment>;
    } else {
      return <CodeBlock key={i} code={part.content} />;
    }
  });
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const typeWriterEffect = (fullText, callback) => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      callback(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 3);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = inputValue.trim();
    const timestamp = new Date().toLocaleString();
    setInputValue("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, time: timestamp },
    ]);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", time: "", isTyping: true },
    ]);

    try {
      const response = await fetch("https://api-inbis.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, userMessage }),
      });
      const data = await response.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantTime = new Date().toLocaleString();

      setMessages((prev) => {
        const newArr = [...prev];
        const typingIndex = newArr.findIndex((m) => m.isTyping);
        if (typingIndex !== -1) newArr.splice(typingIndex, 1);
        return newArr;
      });

      if (data.assistantMessage) {
        let typedText = "";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: typedText, time: assistantTime },
        ]);
        typeWriterEffect(data.assistantMessage, (partial) => {
          setMessages((prev) => {
            const newArr = [...prev];
            newArr[newArr.length - 1].content = partial;
            return newArr;
          });
        });
      }
    } catch (error) {
      setMessages((prev) => {
        const newArr = [...prev];
        const typingIndex = newArr.findIndex((m) => m.isTyping);
        if (typingIndex !== -1) newArr.splice(typingIndex, 1);
        return newArr;
      });
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredMessages = messages.filter((msg) =>
    msg.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <ToastContainer />
      <div style={styles.chatContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>Inbis - Assistente de Programação</h1>
          <div style={styles.searchContainer}>
            <FaSearch style={styles.searchIcon} />
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Buscar na conversa"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div style={styles.messagesContainer}>
          {filteredMessages.map((msg, index) =>
            msg.isTyping ? (
              <div key={index} style={styles.assistantMessage}>
                <div style={styles.typingIndicator}>
                  <span style={styles.dot}>.</span>
                  <span style={styles.dot}>.</span>
                  <span style={styles.dot}>.</span>
                </div>
              </div>
            ) : (
              <div
                key={index}
                style={
                  msg.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                <div style={styles.messageContent}>{renderMessageContent(msg)}</div>
                <div style={styles.timestamp}>{msg.time}</div>
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={styles.inputContainer}>
          <textarea
            style={styles.textarea}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
          />
          <button style={styles.sendButton} onClick={sendMessage}>
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#fff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid #444",
  },
  title: { margin: 0, flex: 1, fontSize: "18px" },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#333",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  searchIcon: { marginRight: "4px" },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
  },
  messagesContainer: {
    flex: 1,
    padding: "16px",
    margin: "0 135px",
    overflowY: "auto",
  },
  userMessage: {
    backgroundColor: "#346EE9",
    padding: "8px 12px",
    borderRadius: "8px",
    marginBottom: "8px",
    alignSelf: "flex-end",
    maxWidth: "60%",
    color: "#fff",
  },
  assistantMessage: {
    backgroundColor: "#333",
    padding: "8px 12px",
    borderRadius: "8px",
    marginBottom: "8px",
    alignSelf: "flex-start",
    maxWidth: "60%",
  },
  messageContent: { marginBottom: "4px" },
  timestamp: { fontSize: "12px", textAlign: "right", opacity: 0.7 },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    padding: "8px",
    borderTop: "1px solid #444",
    margin: "0 135px 16px",
  },
  textarea: {
    flex: 1,
    padding: "8px",
    backgroundColor: "#2e2e2e",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "4px",
    marginRight: "8px",
    resize: "vertical",
    minHeight: "40px",
  },
  sendButton: {
    backgroundColor: "#346EE9",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    cursor: "pointer",
  },
  codeBlock: {
    position: "relative",
    backgroundColor: "#1e1e1e",
    padding: "8px",
    margin: "8px 0",
    borderRadius: "6px",
    border: "1px solid #444",
  },
  pre: {
    margin: 0,
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  copyButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    backgroundColor: "#346EE9",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    color: "#fff",
  },
  typingIndicator: { display: "flex", gap: "4px", fontSize: "24px" },
  dot: {
    animation: "dot-flashing 1s infinite linear alternate",
    fontSize: "24px",
  },
};
