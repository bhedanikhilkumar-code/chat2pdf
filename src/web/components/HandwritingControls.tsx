import React, { useState } from 'react';
import type { HandwritingOptions, PaperType } from '../../core/parser/types';

interface HandwritingControlsProps {
  onExport: (options: HandwritingOptions) => void;
  isExporting: boolean;
}

export const HandwritingControls: React.FC<HandwritingControlsProps> = ({
  onExport,
  isExporting,
}) => {
  const [font, setFont] = useState<'Caveat' | 'Indie Flower' | 'Kalam' | 'Hind'>('Caveat');
  const [inkColor, setInkColor] = useState<string>('#1a237e'); // Deep Navy Blue default
  const [paperType, setPaperType] = useState<PaperType>('ruled');
  const [fontSize, setFontSize] = useState<number>(18);
  const [exportAs, setExportAs] = useState<'pdf' | 'jpg'>('pdf');

  const inkColors = [
    { label: 'Deep Blue', value: '#1a237e' },
    { label: 'Royal Blue', value: '#1565c0' },
    { label: 'Classic Black', value: '#212121' },
    { label: 'Charcoal Grey', value: '#424242' },
    { label: 'Fountain Red', value: '#b71c1c' },
  ];

  const handleGenerate = () => {
    onExport({
      font,
      inkColor,
      paperType,
      fontSize,
      exportAs,
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>✍️</span> Handwriting Notes Settings
        </h4>
        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
          Realistic Ink & Paper
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Font Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Handwriting Font
          </label>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value as any)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Caveat">Caveat (English Casual)</option>
            <option value="Indie Flower">Indie Flower (English Playful)</option>
            <option value="Kalam">Kalam (Hindi / Devanagari Script)</option>
            <option value="Hind">Hind (Hindi Clean)</option>
          </select>
        </div>

        {/* Paper Style */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Paper Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['ruled', 'graph', 'blank'] as PaperType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPaperType(type)}
                className={`text-xs py-2 capitalize font-medium rounded-xl border transition-all ${
                  paperType === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs'
                    : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Ink Color */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Ink Color
          </label>
          <div className="flex items-center gap-2">
            {inkColors.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                onClick={() => setInkColor(color.value)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  inkColor === color.value
                    ? 'scale-110 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                    : 'border-white/50 opacity-80 hover:opacity-100 hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>

        {/* Font Size & Format */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span>Font Size</span>
              <span>{fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Format:</span>
            <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="exportAs"
                value="pdf"
                checked={exportAs === 'pdf'}
                onChange={() => setExportAs('pdf')}
                className="accent-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">PDF (A4)</span>
            </label>
            <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="exportAs"
                value="jpg"
                checked={exportAs === 'jpg'}
                onChange={() => setExportAs('jpg')}
                className="accent-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">JPG Images</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isExporting}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-sm shadow-amber-600/20 flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <span className="animate-spin text-sm">⏳</span> Rendering Handwritten Pages...
            </>
          ) : (
            <>
              <span>✍️</span> Generate Handwritten {exportAs.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
