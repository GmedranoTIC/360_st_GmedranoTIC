import React, { useState, useEffect } from 'react';
import { Scene, Tour, Hotspot, HotspotType } from './types';
import Viewer from './components/Viewer';
import EditorSidebar from './components/EditorSidebar';
import HotspotPanel from './components/HotspotPanel';
import { LogoSVG, LOGO_BASE64 } from './components/Logo';
import { db } from './utils/db';
import JSZip from 'jszip';
import {
  Plus, Download, Eye, Edit3, Image as ImageIcon,
  FileArchive, FilePlus, FileCode, Loader2
} from 'lucide-react';

// Convierte blob URL o data URL a base64 data URL
async function toDataURL(src: string): Promise<string> {
  const res  = await fetch(src);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Añade logo SVG en el nadir (parte inferior) de una imagen 360°
async function addLogoToNadir(imageSrc: string): Promise<string> {
  console.log('  [addLogoToNadir] Starting for image:', imageSrc.substring(0, 60));
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('  [addLogoToNadir] Image loaded:', img.width, 'x', img.height);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        // La imagen equirectangular mantiene sus dimensiones
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Dibujar la imagen original
        ctx.drawImage(img, 0, 0);
        console.log('  [addLogoToNadir] Image drawn on canvas');
        
        // Calcular posición del nadir (centro inferior de la imagen equirectangular)
        //const logoSize = Math.min(img.width, img.height) * 0.15; // 15% del tamaño menor
        const logoSize = Math.max(img.width, img.height); // 100% del tamaño mayor
        const centerX = img.width / 2;
        //const nadirY = img.height * 0.85; // 85% hacia abajo
        const nadirY = img.height * 0.93; // 93% hacia abajo
        
        console.log('  [addLogoToNadir] Logo size:', logoSize, 'at position:', centerX, nadirY);
        
        // Crear logo SVG
        //const svgData = `<svg width="${logoSize}" height="${logoSize}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
	const svgData = `<svg width="${logoSize}" height="${logoSize}*.15" viewBox="0 0 7050 500" xmlns="http://www.w3.org/2000/svg">

  	//<circle cx="24" cy="24" r="22" fill="#92400e" stroke="#fff" stroke-width="2"/>
	//buena <rect x="24" y="24" width="7000" height="400" fill="#92400e" stroke="#fff" stroke-width="2"/>
	<rect x="0" y="0" width="7050" height="400" fill="#92400e" stroke="#fff" stroke-width="0"/>
 	<text x="3500" y="170" font-size="130" fill="white" text-anchor="middle" font-family="sans-serif" letter-spacing="145">360 GmedranoTIC studio - 2026 - </text>
  	//<text x="24" y="36" font-size="6" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="sans-serif"></text>
</svg>`;
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        console.log('  [addLogoToNadir] SVG blob created');
        
        const logoImg = new Image();
        
        logoImg.onload = () => {
          try {
            console.log('  [addLogoToNadir] Logo image loaded, drawing...');
            
            // Dibujar logo en el nadir con sombra
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 1)';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.drawImage(logoImg, centerX - logoSize / 2, nadirY - logoSize / 2, logoSize, logoSize);
            ctx.restore();
            
            console.log('  [addLogoToNadir] Logo drawn successfully');
            
            URL.revokeObjectURL(svgUrl);
            
            // Convertir canvas a base64
            const result = canvas.toDataURL('image/jpeg', 0.92);
            console.log('  [addLogoToNadir] Converted to base64, length:', result.length);
            resolve(result);
          } catch (err) {
            console.error('  [addLogoToNadir] Error drawing logo:', err);
            URL.revokeObjectURL(svgUrl);
            reject(err);
          }
        };
        
        logoImg.onerror = (err) => {
          console.error('  [addLogoToNadir] Failed to load logo image:', err);
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to load logo SVG'));
        };
        
        logoImg.src = svgUrl;
      } catch (err) {
        console.error('  [addLogoToNadir] Error in onload:', err);
        reject(err);
      }
    };
    
    img.onerror = (err) => {
      console.error('  [addLogoToNadir] Failed to load source image:', err);
      reject(new Error('Failed to load source image'));
    };
    
    img.src = imageSrc;
  });
}

