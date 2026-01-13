import { useCallback } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { useAppStore, SPLIT_LAYOUTS, type SplitLayoutType } from '../../stores/appStore';

interface LayoutPreviewProps {
  layout: SplitLayoutType;
  isSelected: boolean;
  onClick: () => void;
}

// Visual preview component for each layout type
function LayoutPreview({ layout, isSelected, onClick }: LayoutPreviewProps) {
  // Render visual representation based on layout type
  const renderLayoutVisual = () => {
    switch (layout.id) {
      case 'single':
        return (
          <div className="w-full h-full border border-claude-border rounded bg-claude-bg" />
        );
      case 'horizontal-2':
        return (
          <div className="w-full h-full flex gap-0.5">
            <div className="flex-1 border border-claude-border rounded-l bg-claude-bg" />
            <div className="flex-1 border border-claude-border rounded-r bg-claude-bg" />
          </div>
        );
      case 'vertical-2':
        return (
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="flex-1 border border-claude-border rounded-t bg-claude-bg" />
            <div className="flex-1 border border-claude-border rounded-b bg-claude-bg" />
          </div>
        );
      case 'horizontal-3':
        return (
          <div className="w-full h-full flex gap-0.5">
            <div className="flex-1 border border-claude-border rounded-l bg-claude-bg" />
            <div className="flex-1 border border-claude-border bg-claude-bg" />
            <div className="flex-1 border border-claude-border rounded-r bg-claude-bg" />
          </div>
        );
      case 'grid-4':
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="border border-claude-border rounded-tl bg-claude-bg" />
            <div className="border border-claude-border rounded-tr bg-claude-bg" />
            <div className="border border-claude-border rounded-bl bg-claude-bg" />
            <div className="border border-claude-border rounded-br bg-claude-bg" />
          </div>
        );
      case 'left-main':
        return (
          <div className="w-full h-full flex gap-0.5">
            <div className="w-3/5 border border-claude-border rounded-l bg-claude-bg" />
            <div className="w-2/5 flex flex-col gap-0.5">
              <div className="flex-1 border border-claude-border rounded-tr bg-claude-bg" />
              <div className="flex-1 border border-claude-border rounded-br bg-claude-bg" />
            </div>
          </div>
        );
      case 'top-main':
        return (
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="h-3/5 border border-claude-border rounded-t bg-claude-bg" />
            <div className="h-2/5 flex gap-0.5">
              <div className="flex-1 border border-claude-border rounded-bl bg-claude-bg" />
              <div className="flex-1 border border-claude-border rounded-br bg-claude-bg" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-lg transition-all
        ${isSelected
          ? 'bg-claude-accent/20 border-2 border-claude-accent'
          : 'bg-claude-surface border-2 border-transparent hover:border-claude-border hover:bg-claude-bg'
        }
      `}
    >
      <div className="w-16 h-12">
        {renderLayoutVisual()}
      </div>
      <span className={`text-xs ${isSelected ? 'text-claude-accent font-medium' : 'text-claude-text-secondary'}`}>
        {layout.name}
      </span>
    </button>
  );
}

interface RatioSliderProps {
  panelIndex: number;
  ratio: number;
  onChange: (index: number, value: number) => void;
  totalPanels: number;
}

// Slider for adjusting panel ratio
function RatioSlider({ panelIndex, ratio, onChange, totalPanels }: RatioSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-claude-text-secondary w-16">
        패널 {panelIndex + 1}
      </span>
      <input
        type="range"
        min={10}
        max={90}
        value={ratio}
        onChange={(e) => onChange(panelIndex, Number(e.target.value))}
        className="flex-1 h-1.5 bg-claude-border rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-claude-accent
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
        "
        disabled={totalPanels === 1}
      />
      <span className="text-xs text-claude-text font-mono w-10 text-right">
        {Math.round(ratio)}%
      </span>
    </div>
  );
}

export function SplitLayoutSelector() {
  const {
    splitLayout,
    isSplitSelectorOpen,
    setSplitLayout,
    updatePanelRatios,
    closeSplitSelector,
  } = useAppStore();

  const currentLayout = SPLIT_LAYOUTS.find((l) => l.id === splitLayout.layoutId);

  const handleLayoutSelect = useCallback((layoutId: string) => {
    setSplitLayout(layoutId);
  }, [setSplitLayout]);

  const handleRatioChange = useCallback((panelIndex: number, newRatio: number) => {
    const panels = splitLayout.panels;
    const totalPanels = panels.length;

    if (totalPanels <= 1) return;

    // Calculate the difference
    const oldRatio = panels[panelIndex].ratio;
    const diff = newRatio - oldRatio;

    // Distribute the difference to other panels proportionally
    const otherPanels = panels.filter((_, i) => i !== panelIndex);
    const otherTotal = otherPanels.reduce((sum, p) => sum + p.ratio, 0);

    const newRatios = panels.map((p, i) => {
      if (i === panelIndex) return newRatio;
      // Distribute proportionally
      const proportion = p.ratio / otherTotal;
      return Math.max(10, p.ratio - diff * proportion);
    });

    // Normalize to ensure total is 100
    const total = newRatios.reduce((sum, r) => sum + r, 0);
    const normalizedRatios = newRatios.map((r) => (r / total) * 100);

    updatePanelRatios(normalizedRatios);
  }, [splitLayout.panels, updatePanelRatios]);

  if (!isSplitSelectorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-claude-surface border border-claude-border rounded-xl shadow-2xl w-[480px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-claude-accent" />
            <h2 className="text-sm font-semibold text-claude-text">터미널 분할 레이아웃</h2>
          </div>
          <button
            onClick={closeSplitSelector}
            className="p-1 text-claude-text-secondary hover:text-claude-text hover:bg-claude-border rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Layout Selection Grid */}
        <div className="p-4">
          <p className="text-xs text-claude-text-secondary mb-3">레이아웃 선택</p>
          <div className="grid grid-cols-4 gap-2">
            {SPLIT_LAYOUTS.map((layout) => (
              <LayoutPreview
                key={layout.id}
                layout={layout}
                isSelected={splitLayout.layoutId === layout.id}
                onClick={() => handleLayoutSelect(layout.id)}
              />
            ))}
          </div>
        </div>

        {/* Ratio Adjustment */}
        {currentLayout && currentLayout.panels > 1 && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-claude-bg rounded-lg">
              <p className="text-xs text-claude-text-secondary mb-3">패널 비율 조정</p>
              <div className="space-y-2">
                {splitLayout.panels.map((panel, index) => (
                  <RatioSlider
                    key={panel.id}
                    panelIndex={index}
                    ratio={panel.ratio}
                    onChange={handleRatioChange}
                    totalPanels={splitLayout.panels.length}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-claude-border bg-claude-bg/50">
          <button
            onClick={closeSplitSelector}
            className="px-4 py-1.5 text-sm text-claude-text-secondary hover:text-claude-text hover:bg-claude-border rounded transition-colors"
          >
            취소
          </button>
          <button
            onClick={closeSplitSelector}
            className="px-4 py-1.5 text-sm bg-claude-accent text-white rounded hover:bg-claude-accent/90 transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
