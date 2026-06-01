class NormirovshikDB {
  constructor() {
    this.dbName = "NormirovshikDatabase";
    this.dbVersion = 2; // Повышаем версию базы данных до 2
    this.db = null;
  }

  // Инициализация базы данных
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Создаем хранилище дней
        if (!db.objectStoreNames.contains("days")) {
          db.createObjectStore("days", { keyPath: "id" });
        }

        // Создаем хранилище операций
        if (!db.objectStoreNames.contains("operations")) {
          const opStore = db.createObjectStore("operations", { keyPath: "id" });
          opStore.createIndex("dayId", "dayId", { unique: false });
        }

        // Создаем хранилище сотрудников
        if (!db.objectStoreNames.contains("staff")) {
          db.createObjectStore("staff", { keyPath: "id", autoIncrement: true });
        }

        // НОВЫЕ ТАБЛИЦЫ ДЛЯ БАЗЫ ДАННЫХ (Версия 2)
        
        // Создаем хранилище инструментов
        if (!db.objectStoreNames.contains("tools")) {
          db.createObjectStore("tools", { keyPath: "id", autoIncrement: true });
        }

        // Создаем хранилище техники
        if (!db.objectStoreNames.contains("equipment")) {
          db.createObjectStore("equipment", { keyPath: "id", autoIncrement: true });
        }

        // Создаем хранилище материалов
        if (!db.objectStoreNames.contains("materials")) {
          db.createObjectStore("materials", { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("IndexedDB успешно инициализирована (Версия " + this.dbVersion + ")");
        resolve(this);
      };

      request.onerror = (event) => {
        console.error("Ошибка инициализации IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ДНЯМИ (Days) ---

  getDays() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readonly");
      const store = transaction.objectStore("days");
      const request = store.getAll();

      request.onsuccess = () => {
        const days = request.result.sort((a, b) => b.createdAt - a.createdAt);
        resolve(days);
      };

      request.onerror = () => reject(request.error);
    });
  }

  getDay(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readonly");
      const store = transaction.objectStore("days");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  addDay(day) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readwrite");
      const store = transaction.objectStore("days");
      const request = store.add(day);

      request.onsuccess = () => resolve(day);
      request.onerror = () => reject(request.error);
    });
  }

  updateDay(day) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readwrite");
      const store = transaction.objectStore("days");
      const request = store.put(day);

      request.onsuccess = () => resolve(day);
      request.onerror = () => reject(request.error);
    });
  }

  deleteDay(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days", "operations", "staff", "tools", "equipment", "materials"], "readwrite");
      
      const dayStore = transaction.objectStore("days");
      dayStore.delete(id);

      const opStore = transaction.objectStore("operations");
      const index = opStore.index("dayId");
      const range = IDBKeyRange.only(id);
      const cursorRequest = index.openCursor(range);

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Удаляем привязанные к этому дню записи справочников
      const deleteDayBoundItems = (storeName) => {
        const store = transaction.objectStore(storeName);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value && cursor.value.dayId === id) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      };

      deleteDayBoundItems("staff");
      deleteDayBoundItems("tools");
      deleteDayBoundItems("equipment");
      deleteDayBoundItems("materials");

      transaction.oncomplete = () => {
        console.log(`День ${id}, его операции и справочники успешно удалены`);
        resolve(true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ОПЕРАЦИЯМИ (Operations) ---

  getOperations(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readonly");
      const store = transaction.objectStore("operations");
      const index = store.index("dayId");
      const range = IDBKeyRange.only(dayId);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const ops = request.result.sort((a, b) => a.startEpoch - b.startEpoch);
        resolve(ops);
      };

      request.onerror = () => reject(request.error);
    });
  }

  addOperation(operation) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.add(operation);

      request.onsuccess = () => resolve(operation);
      request.onerror = () => reject(request.error);
    });
  }

  updateOperation(operation) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.put(operation);

      request.onsuccess = () => resolve(operation);
      request.onerror = () => reject(request.error);
    });
  }

  deleteOperation(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С СОТРУДНИКАМИ (Staff) ---

  getStaff(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["staff"], "readonly");
      const store = transaction.objectStore("staff");
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result.filter(p => p.dayId === dayId);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  addStaff(person) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["staff"], "readwrite");
      const store = transaction.objectStore("staff");
      const request = store.add(person);

      request.onsuccess = (event) => {
        person.id = event.target.result;
        resolve(person);
      };
      request.onerror = () => reject(request.error);
    });
  }

  updateStaff(person) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["staff"], "readwrite");
      const store = transaction.objectStore("staff");
      const request = store.put(person);

      request.onsuccess = () => resolve(person);
      request.onerror = () => reject(request.error);
    });
  }

  deleteStaff(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["staff"], "readwrite");
      const store = transaction.objectStore("staff");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ИНСТРУМЕНТАМИ (Tools) ---

  getTools(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tools"], "readonly");
      const store = transaction.objectStore("tools");
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result.filter(t => t.dayId === dayId);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  addTool(tool) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tools"], "readwrite");
      const store = transaction.objectStore("tools");
      const request = store.put(tool);

      request.onsuccess = (event) => {
        tool.id = event.target.result;
        resolve(tool);
      };
      request.onerror = () => reject(request.error);
    });
  }

  deleteTool(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tools"], "readwrite");
      const store = transaction.objectStore("tools");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ТЕХНИКОЙ (Equipment) ---

  getEquipment(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["equipment"], "readonly");
      const store = transaction.objectStore("equipment");
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result.filter(e => e.dayId === dayId);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  addEquipment(item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["equipment"], "readwrite");
      const store = transaction.objectStore("equipment");
      const request = store.put(item);

      request.onsuccess = (event) => {
        item.id = event.target.result;
        resolve(item);
      };
      request.onerror = () => reject(request.error);
    });
  }

  deleteEquipment(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["equipment"], "readwrite");
      const store = transaction.objectStore("equipment");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С МАТЕРИАЛАМИ (Materials) ---

  getMaterials(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["materials"], "readonly");
      const store = transaction.objectStore("materials");
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result.filter(m => m.dayId === dayId);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  addMaterial(material) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["materials"], "readwrite");
      const store = transaction.objectStore("materials");
      const request = store.put(material);

      request.onsuccess = (event) => {
        material.id = event.target.result;
        resolve(material);
      };
      request.onerror = () => reject(request.error);
    });
  }

  deleteMaterial(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["materials"], "readwrite");
      const store = transaction.objectStore("materials");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }
}
