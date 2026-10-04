export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface ConversationThread {
  id: string;
  title: string;
  category: "General" | "Science" | "Technology" | "Writing" | "History";
  updatedAt: string;
  messages: ChatMessage[];
}

export interface StarterPrompt {
  id: string;
  category: "Science" | "Technology" | "History" | "Writing" | "Everyday";
  title: string;
  prompt: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "sp-1",
    category: "Science",
    title: "Why is the sky blue?",
    prompt: "Explain why the sky appears blue during the day and red at sunset in simple terms.",
  },
  {
    id: "sp-2",
    category: "Technology",
    title: "How does the internet work?",
    prompt: "How does data travel from a web server to my browser when I type a website address?",
  },
  {
    id: "sp-3",
    category: "History",
    title: "Printing press impact",
    prompt: "What were the three biggest societal impacts of the Gutenberg printing press?",
  },
  {
    id: "sp-4",
    category: "Writing",
    title: "Professional email draft",
    prompt: "Write a concise, polite email asking a team for a project timeline update before Friday.",
  },
  {
    id: "sp-5",
    category: "Everyday",
    title: "Effective study habits",
    prompt: "What are the most effective evidence-based techniques for retaining new information?",
  },
  {
    id: "sp-6",
    category: "Science",
    title: "What is nature?",
    prompt: "What is nature? Explain its meaning across scientific, ecological, and philosophical perspectives.",
  },
];

export const INITIAL_THREADS: ConversationThread[] = [
  {
    id: "thread-welcome",
    title: "Getting Started & Capabilities",
    category: "General",
    updatedAt: "10:24 AM",
    messages: [
      {
        id: "msg-init-1",
        role: "user",
        content: "Hello! What kinds of questions can you help me answer?",
        timestamp: "10:24 AM",
      },
      {
        id: "msg-init-2",
        role: "assistant",
        content:
          "Hello! I am ready to answer your questions across a wide variety of topics:\n\n- **Science & Nature**: Physics, biology, ecosystems, weather, and space.\n- **Technology & Coding**: Programming, how the internet works, systems, and tools.\n- **History & Philosophy**: Historical events, cultures, ideas, and timelines.\n- **Writing & Everyday Help**: Drafting emails, summarizing documents, and explanations.\n\nType your question in the input box below or select any prompt to begin.",
        timestamp: "10:24 AM",
      },
    ],
  },
  {
    id: "thread-science",
    title: "Rayleigh Scattering & Sunset Colors",
    category: "Science",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "msg-sci-1",
        role: "user",
        content: "Why does the sky look blue during the day but turn orange and red at sunset?",
        timestamp: "04:15 PM",
      },
      {
        id: "msg-sci-2",
        role: "assistant",
        content:
          "The changing colors of the sky are caused by **Rayleigh scattering**:\n\n1. **Sunlight contains all colors**: White light from the Sun contains all colors of the rainbow. Blue and violet light travel as shorter, smaller waves, while red and orange light travel as longer waves.\n2. **Daytime scattering**: Earth's atmosphere is filled with nitrogen and oxygen molecules. Shorter blue wavelengths collide with these molecules and scatter widely across the sky.\n3. **Sunset path length**: At sunset, the Sun is low on the horizon, so light travels through much more atmosphere. Most blue light scatters away before reaching you, allowing the **warmer red and gold wavelengths** to pass straight to your eyes.",
        timestamp: "04:15 PM",
      },
    ],
  },
];
