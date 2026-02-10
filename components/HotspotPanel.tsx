import React from 'react';
import { Hotspot, HotspotType, Scene } from '../types';
import { X, Trash2, Link as LinkIcon, Image as ImageIcon, DoorOpen, Settings, MessageSquare, Sliders, Compass } from 'lucide-react';

interface HotspotPanelProps {
  hotspot: Hotspot | null;
  scenes: Scene[];
  activeScene: Scene | null;
  onUpdate: (hs: Hotspot) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onUpdateScene: (fields: Partial<Scene>) => void;
}

const label  = "text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2";
const input  = "w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all text-stone-100";
const slider = "w-full h-1.5 rounded-full accent-amber-500 cursor-pointer";

const SliderRow: React.FC<{
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; leftLabel?: string; rightLabel?: string;
  onChange: (v: number) => void;
}> = ({ label: lbl, value, min, max, step = 5, unit = '', leftLabel = '', rightLabel = '', onChange }) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{lbl}</span>
      <span className="text-[11px] text-amber-400 font-bold">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={slider} />
    {(leftLabel || rightLabel) && (
      <div className="flex justify-between text-[9px] text-stone-600 mt-1">
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    )}
  </div>
);

const HotspotPanel: React.FC<HotspotPanelProps> = ({
  hotspot, scenes, activeScene, onUpdate, onRemove, onClose, onUpdateScene,
}) => {

  // ── Sin hotspot: panel de propiedades de la escena ──────────────────────
  if (!hotspot) {
    if (!activeScene) {
      return (
        <div className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col items-center justify-center p-8 text-center text-stone-500">
          <Settings className="w-12 h-12 mb-4 opacity-10" />
          <p className="text-sm">Add or select a scene to begin.</p>
        </div>
      );
    }
    return (
      <aside className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-stone-800">
          <h2 className="text-sm font-black text-stone-100 flex items-center gap-2 uppercase tracking-widest">
            <Settings size={16} className="text-amber-500" /> Scene Settings
          </h2>
          <p className="text-[10px] text-stone-500 mt-1 truncate">{activeScene.name}</p>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* ── Imagen: brillo y contraste ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
              <Sliders size={13} className="text-amber-500" /> Image Adjustments
            </div>

            <SliderRow label="Brightness" value={activeScene.brightness ?? 100}
              min={20} max={200} unit="%" leftLabel="Dark" rightLabel="Bright"
              onChange={(v) => onUpdateScene({ brightness: v })} />

            <SliderRow label="Contrast" value={activeScene.contrast ?? 100}
              min={20} max={200} unit="%" leftLabel="Low" rightLabel="High"
              onChange={(v) => onUpdateScene({ contrast: v })} />

            <button
              onClick={() => onUpdateScene({ brightness: 100, contrast: 100 })}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-amber-400 py-2 border border-stone-800 hover:border-amber-800 rounded-lg transition-all"
            >
              Reset image
            </button>
          </section>

          {/* ── Vista inicial ── */}
          <section className="space-y-4 border-t border-stone-800 pt-5">
            <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
              <Compass size={13} className="text-amber-500" /> Initial View
            </div>

            <SliderRow label="Horizontal (Lon)" value={activeScene.initialLon ?? 0}
              min={-180} max={180} unit="°" leftLabel="-180°" rightLabel="180°"
              onChange={(v) => onUpdateScene({ initialLon: v })} />

            <SliderRow label="Vertical (Lat)" value={activeScene.initialLat ?? 0}
              min={-85} max={85} unit="°" leftLabel="Down" rightLabel="Up"
              onChange={(v) => onUpdateScene({ initialLat: v })} />

            <button
              onClick={() => onUpdateScene({ initialLon: 0, initialLat: 0 })}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-amber-400 py-2 border border-stone-800 hover:border-amber-800 rounded-lg transition-all"
            >
              Reset view
            </button>

            <p className="text-[9px] text-stone-600 leading-relaxed">
              Navigate to the desired starting angle, then adjust the sliders to match.
            </p>
          </section>

          <div className="text-center text-stone-600 text-[10px] border-t border-stone-800 pt-4">
            Click on the 360° sphere to place a hotspot
          </div>
        </div>
      </aside>
    );
  }

  // ── Con hotspot seleccionado ─────────────────────────────────────────────
  const set = (field: keyof Hotspot, value: unknown) => onUpdate({ ...hotspot, [field]: value });

  return (
    <aside className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6 border-b border-stone-800 flex items-center justify-between">
        <h2 className="text-sm font-black text-stone-100 flex items-center gap-2 uppercase tracking-widest">
          <Settings size={16} className="text-amber-500" /> Hotspot
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-lg transition-colors text-stone-400">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

        {/* Tipo */}
        <div>
          <span className={label}>Type</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: HotspotType.SCENE, icon: <DoorOpen size={15} />,      lbl: 'Scene' },
              { id: HotspotType.LINK,  icon: <LinkIcon size={15} />,       lbl: 'Link'  },
              { id: HotspotType.IMAGE, icon: <ImageIcon size={15} />,      lbl: 'Image' },
              { id: HotspotType.TEXT,  icon: <MessageSquare size={15} />,  lbl: 'Text'  },
            ].map(({ id, icon, lbl }) => (
              <button key={id} onClick={() => set('type', id)}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all text-center
                  ${hotspot.type === id
                    ? 'border-amber-600 bg-amber-600/10 text-amber-500'
                    : 'border-stone-800 bg-stone-800/50 text-stone-400 hover:border-stone-700'}`}
              >
                {icon}
                <span className="text-[9px] font-bold leading-none">{lbl}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label className={label}>Label</label>
          <input type="text" value={hotspot.label} onChange={(e) => set('label', e.target.value)}
            className={input} placeholder="e.g. Entrance" />
        </div>

        {/* SCENE → target */}
        {hotspot.type === HotspotType.SCENE && (
          <div>
            <label className={label}>Target scene</label>
            <select value={hotspot.targetSceneId ?? ''} onChange={(e) => set('targetSceneId', e.target.value)}
              className={input + ' appearance-none'}>
              <option value="">Select a scene…</option>
              {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* LINK → url */}
        {hotspot.type === HotspotType.LINK && (
          <div>
            <label className={label}>URL</label>
            <input type="url" value={hotspot.targetUrl ?? ''} onChange={(e) => set('targetUrl', e.target.value)}
              className={input} placeholder="https://…" />
          </div>
        )}

        {/* IMAGE → upload */}
        {hotspot.type === HotspotType.IMAGE && (
          <div>
            <label className={label}>Popup image</label>
            {hotspot.contentImageUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-stone-700">
                <img src={hotspot.contentImageUrl} alt="preview" className="w-full h-32 object-cover" />
                <button onClick={() => set('contentImageUrl', '')}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-stone-800 rounded-2xl hover:border-amber-700 transition-colors cursor-pointer bg-stone-800/30 group">
                <ImageIcon className="text-stone-600 mb-2 group-hover:text-amber-500 transition-colors" size={24} />
                <span className="text-[10px] text-stone-500 font-bold uppercase">Upload image</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = (ev) => set('contentImageUrl', ev.target?.result);
                    r.readAsDataURL(f);
                  }} />
              </label>
            )}
          </div>
        )}

        {/* TEXT → textarea */}
        {hotspot.type === HotspotType.TEXT && (
          <div>
            <label className={label}>Text content</label>
            <textarea value={hotspot.contentText ?? ''} rows={6}
              onChange={(e) => set('contentText', e.target.value)}
              className={input + ' resize-none leading-relaxed'}
              placeholder="Write the text that will appear when the user clicks this hotspot…" />
            <p className="text-[9px] text-stone-600 mt-1.5">Supports line breaks.</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-stone-800">
        <button onClick={() => onRemove(hotspot.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 rounded-xl transition-all font-bold border border-red-900/20">
          <Trash2 size={18} /> Remove hotspot
        </button>
      </div>
    </aside>
  );
};

export default HotspotPanel;
