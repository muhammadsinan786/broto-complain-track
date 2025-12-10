import { useState } from "react";
import ChatbotButton from "./ChatbotButton";
import ChatWindow from "./ChatWindow";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatWindow />}
      <ChatbotButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </>
  );
};

export default Chatbot;
