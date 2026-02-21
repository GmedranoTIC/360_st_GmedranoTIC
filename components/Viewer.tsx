import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Scene, Hotspot, HotspotType } from '../types';

interface ViewerProps {
  scene: Scene;
  onAddHotspot: (pos: { x: number; y: number; z: number }) => void;
  onHotspotClick: (hs: Hotspot) => void;
  selectedHotspotId: string | null;
  isPreviewMode: boolean;
}

const HOTSPOT_COLOR: Record<string, string> = {
  [HotspotType.SCENE]: 'bg-amber-700',
  [HotspotType.LINK]:  'bg-orange-800',
  [HotspotType.IMAGE]: 'bg-stone-700',
  [HotspotType.TEXT]:  'bg-blue-800',
};
const HOTSPOT_ICON: Record<string, string> = {
  [HotspotType.SCENE]: '🚪',
  [HotspotType.LINK]:  '🔗',
  [HotspotType.IMAGE]: '🖼️',
  [HotspotType.TEXT]:  '💬',
};

const Viewer: React.FC<ViewerProps> = ({ scene, onAddHotspot, onHotspotClick, selectedHotspotId, isPreviewMode }) => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef  = useRef<THREE.Scene | null>(null);
  const sphereRef      = useRef<THREE.Mesh | null>(null);
  const hotspotsLayer  = useRef<HTMLDivElement>(null);
  const lonRef         = useRef(scene.initialLon ?? 0);
  const latRef         = useRef(scene.initialLat ?? 0);
  const interacting    = useRef(false);
  const downCoord      = useRef({ x: 0, y: 0 });
  const downRot        = useRef({ lon: 0, lat: 0 });

  const addHotspotRef    = useRef(onAddHotspot);
  const hotspotClickRef  = useRef(onHotspotClick);
  const previewRef       = useRef(isPreviewMode);
  useEffect(() => { addHotspotRef.current   = onAddHotspot;   }, [onAddHotspot]);
  useEffect(() => { hotspotClickRef.current = onHotspotClick; }, [onHotspotClick]);
  useEffect(() => { previewRef.current      = isPreviewMode;  }, [isPreviewMode]);

  const [overlay, setOverlay] = useState<Hotspot | null>(null);

  useEffect(() => {
    lonRef.current = scene.initialLon ?? 0;
    latRef.current = scene.initialLat ?? 0;
  }, [scene.id, scene.initialLon, scene.initialLat]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(75, w / h, 1, 1100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ transparent: true });
    const sphere = new THREE.Mesh(geometry, material);
    threeScene.add(sphere);
    sphereRef.current = sphere;

    const updateHotspots = () => {
      if (!cameraRef.current || !hotspotsLayer.current || !containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      Array.from(hotspotsLayer.current.children).forEach((el) => {
        const raw = (el as HTMLElement).getAttribute('data-pos');
        if (!raw) return;
        const pos  = JSON.parse(raw);
        const vec  = new THREE.Vector3(pos.x, pos.y, pos.z).project(cameraRef.current!);
        const elem = el as HTMLElement;
        if (vec.z > 1) {
          elem.style.display = 'none';
        } else {
          elem.style.display = 'flex';
          elem.style.left    = `${(vec.x * 0.5 + 0.5) * cw}px`;
          elem.style.top     = `${(vec.y * -0.5 + 0.5) * ch}px`;
        }
      });
    };

    let rafId: number;
    const loop = () => {
      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      const phi   = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);
      cameraRef.current!.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta),
      );
      rendererRef.current!.render(threeScene, cameraRef.current!);
      updateHotspots();
      rafId = requestAnimationFrame(loop);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      interacting.current = true;
      downCoord.current = { x: e.clientX, y: e.clientY };
      downRot.current   = { lon: lonRef.current, lat: latRef.current };
    };
    const onMove = (e: PointerEvent) => {
      if (!interacting.current) return;
      lonRef.current = (downCoord.current.x - e.clientX) * 0.15 + downRot.current.lon;
      latRef.current = (e.clientY - downCoord.current.y) * 0.15 + downRot.current.lat;
    };
    const onUp = (e: PointerEvent) => {
      if (!interacting.current) return;
      interacting.current = false;
      const dist = Math.hypot(e.clientX - downCoord.current.x, e.clientY - downCoord.current.y);
      if (dist < 5 && !previewRef.current && sphereRef.current && cameraRef.current && containerRef.current) {
        const rect  = containerRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouse, cameraRef.current);
        const hits = ray.intersectObject(sphereRef.current);
        if (hits.length > 0) addHotspotRef.current(hits[0].point);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      cameraRef.current.fov = THREE.MathUtils.clamp(cameraRef.current.fov + e.deltaY * 0.05, 10, 100);
      cameraRef.current.updateProjectionMatrix();
    };
    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const rw = containerRef.current.clientWidth;
      const rh = containerRef.current.clientHeight;
      cameraRef.current.aspect = rw / rh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(rw, rh);
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sphereRef.current || !scene.imageSource) return;
    new THREE.TextureLoader().load(scene.imageSource, (tex) => {
      if (!sphereRef.current) return;
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }, [scene.imageSource]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const b = scene.brightness ?? 100;
    const c = scene.contrast   ?? 100;
    rendererRef.current.domElement.style.filter = `brightness(${b}%) contrast(${c}%)`;
  }, [scene.brightness, scene.contrast]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0c0a09] relative overflow-hidden touch-none cursor-grab active:cursor-grabbing">

      {/* Marca de agua - logo en la parte inferior */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none select-none opacity-70">
        <img 
          src="/logo.png" 
          alt="GmedranoTIC" 
          className="w-12 h-12 rounded-full border-2 border-white/20 shadow-lg"
        />
      </div>

      <div ref={hotspotsLayer} className="absolute inset-0 z-20" style={{ pointerEvents: 'none' }}>
        {scene.hotspots.map((hs) => (
          <button
            key={hs.id}
            data-pos={JSON.stringify(hs.position)}
            onClick={(e) => {
              e.stopPropagation();
              if (isPreviewMode) {
                if (hs.type === HotspotType.IMAGE || hs.type === HotspotType.TEXT) {
                  setOverlay(hs);
                } else {
                  hotspotClickRef.current(hs);
                }
              } else {
                hotspotClickRef.current(hs);
              }
            }}
            style={{
              pointerEvents: 'auto',
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
            }}
            className={`flex flex-col items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all group border-2 border-stone-200 shadow-xl
              ${selectedHotspotId === hs.id && !isPreviewMode ? 'ring-4 ring-amber-500 scale-125' : 'hover:scale-110'}
              ${HOTSPOT_COLOR[hs.type] ?? 'bg-stone-700'}`}
          >
            <span className="text-white text-lg drop-shadow-md pointer-events-none select-none">
              {HOTSPOT_ICON[hs.type] ?? '📍'}
            </span>
            <div className="absolute top-12 opacity-0 group-hover:opacity-100 bg-stone-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap border border-stone-700 shadow-2xl transition-all uppercase tracking-wider pointer-events-none">
              {hs.label}
            </div>
          </button>
        ))}
      </div>

      {!isPreviewMode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-stone-950/80 backdrop-blur-md border border-stone-800 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 pointer-events-none z-30">
          Click anywhere to place hotspot
        </div>
      )}

      {overlay && (
        <div
          className="absolute inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-8 animate-fadeIn"
          onClick={() => setOverlay(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-red-400 transition-colors text-5xl leading-none"
            onClick={() => setOverlay(null)}
          >
            &times;
          </button>
          {overlay.type === HotspotType.IMAGE && overlay.contentImageUrl && (
            <>
              <img
                src={overlay.contentImageUrl}
                alt={overlay.label}
                onClick={(e) => e.stopPropagation()}
                className="max-w-[88%] max-h-[72vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
              />
              <p className="mt-5 text-white font-bold text-lg tracking-wide">{overlay.label}</p>
            </>
          )}
          {overlay.type === HotspotType.TEXT && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full bg-stone-900 border border-stone-700 rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-amber-400 font-black text-xl mb-4 uppercase tracking-wider">{overlay.label}</h3>
              <p className="text-stone-200 text-base leading-relaxed whitespace-pre-wrap">{overlay.contentText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Viewer;