const App: React.FC = () => {
  const [tour, setTour] = useState<Tour>({ title: 'My 360 Tour', startSceneId: '', scenes: [] });
  const [activeSceneId,   setActiveSceneId]   = useState('');
  const [selectedHsId,    setSelectedHsId]    = useState<string | null>(null);
  const [isPreviewMode,   setIsPreviewMode]   = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);

  const activeScene    = tour.scenes.find((s) => s.id === activeSceneId) ?? null;
  const selectedHotspot = activeScene?.hotspots.find((h) => h.id === selectedHsId) ?? null;

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await db.load('current-tour');
        if (saved?.scenes?.length > 0) {
          setTour(saved);
          setActiveSceneId(saved.startSceneId || saved.scenes[0].id);
        }
      } catch (e) { console.error('Auto-load failed', e); }
    })();
  }, []);

  // Auto-guardado
  useEffect(() => {
    if (tour.scenes.length > 0 || tour.title !== 'My 360 Tour') db.save('current-tour', tour);
  }, [tour]);

  // ── Helpers de tour ──────────────────────────────────────────────────────
  const createNewTour = () => {
    if (!confirm('Create a new tour? This will delete all current scenes and hotspots.')) return;
    const t = { title: 'New 360 Tour', startSceneId: '', scenes: [] };
    setTour(t); setActiveSceneId(''); setSelectedHsId(null); db.save('current-tour', t);
  };

  const updateScene = (fields: Partial<Scene>) => {
    if (!activeSceneId) return;
    setTour(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === activeSceneId ? { ...s, ...fields } : s),
    }));
  };

  const updateHotspot = (hs: Hotspot) => {
    setTour(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === activeSceneId
          ? { ...s, hotspots: s.hotspots.map(h => h.id === hs.id ? hs : h) }
          : s,
      ),
    }));
  };

  const removeHotspot = (id: string) => {
    setTour(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === activeSceneId ? { ...s, hotspots: s.hotspots.filter(h => h.id !== id) } : s,
      ),
    }));
    setSelectedHsId(null);
  };

  const addSceneFile = (file: File) => {
    const imageSource = URL.createObjectURL(file);
    const scene: Scene = {
      id: crypto.randomUUID(), name: file.name.split('.')[0],
      imageFileName: file.name, imageSource, hotspots: [],
    };
    setTour(prev => ({ ...prev, scenes: [...prev.scenes, scene], startSceneId: prev.startSceneId || scene.id }));
    setActiveSceneId(scene.id);
  };

  const addHotspotAt = (pos: { x: number; y: number; z: number }) => {
    if (!activeSceneId) return;
    const id = crypto.randomUUID();
    const hs: Hotspot = { id, type: HotspotType.SCENE, position: pos, label: 'New Hotspot', targetSceneId: '' };
    setTour(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === activeSceneId ? { ...s, hotspots: [...s.hotspots, hs] } : s),
    }));
    setSelectedHsId(id);
  };

  // ── Guardar proyecto (.pano) ─────────────────────────────────────────────
  const saveToZip = async () => {
    setIsLoading(true);
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder('images')!;
      const scenesForJson = await Promise.all(tour.scenes.map(async (scene) => {
        const filename = scene.imageFileName || `${scene.id}.jpg`;
        if (scene.imageSource) {
          const blob = await (await fetch(scene.imageSource)).blob();
          imgFolder.file(filename, blob);
        }
        const hotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl?.startsWith('data:')) {
            const fname = `hs_${hs.id}.jpg`;
            const blob  = await (await fetch(hs.contentImageUrl)).blob();
            imgFolder.file(fname, blob);
            return { ...hs, contentImageUrl: fname };
          }
          return hs;
        }));
        return { ...scene, imageSource: filename, hotspots };
      }));
      zip.file('project.json', JSON.stringify({ ...tour, scenes: scenesForJson }, null, 2));
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${tour.title.replace(/\s+/g, '_')}.pano` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { console.error(e); alert('Save failed.'); }
    finally { setIsLoading(false); }
  };

  // ── Cargar proyecto (.pano) ──────────────────────────────────────────────
  const loadFromZip = async (file: File) => {
    setIsLoading(true);
    try {
      const zip  = await JSZip.loadAsync(file);
      const json = await zip.file('project.json')?.async('string');
      if (!json) throw new Error('Invalid .pano file');
      const data = JSON.parse(json) as Tour;
      const scenes = await Promise.all(data.scenes.map(async (scene) => {
        const imgFile = zip.file(`images/${scene.imageSource}`);
        const imageSource = imgFile ? URL.createObjectURL(await imgFile.async('blob')) : '';
        const hotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl && !hs.contentImageUrl.startsWith('data:')) {
            const f = zip.file(`images/${hs.contentImageUrl}`);
            if (f) return { ...hs, contentImageUrl: await toDataURL(URL.createObjectURL(await f.async('blob'))) };
          }
          return hs;
        }));
        return { ...scene, imageSource, hotspots };
      }));
      const newTour = { ...data, scenes };
      setTour(newTour);
      setActiveSceneId(newTour.startSceneId || newTour.scenes[0]?.id || '');
      setSelectedHsId(null);
    } catch (e) { console.error(e); alert('Failed to load .pano file.'); }
    finally { setIsLoading(false); }
  };

  // ── Exportar tour (.zip con HTML + imágenes base64 embebidas) ────────────
  // FIX 2: Las imágenes se convierten a base64 y se embeben en el HTML
  // para evitar el error "Error al cargar la imagen" en navegadores que bloquean
  // cargas de archivos locales con TextureLoader de Three.js.
  const exportAsZip = async () => {
    if (!tour.scenes.length) { alert('Add at least one scene before exporting.'); return; }
    setIsLoading(true);
    try {
      const zip       = new JSZip();
      const imgFolder = zip.folder('images')!;

      console.log('🚀 Starting export with', tour.scenes.length, 'scenes');

      // Convertir todas las imágenes a base64 para el HTML embebido
      const exportScenes = await Promise.all(tour.scenes.map(async (scene, idx) => {
        const filename = scene.imageFileName || `scene_${idx}.jpg`;
        console.log(`Processing scene ${idx + 1}:`, scene.name, '→', filename);

        let imageBase64 = '';
        
        // Guardar en carpeta images/ del ZIP y obtener base64
        if (scene.imageSource) {
          try {
            console.log('  Fetching image from:', scene.imageSource.substring(0, 50) + '...');
            
            // Añadir logo en el nadir de la imagen
            console.log('  Adding logo to nadir...');
            let imageWithLogo;
            try {
              imageWithLogo = await addLogoToNadir(scene.imageSource);
              console.log('  ✓ Logo added to nadir');
            } catch (logoError) {
              console.error('  ✗ Failed to add logo, using original image:', logoError);
              // Fallback: usar imagen original sin logo
              imageWithLogo = await toDataURL(scene.imageSource);
            }
            
            // Convertir a blob para guardar en ZIP
            const blob = await (await fetch(imageWithLogo)).blob();
            imgFolder.file(filename, blob);
            console.log('  ✓ Saved to images/' + filename, `(${(blob.size / 1024).toFixed(1)}KB)`);
            
            // Usar la imagen (con o sin logo) para base64
            imageBase64 = imageWithLogo;
            console.log('  ✓ Converted to base64', `(${(imageBase64.length / 1024).toFixed(1)}KB)`);
          } catch (err) {
            console.error('  ✗ Failed to process image:', err);
          }
        } else {
          console.warn('  ⚠ Scene has no imageSource');
        }

        const hotspots = await Promise.all(scene.hotspots.map(async (hs) => {
          if (hs.type === HotspotType.IMAGE && hs.contentImageUrl) {
            const b64 = hs.contentImageUrl.startsWith('data:')
              ? hs.contentImageUrl
              : await toDataURL(hs.contentImageUrl).catch(() => hs.contentImageUrl);
            return { ...hs, contentImageUrl: b64 };
          }
          return hs;
        }));

        return { ...scene, imageSource: `images/${filename}`, imageBase64, hotspots };
      }));

      console.log('✓ All scenes processed');

      // Logo añadido en el nadir de cada imagen
      console.log('✓ Logo embedded in nadir of all 360° images');

      // HTML del visor con imágenes embebidas en base64
      const tourJson = JSON.stringify({ ...tour, scenes: exportScenes });

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${tour.title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1c1917;overflow:hidden;font-family:system-ui,sans-serif}
    #c{width:100vw;height:100vh;cursor:grab}
    #c:active{cursor:grabbing}
    #title{position:fixed;top:20px;left:20px;color:#fff;background:rgba(0,0,0,.6);padding:10px 20px;border-radius:20px;font-weight:700;font-size:15px;pointer-events:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1)}
    #credit{position:fixed;bottom:14px;right:14px;color:rgba(255,255,255,.5);font-size:10px;font-weight:700;background:rgba(0,0,0,.35);padding:6px 12px;border-radius:7px;pointer-events:none}
    .hs{position:absolute;width:44px;height:44px;border-radius:50%;cursor:pointer;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.5);z-index:10;transition:transform .18s}
    .hs:hover{transform:translate(-50%,-50%) scale(1.18)}
    .hs-lbl{position:absolute;top:50px;background:rgba(0,0,0,.88);color:#fff;padding:5px 11px;border-radius:6px;font-size:11px;white-space:nowrap;pointer-events:none;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:0;transition:opacity .2s}
    .hs:hover .hs-lbl{opacity:1}
    #ov{position:fixed;inset:0;background:rgba(0,0,0,.94);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:100;padding:40px}
    #ov img{max-width:90%;max-height:76vh;border-radius:14px;box-shadow:0 0 60px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.1)}
    #ov-title{margin-top:20px;color:#fff;font-size:18px;font-weight:700}
    #ov-text{margin-top:12px;color:#d4d0cc;font-size:15px;line-height:1.65;white-space:pre-wrap;max-width:560px;text-align:center}
    .close{position:absolute;top:24px;right:28px;font-size:44px;color:#fff;cursor:pointer;line-height:1;transition:color .2s}
    .close:hover{color:#f87171}
    #loading{position:fixed;inset:0;background:#1c1917;display:flex;align-items:center;justify-content:center;z-index:200;color:#d97706;font-weight:700;font-size:16px;letter-spacing:.1em}
  </style>
</head>
<body>
  <div id="loading">LOADING TOUR…</div>
  <div id="title">${tour.title}</div>
  <div id="credit">360° Studio · @GmedranoTIC</div>
  <canvas id="c"></canvas>
  <div id="ov">
    <span class="close" onclick="closeOv()">&times;</span>
    <img id="ov-img" src="" style="display:none"/>
    <div id="ov-title"></div>
    <div id="ov-text"></div>
  </div>
<script>
const TOUR=${tourJson};
let cam,ren,sphere,lon=0,lat=0,px=0,py=0,pl=0,pa=0,drag=false;
const hs=[];

(function init(){
  const c=document.getElementById('c');
  cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,1,1100);
  const sc=new THREE.Scene();
  const geo=new THREE.SphereGeometry(500,60,40);
  geo.scale(-1,1,1);
  const mat=new THREE.MeshBasicMaterial();
  sphere=new THREE.Mesh(geo,mat);
  sc.add(sphere);
  ren=new THREE.WebGLRenderer({canvas:c,antialias:true});
  ren.setPixelRatio(devicePixelRatio);
  ren.setSize(innerWidth,innerHeight);
  c.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;pl=lon;pa=lat});
  window.addEventListener('pointermove',e=>{if(!drag)return;lon=(px-e.clientX)*.15+pl;lat=(e.clientY-py)*.15+pa});
  window.addEventListener('pointerup',()=>drag=false);
  window.addEventListener('wheel',e=>{cam.fov=Math.max(10,Math.min(100,cam.fov+e.deltaY*.05));cam.updateProjectionMatrix()});
  window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
  loadScene(TOUR.startSceneId||TOUR.scenes[0].id);
  loop();
})();

function loop(){
  requestAnimationFrame(loop);
  lat=Math.max(-85,Math.min(85,lat));
  const phi=THREE.MathUtils.degToRad(90-lat),th=THREE.MathUtils.degToRad(lon);
  cam.lookAt(500*Math.sin(phi)*Math.cos(th),500*Math.cos(phi),500*Math.sin(phi)*Math.sin(th));
  ren.render(ren.scene||sphere.parent,cam);
  hs.forEach(h=>{
    const v=new THREE.Vector3(h.d.position.x,h.d.position.y,h.d.position.z).project(cam);
    if(v.z>1){h.el.style.display='none'}else{
      h.el.style.display='flex';
      h.el.style.left=(v.x*.5+.5)*innerWidth+'px';
      h.el.style.top=(v.y*-.5+.5)*innerHeight+'px';
    }
  });
}

function loadScene(id){
  const data=TOUR.scenes.find(s=>s.id===id);
  if(!data)return;
  lon=data.initialLon||0; lat=data.initialLat||0;
  // FIX 2: usa base64 embebida para evitar errores de CORS/file://
  const src=data.imageBase64||data.imageSource;
  const tex=new THREE.TextureLoader().load(src,()=>{
    const mat=sphere.material;
    mat.map=tex; mat.needsUpdate=true;
    // aplicar brillo/contraste via canvas filter
    const b=data.brightness??100, co=data.contrast??100;
    ren.domElement.style.filter='brightness('+b+'%) contrast('+co+'%)';
    document.getElementById('loading').style.display='none';
    renderHotspots(data.hotspots);
  },undefined,()=>{
    document.getElementById('loading').textContent='Error loading scene image';
  });
}

function renderHotspots(list){
  hs.forEach(h=>h.el.remove()); hs.length=0;
  list.forEach(d=>{
    const el=document.createElement('div');
    el.className='hs';
    const colors={SCENE:'#b45309',LINK:'#9a3412',IMAGE:'#44403c',TEXT:'#1e40af'};
    el.style.background=colors[d.type]||'#44403c';
    const icons={SCENE:'🚪',LINK:'🔗',IMAGE:'🖼️',TEXT:'💬'};
    el.innerHTML='<span style="font-size:22px;pointer-events:none">'+(icons[d.type]||'📍')+'</span><div class="hs-lbl">'+d.label+'</div>';
    el.onclick=()=>{
      if(d.type==='SCENE'&&d.targetSceneId)loadScene(d.targetSceneId);
      else if(d.type==='LINK'&&d.targetUrl)window.open(d.targetUrl,'_blank');
      else if(d.type==='IMAGE')showOv(d.contentImageUrl,'',d.label);
      else if(d.type==='TEXT')showOv('',d.contentText,d.label);
    };
    document.body.appendChild(el);
    hs.push({el,d});
  });
}

function showOv(img,text,title){
  const ovImg=document.getElementById('ov-img');
  const ovText=document.getElementById('ov-text');
  const ovTitle=document.getElementById('ov-title');
  ovImg.style.display=img?'block':'none';
  if(img)ovImg.src=img;
  ovTitle.textContent=title||'';
  ovText.textContent=text||'';
  document.getElementById('ov').style.display='flex';
}
function closeOv(){document.getElementById('ov').style.display='none';}
document.getElementById('ov').addEventListener('click',e=>{if(e.target===e.currentTarget)closeOv();});
<\/script>
</body>
</html>`;

      zip.file('index.html', html);
      console.log('✓ HTML file created');
      console.log('🗜️ Generating ZIP...');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
      console.log('✓ ZIP generated', `(${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${tour.title.replace(/\s+/g, '_')}_tour.zip`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      console.log('✓ Download triggered');
      alert('✅ Tour exported successfully!\n\nUnzip and open index.html in your browser.');
    } catch (e) { console.error(e); alert('Export failed: ' + (e as Error).message); }
    finally { setIsLoading(false); }
  };

  const btn = "flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-white font-bold shadow-lg shadow-amber-900/40 transition-all active:scale-95 text-sm whitespace-nowrap";

  return (
    <div className="flex h-screen bg-neutral-950 text-stone-100 font-sans overflow-hidden">

      {isLoading && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
          <p className="text-lg font-bold animate-pulse text-amber-500 uppercase tracking-widest">Processing…</p>
        </div>
      )}

      <EditorSidebar
        tour={tour}
        activeSceneId={activeSceneId}
        onSelectScene={(id) => { setActiveSceneId(id); setSelectedHsId(null); }}
        onAddScene={addSceneFile}
        onRemoveScene={(id) => {
          if (!confirm('Remove this scene?')) return;
          setTour(prev => ({ ...prev, scenes: prev.scenes.filter(s => s.id !== id) }));
          if (activeSceneId === id) setActiveSceneId(tour.scenes.find(s => s.id !== id)?.id || '');
        }}
        onUpdateTourTitle={(t) => setTour(p => ({ ...p, title: t }))}
      />

      <div className="flex-1 relative flex flex-col overflow-hidden">
        <header className="h-16 border-b border-stone-800 flex items-center justify-between px-6 bg-stone-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="shrink-0"><LogoSVG /></div>
            <h1 className="text-base font-bold truncate max-w-[180px] text-stone-100 shrink-0">{tour.title}</h1>
            <button onClick={createNewTour} className={btn}><FilePlus size={15}/>New</button>
            <label className={btn + ' cursor-pointer'}>
              <FileCode size={15}/>Open
              <input type="file" accept=".pano" className="hidden" onChange={e => e.target.files?.[0] && loadFromZip(e.target.files[0])} />
            </label>
            <button onClick={saveToZip}    className={btn}><FileArchive size={15}/>Save</button>
            <button onClick={() => { setIsPreviewMode(p => !p); setSelectedHsId(null); }} className={btn}>
              {isPreviewMode ? <Edit3 size={15}/> : <Eye size={15}/>}
              {isPreviewMode ? 'Editor' : 'Preview'}
            </button>
            <button onClick={exportAsZip}  className={btn}><Download size={15}/>Export</button>
          </div>
        </header>

        <main className="flex-1 relative bg-black overflow-hidden">
          {activeScene ? (
            <Viewer
              scene={activeScene}
              onAddHotspot={addHotspotAt}
              onHotspotClick={(hs) => {
                if (isPreviewMode) {
                  if (hs.type === HotspotType.SCENE && hs.targetSceneId) setActiveSceneId(hs.targetSceneId);
                  else if (hs.type === HotspotType.LINK && hs.targetUrl) window.open(hs.targetUrl, '_blank');
                  // IMAGE y TEXT los maneja el propio Viewer con el overlay
                } else {
                  setSelectedHsId(hs.id);
                }
              }}
              selectedHotspotId={selectedHsId}
              isPreviewMode={isPreviewMode}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0c0a09]">
              <div className="max-w-md w-full p-10 bg-stone-900/40 rounded-[2.5rem] border border-stone-800 backdrop-blur-xl">
                <ImageIcon size={48} className="text-amber-600 mx-auto mb-6" />
                <h2 className="text-2xl font-black mb-4 tracking-tight text-stone-100">360° Studio</h2>
                <p className="text-stone-400 mb-8">Upload your first 360° equirectangular image to begin.</p>
                <label className="flex items-center justify-center gap-3 px-8 py-4 bg-amber-700 hover:bg-amber-600 rounded-2xl font-bold cursor-pointer transition-all shadow-lg text-white">
                  <Plus size={20}/>Add First Scene
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && addSceneFile(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}
        </main>
      </div>

      {!isPreviewMode && (
        <HotspotPanel
          hotspot={selectedHotspot}
          scenes={tour.scenes}
          activeScene={activeScene}
          onUpdate={updateHotspot}
          onRemove={removeHotspot}
          onClose={() => setSelectedHsId(null)}
          onUpdateScene={updateScene}
        />
      )}
    </div>
  );
};

export default App;
