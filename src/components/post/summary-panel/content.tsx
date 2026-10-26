import { memo, type RefObject } from 'react';

export const SummaryPanelContent = memo(
  ({
    isExpanded,
    summary,
    isTyping,
    textRef,
  }: {
    isExpanded: boolean;
    summary: string;
    isTyping: boolean;
    textRef: RefObject<HTMLSpanElement | null>;
  }) => {
    return (
      <div
        id="summary-panel-content"
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="bg-[hsl(var(--glass-surface-hsl)/0.06)] text-muted-foreground px-4 py-4 text-sm leading-relaxed">
            <span className="sr-only">{summary}</span>
            <p aria-hidden="true">
              <span ref={textRef} />
              {isTyping && <span className="typewriter-cursor" />}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

SummaryPanelContent.displayName = 'SummaryPanelContent';
