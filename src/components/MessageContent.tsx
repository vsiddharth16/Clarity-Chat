import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

interface ParsedBlock {
  type: "code" | "text";
  language?: string;
  content: string;
}

function parseCodeBlocks(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: raw.slice(lastIndex, match.index),
      });
    }
    blocks.push({
      type: "code",
      language: match[1] || "code",
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    blocks.push({
      type: "text",
      content: raw.slice(lastIndex),
    });
  }

  return blocks;
}

function renderInlineFormatting(text: string, isUser: boolean): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${
            isUser
              ? "bg-blue-700 text-blue-50"
              : "bg-slate-200/80 dark:bg-neutral-800 text-slate-900 dark:text-neutral-200"
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function CodeSnippet({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard write errors in restricted frames
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/90 border-b border-slate-700 text-xs text-slate-300">
        <span className="font-mono lowercase">{language || "snippet"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs sm:text-[13px] leading-relaxed overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isUser = false,
}) => {
  const blocks = parseCodeBlocks(content);

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed break-words">
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return (
            <CodeSnippet
              key={bIdx}
              language={block.language || "code"}
              code={block.content}
            />
          );
        }

        const paragraphs = block.content
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean);

        return (
          <React.Fragment key={bIdx}>
            {paragraphs.map((para, pIdx) => {
              const lines = para.split("\n");
              const isBulletList = lines.every((line) =>
                /^(\s*[-*•]\s+)/.test(line)
              );
              const isNumberedList = lines.every((line) =>
                /^(\s*\d+\.\s+)/.test(line)
              );

              if (isBulletList) {
                return (
                  <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-1.5">
                    {lines.map((line, lIdx) => (
                      <li key={lIdx}>
                        {renderInlineFormatting(
                          line.replace(/^(\s*[-*•]\s+)/, ""),
                          isUser
                        )}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (isNumberedList) {
                return (
                  <ol key={pIdx} className="list-decimal pl-5 space-y-1.5 my-1.5">
                    {lines.map((line, lIdx) => (
                      <li key={lIdx}>
                        {renderInlineFormatting(
                          line.replace(/^(\s*\d+\.\s+)/, ""),
                          isUser
                        )}
                      </li>
                    ))}
                  </ol>
                );
              }

              if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
                const headingText = lines[0].replace(/^#{1,3}\s+/, "");
                return (
                  <h4 key={pIdx} className="font-semibold text-base pt-1 tracking-tight">
                    {renderInlineFormatting(headingText, isUser)}
                  </h4>
                );
              }

              return (
                <p key={pIdx} className="whitespace-pre-line">
                  {renderInlineFormatting(para, isUser)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};
