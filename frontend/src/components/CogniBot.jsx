import React, { useEffect, useRef, useState } from 'react'

export default function CogniBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! I'm CogniBot, ready to help you with your questions." },
  ])
  const [input, setInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const loadingRef = useRef(false)
  const chatBoxRef = useRef(null)

  useEffect(() => {
    // Dynamically load three.js and vanta.net only when component mounts
    let threeScript, vantaScript
    if (!window.VANTA) {
      threeScript = document.createElement('script')
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
      threeScript.async = true
      document.body.appendChild(threeScript)

      vantaScript = document.createElement('script')
      vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js'
      vantaScript.async = true
      document.body.appendChild(vantaScript)

      // Keep references for cleanup
    }

    return () => {
      // no-op cleanup; Vanta persists but is harmless
    }
  }, [])

  useEffect(() => {
    // scroll to bottom on messages change
    const el = chatBoxRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, open])

  const openChat = () => {
    setOpen(true)
    document.body.classList.add('chat-open')
  }

  const closeChat = () => {
    setOpen(false)
    document.body.classList.remove('chat-open')
  }

  const sendMessage = async () => {
    const text = (input || '').trim()
    if (!text) return

    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setStatusMessage('')

    // add loading indicator
    setMessages((m) => [...m, { role: 'bot', text: '.....', loading: true }])
    loadingRef.current = true

    try {
      // Try relative path first so Vite proxy can handle it, fallback to localhost
      const apiUrl = '/chat'
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) {
        // try fallback
        const fallback = await fetch('http://127.0.0.1:8000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
        if (!fallback.ok) throw new Error(`Server returned ${fallback.status}`)
        const data = await fallback.json()
        replaceLoadingWithReply(data.reply)
      } else {
        const data = await res.json()
        replaceLoadingWithReply(data.reply)
      }
    } catch (err) {
      console.error('Chat API Error', err)
      setStatusMessage('⚠️ Could not connect to the backend server. Please ensure FastAPI is running.')
      // remove loading bubble
      setMessages((m) => m.filter((x) => !x.loading))
    } finally {
      loadingRef.current = false
    }
  }

  function replaceLoadingWithReply(reply) {
    setMessages((prev) => {
      const withoutLoading = prev.filter((m) => !m.loading)
      return [...withoutLoading, { role: 'bot', text: reply }]
    })
  }

  return (
    <>
      <style>{`
        /* CogniBot styles (scoped inside component) */
        body { overflow: auto; }
        #vanta-bg { position: fixed; top:0; left:0; width:100%; height:100%; z-index:-1 }
        .chat-container { padding:5px; margin-right:5px; margin-top:5px; width:90%; max-width:650px; height:75vh; background-color: rgba(255,255,255,0.9); border-radius:18px; box-shadow:0 6px 20px rgba(0,0,0,0.08); display:none; flex-direction:column; justify-content:flex-end; padding:20px; box-sizing:border-box; position:fixed; right:20px; bottom:90px; transition: opacity .3s, transform .3s; z-index:999 }
        @media (max-width:600px){ .chat-container { width:90%; height:90vh; bottom:5%; right:5% } }
        #chat-box { flex-grow:1; padding:15px; overflow-y:auto; margin-bottom:20px; border:2px solid #f0e6ff; border-radius:12px; background-color:#fff }
        #chat-box > div { padding:10px 15px; margin-bottom:10px; border-radius:20px; max-width:80%; line-height:1.4; word-wrap:break-word; font-size:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.05) }
        .bot { background-color:#f0e6ff; color:#4a4a4a; margin-right:auto; text-align:left; border-bottom-left-radius:5px }
        .user { background-color:#fcd5e5; color:#333; margin-left:auto; text-align:right; border-bottom-right-radius:5px }
        .input-area { display:flex; gap:15px }
        #user-input { flex-grow:1; padding:15px 20px; border:1px solid #e0e0e0; border-radius:30px; font-size:1rem }
        #chat-button { position:fixed; bottom:30px; right:25px; width:70px; height:70px; border-radius:50%; background-color:#6a5acd; color:white; font-size:28px; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:1000; display:flex; justify-content:center; align-items:center }
        #chat-button:hover { background-color:#5345b8; transform:scale(1.05) }
        #close-chat-button { position:absolute; top:10px; right:10px; width:30px; height:30px; border-radius:50%; background-color:#f0e6ff; color:#6a5acd; font-size:16px; padding:0; z-index:1001 }
        body.chat-open .chat-container { display:flex; transform:translateY(0); opacity:1 }
        body.chat-open #chat-button { display:none }
        .error-message { color:#ff4d4d; padding:5px 0; text-align:center; font-size:0.9em }
      `}</style>

      <div id="vanta-bg" />

      <div className="chat-container" aria-hidden={!open} style={{ display: open ? 'flex' : 'none' }}>
        <div id="chat-box" ref={chatBoxRef}>
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? 'user' : 'bot'}>
              <strong style={{ display: 'none' }}>{m.role === 'user' ? 'You:' : 'Bot:'}</strong>
              {m.text}
            </div>
          ))}
        </div>

        <div className="input-area">
          <input
            id="user-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="How can I help you?..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
        <div id="status-message" className="error-message">{statusMessage}</div>
        <button id="close-chat-button" onClick={closeChat} aria-label="Close chat">✖</button>
      </div>

      <button id="chat-button" onClick={openChat} aria-label="Open CogniBot">💬</button>
    </>
  )
}
