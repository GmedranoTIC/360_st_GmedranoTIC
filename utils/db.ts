
export class ProjectDatabase {
  private dbName = 'PanocraftDB';
  private storeName = 'projects';

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async save(key: string, data: any): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(data, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error("IndexedDB Save Failed", err);
    }
  }

  async load(key: string): Promise<any> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const request = tx.objectStore(this.storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB Load Failed", err);
      return null;
    }
  }
}

export const db = new ProjectDatabase();
