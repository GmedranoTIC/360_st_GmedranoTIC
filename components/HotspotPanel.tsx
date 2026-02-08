import React from 'react';
import { Hotspot, HotspotType, Scene } from '../types';
import { X, Trash2, Link as LinkIcon, Image as ImageIcon, DoorOpen, Settings } from 'lucide-react';

interface HotspotPanelProps {
  hotspot: Hotspot | null;
  scenes: Scene[];
  onUpdate: (hs: Hotspot) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const HotspotPanel: React.FC<HotspotPanelProps> = ({ hotspot, scenes, onUpdate, onRemove, onClose }) => {
  if (!hotspot) {
    return (
      <div className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col items-center justify-center p-8 text-center text-stone-500">
        <Settings className="w-12 h-12 mb-4 opacity-10" />
        <p className="text-sm">Select a hotspot to edit its properties or click on the sphere to add a new one.</p>
      </div>
    );
  }

  const handleChange = (field: keyof Hotspot, value: any) => {
    onUpdate({ ...hotspot, [field]: value });
  };

  return (
    <aside className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6 border-b border-stone-800 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-stone-100">
          <Settings size={20} className="text-amber-500" />
          Hotspot
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-lg transition-colors text-stone-400">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-3">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: HotspotType.SCENE, icon: <DoorOpen size={18} />, label: 'Scene' },
              { id: HotspotType.LINK, icon: <LinkIcon size={18} />, label: 'Link' },
              { id: HotspotType.IMAGE, icon: <ImageIcon size={18} />, label: 'Media' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleChange('type', t.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  hotspot.type === t.id
                    ? 'border-amber-600 bg-amber-600/10 text-amber-500'
                    : 'border-stone-800 bg-stone-800/50 text-stone-400 hover:border-stone-700'
                }`}
              >
                {t.icon}
                <span className="text-[9px] font-bold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">
              Name
            </label>
            <input
              type="text"
              value={hotspot.label}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all text-stone-100"
              placeholder="e.g. Entrance"
            />
          </div>

          {hotspot.type === HotspotType.SCENE && (
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">
                Target Scene
              </label>
              <select
                value={hotspot.targetSceneId}
                onChange={(e) => handleChange('targetSceneId', e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all appearance-none text-stone-100"
              >
                <option value="">Select Target...</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hotspot.type === HotspotType.LINK && (
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">
                URL
              </label>
              <input
                type="url"
                value={hotspot.targetUrl}
                onChange={(e) => handleChange('targetUrl', e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all text-stone-100"
                placeholder="https://..."
              />
            </div>
          )}

          {hotspot.type === HotspotType.IMAGE && (
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">
                Popup Content
              </label>
              <div className="space-y-3">
                {hotspot.contentImageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-stone-700">
                    <img src={hotspot.contentImageUrl} alt="Preview" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => handleChange('contentImageUrl', '')}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-stone-800 rounded-2xl hover:border-stone-700 transition-colors cursor-pointer bg-stone-800/30 group">
                    <ImageIcon className="text-stone-600 mb-2 group-hover:text-amber-500 transition-colors" size={24} />
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Upload Media</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => handleChange('contentImageUrl', ev.target?.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-stone-800 bg-stone-950/50">
        <button
          onClick={() => onRemove(hotspot.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 rounded-xl transition-all font-bold border border-red-900/20"
        >
          <Trash2 size={18} />
          Remove
        </button>
      </div>
    </aside>
  );
};

export default HotspotPanel;