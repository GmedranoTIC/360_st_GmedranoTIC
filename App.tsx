import React, { useState, useEffect, useCallback } from 'react';
import { Scene, Tour, Hotspot, HotspotType } from './types';
import Viewer from './components/Viewer';
import EditorSidebar from './components/EditorSidebar';
import HotspotPanel from './components/HotspotPanel';
import { db } from './utils/db';
import JSZip from 'jszip';
import { 
  Plus, 
  Download, 
  Eye, 
  Edit3, 
  Image as ImageIcon, 
  FileArchive, 
  FilePlus,
  FileCode,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [tour, setTour] = useState<Tour>({
    title: 'My 360 Tour',
    startSceneId: '',
    scenes: [],
  });
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const activeScene = tour.scenes.find((s) => s.id === activeSceneId);
  const selectedHotspot = activeScene?.hotspots.find((h) => h.id === selectedHotspotId);

  useEffect(() => {
    const init = async () => {
      // No setear isLoading(true) en la carga inicial
      try {
        const savedTour = await db.load('current-tour');
        if (savedTour && savedTour.scenes && savedTour.scenes.length > 0) {
          setTour(savedTour);
          setActiveSceneId(savedTour.startSceneId || savedTour.scenes[0].id);
        }
      } catch (e) {
        console.error("Auto-load failed", e);
      }
      // No hay finally, el editor carga inmediatamente
    };
    init();
  }, []);

  useEffect(() => {
    if (tour.scenes.length > 0 || tour.title !== 'My 360 Tour') {
      db.save('current-tour', tour);
    }
  }, [tour]);

  const createNewTour = () => {
    if (confirm("Create a new tour? This will delete all current scenes and hotspots.")) {
      const freshTour = { title: 'New 360 Tour', startSceneId: '', scenes: [] };
      setTour(freshTour);
      setActiveSceneId('');
      setSelectedHotspotId(null);
      db.save('current-tour', freshTour);
    }
  };

  const updateHotspot = (updatedHs: Hotspot) => {
    setTour((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === activeSceneId
          ? {
              ...s,
              hotspots: s.hotspots.map((h) => (h.id === updatedHs.id ? updatedHs : h)),
            }
          : s
      ),
    }));
  };

  const removeHotspot = (id: string) => {
    setTour((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === activeSceneId
          ? {
              ...s,
              hotspots: s.hotspots.filter((h) => h.id !== id),
            }
          : s
      ),
    }));
    setSelectedHotspotId(null);
  };

  const saveToZip = async () => {
    setIsLoading(true);
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      
      const scenesForJson = await Promise.all(tour.scenes.map(async (scene) => {
        const filename = scene.imageFileName || `${scene.id}.jpg`;
        if (scene.imageSource) {
          const res = await fetch(scene.imageSource);
          const blob = await res.blob();
          imgFolder?.file(filename, blob);
        }
        
        const updatedHotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl?.startsWith('data:')) {
            const hsFilename = `content_${hs.id}.jpg`;
            const res = await fetch(hs.contentImageUrl);
            const blob = await res.blob();
            imgFolder?.file(hsFilename, blob);
            return { ...hs, contentImageUrl: hsFilename };
          }
          return hs;
        }));

        return { ...scene, imageSource: filename, hotspots: updatedHotspots };
      }));

      const projectData = { ...tour, scenes: scenesForJson };
      zip.file("project.json", JSON.stringify(projectData, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tour.title.replace(/\s+/g, '_')}.pano`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Save failed", e);
      alert("Project save failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromZip = async (file: File) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const projectJson = await zip.file("project.json")?.async("string");
      if (!projectJson) throw new Error("Invalid .pano file");

      const projectData = JSON.parse(projectJson) as Tour;
      
      const reconstructedScenes = await Promise.all(projectData.scenes.map(async (scene) => {
        const imgFile = zip.file(`images/${scene.imageSource}`);
        let imageSource = '';
        if (imgFile) {
          const blob = await imgFile.async("blob");
          imageSource = URL.createObjectURL(blob);
        }

        const reconstructedHotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl && !hs.contentImageUrl.startsWith('data:')) {
            const hsImgFile = zip.file(`images/${hs.contentImageUrl}`);
            if (hsImgFile) {
              const blob = await hsImgFile.async("blob");
              return new Promise<Hotspot>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ ...hs, contentImageUrl: reader.result as string });
                reader.readAsDataURL(blob);
              });
            }
          }
          return hs;
        }));

        return { ...scene, imageSource, hotspots: reconstructedHotspots };
      }));

      const newTour = { ...projectData, scenes: reconstructedScenes };
      setTour(newTour);
      setActiveSceneId(newTour.startSceneId || (newTour.scenes.length > 0 ? newTour.scenes[0].id : ''));
      setSelectedHotspotId(null);
    } catch (e) {
      console.error("Load failed", e);
      alert("Failed to load project file.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportAsZip = async () => {
    if (tour.scenes.length === 0) {
      alert("Por favor añade al menos una escena antes de exportar.");
      return;
    }
    setIsLoading(true);
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      
      if (!imgFolder) {
        throw new Error("No se pudo crear la carpeta de imágenes");
      }
      
      const exportedScenes = await Promise.all(tour.scenes.map(async (scene, index) => {
        // Usar nombre de archivo o generar uno basado en el índice
        let filename = scene.imageFileName || `scene_${index}.jpg`;
        
        // Guardar imagen de la escena
        if (scene.imageSource) {
          try {
            const res = await fetch(scene.imageSource);
            const blob = await res.blob();
            imgFolder.file(filename, blob);
            console.log(`✓ Imagen guardada: ${filename}`);
          } catch (err) {
            console.error(`✗ Error al guardar imagen de escena ${scene.name}:`, err);
          }
        }
        
        // Procesar hotspots con imágenes
        const updatedHotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl) {
            // Si es una imagen en base64 o blob URL
            if (hs.contentImageUrl.startsWith('data:') || hs.contentImageUrl.startsWith('blob:')) {
              const hsFilename = `hotspot_${hs.id}.jpg`;
              try {
                const res = await fetch(hs.contentImageUrl);
                const blob = await res.blob();
                imgFolder.file(hsFilename, blob);
                console.log(`✓ Imagen hotspot guardada: ${hsFilename}`);
                return { ...hs, contentImageUrl: `images/${hsFilename}` };
              } catch (err) {
                console.error(`✗ Error al guardar imagen del hotspot ${hs.id}:`, err);
              }
            }
          }
          return hs;
        }));

        return {
          ...scene,
          imageSource: `images/${filename}`,
          hotspots: updatedHotspots
        };
      }));

      const exportData = { ...tour, scenes: exportedScenes };
      
      const viewerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tour.title}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        body { 
            margin: 0; 
            overflow: hidden; 
            background: #1c1917; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        }
        #container { 
            width: 100vw; 
            height: 100vh; 
            cursor: grab; 
        }
        #container:active { 
            cursor: grabbing; 
        }
        .hotspot { 
            position: absolute; 
            width: 44px; 
            height: 44px; 
            background: rgba(255,255,255,0.95); 
            border: 3px solid #fff; 
            border-radius: 50%; 
            cursor: pointer; 
            transform: translate(-50%, -50%); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 4px 16px rgba(0,0,0,0.5); 
            z-index: 10; 
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
        }
        .hotspot:hover { 
            transform: translate(-50%, -50%) scale(1.2); 
            background: #fff; 
            box-shadow: 0 6px 20px rgba(0,0,0,0.6); 
        }
        .hotspot-label { 
            position: absolute; 
            top: 52px; 
            background: rgba(0,0,0,0.9); 
            color: #fff; 
            padding: 6px 12px; 
            border-radius: 6px; 
            font-size: 12px; 
            white-space: nowrap; 
            pointer-events: none; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        #overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.95); 
            display: none; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            z-index: 100; 
            color: white; 
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { 
            from { opacity: 0; } 
            to { opacity: 1; } 
        }
        #overlay img { 
            max-width: 90%; 
            max-height: 80%; 
            border-radius: 12px; 
            box-shadow: 0 0 60px rgba(0,0,0,0.8); 
            border: 2px solid rgba(255,255,255,0.1);
        }
        #overlay-text {
            margin-top: 24px;
            font-size: 20px;
            font-weight: 600;
        }
        .close-btn { 
            position: absolute; 
            top: 30px; 
            right: 30px; 
            font-size: 48px; 
            cursor: pointer; 
            color: #fff;
            transition: all 0.2s;
            line-height: 1;
        }
        .close-btn:hover {
            color: #ff4b4b;
            transform: scale(1.1);
        }
        #attribution { 
            position: fixed; 
            bottom: 16px; 
            right: 16px; 
            color: rgba(255,255,255,0.6); 
            font-size: 11px; 
            font-weight: 600; 
            background: rgba(0,0,0,0.4); 
            padding: 8px 14px; 
            border-radius: 8px; 
            pointer-events: none; 
            backdrop-filter: blur(8px);
        }
        #title-overlay { 
            position: fixed; 
            top: 24px; 
            left: 24px; 
            color: white; 
            background: rgba(0,0,0,0.6); 
            padding: 12px 24px; 
            border-radius: 24px; 
            font-weight: 700; 
            pointer-events: none; 
            border: 1px solid rgba(255,255,255,0.15); 
            backdrop-filter: blur(8px);
            font-size: 16px;
        }
        #loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 18px;
            background: rgba(0,0,0,0.8);
            padding: 20px 40px;
            border-radius: 12px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="loading">Cargando tour...</div>
    <div id="title-overlay">${tour.title}</div>
    <div id="attribution">360° Studio by @GmedranoTIC</div>
    <div id="container"></div>
    <div id="overlay">
        <span class="close-btn" onclick="document.getElementById('overlay').style.display='none'">&times;</span>
        <img id="overlay-img" />
        <p id="overlay-text"></p>
    </div>
    <script>
        const tourData = ${JSON.stringify(exportData)};
        let camera, scene, renderer, sphere, currentSceneId;
        const hotspots = [];
        let lon = 0, lat = 0, phi = 0, theta = 0;
        let isUserInteracting = false, onPointerDownPointerX = 0, onPointerDownPointerY = 0, onPointerDownLon = 0, onPointerDownLat = 0;

        init();
        animate();

        function init() {
            const container = document.getElementById('container');
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
            scene = new THREE.Scene();
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1);
            const material = new THREE.MeshBasicMaterial();
            sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);
            document.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('resize', onWindowResize);
            document.addEventListener('wheel', (e) => {
                camera.fov = Math.max(10, Math.min(100, camera.fov + e.deltaY * 0.05));
                camera.updateProjectionMatrix();
            });
            loadScene(tourData.startSceneId || tourData.scenes[0].id);
        }

        function loadScene(id) {
            const data = tourData.scenes.find(s => s.id === id);
            if (!data) {
                console.error('Escena no encontrada:', id);
                return;
            }
            currentSceneId = id;
            
            const loader = new THREE.TextureLoader();
            loader.load(
                data.imageSource, 
                (texture) => {
                    sphere.material.map = texture;
                    sphere.material.needsUpdate = true;
                    renderHotspots(data.hotspots);
                    document.getElementById('loading').style.display = 'none';
                }, 
                undefined, 
                (err) => {
                    console.error("Error cargando textura:", err);
                    document.getElementById('loading').textContent = 'Error al cargar imagen';
                }
            );
        }

        function renderHotspots(list) {
            hotspots.forEach(h => h.el.remove());
            hotspots.length = 0;
            list.forEach(hs => {
                const el = document.createElement('div');
                el.className = 'hotspot';
                let icon = hs.type==='SCENE'?'🚪':hs.type==='LINK'?'🔗':'🖼️';
                el.innerHTML = '<span style="font-size:24px">'+icon+'</span><div class="hotspot-label">'+hs.label+'</div>';
                el.onclick = () => {
                    if(hs.type==='SCENE') loadScene(hs.targetSceneId);
                    else if(hs.type==='LINK') window.open(hs.targetUrl, '_blank');
                    else if(hs.type==='IMAGE') {
                        document.getElementById('overlay-img').src = hs.contentImageUrl;
                        document.getElementById('overlay-text').innerText = hs.label;
                        document.getElementById('overlay').style.display = 'flex';
                    }
                };
                document.body.appendChild(el);
                hotspots.push({ el, data: hs });
            });
        }

        function onPointerDown(e) {
            isUserInteracting = true;
            onPointerDownPointerX = e.clientX;
            onPointerDownPointerY = e.clientY;
            onPointerDownLon = lon;
            onPointerDownLat = lat;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        }
        function onPointerMove(e) {
            lon = (onPointerDownPointerX - e.clientX) * 0.15 + onPointerDownLon;
            lat = (e.clientY - onPointerDownPointerY) * 0.15 + onPointerDownLat;
        }
        function onPointerUp() {
            isUserInteracting = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        }
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        function animate() {
            requestAnimationFrame(animate);
            lat = Math.max(-85, Math.min(85, lat));
            phi = THREE.MathUtils.degToRad(90 - lat);
            theta = THREE.MathUtils.degToRad(lon);
            camera.lookAt(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
            renderer.render(scene, camera);
            hotspots.forEach(h => {
                const v = new THREE.Vector3(h.data.position.x, h.data.position.y, h.data.position.z);
                v.project(camera);
                if(v.z > 1) h.el.style.display = 'none';
                else {
                    h.el.style.display = 'flex';
                    h.el.style.left = (v.x * 0.5 + 0.5) * window.innerWidth + 'px';
                    h.el.style.top = (v.y * -0.5 + 0.5) * window.innerHeight + 'px';
                }
            });
        }
    </script>
</body>
</html>`;
      
      zip.file("index.html", viewerHtml);
      
      console.log("Generando archivo ZIP...");
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tour.title.replace(/\s+/g, '_')}_tour.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("✓ Tour exportado exitosamente");
      alert("Tour exportado exitosamente. El ZIP contiene index.html y la carpeta images/");
    } catch (e) {
      console.error("Error en la exportación:", e);
      alert("Error al exportar el tour: " + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const addSceneFile = async (file: File) => {
    const imageSource = URL.createObjectURL(file);
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: file.name.split('.')[0],
      imageFileName: file.name,
      imageSource: imageSource,
      hotspots: [],
    };

    setTour((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
      startSceneId: prev.startSceneId || newScene.id
    }));
    
    setActiveSceneId(newScene.id);
  };

  const addHotspotAt = (pos: { x: number, y: number, z: number }) => {
    if (!activeSceneId) return;
    const newId = crypto.randomUUID();
    const newHs: Hotspot = {
      id: newId,
      type: HotspotType.SCENE,
      position: pos,
      label: 'New Hotspot',
      targetSceneId: '',
    };

    setTour(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === activeSceneId ? { ...s, hotspots: [...s.hotspots, newHs] } : s)
    }));
    setSelectedHotspotId(newId);
  };

  const amberBtnClass = "flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-white font-bold shadow-lg shadow-amber-900/40 transition-all active:scale-95 text-sm whitespace-nowrap";

  return (
    <div className="flex h-screen bg-neutral-950 text-stone-100 font-sans overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
          <p className="text-lg font-bold animate-pulse text-amber-500 uppercase tracking-widest">Processing...</p>
        </div>
      )}

      <EditorSidebar
        tour={tour}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
        onAddScene={addSceneFile}
        onRemoveScene={(id) => {
          if(confirm("Remove this scene?")) {
            setTour(prev => ({ ...prev, scenes: prev.scenes.filter(s => s.id !== id) }));
            if(activeSceneId === id) setActiveSceneId(tour.scenes.find(s => s.id !== id)?.id || '');
          }
        }}
        onUpdateTourTitle={(t) => setTour(p => ({ ...p, title: t }))}
      />

      <div className="flex-1 relative flex flex-col">
        <header className="h-16 border-b border-stone-800 flex items-center justify-between px-6 bg-stone-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <h1 className="text-xl font-bold truncate max-w-[200px] text-stone-100 shrink-0">{tour.title}</h1>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={createNewTour}
                className={amberBtnClass}
              >
                <FilePlus size={16} />
                New Tour
              </button>

              <label className={amberBtnClass + " cursor-pointer"}>
                <FileCode size={16} />
                Open .pano
                <input
                  type="file"
                  accept=".pano"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && loadFromZip(e.target.files[0])}
                />
              </label>

              <button
                onClick={saveToZip}
                className={amberBtnClass}
              >
                <FileArchive size={16} />
                Save .pano
              </button>

              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={amberBtnClass}
              >
                {isPreviewMode ? <Edit3 size={16} /> : <Eye size={16} />}
                {isPreviewMode ? 'Editor' : 'Preview'}
              </button>

              <button
                onClick={exportAsZip}
                className={amberBtnClass}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 relative bg-black">
          {activeScene ? (
            <Viewer
              scene={activeScene}
              onAddHotspot={addHotspotAt}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0c0a09]">
              <div className="max-w-md w-full p-10 bg-stone-900/40 rounded-[2.5rem] border border-stone-800 backdrop-blur-xl">
                <ImageIcon size={48} className="text-amber-600 mx-auto mb-6" />
                <h2 className="text-2xl font-black mb-4 tracking-tight text-stone-100">360º Studio</h2>
                <p className="text-stone-400 mb-8">Ready to build your tour? Upload your first 360&deg; equirectangular image to begin.</p>
                <label className="flex items-center justify-center gap-3 px-8 py-4 bg-amber-700 hover:bg-amber-600 rounded-2xl font-bold cursor-pointer transition-all shadow-lg shadow-amber-900/40 text-white">
                  <Plus size={20} />
                  Add First Scene
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addSceneFile(e.target.files[0])} />
                </label>
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