'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, Menu, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

const EXAMPLE_QUESTIONS = [
  'What are some high-protein breakfast options?',
  'Tell me about Mediterranean diet foods',
  'Which foods are rich in antioxidants?',
  'What are good foods for energy before a workout?',
  'Suggest some low-carb dinner ideas',
]

const MODELS = [
  { id: 'llama-3.1-8b-instant', label: 'Fast', description: 'Quick responses' },
  { id: 'llama-3.1-70b-versatile', label: 'Detailed', description: 'More thorough' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to FoodMind AI! I'm powered by a curated database of 35+ foods. Ask me anything about nutrition, cooking, or ingredients!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text.trim(),
          model: selectedModel,
          history,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleExampleClick = (question: string) => {
    setIsSidebarOpen(false)
    sendMessage(question)
  }

  const selectedModelData = MODELS.find((m) => m.id === selectedModel) || MODELS[0]

  return (
    <div className="flex h-dvh bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Chef hat">
                🍽️
              </span>
              <h1 className="font-serif text-xl font-semibold text-foreground">
                FoodMind AI
              </h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-sidebar-accent rounded-md transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-sidebar-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Model
          </label>
          <div className="relative">
            <button
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-sidebar-accent rounded-lg hover:bg-sidebar-accent/80 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">
                  {selectedModelData.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedModelData.description}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  isModelOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isModelOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-10">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id)
                      setIsModelOpen(false)
                    }}
                    className={`w-full px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors ${
                      selectedModel === model.id ? 'bg-sidebar-accent' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">
                      {model.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {model.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Try asking
          </h2>
          <div className="flex flex-col gap-2">
            {EXAMPLE_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(question)}
                className="text-left px-3 py-2.5 text-sm text-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-2 bg-primary/10 rounded-lg">
            <span className="text-xs font-medium text-primary">
              35+ foods indexed
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 lg:px-6 py-4 border-b border-border">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="font-serif text-lg lg:text-xl font-semibold text-foreground">
            Food Knowledge Assistant
          </h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fade-in ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm" role="img" aria-label="Chef">
                      🍽️
                    </span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] lg:max-w-[75%] ${
                    message.role === 'user' ? 'order-first' : ''
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-secondary text-secondary-foreground rounded-br-md'
                        : 'bg-card border border-border text-card-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'assistant' &&
                    message.sources &&
                    message.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Sources found:
                        </span>
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm" role="img" aria-label="Chef">
                    🍽️
                  </span>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-4 lg:px-6 py-4 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-input rounded-xl p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about food, nutrition, or ingredients..."
                rows={1}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none px-2 py-2 max-h-32"
                style={{
                  height: 'auto',
                  minHeight: '40px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
