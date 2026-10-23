"use client";

import React, { useState, useRef } from "react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

export default function Accordion({
  items,
  className = "",
  allowMultiple = false,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id || ""]);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`divide-y divide-line border-y border-line ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <AccordionRow
            key={item.id}
            item={item}
            isOpen={isOpen}
            onToggle={() => toggle(item.id)}
          />
        );
      })}
    </div>
  );
}

function AccordionRow({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="py-4 group">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${item.id}`}
        className="w-full flex items-center justify-between text-left gap-4 focus:outline-none"
      >
        <span className="text-sm font-semibold text-ink group-hover:text-moss transition-colors">
          {item.question}
        </span>
        <span
          className="text-muted flex-shrink-0 transition-transform duration-200"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      <div
        id={`accordion-content-${item.id}`}
        role="region"
        ref={contentRef}
        style={{
          maxHeight: isOpen ? `${contentRef.current?.scrollHeight ?? 200}px` : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out",
        }}
      >
        <div className="pt-3 text-xs text-muted leading-relaxed font-sans">
          {item.answer}
        </div>
      </div>
    </div>
  );
}
