
export enum HotspotType {
  IMAGE = 'IMAGE',
  LINK = 'LINK',
  SCENE = 'SCENE'
}

export interface Hotspot {
  id: string;
  type: HotspotType;
  position: { x: number; y: number; z: number };
  label: string;
  targetUrl?: string;
  targetSceneId?: string;
  contentImageUrl?: string; // This will still be base64 for exported HTML, but filename for local project
}

export interface Scene {
  id: string;
  name: string;
  imageFileName: string; // Reference to file in local folder
  imageSource?: string;   // Runtime Blob URL
  hotspots: Hotspot[];
}

export interface Tour {
  title: string;
  startSceneId: string;
  scenes: Scene[];
}
