import { useState, useCallback } from "react";

export default function useCommentInput() {
  const [commentTexts, setCommentTexts] = useState({});

  const handleCommentChange = useCallback((postId, valueOrEvent) => {
    const value = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent;
    setCommentTexts((prev) => ({ ...prev, [postId]: value }));
  }, []);

  return [commentTexts, handleCommentChange, setCommentTexts];
} 