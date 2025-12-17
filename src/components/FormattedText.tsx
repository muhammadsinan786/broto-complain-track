import React from "react";

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with **bold** markdown formatting
 * Uses safe React rendering instead of dangerouslySetInnerHTML to prevent XSS
 */
export const FormattedText = ({ text, className = "" }: FormattedTextProps) => {
  // Split by **text** pattern, capturing the bold text
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  
  return (
    <span className={className}>
      {parts.map((part, index) => 
        // Odd indices are the captured groups (text between **)
        index % 2 === 1 ? (
          <strong key={index}>{part}</strong>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
