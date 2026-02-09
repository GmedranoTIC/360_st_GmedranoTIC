
export class ProjectDatabase {
  private dbName = 'PanocraftDB';
  private storeName = 'projects';

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Timeout de seguridad
      const timeout = setTimeout(() => {
        reject(new Error('IndexedDB timeout'));
      }, 5000);

      try {
        const request = indexedDB.open(this.dbName, 1);
        
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        
        request.onsuccess = () => {
          clearTimeout(timeout);
          resolve(request.result);
        };
        
        request.onerror = () => {
          clearTimeout(timeout);
          reject(request.error);
        };
        
        request.onblocked = () => {
          clearTimeout(timeout);
          reject(new Error('IndexedDB blocked'));
        };
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  async save(key: string, data: any): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Save timeout'));
        }, 5000);

        try {
          const tx = db.transaction(this.storeName, 'readwrite');
          tx.objectStore(this.storeName).put(data, key);
          tx.oncomplete = () => {
            clearTimeout(timeout);
            resolve();
          };
          tx.onerror = () => {
            clearTimeout(timeout);
            reject(tx.error);
          };
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    } catch (err) {
      console.error("IndexedDB Save Failed", err);
    }
  }

  async load(key: string): Promise<any> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(null); // En caso de timeout, devolver null en lugar de fallar
        }, 5000);

        try {
          const tx = db.transaction(this.storeName, 'readonly');
          const request = tx.objectStore(this.storeName).get(key);
          request.onsuccess = () => {
            clearTimeout(timeout);
            resolve(request.result);
          };
          request.onerror = () => {
            clearTimeout(timeout);
            resolve(null); // En caso de error, devolver null
          };
        } catch (err) {
          clearTimeout(timeout);
          resolve(null);
        }
      });
    } catch (err) {
      console.error("IndexedDB Load Failed", err);
      return null;
    }
  }
}

export const db = new ProjectDatabase();
