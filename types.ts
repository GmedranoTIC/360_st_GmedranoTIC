export enum HotspotType {
  IMAGE = 'IMAGE',
  LINK = 'LINK',
  SCENE = 'SCENE',
  TEXT = 'TEXT'
}

export interface Hotspot {
  id: string;
  type: HotspotType;
  position: { x: number; y: number; z: number };
  label: string;
  targetUrl?: string;
  targetSceneId?: string;
  contentImageUrl?: string;
  contentText?: string;
}

export interface Scene {
  id: string;
  name: string;
  imageFileName: string;
  imageSource?: string;
  hotspots: Hotspot[];
  brightness?: number;   // 0-200, default 100
  contrast?: number;     // 0-200, default 100
  initialLon?: number;   // -180 a 180, default 0
  initialLat?: number;   // -85 a 85, default 0
}

export interface Tour {
  title: string;
  startSceneId: string;
  scenes: Scene[];
}
