"use client";

import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  sort: string;
  setSort: (s: string) => void;
};

export default function SortMenu({ sort, setSort }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: "latest", label: "Latest" },
    { value: "top-rated", label: "Top Rated" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];

  const selectedOption = options.find((option) => option.value === sort);

  const handleSelect = (value: string) => {
    setSort(value);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <label className="text-xs font-bold uppercase tracking-widest text-white/60 shrink-0">
        Sort By:
      </label>
      <div className="relative w-full sm:w-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:min-w-[200px] px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-left relative hover:bg-white/10 focus:ring-1 focus:ring-[#FF8A70]/50 transition-all text-sm font-bold text-white/70"
        >
          {selectedOption?.label}
          <ChevronDown
            className={`absolute top-1/2 right-3 transform -translate-y-1/2 text-[#FF8A70] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-xl z-[100] overflow-hidden w-full sm:min-w-[200px]">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left transition-all duration-200 ${
                    sort === option.value
                      ? "text-[#FF8A70] bg-white/5 font-bold"
                      : "text-white/40 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{option.label}</span>
                  {sort === option.value && (
                    <Check className="w-4 h-4 text-[#FF7A7A]" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
