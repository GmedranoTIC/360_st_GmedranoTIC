
import React from 'react';
import { Tour, Scene } from '../types';
import { Plus, Trash2, Home, Map, Upload, RefreshCcw, FileCode, PlusCircle } from 'lucide-react';

interface EditorSidebarProps {
  tour: Tour;
  activeSceneId: string;
  onSelectScene: (id: string) => void;
  onAddScene: (file: File) => void;
  onRemoveScene: (id: string) => void;
  onLoadProject: (file: File) => void;
  onUpdateTourTitle: (title: string) => void;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  tour,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onRemoveScene,
  onLoadProject,
  onUpdateTourTitle,
}) => {
  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-blue-400 font-black tracking-tighter text-2xl uppercase italic">
            <Map size={28} strokeWidth={3} />
            Pano
          </div>
          <button 
            onClick={() => { if(confirm("Reload app? Unsaved changes will be lost.")) window.location.reload(); }} 
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
            title="Reload Studio"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
        
        <div className="mb-6">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Import Archive
          </label>
          <label className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-blue-500/10 transition-all hover:border-blue-500/30 group">
            <FileCode size={18} className="text-blue-400 transition-transform group-hover:scale-110" />
            <span className="text-xs text-blue-400 font-bold">Open .pano File</span>
            <input
              type="file"
              accept=".pano"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLoadProject(e.target.files[0])}
            />
          </label>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Tour Name
          </label>
          <input
            type="text"
            value={tour.title}
            onChange={(e) => onUpdateTourTitle(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold placeholder-slate-600"
            placeholder="Project Title"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/30">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scenes ({tour.scenes.length})</h2>
          <label className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full cursor-pointer shadow-lg shadow-blue-900/40 transition-transform active:scale-90">
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
            <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-slate-800 rounded-2xl opacity-50 text-center">
              <PlusCircle size={32} className="mb-2 text-slate-700" />
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Empty Project</p>
            </div>
          )}
          {tour.scenes.map((scene) => (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                activeSceneId === scene.id ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-2xl' : 'border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              <div className="aspect-[2/1] bg-slate-800 relative">
                {scene.imageSource && (
                  <img
                    src={scene.imageSource}
                    alt={scene.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold truncate pr-4 uppercase tracking-tighter drop-shadow-lg">{scene.name}</span>
                    {tour.startSceneId === scene.id && <Home size={12} className="text-emerald-400 shrink-0" />}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveScene(scene.id); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
        <div className="text-[8px] text-slate-600 text-center font-black uppercase tracking-[0.3em]">
          Panocraft Studio v2.6
        </div>
      </div>
    </aside>
  );
};

export default EditorSidebar;
