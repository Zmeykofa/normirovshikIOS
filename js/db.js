class NormirovshikDB {
  constructor() {
    this.dbName = "NormirovshikDatabase";
    this.dbVersion = 1;
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
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("IndexedDB успешно инициализирована");
        resolve(this);
      };

      request.onerror = (event) => {
        console.error("Ошибка инициализации IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ДНЯМИ (Days) ---

  // Получить все дни, отсортированные по дате создания (убывание)
  getDays() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readonly");
      const store = transaction.objectStore("days");
      const request = store.getAll();

      request.onsuccess = () => {
        // Сортируем дни по дате создания от новых к старым
        const days = request.result.sort((a, b) => b.createdAt - a.createdAt);
        resolve(days);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Получить конкретный день
  getDay(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readonly");
      const store = transaction.objectStore("days");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Добавить день
  addDay(day) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readwrite");
      const store = transaction.objectStore("days");
      const request = store.add(day);

      request.onsuccess = () => resolve(day);
      request.onerror = () => reject(request.error);
    });
  }

  // Обновить день
  updateDay(day) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["days"], "readwrite");
      const store = transaction.objectStore("days");
      const request = store.put(day);

      request.onsuccess = () => resolve(day);
      request.onerror = () => reject(request.error);
    });
  }

  // Удалить день и все связанные операции
  deleteDay(id) {
    return new Promise((resolve, reject) => {
      // Удаляем день
      const transaction = this.db.transaction(["days", "operations"], "readwrite");
      
      // 1. Удаляем сам день
      const dayStore = transaction.objectStore("days");
      dayStore.delete(id);

      // 2. Удаляем связанные операции
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

      transaction.oncomplete = () => {
        console.log(`День ${id} и все его операции успешно удалены`);
        resolve(true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С ОПЕРАЦИЯМИ (Operations) ---

  // Получить операции для конкретного дня, отсортированные по времени начала (возрастание)
  getOperations(dayId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readonly");
      const store = transaction.objectStore("operations");
      const index = store.index("dayId");
      const range = IDBKeyRange.only(dayId);
      const request = index.getAll(range);

      request.onsuccess = () => {
        // Сортируем по времени начала от ранних к поздним
        const ops = request.result.sort((a, b) => a.startEpoch - b.startEpoch);
        resolve(ops);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Добавить операцию
  addOperation(operation) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.add(operation);

      request.onsuccess = () => resolve(operation);
      request.onerror = () => reject(request.error);
    });
  }

  // Обновить операцию
  updateOperation(operation) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.put(operation);

      request.onsuccess = () => resolve(operation);
      request.onerror = () => reject(request.error);
    });
  }

  // Удалить операцию
  deleteOperation(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["operations"], "readwrite");
      const store = transaction.objectStore("operations");
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- МЕТОДЫ ДЛЯ РАБОТЫ С СОТРУДНИКАМИ (Staff Database) ---

  getStaff() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["staff"], "readonly");
      const store = transaction.objectStore("staff");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
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
}
