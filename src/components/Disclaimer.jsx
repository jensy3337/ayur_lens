import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

export default function Disclaimer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="disclaimer z-50">
      <button
        type="button"
        className="disclaimer-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className="disclaimer-title">
          <AlertTriangle className="w-4 h-4" />
          Educational notice
        </span>
        <ChevronDown className={`w-4 h-4 disclaimer-chevron ${isOpen ? 'disclaimer-chevron-open' : ''}`} />
      </button>

      {isOpen && (
        <p className="disclaimer-text">
          This app is for educational and informational purposes only. Plant identification may be inaccurate. Always consult certified AYUSH practitioners before using medicinal plants.
        </p>
      )}
    </div>
  );
}
