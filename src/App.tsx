import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Trash2,
  Plus,
  Search,
  Copy,
  Check,
  RotateCcw,
  Download,
  Menu,
  X,
  ArrowUpRight,
  Sun,
  Moon,
} from "lucide-react";
import { MessageContent } from "./components/MessageContent";
import {
  ChatMessage,
  ConversationThread,
  INITIAL_THREADS,
  STARTER_PROMPTS,
} from "./data/starterPrompts";

type ResponseStyle = "concise" | "balanced" | "detailed";
type PromptCategoryFilter = "All" | "Science" | "Technology" | "History" | "Writing" | "Everyday";

function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [threads, setThreads] = useState<ConversationThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>(INITIAL_THREADS[0].id);
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("balanced");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [promptFilter, setPromptFilter] = useState<PromptCategoryFilter>("All");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastClearedMessages, setLastClearedMessages] = useState<ChatMessage[] | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Dark Mode Theme State & Persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("clarity_theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("clarity_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("clarity_theme", "light");
    }
  }, [isDarkMode]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeThread = useMemo(() => {
    return (
      threads.find((t) => t.id === activeThreadId) || {
        id: activeThreadId,
        title: "New Conversation",
        category: "General" as const,
        updatedAt: formatCurrentTime(),
        messages: [],
      }
    );
  }, [threads, activeThreadId]);

  const messages = activeThread.messages;

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  const filteredStarterPrompts = useMemo(() => {
    if (promptFilter === "All") return STARTER_PROMPTS;
    return STARTER_PROMPTS.filter((p) => p.category === promptFilter);
  }, [promptFilter]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isTyping, activeThreadId]);

  const updateActiveThreadMessages = (
    updater: (prevMessages: ChatMessage[]) => ChatMessage[],
    newTitleCandidate?: string
  ) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        const updatedMessages = updater(thread.messages);
        const shouldUpdateTitle =
          newTitleCandidate &&
          (thread.title === "New Conversation" ||
            thread.title === "Getting Started & Capabilities") &&
          updatedMessages.filter((m) => m.role === "user").length <= 2;

        return {
          ...thread,
          title: shouldUpdateTitle
            ? newTitleCandidate.slice(0, 42) + (newTitleCandidate.length > 42 ? "..." : "")
            : thread.title,
          updatedAt: formatCurrentTime(),
          messages: updatedMessages,
        };
      })
    );
  };

  const sendMessage = async (rawText?: string) => {
    const content = (rawText !== undefined ? rawText : inputValue).trim();
    if (!content || isTyping) return;

    const timestamp = formatCurrentTime();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp,
    };

    const updatedHistory = [...messages, userMessage];

    if (rawText === undefined) {
      setInputValue("");
    }
    setLastClearedMessages(null);

    updateActiveThreadMessages(() => updatedHistory, content);
    setIsTyping(true);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          responseStyle,
        }),
      });

      const data = await response.json();
      await minDelay;

      if (!response.ok || data.error) {
        const errorMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Could not generate an answer: ${data.error || "Server error"}. Please check your connection or try again.`,
          timestamp: formatCurrentTime(),
          isError: true,
        };
        updateActiveThreadMessages((prev) => [...prev, errorMessage]);
      } else {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: formatCurrentTime(),
        };
        updateActiveThreadMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err: unknown) {
      await minDelay;
      const message = err instanceof Error ? err.message : "Network error";
      const errorMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Network error: ${message}. Please check your connection and try again.`,
        timestamp: formatCurrentTime(),
        isError: true,
      };
      updateActiveThreadMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0) {
      setLastClearedMessages(messages);
    }
    setIsTyping(false);
    updateActiveThreadMessages(() => []);
    inputRef.current?.focus();
  };

  const handleRestoreCleared = () => {
    if (!lastClearedMessages) return;
    updateActiveThreadMessages(() => lastClearedMessages);
    setLastClearedMessages(null);
  };

  const handleNewConversation = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: ConversationThread = {
      id: newId,
      title: "New Conversation",
      category: "General",
      updatedAt: formatCurrentTime(),
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setLastClearedMessages(null);
    setMobileSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) {
      handleClearChat();
      return;
    }
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);
    if (activeThreadId === id) {
      setActiveThreadId(remaining[0].id);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 1800);
    } catch {
      // Ignore clipboard write failures in sandbox
    }
  };

  const handleRegenerateLast = () => {
    if (isTyping || messages.length === 0) return;
    const lastUserIndex = [...messages]
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[lastUserIndex];
    const trimmedHistory = messages.slice(0, lastUserIndex);
    updateActiveThreadMessages(() => trimmedHistory);
    setTimeout(() => {
      sendMessage(lastUserMessage.content);
    }, 20);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.role === "user" ? "You" : "AI Assistant"}:\n${m.content}\n`
      )
      .join("\n----------------------------------------\n\n");

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeThread.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-chat.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNavTopicSelect = (category: PromptCategoryFilter, sampleQuestion: string) => {
    setPromptFilter(category);
    setInputValue(sampleQuestion);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-white dark:bg-[#121418] text-slate-900 dark:text-neutral-100 overflow-hidden transition-colors duration-200">
      {/* Top Bar Header with Top-Right Theme Toggle */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-[#121418] border-b border-slate-200 dark:border-neutral-800 z-20 transition-colors duration-200">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle conversations sidebar"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-neutral-100 whitespace-nowrap"
          >
            Clarity Chat
          </a>
        </div>

        {/* Zone 2: Navigation Topic Presets */}
        <nav
          aria-label="Topic presets"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-neutral-400"
        >
          <button
            type="button"
            onClick={() =>
              handleNavTopicSelect(
                "Science",
                "What is nature? Explain its meaning across scientific, ecological, and philosophical perspectives."
              )
            }
            className="hover:text-slate-900 dark:hover:text-neutral-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Science
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavTopicSelect(
                "Technology",
                "What happens behind the scenes when I visit a website in my browser?"
              )
            }
            className="hover:text-slate-900 dark:hover:text-neutral-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Technology
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavTopicSelect(
                "History",
                "What were the most important discoveries and inventions of the Renaissance?"
              )
            }
            className="hover:text-slate-900 dark:hover:text-neutral-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            History
          </button>
          <button
            type="button"
            onClick={() =>
              handleNavTopicSelect(
                "Writing",
                "Draft a friendly and professional follow-up email after a job interview."
              )
            }
            className="hover:text-slate-900 dark:hover:text-neutral-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Writing
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Export, Clear Chat, and Dark/Light Mode Toggle in Top-Right Corner) */}
        <div className="flex items-center gap-2">
          {/* Export Transcript */}
          <button
            type="button"
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-white dark:bg-[#181b22] border border-slate-200 dark:border-neutral-800 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap cursor-pointer"
            title="Download conversation transcript"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Clear Chat Button */}
          <button
            id="clear-chat-button"
            type="button"
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-[#1c2026] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400 border border-slate-200/80 dark:border-neutral-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            aria-label="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>

          {/* Dark / Light Mode Toggle in Top-Right Corner */}
          <button
            id="theme-toggle-button"
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-[#1c2026] border border-transparent dark:border-neutral-800/80 rounded-lg transition-colors cursor-pointer"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 relative bg-white dark:bg-[#121418] transition-colors duration-200">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-20 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } fixed lg:static inset-y-0 left-0 top-16 lg:top-0 w-72 shrink-0 bg-slate-50 dark:bg-[#16181f] border-r border-slate-200 dark:border-neutral-800 flex flex-col z-30 transition-all duration-200 ease-out`}
        >
          {/* New Conversation + Search */}
          <div className="p-4 space-y-3 border-b border-slate-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search conversations"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  Conversations
                </span>
                <span className="text-xs text-slate-400 dark:text-neutral-500 font-mono tabular-nums">
                  {filteredThreads.length}
                </span>
              </div>

              {filteredThreads.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500 dark:text-neutral-400">
                  No conversations match "{searchQuery}".
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredThreads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    return (
                      <li key={thread.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setActiveThreadId(thread.id);
                            setMobileSidebarOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActiveThreadId(thread.id);
                              setMobileSidebarOpen(false);
                            }
                          }}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isActive
                              ? "bg-white dark:bg-[#1c2026] text-slate-900 dark:text-neutral-100 font-medium border border-slate-200/90 dark:border-neutral-700/60 shadow-2xs"
                              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1a1d24] hover:text-slate-900 dark:hover:text-neutral-100"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs truncate">{thread.title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5 font-mono tabular-nums">
                              <span>{thread.messages.length} msgs</span>
                              <span aria-hidden="true">·</span>
                              <span>{thread.updatedAt}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteThread(thread.id, e)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-opacity cursor-pointer"
                            aria-label={`Delete ${thread.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Starter Questions Bank */}
            <div className="pt-3 border-t border-slate-200 dark:border-neutral-800">
              <div className="px-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  Sample Questions
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 px-1 mb-3">
                {(["All", "Science", "Technology", "History", "Writing"] as PromptCategoryFilter[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPromptFilter(cat)}
                      className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        promptFilter === cat
                          ? "bg-slate-900 dark:bg-neutral-100 text-white dark:text-slate-900"
                          : "bg-slate-200/70 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700 hover:text-slate-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <div className="space-y-1.5">
                {filteredStarterPrompts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      sendMessage(item.prompt);
                      setMobileSidebarOpen(false);
                    }}
                    disabled={isTyping}
                    className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-[#1a1d24] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-slate-200/80 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-600/50 transition-colors group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800 dark:text-neutral-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                        {item.title}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-2 mt-1 leading-snug">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Column (Dark Charcoal Canvas in Dark Mode) */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#121418] transition-colors duration-200">
          {/* Undo Banner after Clear Chat */}
          {lastClearedMessages && messages.length === 0 && (
            <div className="bg-slate-50 dark:bg-[#181b22] border-b border-slate-200 dark:border-neutral-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-neutral-300">
              <span>Conversation cleared.</span>
              <button
                type="button"
                onClick={handleRestoreCleared}
                className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore previous messages</span>
              </button>
            </div>
          )}

          {/* Messages Display Area */}
          <div
            id="messages-display-area"
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            className="flex-1 overflow-y-auto bg-white dark:bg-[#121418] px-4 sm:px-8 py-6 transition-colors duration-200"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && !isTyping ? (
                /* Empty State Canvas */
                <div className="py-12 sm:py-16 text-center max-w-xl mx-auto">
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 mb-3"
                    style={{ textWrap: "balance" }}
                  >
                    Ask any question
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 mb-8 leading-relaxed">
                    Get clear, direct, and well-structured answers from AI. Choose a prompt
                    below or type your question in the box at the bottom.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {STARTER_PROMPTS.slice(0, 4).map((starter) => (
                      <button
                        key={starter.id}
                        type="button"
                        onClick={() => sendMessage(starter.prompt)}
                        className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181b22] hover:bg-slate-50 dark:hover:bg-[#1e222b] hover:border-slate-300 dark:hover:border-neutral-700 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {starter.title}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                          {starter.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages List */
                messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  const isLastAssistant =
                    !isUser && index === messages.length - 1;

                  if (isUser) {
                    /* User Message on Right Side in Blue Accent */
                    return (
                      <div
                        key={msg.id}
                        data-testid="user-message"
                        className="flex flex-col items-end justify-end"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 mb-1.5 px-1 font-mono tabular-nums">
                          <span>You</span>
                          <span aria-hidden="true">·</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div className="max-w-[85%] sm:max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-2xs">
                          <MessageContent content={msg.content} isUser={true} />
                        </div>
                      </div>
                    );
                  }

                  /* AI Response on Left Side: Slightly lighter dark chat cards in Dark Mode */
                  return (
                    <div
                      key={msg.id}
                      data-testid="ai-message"
                      className="flex flex-col items-start justify-start group"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 mb-1.5 px-1 font-mono tabular-nums">
                        <span className="font-sans font-medium text-slate-700 dark:text-neutral-300">
                          AI Assistant
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-tl-sm px-5 py-4 ${
                          msg.isError
                            ? "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-900/50"
                            : "bg-slate-100 dark:bg-[#1c2026] text-slate-900 dark:text-neutral-100 border border-slate-200/80 dark:border-neutral-800/90 shadow-2xs"
                        }`}
                      >
                        <MessageContent content={msg.content} isUser={false} />
                      </div>

                      {/* Message Actions */}
                      <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-slate-500 dark:text-neutral-400">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
                          aria-label="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {isLastAssistant && !isTyping && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={handleRegenerateLast}
                              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
                              aria-label="Regenerate response"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator on Left Side in Grey / Lighter Dark Card */}
              {isTyping && (
                <div
                  id="typing-indicator"
                  data-testid="typing-indicator"
                  role="status"
                  aria-label="AI is typing"
                  className="flex flex-col items-start justify-start"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 mb-1.5 px-1">
                    <span className="font-medium text-slate-700 dark:text-neutral-300">AI Assistant</span>
                    <span aria-hidden="true">·</span>
                    <span>Typing...</span>
                  </div>
                  <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-[#1c2026] text-slate-700 dark:text-neutral-300 border border-slate-200/80 dark:border-neutral-800/90 rounded-2xl rounded-tl-sm px-5 py-3.5">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-neutral-400 typing-dot-1" />
                      <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-neutral-400 typing-dot-2" />
                      <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-neutral-400 typing-dot-3" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input Box at Bottom */}
          <div className="shrink-0 bg-white dark:bg-[#121418] border-t border-slate-200 dark:border-neutral-800 px-4 sm:px-8 py-4 transition-colors duration-200">
            <div className="max-w-3xl mx-auto">
              {/* Response Depth Selector & Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div
                  role="group"
                  aria-label="Response detail level"
                  className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#181b22] rounded-lg border border-slate-200/60 dark:border-neutral-800"
                >
                  {(["concise", "balanced", "detailed"] as ResponseStyle[]).map(
                    (style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setResponseStyle(style)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          responseStyle === style
                            ? "bg-white dark:bg-[#222731] text-slate-900 dark:text-neutral-100 shadow-2xs font-semibold"
                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                        }`}
                      >
                        {style}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-neutral-500 font-mono tabular-nums">
                  <span>{messages.length} messages</span>
                  <span aria-hidden="true">·</span>
                  <span>Press Enter to send</span>
                </div>
              </div>

              {/* Input Form with Blue Accent Send Button */}
              <form
                onSubmit={handleFormSubmit}
                className="flex items-end gap-2.5 bg-white dark:bg-[#181b22] border border-slate-300 dark:border-neutral-700/80 focus-within:border-blue-600 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-600/15 rounded-xl p-2 transition-all"
              >
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question here..."
                  aria-label="Chat input"
                  className="flex-1 max-h-36 min-h-[40px] py-2 px-3 bg-transparent text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-[15px] leading-relaxed resize-none focus:outline-none"
                />

                <button
                  id="send-button"
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Send message"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-neutral-800 disabled:text-slate-400 dark:disabled:text-neutral-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 shadow-xs"
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
