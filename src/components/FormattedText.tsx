import { parseBoldText } from "@/lib/textFormatting";

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with **bold** markdown formatting
 */
export const FormattedText = ({ text, className = "" }: FormattedTextProps) => {
  const formattedHtml = parseBoldText(text);
  
  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
};
