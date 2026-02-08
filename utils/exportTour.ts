
import { Tour } from '../types';

export const exportTourAsHTML = async (tour: Tour) => {
  // For export, we need to convert current Blob URLs or local files to base64
  // so the single HTML file is truly portable as requested.
  const scenesWithBase64 = await Promise.all(
    tour.scenes.map(async (scene) => {
      if (!scene.imageSource) return scene;
      try {
        const response = await fetch(scene.imageSource);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ ...scene, imageSource: reader.result as string });
          };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to convert image for export", e);
        return scene;
      }
    })
  );

  const exportedTour = { ...tour, scenes: scenesWithBase64 };
  const tourData = JSON.stringify(exportedTour);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tour.title}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        body { margin: 0; overflow: hidden; background: #000; font-family: sans-serif; }
        #container { width: 100vw; height: 100vh; }
        .hotspot {
            position: absolute;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #fff;
            border-radius: 50%;
            cursor: pointer;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 10;
        }
        .hotspot:hover { transform: translate(-50%, -50%) scale(1.15); background: #fff; }
        .hotspot-label {
            position: absolute;
            top: 48px;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 4px 10px;
            border-radius: 6px;
            white-space: nowrap;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        #info {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            padding: 12px 24px;
            border-radius: 30px;
            font-weight: bold;
            pointer-events: none;
            border: 1px solid rgba(255,255,255,0.1);
        }
        #overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100;
            color: white;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        #overlay img { max-width: 90%; max-height: 80%; border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 50px rgba(0,0,0,0.8); }
        #overlay-text { margin-top: 20px; font-size: 18px; font-weight: bold; }
        #overlay .close { position: absolute; top: 30px; right: 30px; cursor: pointer; font-size: 40px; color: #fff; transition: transform 0.2s; }
        #overlay .close:hover { transform: scale(1.1); color: #ff4b4b; }
    </style>
</head>
<body>
    <div id="info">${tour.title}</div>
    <div id="container"></div>
    <div id="overlay">
        <span class="close" onclick="closeOverlay()">&times;</span>
        <img id="overlay-img" src="" />
        <p id="overlay-text"></p>
    </div>

    <script>
        const tourData = ${tourData};
        let currentSceneId = tourData.startSceneId;
        
        let camera, scene, renderer, sphere;
        let isUserInteracting = false;
        let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
        let lon = 0, onPointerDownLon = 0;
        let lat = 0, onPointerDownLat = 0;
        let phi = 0, theta = 0;
        const hotspotsElements = [];

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

            container.addEventListener('pointerdown', onPointerDown);
            document.addEventListener('wheel', onDocumentMouseWheel);
            window.addEventListener('resize', onWindowResize);

            loadScene(currentSceneId);
        }

        function loadScene(id) {
            const sceneData = tourData.scenes.find(s => s.id === id);
            if (!sceneData) return;
            currentSceneId = id;

            const loader = new THREE.TextureLoader();
            loader.load(sceneData.imageSource, function(texture) {
                sphere.material.map = texture;
                sphere.material.needsUpdate = true;
                renderHotspots(sceneData.hotspots);
            });
        }

        function renderHotspots(hotspots) {
            hotspotsElements.forEach(el => el.remove());
            hotspotsElements.length = 0;

            hotspots.forEach(hs => {
                const el = document.createElement('div');
                el.className = 'hotspot';
                
                let icon = '📍';
                if(hs.type === 'IMAGE') icon = '🖼️';
                if(hs.type === 'LINK') icon = '🔗';
                if(hs.type === 'SCENE') icon = '🚪';

                el.innerHTML = '<span style="font-size: 20px">' + icon + '</span><div class="hotspot-label">' + hs.label + '</div>';
                el.onclick = () => handleHotspotClick(hs);
                document.body.appendChild(el);
                hotspotsElements.push(el);
                el.userData = hs;
            });
        }

        function handleHotspotClick(hs) {
            if (hs.type === 'SCENE') {
                loadScene(hs.targetSceneId);
            } else if (hs.type === 'LINK') {
                window.open(hs.targetUrl, '_blank');
            } else if (hs.type === 'IMAGE') {
                document.getElementById('overlay-img').src = hs.contentImageUrl;
                document.getElementById('overlay-text').innerText = hs.label;
                document.getElementById('overlay').style.display = 'flex';
            }
        }

        function closeOverlay() {
            document.getElementById('overlay').style.display = 'none';
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onPointerDown(event) {
            if (event.isPrimary === false) return;
            isUserInteracting = true;
            onPointerDownMouseX = event.clientX;
            onPointerDownMouseY = event.clientY;
            onPointerDownLon = lon;
            onPointerDownLat = lat;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        }

        function onPointerMove(event) {
            if (event.isPrimary === false) return;
            lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
            lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
        }

        function onPointerUp() {
            isUserInteracting = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        }

        function onDocumentMouseWheel(event) {
            const fov = camera.fov + event.deltaY * 0.05;
            camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
            camera.updateProjectionMatrix();
        }

        function animate() {
            requestAnimationFrame(animate);
            update();
        }

        function update() {
            lat = Math.max(-85, Math.min(85, lat));
            phi = THREE.MathUtils.degToRad(90 - lat);
            theta = THREE.MathUtils.degToRad(lon);

            const x = 500 * Math.sin(phi) * Math.cos(theta);
            const y = 500 * Math.cos(phi);
            const z = 500 * Math.sin(phi) * Math.sin(theta);

            camera.lookAt(x, y, z);
            renderer.render(scene, camera);
            updateHotspotPositions();
        }

        function updateHotspotPositions() {
            hotspotsElements.forEach(el => {
                const hs = el.userData;
                const pos = new THREE.Vector3(hs.position.x, hs.position.y, hs.position.z);
                pos.project(camera);

                if (pos.z > 1) {
                    el.style.display = 'none';
                } else {
                    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (pos.y * -0.5 + 0.5) * window.innerHeight;
                    el.style.display = 'flex';
                    el.style.left = x + 'px';
                    el.style.top = y + 'px';
                }
            });
        }
    </script>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tour.title.replace(/\s+/g, '_')}_tour.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
