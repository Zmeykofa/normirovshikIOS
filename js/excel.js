class ExcelExporter {
  // Вспомогательная функция форматирования даты в DD.MM.YYYY HH:mm
  formatDateTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  // Вспомогательная функция форматирования времени в HH:mm:ss
  formatTimeOnly(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // Генерация и скачивание файла Excel
  exportToExcel(day, operations) {
    // 1. Создаем новую книгу Excel
    const wb = XLSX.utils.book_new();

    // --- Лист 1: Паспорт дня ---
    const passportData = [
      ["Параметр", "Значение"],
      ["Название дня", day.name || ""],
      ["Дата создания", this.formatDateTime(day.createdAt)],
      ["Место проведения", day.location || ""],
      ["Объект", day.objectName || ""],
      ["Организация", day.organization || ""],
      ["Вид работ", day.workType || ""],
      ["Техпроцесс", day.processName || ""],
      ["Документы", day.docsInfo || ""],
      ["Бригада №", day.brigadeNumber || ""],
      ["Бригадир", day.brigadeLeader || ""],
      [], // пустая строка
      ["Исполнители (список шаблонов)", day.workersList || ""],
      ["Инструменты (список шаблонов)", day.toolsList || ""],
      ["Техника (список шаблонов)", day.equipmentList || ""],
      ["Материалы (список шаблонов)", day.materialsList || ""]
    ];

    const wsPassport = XLSX.utils.aoa_to_sheet(passportData);

    // Задаем ширину столбцов на листе Паспорта
    wsPassport["!cols"] = [
      { wch: 30 }, // Колонка А
      { wch: 50 }  // Колонка B
    ];

    // Добавляем лист Паспорта в книгу
    XLSX.utils.book_append_sheet(wb, wsPassport, "Паспорт");

    // --- Лист 2: Хронометраж ---
    const headers = [
      "Название", 
      "Начало", 
      "Конец", 
      "Длит. (сек)", 
      "Длит. (чч:мм:сс)", 
      "Люди", 
      "Исполнители", 
      "Кол-во рабочих", 
      "Инструменты", 
      "Техника", 
      "Кол-во машин", 
      "Машинисты", 
      "Материалы", 
      "Заметки"
    ];

    // Сортируем операции по времени начала (от ранних к поздним)
    const sortedOps = [...operations].sort((a, b) => a.startEpoch - b.startEpoch);

    const opsRows = sortedOps.map(op => {
      // Расчет длительности
      const stopTime = op.stopEpoch || Date.now();
      const durationMillis = stopTime - op.startEpoch;
      const durationSec = Math.floor(durationMillis / 1000);

      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      const seconds = durationSec % 60;
      const durFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      const stopText = op.stopEpoch ? this.formatTimeOnly(op.stopEpoch) : "Активна";

      // Подсчет рабочих
      const workersCount = op.workers ? op.workers.split(",").filter(w => w.trim().length > 0).length : 0;

      // Обработка техники
      const equipmentItems = op.equipment ? op.equipment.split(",").filter(e => e.trim().length > 0).map(e => e.trim()) : [];
      const equipmentCount = equipmentItems.length;
      const equipmentNames = equipmentItems.map(item => {
        const bracketIndex = item.indexOf(" [");
        if (bracketIndex !== -1) {
          return item.substring(0, bracketIndex).trim();
        }
        return item.split("=")[0].trim();
      }).join(", ");
      const machinistsList = equipmentItems.map(item => {
        const bracketIndex = item.indexOf(" [");
        if (bracketIndex !== -1) {
          const eqName = item.substring(0, bracketIndex).trim();
          const details = item.substring(bracketIndex + 2, item.length - 1).trim();
          return `${eqName}: ${details}`;
        }
        const parts = item.split("=");
        return (parts.length > 1 && parts[1].trim().length > 0) ? `${parts[0].trim()}: ${parts[1].trim()}` : null;
      }).filter(Boolean).join(", ");

      return [
        op.name || "",
        this.formatTimeOnly(op.startEpoch),
        stopText,
        durationSec,
        durFormatted,
        Number(op.people || 0),
        op.workers || "",
        workersCount,
        op.tools || "",
        equipmentNames,
        equipmentCount,
        machinistsList,
        op.materials || "",
        op.notes || ""
      ];
    });

    const wsOps = XLSX.utils.aoa_to_sheet([headers, ...opsRows]);

    // Задаем ширину столбцов на листе Хронометража
    wsOps["!cols"] = [
      { wch: 25 }, // Название
      { wch: 12 }, // Начало
      { wch: 12 }, // Конец
      { wch: 12 }, // Длит (сек)
      { wch: 16 }, // Длит (чч:мм:сс)
      { wch: 8 },  // Люди
      { wch: 30 }, // Исполнители
      { wch: 15 }, // Кол-во рабочих
      { wch: 30 }, // Инструменты
      { wch: 30 }, // Техника
      { wch: 15 }, // Кол-во машин
      { wch: 30 }, // Машинисты
      { wch: 30 }, // Материалы
      { wch: 40 }  // Заметки
    ];

    // Добавляем лист Хронометража в книгу
    XLSX.utils.book_append_sheet(wb, wsOps, "Хронометраж");

    // --- Сохранение файла ---
    const dateStr = new Date(day.createdAt).toLocaleDateString("ru-RU").replace(/\./g, "_");
    const safeDayName = (day.name || "день").replace(/\s+/g, "_");
    const fileName = `Otchet_${safeDayName}_${dateStr}.xlsx`;

    // Вызываем скачивание файла в браузере
    XLSX.writeFile(wb, fileName);
  }
}
