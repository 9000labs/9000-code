import React, { useEffect, useRef } from 'react';

interface ResizeHandleProps {
  onResizeStart: () => void;
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
  isResizing: boolean;
}

export function ResizeHandle({
  onResizeStart,
  onResize,
  onResizeEnd,
  isResizing,
}: ResizeHandleProps) {
  const lastXRef = useRef<number>(0);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, onResize, onResizeEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    lastXRef.current = e.clientX;
    onResizeStart();
  };

  return (
    <div
      className={`w-1 cursor-col-resize transition-colors hover:bg-claude-accent ${
        isResizing ? 'bg-claude-accent' : 'bg-claude-border'
      }`}
      onMouseDown={handleMouseDown}
    />
  );
}
