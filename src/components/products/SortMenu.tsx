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
      <label className="text-sm sm:text-md font-semibold text-gray-600 shrink-0">
        Sort By:
      </label>
      <div className="relative w-full sm:w-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:min-w-[200px] px-3 py-2 rounded-lg sm:rounded-full border border-gray-300 bg-white shadow-sm text-left relative hover:border-gray-400 focus:border-[#FF7A7A] focus:ring-2 focus:ring-[#FF7A7A] transition-all"
        >
          {selectedOption?.label}
          <ChevronDown
            className={`absolute top-1/2 right-3 transform -translate-y-1/2 text-[#FF7A7A] transition-transform duration-200 ${
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden w-full sm:min-w-[200px]">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors duration-200 ${
                    sort === option.value
                      ? "text-[#FF7A7A] font-medium"
                      : "text-gray-700"
                  } hover:bg-[#FF7A7A] hover:text-white`}
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
