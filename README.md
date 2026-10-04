# 💬 Clarity Chat — Full-Stack AI Assistant

**Clarity Chat** is a modern, responsive AI chatbot web application designed to answer general knowledge, science, programming, and writing questions with speed and precision.

Powered by Google's Gemini models (`@google/genai`), the app features a resilient server-side proxy architecture, multi-turn conversation context, copyable code snippets, and a charcoal dark mode with persistent user preferences.

### ✨ Key Features
- **Real-Time Gemini AI Responses**: Powered by Gemini Flash with seamless automatic fallback to handle high demand without downtime.
- **Modern Clean UI**: 60-30-10 color hierarchy with blue user bubbles, left-aligned gray/charcoal AI response cards, and animated typing indicators.
- **Dark & Light Mode**: Charcoal dark theme with subtle borders and theme persistence via `localStorage`.
- **Rich Markdown & Code Snippets**: Formatted lists, headers, inline code, and dedicated code blocks with one-click copy.
- **Conversation Management**: Multiple chat threads, search filtering, transcript export (`.txt`), and reversible chat clearing.
- **Secure Backend Proxy**: Server-side API key handling (`/api/chat`) ensuring sensitive credentials are never exposed to the client.

### 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express / Vite Middleware
- **AI SDK**: `@google/genai` (Gemini API)
