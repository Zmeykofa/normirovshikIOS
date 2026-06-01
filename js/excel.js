class ExcelExporter {
  // Вспомогательная функция для форматирования и группировки исполнителей
  formatWorkersForExcel(workersStr) {
    if (!workersStr) return "";
    const workerStrings = workersStr.split(/,(?![^(]*\))/).map(w => w.trim()).filter(Boolean);
    if (workerStrings.length === 0) return "";

    const counts = {};
    workerStrings.forEach(w => {
      let position = "";
      let grade = "";

      const match = w.match(/\(([^)]+)\)/);
      if (match) {
        const details = match[1].split(",").map(s => s.trim());
        if (details.length >= 2) {
          position = details[0];
          grade = details[1];
        } else if (details.length === 1) {
          const val = details[0];
          if (/\d/.test(val)) {
            grade = val;
          } else {
            position = val;
          }
        }
      } else {
        if (w.includes(",")) {
          const details = w.split(",").map(s => s.trim());
          position = details[0];
          grade = details[1];
        } else {
          const trimmed = w.trim();
          if (/\d/.test(trimmed)) {
            grade = trimmed;
          } else {
            position = trimmed;
          }
        }
      }

      let posFormatted = position.trim();
      if (posFormatted) {
        posFormatted = posFormatted.charAt(0).toUpperCase() + posFormatted.slice(1);
      }

      let gradeFormatted = grade.trim();
      if (gradeFormatted) {
        const gradeClean = gradeFormatted.replace(/\s*р\.?$/, "");
        gradeFormatted = gradeClean + "р.";
      }

      let key = "";
      if (posFormatted && gradeFormatted) {
        key = `${posFormatted} ${gradeFormatted}`;
      } else if (posFormatted) {
        key = posFormatted;
      } else if (gradeFormatted) {
        key = gradeFormatted;
      } else {
        key = "Сотрудник";
      }

      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([key, count]) => `${key} - ${count} чел.`)
      .join(", ");
  }

  // Вспомогательная функция для форматирования и группировки техники
  formatEquipmentForExcel(equipmentStr) {
    if (!equipmentStr) return "";
    const eqStrings = equipmentStr.split(/,(?![^\[]*\])/).map(e => e.trim()).filter(Boolean);
    if (eqStrings.length === 0) return "";

    const counts = {};
    eqStrings.forEach(e => {
      let name = e;
      const bracketIndex = e.indexOf(" [");
      if (bracketIndex !== -1) {
        name = e.substring(0, bracketIndex).trim();
      } else if (e.includes("=")) {
        name = e.split("=")[0].trim();
      }

      let nameFormatted = name.trim();
      if (nameFormatted) {
        nameFormatted = nameFormatted.charAt(0).toUpperCase() + nameFormatted.slice(1);
      } else {
        nameFormatted = "Техника";
      }

      counts[nameFormatted] = (counts[nameFormatted] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => `${name} - ${count} шт.`)
      .join(", ");
  }

  // Вспомогательная функция для форматирования и группировки машинистов
  formatMachinistsForExcel(equipmentStr) {
    if (!equipmentStr) return "";
    const eqStrings = equipmentStr.split(/,(?![^\[]*\])/).map(e => e.trim()).filter(Boolean);
    if (eqStrings.length === 0) return "";

    const counts = {};
    eqStrings.forEach(e => {
      let position = "";
      let grade = "";

      const match = e.match(/\[([^\]]+)\]/);
      if (match) {
        const inner = match[1];
        const details = inner.split(",").map(x => x.trim()).filter(Boolean);
        
        const isFio = (str) => {
          return /[А-ЯA-Z]\.[А-ЯA-Z]?\./.test(str) || (str.split(" ").length > 1 && /[А-ЯA-Z]/.test(str));
        };

        if (details.length === 3) {
          position = details[1];
          grade = details[2];
        } else if (details.length === 2) {
          const hasDigit0 = /\d/.test(details[0]);
          const hasDigit1 = /\d/.test(details[1]);
          if (hasDigit0) {
            grade = details[0];
            if (!isFio(details[1])) position = details[1];
          } else if (hasDigit1) {
            grade = details[1];
            if (!isFio(details[0])) position = details[0];
          } else {
            if (!isFio(details[0])) position = details[0];
            if (!isFio(details[1])) position = details[1];
          }
        } else if (details.length === 1) {
          const val = details[0];
          if (/\d/.test(val)) {
            grade = val;
          } else if (!isFio(val)) {
            position = val;
          }
        }
      }

      let posFormatted = position.trim();
      if (posFormatted) {
        posFormatted = posFormatted.charAt(0).toUpperCase() + posFormatted.slice(1);
      }

      let gradeFormatted = grade.trim();
      if (gradeFormatted) {
        const gradeClean = gradeFormatted.replace(/\s*р\.?$/, "");
        gradeFormatted = gradeClean + "р.";
      }

      let key = "";
      if (posFormatted && gradeFormatted) {
        key = `${posFormatted} ${gradeFormatted}`;
      } else if (posFormatted) {
        key = posFormatted;
      } else if (gradeFormatted) {
        key = `Машинист ${gradeFormatted}`;
      } else {
        key = "Машинист";
      }

      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([key, count]) => `${key} - ${count} чел.`)
      .join(", ");
  }

  // Вспомогательная функция для форматирования списка шаблонов исполнителей без ФИО
  formatWorkersTemplateList(workersStr) {
    if (!workersStr) return "";
    const workerStrings = workersStr.split(/,(?![^(]*\))/).map(w => w.trim()).filter(Boolean);
    const uniqueKeys = new Set();
    
    workerStrings.forEach(w => {
      let position = "";
      let grade = "";

      const match = w.match(/\(([^)]+)\)/);
      if (match) {
        const details = match[1].split(",").map(s => s.trim());
        if (details.length >= 2) {
          position = details[0];
          grade = details[1];
        } else if (details.length === 1) {
          const val = details[0];
          if (/\d/.test(val)) {
            grade = val;
          } else {
            position = val;
          }
        }
      } else {
        if (w.includes(",")) {
          const details = w.split(",").map(s => s.trim());
          position = details[0];
          grade = details[1];
        } else {
          const trimmed = w.trim();
          if (/\d/.test(trimmed)) {
            grade = trimmed;
          } else {
            position = trimmed;
          }
        }
      }

      let posFormatted = position.trim();
      if (posFormatted) {
        posFormatted = posFormatted.charAt(0).toUpperCase() + posFormatted.slice(1);
      }

      let gradeFormatted = grade.trim();
      if (gradeFormatted) {
        const gradeClean = gradeFormatted.replace(/\s*р\.?$/, "");
        gradeFormatted = gradeClean + "р.";
      }

      let key = "";
      if (posFormatted && gradeFormatted) {
        key = `${posFormatted} ${gradeFormatted}`;
      } else if (posFormatted) {
        key = posFormatted;
      } else if (gradeFormatted) {
        key = gradeFormatted;
      } else {
        key = "Сотрудник";
      }

      uniqueKeys.add(key);
    });

    return Array.from(uniqueKeys).sort().join(", ");
  }

  // Вспомогательная функция для форматирования списка шаблонов техники без ФИО
  formatEquipmentTemplateList(equipmentStr) {
    if (!equipmentStr) return "";
    const eqStrings = equipmentStr.split(/,(?![^\[]*\])/).map(e => e.trim()).filter(Boolean);
    const uniqueKeys = new Set();

    eqStrings.forEach(e => {
      let name = e;
      const bracketIndex = e.indexOf(" [");
      if (bracketIndex !== -1) {
        name = e.substring(0, bracketIndex).trim();
      } else if (e.includes("=")) {
        name = e.split("=")[0].trim();
      }

      let nameFormatted = name.trim();
      if (nameFormatted) {
        nameFormatted = nameFormatted.charAt(0).toUpperCase() + nameFormatted.slice(1);
      } else {
        nameFormatted = "Техника";
      }

      uniqueKeys.add(nameFormatted);
    });

    return Array.from(uniqueKeys).sort().join(", ");
  }

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
  exportToExcel(day, operations, staffList = [], toolsList = [], equipmentList = [], materialsList = []) {
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
      ["Исполнители (список шаблонов)", this.formatWorkersForExcel(day.workersList || staffList.map(p => {
        const parts = [];
        if (p.name) parts.push(p.name);
        const details = [];
        if (p.position) details.push(p.position);
        if (p.grade) details.push(p.grade);
        if (details.length > 0) {
          if (p.name) {
            parts.push(`(${details.join(", ")})`);
          } else {
            parts.push(details.join(", "));
          }
        }
        return parts.join(" ").trim() || "Сотрудник";
      }).join(", "))],
      ["Инструменты (список шаблонов)", day.toolsList || toolsList.map(t => t.name).join(", ")],
      ["Техника (список шаблонов)", this.formatEquipmentForExcel(day.equipmentList || equipmentList.map(item => {
        const parts = [item.name];
        const details = [];
        if (item.machinist) details.push(item.machinist);
        if (item.position) details.push(item.position);
        if (item.grade) details.push(item.grade);
        if (details.length > 0) {
          parts.push(`[${details.join(", ")}]`);
        }
        return parts.join(" ").trim();
      }).join(", "))],
      ["Материалы (список шаблонов)", day.materialsList || materialsList.map(m => m.name).join(", ")]
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
      const stopText = op.stopEpoch ? this.formatTimeOnly(op.stopEpoch) : "Активна";

      // Подсчет рабочих
      const workersCount = op.workers ? op.workers.split(/,(?![^(]*\))/).filter(w => w.trim().length > 0).length : 0;

      // Обработка техники
      const equipmentItems = op.equipment ? op.equipment.split(/,(?![^\[]*\])/).filter(e => e.trim().length > 0).map(e => e.trim()) : [];
      const equipmentCount = equipmentItems.length;
      const equipmentNames = this.formatEquipmentForExcel(op.equipment || "");
      const machinistsList = this.formatMachinistsForExcel(op.equipment || "");

      return [
        op.name || "",
        this.formatTimeOnly(op.startEpoch),
        stopText,
        Number(op.people || 0),
        this.formatWorkersForExcel(op.workers || ""),
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
