// Главная логика PWA приложения "Нормировщик"

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
    
    // Справочники баз данных (Persistent lists)
    staff: [],
    tools: [],
    equipment: [],
    materials: [],
    
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
    openDirectoriesBtn: document.getElementById("openDirectoriesBtn"),
    
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
    
    // Диалоги дней
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
    
    // Диалог операции (Чистый и компактный)
    editOperationModal: document.getElementById("editOperationModal"),
    editOperationModalTitle: document.getElementById("editOperationModalTitle"),
    eoName: document.getElementById("eoName"),
    eoPeople: document.getElementById("eoPeople"),
    eoWorkersContainer: document.getElementById("eoWorkersContainer"),
    eoToolsContainer: document.getElementById("eoToolsContainer"),
    eoEquipmentContainer: document.getElementById("eoEquipmentContainer"),
    eoMaterialsContainer: document.getElementById("eoMaterialsContainer"),
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
    
    // Глобальный диалог справочников
    directoriesModal: document.getElementById("directoriesModal"),
    dirTabStaffBtn: document.getElementById("dirTabStaffBtn"),
    dirTabToolsBtn: document.getElementById("dirTabToolsBtn"),
    dirTabEquipmentBtn: document.getElementById("dirTabEquipmentBtn"),
    dirTabMaterialsBtn: document.getElementById("dirTabMaterialsBtn"),
    
    dirTabContentStaff: document.getElementById("dirTabContentStaff"),
    dirTabContentTools: document.getElementById("dirTabContentTools"),
    dirTabContentEquipment: document.getElementById("dirTabContentEquipment"),
    dirTabContentMaterials: document.getElementById("dirTabContentMaterials"),
    
    // Справочник: Сотрудники
    staffTableBody: document.getElementById("staffTableBody"),
    newStaffName: document.getElementById("newStaffName"),
    newStaffPosition: document.getElementById("newStaffPosition"),
    newStaffGrade: document.getElementById("newStaffGrade"),
    addStaffBtn: document.getElementById("addStaffBtn"),
    
    // Справочник: Инструменты
    toolsTableBody: document.getElementById("toolsTableBody"),
    newToolName: document.getElementById("newToolName"),
    addToolBtn: document.getElementById("addToolBtn"),
    
    // Справочник: Техника
    equipmentTableBody: document.getElementById("equipmentTableBody"),
    newEquipmentName: document.getElementById("newEquipmentName"),
    newEquipmentMachinist: document.getElementById("newEquipmentMachinist"),
    addEquipmentBtn: document.getElementById("addEquipmentBtn"),
    
    // Справочник: Материалы
    materialsTableBody: document.getElementById("materialsTableBody"),
    newMaterialName: document.getElementById("newMaterialName"),
    addMaterialBtn: document.getElementById("addMaterialBtn"),
    
    resetAppCacheBtn: document.getElementById("resetAppCacheBtn")
  };

  // --- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
  try {
    await state.db.init();
    
    // Загружаем все справочники баз данных на старте
    await loadStaff();
    await loadTools();
    await loadEquipment();
    await loadMaterials();
    
    // Загружаем список дней хронометража
    await refreshDaysList();
    
    // Автовыбор последнего дня или открытие диалога создания
    if (state.days.length > 0) {
      const lastDayId = localStorage.getItem("lastSelectedDayId");
      const foundDay = state.days.find(d => d.id === lastDayId);
      if (foundDay) {
        await selectDay(lastDayId);
      } else {
        await selectDay(state.days[0].id);
      }
    } else {
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
        
        // Синхронизируем: если открыта модалка редактирования операции, перерисовываем чекбоксы
        if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
          const op = state.operations.find(o => o.id === state.editingOperationId);
          renderWorkersMultiselect(op ? op.workers : "");
        }
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
    
    if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
      const op = state.operations.find(o => o.id === state.editingOperationId);
      renderWorkersMultiselect(op ? op.workers : "");
    }
  });

  // --- УПРАВЛЕНИЕ СПРАВОЧНИКОМ ИНСТРУМЕНТОВ (Tools Database) ---
  async function loadTools() {
    state.tools = await state.db.getTools();
    renderToolsTable();
  }

  function renderToolsTable() {
    DOM.toolsTableBody.innerHTML = "";
    if (state.tools.length === 0) {
      DOM.toolsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">База инструментов пуста. Добавьте записи ниже.</td></tr>`;
      return;
    }
    state.tools.forEach(tool => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(tool.name)}</strong></td>
        <td>
          <button class="tool-delete-btn" data-id="${tool.id}">
            <span class="material-icons-outlined" style="font-size: 16px;">delete</span>
          </button>
        </td>
      `;
      
      tr.querySelector(".tool-delete-btn").addEventListener("click", async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await state.db.deleteTool(id);
        await loadTools();
        
        if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
          const op = state.operations.find(o => o.id === state.editingOperationId);
          renderToolsMultiselect(op ? op.tools : "");
        }
      });
      
      DOM.toolsTableBody.appendChild(tr);
    });
  }

  DOM.addToolBtn.addEventListener("click", async () => {
    const name = DOM.newToolName.value.trim();
    if (!name) {
      alert("Введите название инструмента");
      return;
    }
    await state.db.addTool({ name });
    DOM.newToolName.value = "";
    await loadTools();
    
    if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
      const op = state.operations.find(o => o.id === state.editingOperationId);
      renderToolsMultiselect(op ? op.tools : "");
    }
  });

  // --- УПРАВЛЕНИЕ СПРАВОЧНИКОМ ТЕХНИКИ (Equipment Database) ---
  async function loadEquipment() {
    state.equipment = await state.db.getEquipment();
    renderEquipmentTable();
  }

  function renderEquipmentTable() {
    DOM.equipmentTableBody.innerHTML = "";
    if (state.equipment.length === 0) {
      DOM.equipmentTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">База спецтехники пуста. Добавьте записи ниже.</td></tr>`;
      return;
    }
    state.equipment.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${escapeHtml(item.machinist || "—")}</td>
        <td>
          <button class="eq-delete-btn" data-id="${item.id}">
            <span class="material-icons-outlined" style="font-size: 16px;">delete</span>
          </button>
        </td>
      `;
      
      tr.querySelector(".eq-delete-btn").addEventListener("click", async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await state.db.deleteEquipment(id);
        await loadEquipment();
        
        if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
          const op = state.operations.find(o => o.id === state.editingOperationId);
          renderEquipmentMultiselect(op ? op.equipment : "");
        }
      });
      
      DOM.equipmentTableBody.appendChild(tr);
    });
  }

  DOM.addEquipmentBtn.addEventListener("click", async () => {
    const name = DOM.newEquipmentName.value.trim();
    const machinist = DOM.newEquipmentMachinist.value.trim();
    if (!name) {
      alert("Введите название спецтехники");
      return;
    }
    await state.db.addEquipment({ name, machinist });
    DOM.newEquipmentName.value = "";
    DOM.newEquipmentMachinist.value = "";
    await loadEquipment();
    
    if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
      const op = state.operations.find(o => o.id === state.editingOperationId);
      renderEquipmentMultiselect(op ? op.equipment : "");
    }
  });

  // --- УПРАВЛЕНИЕ СПРАВОЧНИКОМ МАТЕРИАЛОВ (Materials Database) ---
  async function loadMaterials() {
    state.materials = await state.db.getMaterials();
    renderMaterialsTable();
  }

  function renderMaterialsTable() {
    DOM.materialsTableBody.innerHTML = "";
    if (state.materials.length === 0) {
      DOM.materialsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">База материалов пуста. Добавьте записи ниже.</td></tr>`;
      return;
    }
    state.materials.forEach(mat => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(mat.name)}</strong></td>
        <td>
          <button class="mat-delete-btn" data-id="${mat.id}">
            <span class="material-icons-outlined" style="font-size: 16px;">delete</span>
          </button>
        </td>
      `;
      
      tr.querySelector(".mat-delete-btn").addEventListener("click", async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        await state.db.deleteMaterial(id);
        await loadMaterials();
        
        if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
          const op = state.operations.find(o => o.id === state.editingOperationId);
          renderMaterialsMultiselect(op ? op.materials : "");
        }
      });
      
      DOM.materialsTableBody.appendChild(tr);
    });
  }

  DOM.addMaterialBtn.addEventListener("click", async () => {
    const name = DOM.newMaterialName.value.trim();
    if (!name) {
      alert("Введите название материала");
      return;
    }
    await state.db.addMaterial({ name });
    DOM.newMaterialName.value = "";
    await loadMaterials();
    
    if (DOM.editOperationModal.classList.contains("active") && state.editingOperationId) {
      const op = state.operations.find(o => o.id === state.editingOperationId);
      renderMaterialsMultiselect(op ? op.materials : "");
    }
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
      
      div.querySelector(".day-item-name").addEventListener("click", () => {
        selectDay(day.id);
        closeMobileSidebar();
      });
      
      div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        state.editingDayId = day.id;
        DOM.renameDayInput.value = day.name;
        openModal(DOM.renameDayModal);
      });
      
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
    
    localStorage.setItem("lastSelectedDayId", dayId);
    DOM.headerTitle.textContent = state.currentDay.name;
    
    document.querySelectorAll(".day-item").forEach(item => {
      item.classList.toggle("active", item.dataset.id === dayId);
    });
    
    renderPassport();
    await refreshOperations();
    
    DOM.dayPassportCard.style.display = "block";
    DOM.fabAddOperation.style.display = "flex";

    // На мобильных экранах скрываем тело паспорта по умолчанию для разгрузки интерфейса
    if (window.innerWidth <= 768) {
      DOM.passportBody.classList.add("collapsed");
      DOM.passportToggleBtn.querySelector("span").textContent = "expand_more";
    } else {
      DOM.passportBody.classList.remove("collapsed");
      DOM.passportToggleBtn.querySelector("span").textContent = "expand_less";
    }
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

  DOM.passportHeader.addEventListener("click", () => {
    const isCollapsed = DOM.passportBody.classList.toggle("collapsed");
    DOM.passportToggleBtn.querySelector("span").textContent = isCollapsed ? "expand_more" : "expand_less";
  });

  // --- УПРАВЛЕНИЕ ОПЕРАЦИЯМИ (Operations Logic) ---
  async function refreshOperations() {
    if (!state.currentDay) return;
    
    state.operations = await state.db.getOperations(state.currentDay.id);
    state.operations.sort((a, b) => b.startEpoch - a.startEpoch);
    
    DOM.operationsCount.textContent = state.operations.length;
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
      
      const stopBtnHtml = op.stopEpoch === null 
        ? `<button class="op-action-btn stop-btn" title="Завершить операцию"><span class="material-icons-outlined">stop_circle</span> <span class="btn-label">Завершить</span></button>` 
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
          <button class="op-action-btn split-btn" title="Разделить"><span class="material-icons-outlined">content_cut</span> <span class="btn-label">Разделить</span></button>
          <button class="op-action-btn repeat-btn" title="Повторить"><span class="material-icons-outlined">replay</span> <span class="btn-label">Повторить</span></button>
          <button class="op-action-btn delete-btn" title="Удалить"><span class="material-icons-outlined">delete</span></button>
        </div>
      `;
      
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

  async function triggerAddOperation() {
    if (!state.currentDay) return;
    
    const newOp = {
      id: Date.now() + Math.floor(Math.random() * 1000),
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
    
    const addedOp = state.operations.find(o => o.id === newOp.id);
    if (addedOp) {
      openEditOperationModal(addedOp);
    }
  }

  DOM.fabAddOperation.addEventListener("click", triggerAddOperation);
  DOM.emptyAddOpBtn.addEventListener("click", triggerAddOperation);

  async function stopOperation(op) {
    const updated = {
      ...op,
      stopEpoch: Date.now()
    };
    await state.db.updateOperation(updated);
    await refreshOperations();
  }

  async function splitOperation(op) {
    const now = Date.now();
    const updatedCurrent = {
      ...op,
      stopEpoch: now
    };
    await state.db.updateOperation(updatedCurrent);
    
    const newOp = {
      ...op,
      id: now + Math.floor(Math.random() * 1000),
      startEpoch: now,
      stopEpoch: null
    };
    await state.db.addOperation(newOp);
    await refreshOperations();
  }

  async function repeatOperation(op) {
    const now = Date.now();
    const newOp = {
      ...op,
      id: now + Math.floor(Math.random() * 1000),
      startEpoch: now,
      stopEpoch: null
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
      const cardEl = document.querySelector(`.operation-card[data-id="${op.id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        cardEl.style.outline = "2px solid var(--primary)";
        setTimeout(() => cardEl.style.outline = "none", 1500);
      }
    }
    
    state.currentUnfinishedIndex = (state.currentUnfinishedIndex + 1) % count;
    DOM.unfinishedStatusText.textContent = `${state.currentUnfinishedIndex + 1}/${count}`;
  });

  // --- ЭКСПОРТ В EXCEL ---
  DOM.exportExcelBtn.addEventListener("click", () => {
    if (!state.currentDay) return;
    state.exporter.exportToExcel(state.currentDay, state.operations);
  });

  // --- ДИАЛОГ: РЕДАКТИРОВАНИЕ ОПЕРАЦИИ, ЧЕКБОКСЫ И ШАБЛОНЫ ---
  function openEditOperationModal(op) {
    state.editingOperationId = op.id;
    DOM.editOperationModalTitle.textContent = `Редактирование: ${escapeHtml(op.name)}`;
    
    DOM.eoName.value = op.name || "";
    DOM.eoPeople.value = op.people || 0;
    DOM.eoNotes.value = op.notes || "";
    
    // --- 1. Обработка Исполнителей (Сотрудники) ---
    renderWorkersMultiselect(op.workers);
    
    // --- 2. Обработка Инструментов (Чекбоксы БД + Ручной ввод) ---
    const dbToolNames = state.tools.map(t => t.name);
    const opToolsList = op.tools ? op.tools.split(",").map(t => t.trim()).filter(Boolean) : [];
    
    // Отмечаем чекбоксы для инструментов, которые есть в БД
    renderToolsMultiselect(op.tools);
    
    // Все остальные инструменты, которых нет в БД, отправляем в поле ручного ввода
    const manualTools = opToolsList.filter(t => !dbToolNames.includes(t));
    DOM.eoTools.value = manualTools.join(", ");
    
    // --- 3. Обработка Материалов (Чекбоксы БД + Ручной ввод) ---
    const dbMaterialNames = state.materials.map(m => m.name);
    const opMaterialsList = op.materials ? op.materials.split(",").map(m => m.trim()).filter(Boolean) : [];
    
    renderMaterialsMultiselect(op.materials);
    
    const manualMaterials = opMaterialsList.filter(m => !dbMaterialNames.includes(m));
    DOM.eoMaterials.value = manualMaterials.join(", ");
    
    // --- 4. Обработка Техники (Чекбоксы БД с машинистами + Ручной ввод) ---
    const dbEqNames = state.equipment.map(e => e.name);
    const opEqList = op.equipment ? op.equipment.split(",").map(e => e.trim()).filter(Boolean) : [];
    
    renderEquipmentMultiselect(op.equipment);
    
    const manualEqItems = opEqList.filter(item => {
      const eqName = item.split("=")[0].trim();
      return !dbEqNames.includes(eqName);
    });
    DOM.eoEquipment.value = manualEqItems.join(", ");
    
    // --- 5. Рендер тегов-шаблонов из паспорта дня (быстрый клик) ---
    renderTemplateHelpers(DOM.eoToolsTemplates, state.currentDay.toolsList, DOM.eoTools);
    renderTemplateHelpers(DOM.eoEquipmentTemplates, state.currentDay.equipmentList, DOM.eoEquipment);
    renderTemplateHelpers(DOM.eoMaterialsTemplates, state.currentDay.materialsList, DOM.eoMaterials);
    
    openModal(DOM.editOperationModal);
  }

  // Быстрое добавление тегов-шаблонов в поля ввода
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
          const suffix = container === DOM.eoEquipmentTemplates ? "=" : "";
          if (!currentVal.includes(item)) {
            inputEl.value = currentVal + ", " + item + suffix;
          }
        }
        inputEl.focus();
      });
      
      container.appendChild(span);
    });
  }

  // Чекбоксы: Сотрудники
  function renderWorkersMultiselect(selectedWorkersString = "") {
    DOM.eoWorkersContainer.innerHTML = "";
    
    if (state.staff.length === 0) {
      DOM.eoWorkersContainer.innerHTML = `<div style="padding: 8px; color: var(--text-muted); font-size: 0.85rem;">База исполнителей пуста. Перейдите в "Справочники БД" в боковом меню, чтобы добавить людей.</div>`;
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
        const checkedBoxes = DOM.eoWorkersContainer.querySelectorAll("input[type='checkbox']:checked");
        DOM.eoPeople.value = checkedBoxes.length;
      });
      
      DOM.eoWorkersContainer.appendChild(label);
    });
  }

  // Чекбоксы: Инструменты
  function renderToolsMultiselect(selectedToolsString = "") {
    DOM.eoToolsContainer.innerHTML = "";
    
    if (state.tools.length === 0) {
      DOM.eoToolsContainer.innerHTML = `<div style="padding: 8px; color: var(--text-muted); font-size: 0.85rem;">База инструментов пуста. Перейдите в "Справочники БД" в боковом меню, чтобы добавить.</div>`;
      return;
    }
    
    const selectedList = selectedToolsString ? selectedToolsString.split(",").map(x => x.trim()) : [];
    
    state.tools.forEach(tool => {
      const isSelected = selectedList.includes(tool.name);
      const label = document.createElement("label");
      label.className = `multiselect-item ${isSelected ? "selected" : ""}`;
      
      label.innerHTML = `
        <input type="checkbox" data-name="${escapeHtml(tool.name)}" ${isSelected ? "checked" : ""}>
        <div><strong>${escapeHtml(tool.name)}</strong></div>
      `;
      
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        label.classList.toggle("selected", checkbox.checked);
      });
      
      DOM.eoToolsContainer.appendChild(label);
    });
  }

  // Чекбоксы: Материалы
  function renderMaterialsMultiselect(selectedMaterialsString = "") {
    DOM.eoMaterialsContainer.innerHTML = "";
    
    if (state.materials.length === 0) {
      DOM.eoMaterialsContainer.innerHTML = `<div style="padding: 8px; color: var(--text-muted); font-size: 0.85rem;">База материалов пуста. Перейдите в "Справочники БД" в боковом меню, чтобы добавить.</div>`;
      return;
    }
    
    const selectedList = selectedMaterialsString ? selectedMaterialsString.split(",").map(x => x.trim()) : [];
    
    state.materials.forEach(mat => {
      const isSelected = selectedList.includes(mat.name);
      const label = document.createElement("label");
      label.className = `multiselect-item ${isSelected ? "selected" : ""}`;
      
      label.innerHTML = `
        <input type="checkbox" data-name="${escapeHtml(mat.name)}" ${isSelected ? "checked" : ""}>
        <div><strong>${escapeHtml(mat.name)}</strong></div>
      `;
      
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        label.classList.toggle("selected", checkbox.checked);
      });
      
      DOM.eoMaterialsContainer.appendChild(label);
    });
  }

  // Чекбоксы: Техника (с инпутами для машинистов)
  function renderEquipmentMultiselect(selectedEquipmentString = "") {
    DOM.eoEquipmentContainer.innerHTML = "";
    
    if (state.equipment.length === 0) {
      DOM.eoEquipmentContainer.innerHTML = `<div style="padding: 8px; color: var(--text-muted); font-size: 0.85rem;">База спецтехники пуста. Перейдите в "Справочники БД" в боковом меню, чтобы добавить.</div>`;
      return;
    }
    
    const selectedMap = {};
    if (selectedEquipmentString) {
      selectedEquipmentString.split(",").map(x => x.trim()).forEach(item => {
        const parts = item.split("=");
        const name = parts[0].trim();
        const driver = parts.length > 1 ? parts[1].trim() : "";
        selectedMap[name] = { selected: true, driver };
      });
    }
    
    state.equipment.forEach(eq => {
      const isSelected = selectedMap[eq.name] !== undefined;
      const initialDriver = isSelected ? selectedMap[eq.name].driver : "";
      
      const label = document.createElement("label");
      label.className = `multiselect-item ${isSelected ? "selected" : ""}`;
      label.style.display = "flex";
      label.style.justifyContent = "space-between";
      label.style.alignItems = "center";
      
      label.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex: 1;">
          <input type="checkbox" data-name="${escapeHtml(eq.name)}" ${isSelected ? "checked" : ""}>
          <div><strong>${escapeHtml(eq.name)}</strong></div>
        </div>
        <input type="text" class="form-input machinist-input" placeholder="Машинист" style="padding:4px 8px; font-size:0.8rem; width:120px; display:${isSelected ? 'block' : 'none'}; margin-left:10px;" value="${escapeHtml(initialDriver)}">
      `;
      
      const checkbox = label.querySelector("input[type='checkbox']");
      const textInput = label.querySelector("input[type='text']");
      
      checkbox.addEventListener("change", () => {
        label.classList.toggle("selected", checkbox.checked);
        textInput.style.display = checkbox.checked ? "block" : "none";
        if (checkbox.checked) {
          if (!textInput.value.trim()) {
            textInput.value = eq.machinist || "";
          }
          textInput.focus();
        }
      });
      
      textInput.addEventListener("click", (e) => e.stopPropagation());
      DOM.eoEquipmentContainer.appendChild(label);
    });
  }

  // Сохранение отредактированной операции
  DOM.saveOperationBtn.addEventListener("click", async () => {
    const op = state.operations.find(o => o.id === state.editingOperationId);
    if (!op) return;
    
    // 1. Собираем сотрудников
    const checkedWorkers = Array.from(DOM.eoWorkersContainer.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.dataset.name);
    const finalWorkers = checkedWorkers.join(", ");
    
    // 2. Собираем инструменты (БД + ручные)
    const checkedTools = Array.from(DOM.eoToolsContainer.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.dataset.name);
    const manualToolsStr = DOM.eoTools.value.trim();
    const manualToolsList = manualToolsStr ? manualToolsStr.split(",").map(t => t.trim()).filter(Boolean) : [];
    const finalTools = [...checkedTools, ...manualToolsList].join(", ");
    
    // 3. Собираем материалы (БД + ручные)
    const checkedMaterials = Array.from(DOM.eoMaterialsContainer.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.dataset.name);
    const manualMaterialsStr = DOM.eoMaterials.value.trim();
    const manualMaterialsList = manualMaterialsStr ? manualMaterialsStr.split(",").map(m => m.trim()).filter(Boolean) : [];
    const finalMaterials = [...checkedMaterials, ...manualMaterialsList].join(", ");
    
    // 4. Собираем технику с машинистами (БД + ручная)
    const dbEqItems = [];
    DOM.eoEquipmentContainer.querySelectorAll(".multiselect-item.selected").forEach(item => {
      const cb = item.querySelector("input[type='checkbox']");
      const textInput = item.querySelector("input[type='text']");
      const eqName = cb.dataset.name;
      const driver = textInput.value.trim();
      if (driver) {
        dbEqItems.push(`${eqName}=${driver}`);
      } else {
        dbEqItems.push(eqName);
      }
    });
    const manualEqStr = DOM.eoEquipment.value.trim();
    const manualEqList = manualEqStr ? manualEqStr.split(",").map(e => e.trim()).filter(Boolean) : [];
    const finalEquipment = [...dbEqItems, ...manualEqList].join(", ");
    
    const updated = {
      ...op,
      name: DOM.eoName.value.trim() || "Операция",
      people: parseInt(DOM.eoPeople.value) || 0,
      workers: finalWorkers,
      tools: finalTools,
      equipment: finalEquipment,
      materials: finalMaterials,
      notes: DOM.eoNotes.value.trim()
    };
    
    await state.db.updateOperation(updated);
    await refreshOperations();
    closeModal(DOM.editOperationModal);
  });

  // --- УПРАВЛЕНИЕ ГЛОБАЛЬНЫМИ СПРАВОЧНИКАМИ БД ---
  DOM.openDirectoriesBtn.addEventListener("click", () => {
    switchDirTab("staff");
    openModal(DOM.directoriesModal);
    closeMobileSidebar();
  });

  function switchDirTab(tab) {
    const tabs = ["staff", "tools", "equipment", "materials"];
    tabs.forEach(t => {
      const btn = document.getElementById(`dirTab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
      const content = document.getElementById(`dirTabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
      
      if (btn && content) {
        if (t === tab) {
          btn.classList.add("active");
          content.classList.add("active");
        } else {
          btn.classList.remove("active");
          content.classList.remove("active");
        }
      }
    });
  }

  DOM.dirTabStaffBtn.addEventListener("click", () => switchDirTab("staff"));
  DOM.dirTabToolsBtn.addEventListener("click", () => switchDirTab("tools"));
  DOM.dirTabEquipmentBtn.addEventListener("click", () => switchDirTab("equipment"));
  DOM.dirTabMaterialsBtn.addEventListener("click", () => switchDirTab("materials"));

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

  DOM.confirmDeleteDayBtn.addEventListener("click", async () => {
    if (state.deletingDayId) {
      await state.db.deleteDay(state.deletingDayId);
      await refreshDaysList();
      
      if (state.currentDay && state.currentDay.id === state.deletingDayId) {
        if (state.days.length > 0) {
          await selectDay(state.days[0].id);
        } else {
          state.currentDay = null;
          DOM.headerTitle.textContent = "Нормировщик";
          DOM.dayPassportCard.style.display = "none";
          DOM.operationsList.style.display = "none";
          DOM.emptyOperationsState.style.display = "none";
          DOM.fabAddOperation.style.display = "none";
          DOM.unfinishedNavigator.style.display = "none";
          DOM.newDayNameInput.value = "Рабочая смена " + new Date().toLocaleDateString("ru-RU");
          openModal(DOM.addDayModal);
        }
      }
      state.deletingDayId = null;
      closeModal(DOM.deleteDayModal);
    }
  });

  // --- ХЕЛПЕРЫ ДЛЯ ИНТЕРФЕЙСА (UI Helpers) ---
  
  function openModal(modalEl) {
    modalEl.classList.add("active");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("active");
  }

  document.querySelectorAll(".modal-overlay").forEach(modal => {
    const closeBtn = modal.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modal));
    
    const cancelBtn = modal.querySelector(".cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal(modal));
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  DOM.addDayBtn.addEventListener("click", () => {
    DOM.newDayNameInput.value = "Рабочая смена " + new Date().toLocaleDateString("ru-RU");
    openModal(DOM.addDayModal);
  });

  DOM.resetAppCacheBtn.addEventListener("click", async () => {
    if (confirm("Вы уверены, что хотите принудительно обновить приложение? Ваши сохраненные дни и справочники в БД НЕ удалятся, но кэш файлов сбросится до самой последней версии.")) {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let reg of registrations) {
            await reg.unregister();
          }
        }
        const cacheNames = await caches.keys();
        for (let name of cacheNames) {
          await caches.delete(name);
        }
        window.location.reload(true);
      } catch (err) {
        alert("Ошибка обновления кэша: " + err);
        window.location.reload(true);
      }
    }
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
