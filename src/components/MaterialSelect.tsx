"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

/** Materials offered in the goods dropdown (sales bills and quotations). */
export const QUARRY_MATERIALS = [
  "20MM JALLY",
  "40MM JALLY",
  "10MM JALLY",
  "6MM JALLY",
  "M SAND",
  "P SAND",
  "CONCRETE SAND",
  "DUST",
  "GSB",
  "WET MIX",
  "GABION",
  "ROUGH STONE / BOULDER",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  options?: string[];
}

/**
 * Dropdown of quarry materials that still accepts typed text for anything not listed.
 * The list is rendered in a portal so it is never clipped by scrolling tables or cards.
 */
export default function MaterialSelect({ value, onChange, placeholder = "Select or type material", required, className = "", options = QUARRY_MATERIALS }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; bottom: number } | null>(null);

  const typed = value.trim().toUpperCase();
  const showAll = !typed || options.includes(typed);
  const shown = showAll ? options : options.filter((o) => o.includes(typed));

  // Keep the floating list under the input while the page or a table scrolls
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.left, top: r.bottom + 4, width: r.width, bottom: r.top });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // Enter picks the highlighted material (or just closes the list); it never submits the form
      e.preventDefault();
      if (open && highlight >= 0 && shown[highlight]) choose(shown[highlight]);
      else setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Open upwards when there is not enough room below the input
  const listHeight = Math.min(shown.length || 1, 7) * 34 + 8;
  const openUp = rect ? rect.top + listHeight > window.innerHeight && rect.bottom > listHeight : false;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={`${className} pr-8 uppercase`}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show materials"
        onMouseDown={(e) => {
          e.preventDefault(); // keep focus in the input
          setOpen((o) => !o);
          inputRef.current?.focus();
        }}
        className="absolute inset-y-0 right-0 px-2 flex items-center text-slate-400 hover:text-amber-400"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        rect &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              left: rect.left,
              width: Math.max(rect.width, 200),
              ...(openUp ? { bottom: window.innerHeight - rect.bottom + 4 } : { top: rect.top }),
            }}
            className="z-[60] max-h-60 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-xl soft-fade-in"
          >
            {shown.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">
                Not in the list — <span className="font-bold text-slate-200">{typed}</span> will be used as typed
              </li>
            ) : (
              shown.map((option, i) => (
                <li
                  key={option}
                  role="option"
                  aria-selected={option === typed}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
                    i === highlight ? "bg-slate-800 text-amber-400" : option === typed ? "text-amber-400" : "text-slate-200"
                  }`}
                >
                  {option}
                </li>
              ))
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
