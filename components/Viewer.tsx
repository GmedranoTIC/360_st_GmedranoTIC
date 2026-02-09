
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Scene, Hotspot, HotspotType } from '../types';

interface ViewerProps {
  scene: Scene;
  onAddHotspot: (pos: { x: number; y: number; z: number }) => void;
  onHotspotClick: (hs: Hotspot) => void;
  selectedHotspotId: string | null;
  isPreviewMode: boolean;
}

const Viewer: React.FC<ViewerProps> = ({ scene, onAddHotspot, onHotspotClick, selectedHotspotId, isPreviewMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const hotspotsLayerRef = useRef<HTMLDivElement>(null);
  
  const lon = useRef(0);
  const lat = useRef(0);
  const isInteracting = useRef(false);
  const pointerDownCoord = useRef({ x: 0, y: 0 });
  const pointerDownRot = useRef({ lon: 0, lat: 0 });

  // Callback stability
  const onAddHotspotRef = useRef(onAddHotspot);
  const isPreviewModeRef = useRef(isPreviewMode);
  useEffect(() => { onAddHotspotRef.current = onAddHotspot; }, [onAddHotspot]);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // DoubleSide is more robust for raycasting from within
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });
    const sphere = new THREE.Mesh(geometry, material);
    threeScene.add(sphere);
    sphereRef.current = sphere;

    const updateHotspotsUI = () => {
      if (!cameraRef.current || !hotspotsLayerRef.current || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const elements = hotspotsLayerRef.current.children;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const data = el.getAttribute('data-pos');
        if (!data) continue;
        
        const pos = JSON.parse(data);
        const vec = new THREE.Vector3(pos.x, pos.y, pos.z);
        vec.project(cameraRef.current);

        if (vec.z > 1) {
          el.style.display = 'none';
        } else {
          el.style.display = 'flex';
          el.style.left = `${(vec.x * 0.5 + 0.5) * w}px`;
          el.style.top = `${(vec.y * -0.5 + 0.5) * h}px`;
        }
      }
    };

    let animationId: number;
    const renderLoop = () => {
      if (!rendererRef.current || !cameraRef.current || !threeSceneRef.current) return;
      
      lat.current = Math.max(-85, Math.min(85, lat.current));
      const phi = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      cameraRef.current.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      rendererRef.current.render(threeScene, cameraRef.current);
      updateHotspotsUI();
      animationId = requestAnimationFrame(renderLoop);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isInteracting.current = true;
      pointerDownCoord.current = { x: e.clientX, y: e.clientY };
      pointerDownRot.current = { lon: lon.current, lat: lat.current };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isInteracting.current) return;
      lon.current = (pointerDownCoord.current.x - e.clientX) * 0.15 + pointerDownRot.current.lon;
      lat.current = (e.clientY - pointerDownCoord.current.y) * 0.15 + pointerDownRot.current.lat;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isInteracting.current) return;
      isInteracting.current = false;
      
      const dist = Math.hypot(e.clientX - pointerDownCoord.current.x, e.clientY - pointerDownCoord.current.y);
      
      // If it's a discrete click and not preview mode
      if (dist < 5 && !isPreviewModeRef.current) {
        if (!rendererRef.current || !cameraRef.current || !containerRef.current || !sphereRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current!);
        // Increase precision for large scenes
        raycaster.params.Mesh.threshold = 0;
        
        const intersects = raycaster.intersectObject(sphereRef.current!);
        if (intersects.length > 0) {
          // Send the point of intersection on the sphere
          onAddHotspotRef.current({
            x: intersects[0].point.x,
            y: intersects[0].point.y,
            z: intersects[0].point.z
          });
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      cameraRef.current.fov = THREE.MathUtils.clamp(cameraRef.current.fov + e.deltaY * 0.05, 10, 100);
      cameraRef.current.updateProjectionMatrix();
    };

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      if (containerRef.current) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('wheel', onWheel);
        containerRef.current.innerHTML = '';
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Update image texture
  useEffect(() => {
    if (!sphereRef.current || !scene.imageSource) return;
    const loader = new THREE.TextureLoader();
    loader.load(scene.imageSource, (texture) => {
      if (sphereRef.current) {
        const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
        mat.map = texture;
        mat.needsUpdate = true;
      }
    });
  }, [scene.imageSource]);

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden touch-none cursor-grab active:cursor-grabbing">
      <div ref={hotspotsLayerRef} className="absolute inset-0 pointer-events-none z-20">
        {scene.hotspots.map((hs) => (
          <div
            key={hs.id}
            data-pos={JSON.stringify(hs.position)}
            onClick={(e) => { e.stopPropagation(); onHotspotClick(hs); }}
            className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full cursor-pointer transition-all pointer-events-auto group
              ${selectedHotspotId === hs.id && !isPreviewMode ? 'ring-4 ring-blue-500 scale-125' : 'hover:scale-110'}
              ${hs.type === HotspotType.SCENE ? 'bg-blue-600' : hs.type === HotspotType.LINK ? 'bg-orange-600' : 'bg-purple-600'}
              border-2 border-white shadow-xl`}
          >
            <span className="text-white text-lg drop-shadow-md pointer-events-none">
              {hs.type === HotspotType.SCENE ? '🚪' : hs.type === HotspotType.LINK ? '🔗' : '🖼️'}
            </span>
            <div className="absolute top-12 opacity-0 group-hover:opacity-100 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap border border-white/10 shadow-2xl transition-all uppercase tracking-wider">
              {hs.label}
            </div>
          </div>
        ))}
      </div>
      
      {!isPreviewMode && (
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 pointer-events-none z-30 shadow-2xl ring-1 ring-blue-500/20">
            Click Anywhere to Place Hotspot
         </div>
      )}
    </div>
  );
};

export default Viewer;
