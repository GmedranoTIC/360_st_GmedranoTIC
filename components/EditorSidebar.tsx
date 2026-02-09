import React from 'react';
import { Tour, Scene } from '../types';
import { Plus, Trash2, Home, Map, PlusCircle } from 'lucide-react';

interface EditorSidebarProps {
  tour: Tour;
  activeSceneId: string;
  onSelectScene: (id: string) => void;
  onAddScene: (file: File) => void;
  onRemoveScene: (id: string) => void;
  onUpdateTourTitle: (title: string) => void;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  tour,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onRemoveScene,
  onUpdateTourTitle,
}) => {
  return (
    <aside className="w-72 bg-stone-900 border-r border-stone-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6 border-b border-stone-800">
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center gap-2 text-amber-500 font-black tracking-tighter text-lg uppercase italic">
            <Map size={24} strokeWidth={3} />
            360º Studio
          </div>
          <div className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em]">by @GmedranoTIC</div>
        </div>
        
        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">
            Project Title
          </label>
          <input
            type="text"
            value={tour.title}
            onChange={(e) => onUpdateTourTitle(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold placeholder-stone-600 text-stone-100"
            placeholder="Project Title"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-stone-900/30">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Scenes ({tour.scenes.length})</h2>
          <label className="p-1.5 bg-amber-700 hover:bg-amber-600 rounded-full cursor-pointer shadow-lg shadow-amber-900/40 transition-transform active:scale-90 text-white">
            <Plus size={16} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onAddScene(e.target.files[0])}
            />
          </label>
        </div>

        <div className="space-y-4">
          {tour.scenes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-stone-800 rounded-2xl opacity-50 text-center">
              <PlusCircle size={32} className="mb-2 text-stone-700" />
              <p className="text-[10px] text-stone-600 font-bold uppercase tracking-wider">Add images</p>
            </div>
          )}
          {tour.scenes.map((scene) => (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                activeSceneId === scene.id ? 'border-amber-600 ring-4 ring-amber-900/20 shadow-2xl' : 'border-stone-800 hover:border-stone-700 shadow-lg'
              }`}
            >
              <div className="aspect-[2/1] bg-stone-800 relative">
                {scene.imageSource && (
                  <img
                    src={scene.imageSource}
                    alt={scene.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold truncate pr-4 uppercase tracking-tighter drop-shadow-lg text-white">{scene.name}</span>
                    {tour.startSceneId === scene.id && <Home size={12} className="text-amber-400 shrink-0" />}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveScene(scene.id); }}
                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl text-white"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-stone-950 border-t border-stone-800">
        <div className="text-[8px] text-stone-600 text-center font-black uppercase tracking-[0.3em]">
          by @GmedranoTIC
        </div>
      </div>
    </aside>
  );
};

export default EditorSidebar;