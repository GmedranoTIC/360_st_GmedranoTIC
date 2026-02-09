
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
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <Settings className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Select a hotspot to edit its properties or click on the sphere to add a new one.</p>
      </div>
    );
  }

  const handleChange = (field: keyof Hotspot, value: any) => {
    onUpdate({ ...hotspot, [field]: value });
  };

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings size={20} className="text-blue-400" />
          Properties
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
            Interaction Type
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
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Label
            </label>
            <input
              type="text"
              value={hotspot.label}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. Balcony"
            />
          </div>

          {hotspot.type === HotspotType.SCENE && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Destination
              </label>
              <select
                value={hotspot.targetSceneId}
                onChange={(e) => handleChange('targetSceneId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                External Link
              </label>
              <input
                type="url"
                value={hotspot.targetUrl}
                onChange={(e) => handleChange('targetUrl', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="https://..."
              />
            </div>
          )}

          {hotspot.type === HotspotType.IMAGE && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Popup Content
              </label>
              <div className="space-y-3">
                {hotspot.contentImageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-700">
                    <img src={hotspot.contentImageUrl} alt="Preview" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => handleChange('contentImageUrl', '')}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-800 rounded-2xl hover:border-slate-700 transition-colors cursor-pointer bg-slate-800/30 group">
                    <ImageIcon className="text-slate-600 mb-2 group-hover:text-slate-400 transition-colors" size={24} />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Upload Media</span>
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

      <div className="p-6 border-t border-slate-800 bg-slate-950/50">
        <button
          onClick={() => onRemove(hotspot.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all font-bold border border-red-500/20"
        >
          <Trash2 size={18} />
          Remove Hotspot
        </button>
      </div>
    </aside>
  );
};

export default HotspotPanel;
