
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Scene, Tour, Hotspot, HotspotType } from './types';
import Viewer from './components/Viewer';
import EditorSidebar from './components/EditorSidebar';
import HotspotPanel from './components/HotspotPanel';
import { exportTourAsHTML } from './utils/exportTour';
import { db } from './utils/db';
import JSZip from 'jszip';
import { Plus, Download, Eye, Edit3, Image as ImageIcon, FileArchive, Save, Trash2, Info, Upload } from 'lucide-react';

const App: React.FC = () => {
  const [tour, setTour] = useState<Tour>({
    title: 'My 360 Tour',
    startSceneId: '',
    scenes: [],
  });
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const activeScene = tour.scenes.find((s) => s.id === activeSceneId);
  const selectedHotspot = activeScene?.hotspots.find((h) => h.id === selectedHotspotId);

  // Load from IndexedDB on startup
  useEffect(() => {
    const init = async () => {
      try {
        const savedTour = await db.load('current-tour');
        if (savedTour && savedTour.scenes && savedTour.scenes.length > 0) {
          setTour(savedTour);
          setActiveSceneId(savedTour.startSceneId || savedTour.scenes[0].id);
        }
      } catch (e) {
        console.error("Auto-load failed", e);
      }
    };
    init();
  }, []);

  // Save to ZIP (.pano)
  const saveToZip = async () => {
    try {
      setIsLoading(true);
      const zip = new JSZip();
      
      const cleanScenes = await Promise.all(tour.scenes.map(async (scene) => {
        const { imageSource, ...rest } = scene;
        if (imageSource) {
          try {
            const response = await fetch(imageSource);
            const blob = await response.blob();
            zip.file(`images/${scene.imageFileName}`, blob);
          } catch (e) {
            console.warn(`Could not include image ${scene.imageFileName} in ZIP`, e);
          }
        }
        
        const updatedHotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl && hs.contentImageUrl.startsWith('data:')) {
             const res = await fetch(hs.contentImageUrl);
             const blob = await res.blob();
             const filename = `content_${hs.id}.jpg`;
             zip.file(`images/${filename}`, blob);
             return { ...hs, contentImageUrl: filename };
          }
          return hs;
        }));

        return { ...rest, hotspots: updatedHotspots };
      }));

      const projectJson = { ...tour, scenes: cleanScenes };
      zip.file('project.json', JSON.stringify(projectJson, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tour.title.replace(/\s+/g, '_')}_project.pano`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await db.save('current-tour', tour);
      setIsDirty(false);
      alert("Project saved successfully!");
    } catch (e) {
      console.error("ZIP export failed", e);
      alert("Failed to create project file.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromZip = async (file: File) => {
    try {
      setIsLoading(true);
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file('project.json');
      if (!jsonFile) throw new Error("Missing project.json in archive");

      const jsonText = await jsonFile.async('string');
      const loadedTour: Tour = JSON.parse(jsonText);

      const hydratedScenes = await Promise.all(loadedTour.scenes.map(async (scene) => {
        const imgFile = zip.file(`images/${scene.imageFileName}`);
        let imageSource = '';
        if (imgFile) {
          const blob = await imgFile.async('blob');
          imageSource = URL.createObjectURL(blob);
        }

        const hydratedHotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl && !hs.contentImageUrl.startsWith('data:')) {
            const hsImgFile = zip.file(`images/${hs.contentImageUrl}`);
            if (hsImgFile) {
              const blob = await hsImgFile.async('blob');
              return { ...hs, contentImageUrl: await blobToBase64(blob) };
            }
          }
          return hs;
        }));

        return { ...scene, imageSource, hotspots: hydratedHotspots };
      }));

      const finalTour = { ...loadedTour, scenes: hydratedScenes };
      setTour(finalTour);
      if (finalTour.scenes.length > 0) setActiveSceneId(finalTour.startSceneId || finalTour.scenes[0].id);
      setIsDirty(false);
      await db.save('current-tour', finalTour);
    } catch (e) {
      console.error("ZIP import failed", e);
      alert("Error loading .pano file.");
    } finally {
      setIsLoading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const addScene = useCallback(async (file: File) => {
    const imageSource = URL.createObjectURL(file);
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: file.name.split('.')[0],
      imageFileName: file.name,
      imageSource: imageSource,
      hotspots: [],
    };

    setTour((prev) => {
      const updated = {
        ...prev,
        scenes: [...prev.scenes, newScene],
        startSceneId: prev.startSceneId || newScene.id,
      };
      db.save('current-tour', updated);
      return updated;
    });
    setActiveSceneId(newScene.id);
    setIsDirty(true);
  }, []);

  const updateHotspot = useCallback((updated: Hotspot) => {
    setTour((prev) => {
      const next = {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === activeSceneId
            ? { ...s, hotspots: s.hotspots.map((h) => (h.id === updated.id ? updated : h)) }
            : s
        ),
      };
      db.save('current-tour', next);
      return next;
    });
    setIsDirty(true);
  }, [activeSceneId]);

  const addHotspot = useCallback((position: { x: number; y: number; z: number }) => {
    if (!activeSceneId || isPreviewMode) return;

    const newId = crypto.randomUUID();
    const newHotspot: Hotspot = {
      id: newId,
      type: HotspotType.SCENE,
      position: { x: position.x, y: position.y, z: position.z },
      label: 'New Hotspot',
      targetSceneId: '',
      targetUrl: '',
      contentImageUrl: '',
    };

    setTour((prev) => {
      const updated = {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === activeSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
        ),
      };
      db.save('current-tour', updated);
      return updated;
    });
    
    setSelectedHotspotId(newId);
    setIsDirty(true);
  }, [activeSceneId, isPreviewMode]);

  const removeHotspot = useCallback((id: string) => {
    setTour((prev) => {
      const updated = {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === activeSceneId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== id) } : s
        ),
      };
      db.save('current-tour', updated);
      return updated;
    });
    setSelectedHotspotId(null);
    setIsDirty(true);
  }, [activeSceneId]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <EditorSidebar
        tour={tour}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
        onAddScene={addScene}
        onRemoveScene={(id) => {
            if (!confirm("Remove this scene?")) return;
            setTour(prev => {
                const nextScenes = prev.scenes.filter(s => s.id !== id);
                return { ...prev, scenes: nextScenes, startSceneId: prev.startSceneId === id ? (nextScenes[0]?.id || '') : prev.startSceneId };
            });
            setIsDirty(true);
        }}
        onLoadProject={loadFromZip}
        onUpdateTourTitle={(title) => { setTour((prev) => ({ ...prev, title })); setIsDirty(true); }}
      />

      <div className="flex-1 relative flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              {tour.title}
            </h1>
            {isDirty && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase font-black tracking-widest">Unsaved</span>}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={saveToZip}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700 font-medium disabled:opacity-50"
            >
              <Save size={18} />
              {isLoading ? 'Processing...' : 'Save .pano'}
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${isPreviewMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}
            >
              {isPreviewMode ? <Edit3 size={18} /> : <Eye size={18} />}
              {isPreviewMode ? 'Editor' : 'Preview'}
            </button>
            <button
              onClick={() => exportTourAsHTML(tour)}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold shadow-lg shadow-blue-900/20"
            >
              <Download size={18} />
              Export HTML
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden bg-black">
          {activeScene ? (
            <Viewer
              scene={activeScene}
              onAddHotspot={addHotspot}
              onHotspotClick={(hs) => {
                if (isPreviewMode) {
                  if (hs.type === HotspotType.SCENE && hs.targetSceneId) setActiveSceneId(hs.targetSceneId);
                  else if (hs.type === HotspotType.LINK && hs.targetUrl) window.open(hs.targetUrl, '_blank');
                  else if (hs.type === HotspotType.IMAGE) setSelectedHotspotId(hs.id);
                } else {
                  setSelectedHotspotId(hs.id);
                }
              }}
              selectedHotspotId={selectedHotspotId}
              isPreviewMode={isPreviewMode}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-md w-full p-10 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 backdrop-blur-xl">
                <ImageIcon size={48} className="text-blue-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black mb-4 tracking-tight">Panocraft 360 Studio</h2>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                    <Plus size={20} />
                    New 360 Scene
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addScene(e.target.files[0])} />
                  </label>
                  <label className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold border border-slate-700 cursor-pointer transition-all active:scale-95">
                    <Upload size={20} />
                    Load .pano Project
                    <input type="file" accept=".pano" className="hidden" onChange={(e) => e.target.files?.[0] && loadFromZip(e.target.files[0])} />
                  </label>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {!isPreviewMode && (
        <HotspotPanel
          hotspot={selectedHotspot || null}
          scenes={tour.scenes}
          onUpdate={updateHotspot}
          onRemove={removeHotspot}
          onClose={() => setSelectedHotspotId(null)}
        />
      )}
    </div>
  );
};

export default App;
