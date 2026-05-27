// Главная логика приложения "Нормировщик"

document.addEventListener("DOMContentLoaded", async () => {
  // --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ (State) ---
  const state = {
    db: new NormirovshikDB(),
    exporter: new ExcelExporter(),
    days: [],
    currentDay: null,
    operations: [],
    unfinishedOperations: [],
    currentUnfinishedIndex: 0,
    staff: [],
    
    // Вспомогательные ID для диалогов
    editingDayId: null,
    deletingDayId: null,
    editingOperationId: null,
    deletingOperationId: null,
    
    // Активные таймеры
    timerInterval: null
  };

  // --- DOM ЭЛЕМЕНТЫ ---
  const DOM = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebarOverlay"),
    menuToggleBtn: document.getElementById("menuToggleBtn"),
    headerTitle: document.getElementById("headerTitle"),
    daysListContainer: document.getElementById("daysListContainer"),
    addDayBtn: document.getElementById("addDayBtn"),
    
    // Паспорт дня
    dayPassportCard: document.getElementById("dayPassportCard"),
    passportHeader: document.getElementById("passportHeader"),
    passportBody: document.getElementById("passportBody"),
    passportToggleBtn: document.getElementById("passportToggleBtn"),
    editPassportBtn: document.getElementById("editPassportBtn"),
    pLocation: document.getElementById("pLocation"),
    pObjectName: document.getElementById("pObjectName"),
    pOrganization: document.getElementById("pOrganization"),
    pWorkType: document.getElementById("pWorkType"),
    pProcessName: document.getElementById("pProcessName"),
    pDocsInfo: document.getElementById("pDocsInfo"),
    pBrigadeNumber: document.getElementById("pBrigadeNumber"),
    pBrigadeLeader: document.getElementById("pBrigadeLeader"),
    pWorkersTags: document.getElementById("pWorkersTags"),
    pToolsTags: document.getElementById("pToolsTags"),
    pEquipmentTags: document.getElementById("pEquipmentTags"),
    pMaterialsTags: document.getElementById("pMaterialsTags"),
    
    // Хронометраж
    operationsList: document.getElementById("operationsList"),
    emptyOperationsState: document.getElementById("emptyOperationsState"),
    operationsCount: document.getElementById("operationsCount"),
    fabAddOperation: document.getElementById("fabAddOperation"),
    emptyAddOpBtn: document.getElementById("emptyAddOpBtn"),
    exportExcelBtn: document.getElementById("exportExcelBtn"),
    
    // Навигатор незавершенных
    unfinishedNavigator: document.getElementById("unfinishedNavigator"),
    unfinishedStatusText: document.getElementById("unfinishedStatusText"),
    
    // Диалоги
    addDayModal: document.getElementById("addDayModal"),
    newDayNameInput: document.getElementById("newDayNameInput"),
    copySourceDaySelect: document.getElementById("copySourceDaySelect"),
    confirmAddDayBtn: document.getElementById("confirmAddDayBtn"),
    
    renameDayModal: document.getElementById("renameDayModal"),
    renameDayInput: document.getElementById("renameDayInput"),
    confirmRenameDayBtn: document.getElementById("confirmRenameDayBtn"),
    
    deleteDayModal: document.getElementById("deleteDayModal"),
    deleteDayMessage: document.getElementById("deleteDayMessage"),
    confirmDeleteDayBtn: document.getElementById("confirmDeleteDayBtn"),
    
    editPassportModal: document.getElementById("editPassportModal"),
    savePassportBtn: document.getElementById("savePassportBtn"),
    
    editOperationModal: document.getElementById("editOperationModal"),
    editOperationModalTitle: document.getElementById("editOperationModalTitle"),
    eoName: document.getElementById("eoName"),
    eoPeople: document.getElementById("eoPeople"),
    eoWorkersContainer: document.getElementById("eoWorkersContainer"),
    eoTools: document.getElementById("eoTools"),
    eoToolsTemplates: document.getElementById("eoToolsTemplates"),
    eoEquipment: document.getElementById("eoEquipment"),
    eoEquipmentTemplates: document.getElementById("eoEquipmentTemplates"),
    eoMaterials: document.getElementById("eoMaterials"),
    eoMaterialsTemplates: document.getElementById("eoMaterialsTemplates"),
    eoNotes: document.getElementById("eoNotes"),
    saveOperationBtn: document.getElementById("saveOperationBtn"),
    
    deleteOperationModal: document.getElementById("deleteOperationModal"),
    deleteOperationMessage: document.getElementById("deleteOperationMessage"),
    confirmDeleteOperationBtn: document.getElementById("confirmDeleteOperationBtn"),
    
    // Табы внутри редактирования операции
    tabMainBtn: document.getElementById("tabMainBtn"),
    tabStaffBtn: document.getElementById("tabStaffBtn"),
    tabContentMain: document.getElementById("tabContentMain"),
    tabContentStaff: document.getElementById("tabContentStaff"),
    
    // База сотрудников
    staffTableBody: document.getElementById("staffTableBody"),
    newStaffName: document.getElementById("newStaffName"),
    newStaffPosition: document.getElementById("newStaffPosition"),
    newStaffGrade: document.getElementById("newStaffGrade"),
    addStaffBtn: document.getElementById("addStaffBtn")
  };

  // --- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
  try {
    await state.db.init();
    
    // Загружаем справочники
    await loadStaff();
    
    // Загружаем список дней
    await refreshDaysList();
    
    // Автовыбор последнего дня или открытие диалога создания
    if (state.days.length > 0) {
      // Ищем ID последнего открытого дня из localStorage
      const lastDayId = localStorage.getItem("lastSelectedDayId");
      const foundDay = state.days.find(d => d.id === lastDayId);
      if (foundDay) {
        await selectDay(lastDayId);
      } else {
        await selectDay(state.days[0].id);
      }
    } else {
      // Если дней нет вообще, показываем модалку создания первого дня
      openModal(DOM.addDayModal);
      DOM.newDayNameInput.value = "Рабочая смена " + new Date().toLocaleDateString("ru-RU");
    }
    
    // Запускаем интервал обновления тикающих таймеров
    startTickingInterval();
  } catch (err) {
    console.error("Ошибка инициализации приложения:", err);
  }

  // --- СИСТЕМНЫЕ ТАЙМЕРЫ (Real-time updates) ---
  function startTickingInterval() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      // Находим на экране все активные операции и обновляем текстовое время
      const activeCards = document.querySelectorAll(".operation-card.active");
      activeCards.forEach(card => {
        const opId = card.dataset.id;
        const op = state.operations.find(o => String(o.id) === String(opId));
        if (op) {
          const durationSec = Math.floor((Date.now() - op.startEpoch) / 1000);
          const hours = Math.floor(durationSec / 3600);
          const minutes = Math.floor((durationSec % 3600) / 60);
          const seconds = durationSec % 60;
          const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
          
          const timerEl = card.querySelector(".op-timer");
          if (timerEl) timerEl.textContent = formatted;
        }
      });
    }, 1000);
  }

  // --- УПРАВЛЕНИЕ СПРАВОЧНИКОМ СОТРУДНИКОВ (Staff) ---
  async function loadStaff() {
    state.staff = await state.db.getStaff();
    renderStaffTable();
  }

  function renderStaffTable() {
    DOM.staffTableBody.innerHTML = "";
    if (state.staff.length === 0) {
      DOM.staffTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">База пуста. Добавьте сотрудников ниже.</td></tr>`;
      return;
    }
    state.staff.forEach(person => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(person.name)}</strong></td>
        <td>${escapeHtml(person.position || "—")}</td>
        <td>${escapeHtml(person.grade || "—")}</td>
        <td>
          <button class="staff-delete-btn" data-id="${person.id}">
            <span class="material-icons-outlined" style="font-size: 16px;">delete</span>
          </button>
        </td>
      `;
      
      tr.querySelector(".staff-delete-btn").addEventListener("click", async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await state.db.deleteStaff(id);
        await loadStaff();
        // Обновляем список мультиселекта в форме
        renderWorkersMultiselect();
      });
      
      DOM.staffTableBody.appendChild(tr);
    });
  }

  DOM.addStaffBtn.addEventListener("click", async () => {
    const name = DOM.newStaffName.value.trim();
    const position = DOM.newStaffPosition.value.trim();
    const grade = DOM.newStaffGrade.value.trim();
    
    if (!name) {
      alert("Пожалуйста, введите имя сотрудника");
      return;
    }
    
    await state.db.addStaff({ name, position, grade });
    DOM.newStaffName.value = "";
    DOM.newStaffPosition.value = "";
    DOM.newStaffGrade.value = "";
    
    await loadStaff();
    // Обновляем список мультиселекта в форме
    renderWorkersMultiselect();
  });

  // --- УПРАВЛЕНИЕ ДНЯМИ (Days Logic) ---
  async function refreshDaysList() {
    state.days = await state.db.getDays();
    renderDaysSidebar();
    updateCopyDaysDropdown();
  }

  function renderDaysSidebar() {
    DOM.daysListContainer.innerHTML = "";
    state.days.forEach(day => {
      const activeClass = state.currentDay && state.currentDay.id === day.id ? "active" : "";
      const div = document.createElement("div");
      div.className = `day-item ${activeClass}`;
      div.dataset.id = day.id;
      
      div.innerHTML = `
        <span class="day-item-name">${escapeHtml(day.name)}</span>
        <div class="day-item-actions">
          <button class="day-action-btn edit-btn" title="Переименовать">
            <span class="material-icons-outlined" style="font-size: 18px;">edit</span>
          </button>
          <button class="day-action-btn delete-btn" title="Удалить">
            <span class="material-icons-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      `;
      
      // Выбор дня при клике на имя
      div.querySelector(".day-item-name").addEventListener("click", () => {
        selectDay(day.id);
        closeMobileSidebar();
      });
      
      // Переименование дня
      div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        state.editingDayId = day.id;
        DOM.renameDayInput.value = day.name;
        openModal(DOM.renameDayModal);
      });
      
      // Удаление дня
      div.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        state.deletingDayId = day.id;
        DOM.deleteDayMessage.innerHTML = `Вы уверены, что хотите удалить день <strong>"${escapeHtml(day.name)}"</strong> и все его хронометражи безвозвратно?`;
        openModal(DOM.deleteDayModal);
      });
      
      DOM.daysListContainer.appendChild(div);
    });
  }

  function updateCopyDaysDropdown() {
    DOM.copySourceDaySelect.innerHTML = `<option value="">Не копировать (пустой)</option>`;
    state.days.forEach(day => {
      const opt = document.createElement("option");
      opt.value = day.id;
      opt.textContent = day.name;
      DOM.copySourceDaySelect.appendChild(opt);
    });
  }

  async function selectDay(dayId) {
    state.currentDay = await state.db.getDay(dayId);
    if (!state.currentDay) return;
    
    // Запоминаем последний открытый день
    localStorage.setItem("lastSelectedDayId", dayId);
    
    DOM.headerTitle.textContent = state.currentDay.name;
    
    // Подсвечиваем в боковой панели
    document.querySelectorAll(".day-item").forEach(item => {
      item.classList.toggle("active", item.dataset.id === dayId);
    });
    
    // Загружаем паспорт и операции дня
    renderPassport();
    await refreshOperations();
    
    // Показываем паспорт и плавающую кнопку
    DOM.dayPassportCard.style.display = "block";
    DOM.fabAddOperation.style.display = "flex";
  }

  // --- УПРАВЛЕНИЕ ПАСПОРТОМ ДНЯ (Passport) ---
  function renderPassport() {
    const d = state.currentDay;
    if (!d) return;
    
    DOM.pLocation.textContent = d.location || "—";
    DOM.pObjectName.textContent = d.objectName || "—";
    DOM.pOrganization.textContent = d.organization || "—";
    DOM.pWorkType.textContent = d.workType || "—";
    DOM.pProcessName.textContent = d.processName || "—";
    DOM.pDocsInfo.textContent = d.docsInfo || "—";
    DOM.pBrigadeNumber.textContent = d.brigadeNumber || "—";
    DOM.pBrigadeLeader.textContent = d.brigadeLeader || "—";
    
    // Рендер тегов списков ресурсов
    renderTags(DOM.pWorkersTags, d.workersList);
    renderTags(DOM.pToolsTags, d.toolsList);
    renderTags(DOM.pEquipmentTags, d.equipmentList);
    renderTags(DOM.pMaterialsTags, d.materialsList);
  }

  function renderTags(container, listString) {
    container.innerHTML = "";
    if (!listString) {
      container.textContent = "—";
      return;
    }
    const tags = listString.split(",").map(t => t.trim()).filter(t => t.length > 0);
    if (tags.length === 0) {
      container.textContent = "—";
      return;
    }
    tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "resource-tag";
      span.textContent = tag;
      container.appendChild(span);
    });
  }

  // Редактирование паспорта
  DOM.editPassportBtn.addEventListener("click", () => {
    const d = state.currentDay;
    if (!d) return;
    
    document.getElementById("epLocation").value = d.location || "";
    document.getElementById("epObjectName").value = d.objectName || "";
    document.getElementById("epOrganization").value = d.organization || "";
    document.getElementById("epWorkType").value = d.workType || "";
    document.getElementById("epProcessName").value = d.processName || "";
    document.getElementById("epDocsInfo").value = d.docsInfo || "";
    document.getElementById("epBrigadeNumber").value = d.brigadeNumber || "";
    document.getElementById("epBrigadeLeader").value = d.brigadeLeader || "";
    
    document.getElementById("epWorkersList").value = d.workersList || "";
    document.getElementById("epToolsList").value = d.toolsList || "";
    document.getElementById("epEquipmentList").value = d.equipmentList || "";
    document.getElementById("epMaterialsList").value = d.materialsList || "";
    
    openModal(DOM.editPassportModal);
  });

  DOM.savePassportBtn.addEventListener("click", async () => {
    if (!state.currentDay) return;
    
    const updated = {
      ...state.currentDay,
      location: document.getElementById("epLocation").value.trim(),
      objectName: document.getElementById("epObjectName").value.trim(),
      organization: document.getElementById("epOrganization").value.trim(),
      workType: document.getElementById("epWorkType").value.trim(),
      processName: document.getElementById("epProcessName").value.trim(),
      docsInfo: document.getElementById("epDocsInfo").value.trim(),
      brigadeNumber: document.getElementById("epBrigadeNumber").value.trim(),
      brigadeLeader: document.getElementById("epBrigadeLeader").value.trim(),
      
      workersList: document.getElementById("epWorkersList").value.trim(),
      toolsList: document.getElementById("epToolsList").value.trim(),
      equipmentList: document.getElementById("epEquipmentList").value.trim(),
      materialsList: document.getElementById("epMaterialsList").value.trim()
    };
    
    await state.db.updateDay(updated);
    state.currentDay = updated;
    renderPassport();
    closeModal(DOM.editPassportModal);
  });

  // Сворачивание / Разворачивание паспорта
  DOM.passportHeader.addEventListener("click", () => {
    const isCollapsed = DOM.passportBody.classList.toggle("collapsed");
    DOM.passportToggleBtn.querySelector("span").textContent = isCollapsed ? "expand_more" : "expand_less";
  });

  // --- УПРАВЛЕНИЕ ОПЕРАЦИЯМИ (Operations Logic) ---
  async function refreshOperations() {
    if (!state.currentDay) return;
    
    state.operations = await state.db.getOperations(state.currentDay.id);
    
    // Сортируем операции: активные сверху, затем остальные по времени начала
    // (Поведение Jetpack Compose: обычно сортируют от новых к старым или по времени старта)
    state.operations.sort((a, b) => b.startEpoch - a.startEpoch);
    
    DOM.operationsCount.textContent = state.operations.length;
    
    // Обновляем список незавершенных операций для навигатора
    state.unfinishedOperations = state.operations.filter(op => op.stopEpoch === null);
    updateUnfinishedNavigator();
    
    renderOperationsList();
  }

  function renderOperationsList() {
    DOM.operationsList.innerHTML = "";
    
    if (state.operations.length === 0) {
      DOM.operationsList.style.display = "none";
      DOM.emptyOperationsState.style.display = "flex";
      return;
    }
    
    DOM.operationsList.style.display = "flex";
    DOM.emptyOperationsState.style.display = "none";
    
    state.operations.forEach(op => {
      const activeClass = op.stopEpoch === null ? "active" : "";
      
      // Расчет длительности
      const stopTime = op.stopEpoch || Date.now();
      const durationSec = Math.floor((stopTime - op.startEpoch) / 1000);
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      const seconds = durationSec % 60;
      const durFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      
      const startTimeStr = formatTimeOnly(op.startEpoch);
      const stopTimeStr = op.stopEpoch ? formatTimeOnly(op.stopEpoch) : "Активна";
      
      const card = document.createElement("div");
      card.className = `operation-card ${activeClass}`;
      card.dataset.id = op.id;
      
      // Баджи ресурсов
      let resourcesHtml = "";
      if (op.people > 0) {
        resourcesHtml += `
          <div class="op-resource-chip workers" title="Количество людей">
            <span class="material-icons-outlined">people</span>
            <span>Людей: ${op.people}</span>
          </div>
        `;
      }
      if (op.workers) {
        resourcesHtml += `
          <div class="op-resource-chip workers" title="Исполнители">
            <span class="material-icons-outlined">person</span>
            <span>${escapeHtml(op.workers)}</span>
          </div>
        `;
      }
      if (op.tools) {
        resourcesHtml += `
          <div class="op-resource-chip tools" title="Инструменты">
            <span class="material-icons-outlined">handyman</span>
            <span>${escapeHtml(op.tools)}</span>
          </div>
        `;
      }
      if (op.equipment) {
        // Парсим красивый вывод техники без машинистов во всплывающей подсказке
        const eqList = op.equipment.split(",").map(e => e.split("=")[0].trim()).join(", ");
        resourcesHtml += `
          <div class="op-resource-chip equipment" title="Техника: ${escapeHtml(op.equipment)}">
            <span class="material-icons-outlined">construction</span>
            <span>${escapeHtml(eqList)}</span>
          </div>
        `;
      }
      if (op.materials) {
        resourcesHtml += `
          <div class="op-resource-chip materials" title="Материалы">
            <span class="material-icons-outlined">layers</span>
            <span>${escapeHtml(op.materials)}</span>
          </div>
        `;
      }
      if (op.notes) {
        resourcesHtml += `
          <div class="op-resource-chip notes" title="Заметка">
            <span class="material-icons-outlined">description</span>
            <span style="font-style: italic;">${escapeHtml(op.notes)}</span>
          </div>
        `;
      }
      
      // Кнопка Стоп для активной задачи
      const stopBtnHtml = op.stopEpoch === null 
        ? `<button class="op-action-btn stop-btn" title="Завершить операцию"><span class="material-icons-outlined">stop_circle</span> Завершить</button>` 
        : "";
      
      card.innerHTML = `
        <div class="op-main-row">
          <div class="op-title-block">
            <div class="op-name">${escapeHtml(op.name)}</div>
            <div class="op-time-info">
              <span><span class="material-icons-outlined" style="font-size:14px;">play_arrow</span> ${startTimeStr}</span>
              <span class="arrow-right"><span class="material-icons-outlined" style="font-size:14px;">east</span></span>
              <span><span class="material-icons-outlined" style="font-size:14px;">stop</span> ${stopTimeStr}</span>
            </div>
          </div>
          <div class="op-duration-block">
            <div class="op-timer">${durFormatted}</div>
            <div class="op-status-badge ${op.stopEpoch === null ? "active" : "completed"}">
              ${op.stopEpoch === null ? '<span class="pulse-dot"></span> Идет' : "Завершено"}
            </div>
          </div>
        </div>
        
        ${resourcesHtml ? `<div class="op-resources-grid">${resourcesHtml}</div>` : ""}
        
        <div class="op-actions-row">
          ${stopBtnHtml}
          <button class="op-action-btn edit-btn" title="Редактировать"><span class="material-icons-outlined">edit</span></button>
          <button class="op-action-btn split-btn" title="Разделить"><span class="material-icons-outlined">content_cut</span> Разделить</button>
          <button class="op-action-btn repeat-btn" title="Повторить"><span class="material-icons-outlined">replay</span> Повторить</button>
          <button class="op-action-btn delete-btn" title="Удалить"><span class="material-icons-outlined">delete</span></button>
        </div>
      `;
      
      // Навешивание обработчиков на кнопки карты операции
      if (op.stopEpoch === null) {
        card.querySelector(".stop-btn").addEventListener("click", () => stopOperation(op));
      }
      
      card.querySelector(".edit-btn").addEventListener("click", () => openEditOperationModal(op));
      card.querySelector(".split-btn").addEventListener("click", () => splitOperation(op));
      card.querySelector(".repeat-btn").addEventListener("click", () => repeatOperation(op));
      card.querySelector(".delete-btn").addEventListener("click", () => {
        state.deletingOperationId = op.id;
        DOM.deleteOperationMessage.innerHTML = `Вы уверены, что хотите удалить операцию <strong>"${escapeHtml(op.name)}"</strong>?`;
        openModal(DOM.deleteOperationModal);
      });
      
      DOM.operationsList.appendChild(card);
    });
  }

  // --- ОПЕРАЦИИ: СОЗДАНИЕ, ОСТАНОВКА, РАЗДЕЛЕНИЕ, ПОВТОРЕНИЕ ---

  // Создание новой операции
  async function triggerAddOperation() {
    if (!state.currentDay) return;
    
    // Предзаполняем поля из шаблонов паспорта дня
    const newOp = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Уникальный ID
      dayId: state.currentDay.id,
      name: "Новая операция",
      startEpoch: Date.now(),
      stopEpoch: null,
      people: 0,
      workers: "",
      tools: "",
      equipment: "",
      materials: "",
      notes: ""
    };
    
    await state.db.addOperation(newOp);
    await refreshOperations();
    
    // Автоматически открываем модалку редактирования сразу после создания, чтобы пользователь ввел название
    const addedOp = state.operations.find(o => o.id === newOp.id);
    if (addedOp) {
      openEditOperationModal(addedOp);
    }
  }

  DOM.fabAddOperation.addEventListener("click", triggerAddOperation);
  DOM.emptyAddOpBtn.addEventListener("click", triggerAddOperation);

  // Остановка операции
  async function stopOperation(op) {
    const updated = {
      ...op,
      stopEpoch: Date.now()
    };
    await state.db.updateOperation(updated);
    await refreshOperations();
  }

  // Разделить операцию
  async function splitOperation(op) {
    const now = Date.now();
    
    // 1. Останавливаем текущую операцию прямо сейчас
    const updatedCurrent = {
      ...op,
      stopEpoch: now
    };
    await state.db.updateOperation(updatedCurrent);
    
    // 2. Создаем точно такую же новую операцию, стартующую прямо сейчас (активную)
    const newOp = {
      ...op,
      id: now + Math.floor(Math.random() * 1000),
      startEpoch: now,
      stopEpoch: null
    };
    await state.db.addOperation(newOp);
    
    await refreshOperations();
  }

  // Повторить операцию
  async function repeatOperation(op) {
    const now = Date.now();
    const newOp = {
      ...op,
      id: now + Math.floor(Math.random() * 1000),
      startEpoch: now,
      stopEpoch: null // Создается активной
    };
    await state.db.addOperation(newOp);
    await refreshOperations();
  }

  // --- НАВИГАТОР ПО НЕЗАВЕРШЕННЫМ ЗАДАЧАМ ---
  function updateUnfinishedNavigator() {
    const count = state.unfinishedOperations.length;
    if (count === 0) {
      DOM.unfinishedNavigator.style.display = "none";
      return;
    }
    
    DOM.unfinishedNavigator.style.display = "flex";
    if (state.currentUnfinishedIndex >= count) {
      state.currentUnfinishedIndex = 0;
    }
    
    DOM.unfinishedStatusText.textContent = `${state.currentUnfinishedIndex + 1}/${count}`;
  }

  DOM.unfinishedNavigator.addEventListener("click", () => {
    const count = state.unfinishedOperations.length;
    if (count === 0) return;
    
    const op = state.unfinishedOperations[state.currentUnfinishedIndex];
    if (op) {
      // Скроллим к карточке операции
      const cardEl = document.querySelector(`.operation-card[data-id="${op.id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        // Даем кратковременное свечение карте для привлечения внимания
        cardEl.style.outline = "2px solid var(--primary)";
        setTimeout(() => cardEl.style.outline = "none", 1500);
      }
    }
    
    // Двигаем индекс вперед по кольцу
    state.currentUnfinishedIndex = (state.currentUnfinishedIndex + 1) % count;
    DOM.unfinishedStatusText.textContent = `${state.currentUnfinishedIndex + 1}/${count}`;
  });

  // --- ЭКСПОРТ В EXCEL ---
  DOM.exportExcelBtn.addEventListener("click", () => {
    if (!state.currentDay) return;
    state.exporter.exportToExcel(state.currentDay, state.operations);
  });

  // --- ДИАЛОГ: РЕДАКТИРОВАНИЕ ОПЕРАЦИИ & ШАБЛОНЫ ---
  function openEditOperationModal(op) {
    state.editingOperationId = op.id;
    DOM.editOperationModalTitle.textContent = `Редактирование: ${escapeHtml(op.name)}`;
    
    // Переключаемся на первую вкладку "Основное" по умолчанию
    switchTab("main");
    
    DOM.eoName.value = op.name || "";
    DOM.eoPeople.value = op.people || 0;
    DOM.eoTools.value = op.tools || "";
    DOM.eoEquipment.value = op.equipment || "";
    DOM.eoMaterials.value = op.materials || "";
    DOM.eoNotes.value = op.notes || "";
    
    // 1. Рендерим мультиселект исполнителей из БД
    renderWorkersMultiselect(op.workers);
    
    // 2. Рендерим теги шаблонов из паспорта дня под инпутами для быстрого клика!
    renderTemplateHelpers(DOM.eoToolsTemplates, state.currentDay.toolsList, DOM.eoTools);
    renderTemplateHelpers(DOM.eoEquipmentTemplates, state.currentDay.equipmentList, DOM.eoEquipment);
    renderTemplateHelpers(DOM.eoMaterialsTemplates, state.currentDay.materialsList, DOM.eoMaterials);
    
    openModal(DOM.editOperationModal);
  }

  // Рендер кнопок шаблонов для быстрого добавления в поле ввода
  function renderTemplateHelpers(container, templatesList, inputEl) {
    container.innerHTML = "";
    if (!templatesList) return;
    
    const items = templatesList.split(",").map(x => x.trim()).filter(x => x.length > 0);
    if (items.length === 0) return;
    
    items.forEach(item => {
      const span = document.createElement("span");
      span.className = "resource-tag";
      span.style.cursor = "pointer";
      span.textContent = item;
      
      span.addEventListener("click", () => {
        const currentVal = inputEl.value.trim();
        if (currentVal === "") {
          inputEl.value = item;
        } else {
          // Если кликаем технику, то можем добавить пустой автозаполнитель "= ", например "Экскаватор="
          const suffix = container === DOM.eoEquipmentTemplates ? "=" : "";
          
          // Проверяем, есть ли уже этот элемент в инпуте, чтобы избежать дублей
          if (!currentVal.includes(item)) {
            inputEl.value = currentVal + ", " + item + suffix;
          }
        }
        inputEl.focus();
      });
      
      container.appendChild(span);
    });
  }

  // Рендер чекбоксов сотрудников с выбором
  function renderWorkersMultiselect(selectedWorkersString = "") {
    DOM.eoWorkersContainer.innerHTML = "";
    
    if (state.staff.length === 0) {
      DOM.eoWorkersContainer.innerHTML = `<div style="padding: 8px; color: var(--text-muted); font-size: 0.85rem;">База исполнителей пуста. Перейдите во вкладку "База" чтобы добавить рабочих.</div>`;
      return;
    }
    
    const selectedList = selectedWorkersString ? selectedWorkersString.split(",").map(x => x.trim()) : [];
    
    state.staff.forEach(person => {
      const isSelected = selectedList.includes(person.name);
      
      const label = document.createElement("label");
      label.className = `multiselect-item ${isSelected ? "selected" : ""}`;
      
      label.innerHTML = `
        <input type="checkbox" data-name="${escapeHtml(person.name)}" ${isSelected ? "checked" : ""}>
        <div>
          <strong>${escapeHtml(person.name)}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${escapeHtml(person.position || "")} ${person.grade ? `(${person.grade} разряд)` : ""}</span>
        </div>
      `;
      
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        label.classList.toggle("selected", checkbox.checked);
        
        // Автоматически пересчитываем текстовую строку рабочих и обновляем инпут
        const checkedBoxes = DOM.eoWorkersContainer.querySelectorAll("input[type='checkbox']:checked");
        const names = Array.from(checkedBoxes).map(cb => cb.dataset.name);
        
        // Устанавливаем количество людей автоматически по числу выбранных чекбоксов!
        DOM.eoPeople.value = names.length;
      });
      
      DOM.eoWorkersContainer.appendChild(label);
    });
  }

  // Сохранение операции
  DOM.saveOperationBtn.addEventListener("click", async () => {
    const op = state.operations.find(o => o.id === state.editingOperationId);
    if (!op) return;
    
    // Получаем выбранных рабочих из чекбоксов
    const checkedBoxes = DOM.eoWorkersContainer.querySelectorAll("input[type='checkbox']:checked");
    const workersString = Array.from(checkedBoxes).map(cb => cb.dataset.name).join(", ");
    
    const updated = {
      ...op,
      name: DOM.eoName.value.trim() || "Операция",
      people: parseInt(DOM.eoPeople.value) || 0,
      workers: workersString,
      tools: DOM.eoTools.value.trim(),
      equipment: DOM.eoEquipment.value.trim(),
      materials: DOM.eoMaterials.value.trim(),
      notes: DOM.eoNotes.value.trim()
    };
    
    await state.db.updateOperation(updated);
    await refreshOperations();
    closeModal(DOM.editOperationModal);
  });

  // --- ВЫБОР ТАБОВ В ДИАЛОГЕ РЕДАКТИРОВАНИЯ ---
  function switchTab(tab) {
    if (tab === "main") {
      DOM.tabMainBtn.classList.add("active");
      DOM.tabStaffBtn.classList.remove("active");
      DOM.tabContentMain.classList.add("active");
      DOM.tabContentStaff.classList.remove("active");
    } else {
      DOM.tabMainBtn.classList.remove("active");
      DOM.tabStaffBtn.classList.add("active");
      DOM.tabContentMain.classList.remove("active");
      DOM.tabContentStaff.classList.add("active");
    }
  }

  DOM.tabMainBtn.addEventListener("click", () => switchTab("main"));
  DOM.tabStaffBtn.addEventListener("click", () => switchTab("staff"));

  // --- ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ОПЕРАЦИИ ---
  DOM.confirmDeleteOperationBtn.addEventListener("click", async () => {
    if (state.deletingOperationId) {
      await state.db.deleteOperation(state.deletingOperationId);
      await refreshOperations();
      state.deletingOperationId = null;
      closeModal(DOM.deleteOperationModal);
    }
  });

  // --- ПОДТВЕРЖДЕНИЕ ОПЕРАЦИЙ НАД ДНЯМИ ---
  
  // Добавление дня
  DOM.confirmAddDayBtn.addEventListener("click", async () => {
    const name = DOM.newDayNameInput.value.trim();
    if (!name) {
      alert("Пожалуйста, введите название дня");
      return;
    }
    
    const copySourceId = DOM.copySourceDaySelect.value;
    
    const newDayId = "day_" + Date.now();
    let newDay = {
      id: newDayId,
      name: name,
      createdAt: Date.now(),
      
      location: "",
      objectName: "",
      organization: "",
      workType: "",
      processName: "",
      docsInfo: "",
      brigadeNumber: "",
      brigadeLeader: "",
      
      workersList: "",
      toolsList: "",
      equipmentList: "",
      materialsList: "",
      operationTemplatesList: ""
    };
    
    // Если выбран день для копирования, копируем паспорт и списки шаблонов ресурсов!
    if (copySourceId) {
      const sourceDay = await state.db.getDay(copySourceId);
      if (sourceDay) {
        newDay = {
          ...newDay,
          location: sourceDay.location || "",
          objectName: sourceDay.objectName || "",
          organization: sourceDay.organization || "",
          workType: sourceDay.workType || "",
          processName: sourceDay.processName || "",
          docsInfo: sourceDay.docsInfo || "",
          brigadeNumber: sourceDay.brigadeNumber || "",
          brigadeLeader: sourceDay.brigadeLeader || "",
          
          workersList: sourceDay.workersList || "",
          toolsList: sourceDay.toolsList || "",
          equipmentList: sourceDay.equipmentList || "",
          materialsList: sourceDay.materialsList || ""
        };
      }
    }
    
    await state.db.addDay(newDay);
    DOM.newDayNameInput.value = "";
    DOM.copySourceDaySelect.value = "";
    
    await refreshDaysList();
    await selectDay(newDayId);
    
    closeModal(DOM.addDayModal);
  });

  // Переименование дня
  DOM.confirmRenameDayBtn.addEventListener("click", async () => {
    const newName = DOM.renameDayInput.value.trim();
    if (!newName) {
      alert("Пожалуйста, введите название дня");
      return;
    }
    if (state.editingDayId) {
      const day = await state.db.getDay(state.editingDayId);
      if (day) {
        day.name = newName;
        await state.db.updateDay(day);
        await refreshDaysList();
        if (state.currentDay && state.currentDay.id === day.id) {
          DOM.headerTitle.textContent = newName;
          state.currentDay = day;
        }
      }
      state.editingDayId = null;
      closeModal(DOM.renameDayModal);
    }
  });

  // Удаление дня
  DOM.confirmDeleteDayBtn.addEventListener("click", async () => {
    if (state.deletingDayId) {
      await state.db.deleteDay(state.deletingDayId);
      await refreshDaysList();
      
      // Если удалили открытый в данный момент день
      if (state.currentDay && state.currentDay.id === state.deletingDayId) {
        if (state.days.length > 0) {
          await selectDay(state.days[0].id);
        } else {
          // Сбрасываем холст
          state.currentDay = null;
          DOM.headerTitle.textContent = "Нормировщик";
          DOM.dayPassportCard.style.display = "none";
          DOM.operationsList.style.display = "none";
          DOM.emptyOperationsState.style.display = "none";
          DOM.fabAddOperation.style.display = "none";
          DOM.unfinishedNavigator.style.display = "none";
          // Автооткрываем диалог добавления дня
          DOM.newDayNameInput.value = "Рабочая смена " + new Date().toLocaleDateString("ru-RU");
          openModal(DOM.addDayModal);
        }
      }
      state.deletingDayId = null;
      closeModal(DOM.deleteDayModal);
    }
  });

  // --- ХЕЛПЕРЫ ДЛЯ ИНТЕРФЕЙСА (UI Helpers) ---
  
  // Открытие/закрытие модальных окон
  function openModal(modalEl) {
    modalEl.classList.add("active");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("active");
  }

  // Навешивание обработчиков закрытия на все модальные окна
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    // Клик на крестик
    const closeBtn = modal.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modal));
    
    // Клик на кнопку Отмена
    const cancelBtn = modal.querySelector(".cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal(modal));
    
    // Клик на оверлей вне контента (по желанию, для удобства мобильного)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Логика кнопки добавления дня из сайдбара
  DOM.addDayBtn.addEventListener("click", () => {
    DOM.newDayNameInput.value = "Рабочая смена " + new Date().toLocaleDateString("ru-RU");
    openModal(DOM.addDayModal);
  });

  // --- БОКОВОЕ МЕНЮ НА МОБИЛЬНЫХ УСТРОЙСТВАХ ---
  function openMobileSidebar() {
    DOM.sidebar.classList.add("active");
    DOM.sidebarOverlay.classList.add("active");
  }

  function closeMobileSidebar() {
    DOM.sidebar.classList.remove("active");
    DOM.sidebarOverlay.classList.remove("active");
  }

  DOM.menuToggleBtn.addEventListener("click", openMobileSidebar);
  DOM.sidebarOverlay.addEventListener("click", closeMobileSidebar);

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Formatters & Escapes) ---
  function formatTimeOnly(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
