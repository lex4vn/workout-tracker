// Register Service Worker for PWA Offline Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered successfully.', reg.scope))
      .catch((err) => console.log('Service Worker registration failed: ', err));
  });
}

// ==========================================================================
// STATE MANAGEMENT & INITIALIZATION
// ==========================================================================

const DEFAULT_SETTINGS = {
  goalName: "Thử Thách 100 Ngày",
  targetDays: 100,
  startDate: getLocalDateString(new Date()) // Default start date is today
};

let appState = {
  settings: { ...DEFAULT_SETTINGS },
  workoutLogs: {} // Keyed by YYYY-MM-DD. Value: { completed: bool, duration: num, tags: [], notes: "" }
};

// LocalStorage Keys
const STORAGE_KEY_SETTINGS = 'workout_tracker_settings';
const STORAGE_KEY_LOGS = 'workout_tracker_logs';

// Helper: Format Date to YYYY-MM-DD in local time
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Format YYYY-MM-DD to display format dd/mm/yyyy
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Helper: Parse YYYY-MM-DD into a Date Object in local timezone
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Add/Subtract days helper
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Load data from localStorage
function loadState() {
  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);

    if (savedSettings) {
      appState.settings = JSON.parse(savedSettings);
    } else {
      appState.settings = { ...DEFAULT_SETTINGS };
      saveSettings();
    }

    if (savedLogs) {
      appState.workoutLogs = JSON.parse(savedLogs);
    } else {
      appState.workoutLogs = {};
      saveLogs();
    }
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    showToast("Lỗi khi tải dữ liệu. Đã khôi phục cài đặt mặc định.");
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appState.settings));
}

function saveLogs() {
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(appState.workoutLogs));
}

// ==========================================================================
// CALCULATIONS & METRICS
// ==========================================================================

function getStreakMetrics() {
  const logs = appState.workoutLogs;
  const completedDates = Object.keys(logs)
    .filter(dateStr => logs[dateStr] && logs[dateStr].completed)
    .sort();

  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(addDays(new Date(), -1));

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let checkDate = new Date(); // Start checking from today
  let checkDateStr = getLocalDateString(checkDate);

  // If today is not completed, we can still continue streak if yesterday was completed
  if (!logs[todayStr] || !logs[todayStr].completed) {
    if (logs[yesterdayStr] && logs[yesterdayStr].completed) {
      checkDate = addDays(new Date(), -1);
      checkDateStr = yesterdayStr;
    } else {
      // Both today and yesterday not completed, current streak is 0
      checkDate = null;
    }
  }

  if (checkDate) {
    while (true) {
      const dateKey = getLocalDateString(checkDate);
      if (logs[dateKey] && logs[dateKey].completed) {
        currentStreak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }
  }

  // 2. Calculate Longest Streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  // Since completedDates are sorted chronologically (YYYY-MM-DD)
  for (let i = 0; i < completedDates.length; i++) {
    const currDate = parseLocalDate(completedDates[i]);
    
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = currDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

function getCompletionMetrics() {
  const logs = appState.workoutLogs;
  const targetDays = appState.settings.targetDays;
  const startDateStr = appState.settings.startDate;
  const startDate = parseLocalDate(startDateStr);

  let completedCount = 0;
  let totalMinutes = 0;

  // We only count completions that fall within the target days timeframe starting from startDate
  for (let i = 0; i < targetDays; i++) {
    const dateKey = getLocalDateString(addDays(startDate, i));
    if (logs[dateKey]) {
      if (logs[dateKey].completed) {
        completedCount++;
      }
      totalMinutes += Number(logs[dateKey].duration || 0);
    }
  }

  const percent = Math.min(100, Math.round((completedCount / targetDays) * 100));

  return {
    completedCount,
    totalMinutes,
    percent
  };
}

// ==========================================================================
// DOM ELEMENT SELECTIONS
// ==========================================================================

const DOM = {
  // Title / Headers
  appTitle: document.getElementById('app-title'),
  appSubtitle: document.getElementById('app-subtitle'),
  
  // Dashboard
  progressIndicator: document.getElementById('progress-indicator'),
  statPercent: document.getElementById('stat-percent'),
  statFraction: document.getElementById('stat-fraction'),
  statCurrentStreak: document.getElementById('stat-current-streak'),
  statLongestStreak: document.getElementById('stat-longest-streak'),
  statTotalMinutes: document.getElementById('stat-total-minutes'),
  btnQuickLog: document.getElementById('btn-quick-log'),

  // Views & Nav
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.view-section'),
  
  // Grid View
  gridContainer: document.getElementById('grid-days'),
  gridStatusBadge: document.getElementById('grid-status-badge'),
  
  // Stats View
  chartDuration: document.getElementById('chart-duration'),
  tagsChartContainer: document.getElementById('tags-chart-container'),
  logsListContainer: document.getElementById('logs-list-container'),
  
  // Settings View
  formSettings: document.getElementById('form-settings'),
  settingsGoalName: document.getElementById('settings-goal-name'),
  settingsTargetDays: document.getElementById('settings-target-days'),
  settingsStartDate: document.getElementById('settings-start-date'),
  btnExportData: document.getElementById('btn-export-data'),
  btnImportData: document.getElementById('btn-import-data'),
  btnResetData: document.getElementById('btn-reset-data'),
  
  // Log Modal
  logModal: document.getElementById('log-modal'),
  formLogWorkout: document.getElementById('form-log-workout'),
  modalTitle: document.getElementById('modal-title'),
  logCompleted: document.getElementById('log-completed'),
  logDate: document.getElementById('log-date'),
  logDuration: document.getElementById('log-duration'),
  logDurationVal: document.getElementById('log-duration-val'),
  logChips: document.getElementById('log-chips'),
  logNotes: document.getElementById('log-notes'),
  btnDeleteLog: document.getElementById('btn-delete-log'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  
  // Import Modal
  importModal: document.getElementById('import-modal'),
  importJsonData: document.getElementById('import-json-data'),
  importFile: document.getElementById('import-file'),
  btnSubmitImport: document.getElementById('btn-submit-import'),
  btnCancelImport: document.getElementById('btn-cancel-import'),
  btnCloseImport: document.getElementById('btn-close-import'),
  
  // Toast Alert
  toast: document.getElementById('toast')
};

// ==========================================================================
// RENDER CONTROLLERS
// ==========================================================================

function updateUI() {
  loadState();

  // 1. Update Title Header
  DOM.appTitle.textContent = appState.settings.goalName;
  
  // Calculate completion percentage & streaks
  const completion = getCompletionMetrics();
  const streaks = getStreakMetrics();

  // 2. Update Dashboard Metrics
  DOM.statPercent.textContent = `${completion.percent}%`;
  DOM.statFraction.textContent = `${completion.completedCount}/${appState.settings.targetDays} ngày`;
  DOM.statCurrentStreak.textContent = `${streaks.currentStreak} ngày`;
  DOM.statLongestStreak.textContent = `${streaks.longestStreak} ngày`;
  DOM.statTotalMinutes.textContent = `${completion.totalMinutes} phút`;

  // Update Radial Circle Progress stroke-dashoffset
  // circumference = 2 * PI * r = 2 * 3.14159 * 50 = 314.16
  const strokeOffset = 314.16 - (completion.percent / 100) * 314.16;
  DOM.progressIndicator.style.strokeDashoffset = strokeOffset;

  // 3. Render Active View
  renderActiveView();
}

function renderActiveView() {
  const activeView = document.querySelector('.nav-item.active').dataset.view;
  
  // Toggle visibility of views
  DOM.views.forEach(view => {
    if (view.id === `view-${activeView}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  if (activeView === 'grid') {
    renderGridView();
  } else if (activeView === 'stats') {
    renderStatsView();
  } else if (activeView === 'settings') {
    renderSettingsView();
  }
}

// 1. RENDER GRID VIEW
function renderGridView() {
  DOM.gridContainer.innerHTML = '';
  
  const targetDays = appState.settings.targetDays;
  const startDateStr = appState.settings.startDate;
  const startDate = parseLocalDate(startDateStr);
  const todayStr = getLocalDateString(new Date());

  let daysTrackedCount = 0;
  
  for (let i = 0; i < targetDays; i++) {
    const currentDayDate = addDays(startDate, i);
    const dateKey = getLocalDateString(currentDayDate);
    const log = appState.workoutLogs[dateKey];
    
    const dayBlock = document.createElement('div');
    dayBlock.className = 'day-block';
    
    // Label day number
    const dayNumSpan = document.createElement('span');
    dayNumSpan.className = 'day-number';
    dayNumSpan.textContent = i + 1;
    dayBlock.appendChild(dayNumSpan);

    // Label duration if completed
    const dayDurSpan = document.createElement('span');
    dayDurSpan.className = 'day-duration';
    
    // Determine state of this day
    if (log && log.completed) {
      dayBlock.classList.add('completed');
      dayDurSpan.textContent = `${log.duration}m`;
      daysTrackedCount++;
    } else if (dateKey === todayStr) {
      dayBlock.classList.add('today');
      dayDurSpan.textContent = 'Hôm nay';
    } else if (currentDayDate < new Date() && dateKey !== todayStr) {
      dayBlock.classList.add('missed');
      dayDurSpan.textContent = 'Bỏ lỡ';
    } else {
      dayBlock.classList.add('future');
      dayDurSpan.textContent = '';
    }
    
    dayBlock.appendChild(dayDurSpan);
    
    // Click action: Open Log Modal for this day
    dayBlock.addEventListener('click', () => {
      openLogModal(dateKey, i + 1);
    });
    
    DOM.gridContainer.appendChild(dayBlock);
  }

  // Update status badge
  // Calculate which day of the challenge today is
  const diffTime = Math.abs(new Date() - startDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays >= 1 && diffDays <= targetDays) {
    DOM.gridStatusBadge.textContent = `Ngày ${diffDays}/${targetDays}`;
  } else if (diffDays > targetDays) {
    DOM.gridStatusBadge.textContent = `Hoàn thành thử thách!`;
  } else {
    DOM.gridStatusBadge.textContent = `Thử thách chưa bắt đầu`;
  }
}

// 2. RENDER STATS VIEW
function renderStatsView() {
  renderDurationChart();
  renderTagsBreakdown();
  renderLogsList();
}

// Draw dynamic SVG Bar Chart for workout duration of last 7 calendar days
function renderDurationChart() {
  DOM.chartDuration.innerHTML = '';
  
  // Get last 7 days of logs (including today)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(new Date(), -i);
    last7Days.push({
      dateStr: getLocalDateString(date),
      label: formatDateLabel(date),
      duration: 0
    });
  }

  // Populate durations from state
  let maxDuration = 15; // default max scaling height (in minutes)
  last7Days.forEach(day => {
    const log = appState.workoutLogs[day.dateStr];
    if (log && log.completed) {
      day.duration = Number(log.duration || 0);
      if (day.duration > maxDuration) {
        maxDuration = day.duration;
      }
    }
  });

  // Build dynamic SVG
  const width = 320;
  const height = 130;
  const padding = { top: 15, right: 10, bottom: 20, left: 25 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;
  
  // Y-axis gridlines & labels
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxDuration / steps) * i);
    const y = padding.top + chartHeight - (chartHeight / steps) * i;
    
    // Gridline
    svgContent += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`;
    // Label
    svgContent += `<text x="${padding.left - 5}" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">${val}m</text>`;
  }

  // Draw Bars
  const barCount = last7Days.length;
  const barSpacing = chartWidth / barCount;
  const barWidth = Math.max(12, barSpacing * 0.45);

  last7Days.forEach((day, index) => {
    const x = padding.left + (barSpacing * index) + (barSpacing - barWidth) / 2;
    const barHeight = (day.duration / maxDuration) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    
    // Bar Gradient or fill
    const isCompleted = day.duration > 0;
    const fill = isCompleted ? 'url(#barGrad)' : 'rgba(255,255,255,0.04)';
    const rx = 4; // corner radius
    
    // Draw Bar
    if (isCompleted) {
      svgContent += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${rx}" fill="${fill}">
          <animate attributeName="height" from="0" to="${barHeight}" dur="0.5s" fill="freeze" />
          <animate attributeName="y" from="${padding.top + chartHeight}" to="${y}" dur="0.5s" fill="freeze" />
        </rect>
      `;
      // Draw value on top of bar
      svgContent += `<text x="${x + barWidth/2}" y="${y - 4}" fill="var(--accent-neon-mint)" font-size="9" font-weight="700" text-anchor="middle">${day.duration}</text>`;
    } else {
      svgContent += `<rect x="${x}" y="${y - 4}" width="${barWidth}" height="4" rx="2" fill="${fill}" />`;
    }

    // X-axis Label (Day of week / Date)
    svgContent += `<text x="${x + barWidth/2}" y="${height - 4}" fill="${isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'}" font-size="9" text-anchor="middle">${day.label}</text>`;
  });

  // Gradient Definition
  svgContent += `
    <defs>
      <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="var(--accent-electric-blue)" />
        <stop offset="100%" stop-color="var(--accent-neon-mint)" />
      </linearGradient>
    </defs>
  `;
  
  svgContent += `</svg>`;
  DOM.chartDuration.innerHTML = svgContent;
}

// Helper: Format date for chart labels (e.g. T2, T3 or 21/06)
function formatDateLabel(date) {
  const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayName = daysOfWeek[date.getDay()];
  const dayNum = String(date.getDate()).padStart(2, '0');
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  
  const todayStr = getLocalDateString(new Date());
  if (getLocalDateString(date) === todayStr) {
    return 'H.Nay';
  }
  
  return `${dayName}`;
}

// Render tag frequency bars
function renderTagsBreakdown() {
  const logs = appState.workoutLogs;
  const tagCounts = {};
  let totalTagsCount = 0;

  // Extract all tags from completed workouts
  Object.values(logs).forEach(log => {
    if (log.completed && log.tags && Array.isArray(log.tags)) {
      log.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        totalTagsCount++;
      });
    }
  });

  if (totalTagsCount === 0) {
    DOM.tagsChartContainer.innerHTML = '<div class="no-data-msg">Chưa có dữ liệu phân bổ cơ bắp</div>';
    return;
  }

  // Sort tags by frequency
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedTags[0][1];

  let html = '';
  sortedTags.forEach(([tag, count]) => {
    const widthPercent = Math.round((count / maxCount) * 100);
    html += `
      <div class="tag-bar-row">
        <div class="tag-bar-label-row">
          <span class="tag-bar-label">${tag}</span>
          <span class="tag-bar-count">${count} buổi</span>
        </div>
        <div class="tag-bar-track">
          <div class="tag-bar-fill" style="width: ${widthPercent}%"></div>
        </div>
      </div>
    `;
  });

  DOM.tagsChartContainer.innerHTML = html;
}

// Render list of recent workout logs (Chronological feed)
function renderLogsList() {
  DOM.logsListContainer.innerHTML = '';
  
  const logs = appState.workoutLogs;
  const sortedDates = Object.keys(logs)
    .filter(dateStr => logs[dateStr])
    .sort()
    .reverse(); // Newest first

  if (sortedDates.length === 0) {
    DOM.logsListContainer.innerHTML = '<div class="no-data-msg">Chưa ghi nhận nhật ký tập luyện nào.</div>';
    return;
  }

  sortedDates.forEach(dateStr => {
    const log = logs[dateStr];
    
    // Find Day Index based on start date
    const startDate = parseLocalDate(appState.settings.startDate);
    const logDate = parseLocalDate(dateStr);
    const diffTime = logDate - startDate;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    // Create tags badges
    let tagsHtml = '';
    if (log.tags && log.tags.length > 0) {
      log.tags.forEach(tag => {
        tagsHtml += `<span class="log-badge-tag">${tag}</span>`;
      });
    }

    logItem.innerHTML = `
      <div class="log-item-left">
        <div class="log-item-title-row">
          <span class="log-item-title">Ngày ${dayNumber > 0 ? dayNumber : 'Ngoài Thử Thách'}</span>
          <span class="log-item-date">${formatDisplayDate(dateStr)}</span>
        </div>
        <div class="log-item-tags">${tagsHtml}</div>
        ${log.notes ? `<p class="log-item-notes">${escapeHTML(log.notes)}</p>` : ''}
      </div>
      <div class="log-item-right">
        ${log.completed 
          ? `<span class="log-item-duration">${log.duration} phút</span>`
          : '<span class="log-item-icon-missed">Nghỉ tập</span>'
        }
      </div>
    `;

    // Click handler to edit this specific entry
    logItem.addEventListener('click', () => {
      openLogModal(dateStr, dayNumber);
    });

    DOM.logsListContainer.appendChild(logItem);
  });
}

// Helper: Escape HTML strings for safety
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// 3. RENDER SETTINGS VIEW
function renderSettingsView() {
  DOM.settingsGoalName.value = appState.settings.goalName;
  DOM.settingsTargetDays.value = appState.settings.targetDays;
  DOM.settingsStartDate.value = appState.settings.startDate;
}

// ==========================================================================
// WORKOUT LOG MODAL HANDLERS
// ==========================================================================

let activeLogDate = null;

function openLogModal(dateStr, dayNum) {
  activeLogDate = dateStr;
  
  // Set Modal Title based on Day Number
  DOM.modalTitle.textContent = dayNum > 0 ? `Ghi nhận: Ngày ${dayNum}` : `Ghi nhận: ${formatDisplayDate(dateStr)}`;
  DOM.logDate.value = dateStr;

  // Retrieve existing log if any
  const existingLog = appState.workoutLogs[dateStr];
  
  if (existingLog) {
    DOM.logCompleted.checked = existingLog.completed;
    DOM.logDuration.value = existingLog.duration || 15;
    DOM.logNotes.value = existingLog.notes || '';
    
    // Highlight Chips
    const activeTags = existingLog.tags || [];
    document.querySelectorAll('#log-chips .chip').forEach(chip => {
      if (activeTags.includes(chip.dataset.value)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });

    // Show delete button
    DOM.btnDeleteLog.style.display = 'block';
  } else {
    // Default values for new log
    DOM.logCompleted.checked = true;
    DOM.logDuration.value = 15;
    DOM.logNotes.value = '';
    
    // Clear chip selections
    document.querySelectorAll('#log-chips .chip').forEach(chip => {
      chip.classList.remove('selected');
    });

    // Hide delete button
    DOM.btnDeleteLog.style.display = 'none';
  }

  // Trigger checkbox/slider UI updates
  updateLogCheckboxLabel();
  updateLogDurationVal();

  // Show Modal
  DOM.logModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Lock body scroll
}

function closeLogModal() {
  DOM.logModal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scroll
  activeLogDate = null;
}

// Update text states when toggling checkboxes / sliders
function updateLogCheckboxLabel() {
  const isChecked = DOM.logCompleted.checked;
  const labelTitle = DOM.logModal.querySelector('.checkbox-title');
  const labelDesc = DOM.logModal.querySelector('.checkbox-desc');
  
  if (isChecked) {
    labelTitle.textContent = "Đã hoàn thành buổi tập";
    labelTitle.style.color = "var(--accent-neon-mint)";
    labelDesc.textContent = "Bạn đã hoàn thành mục tiêu tập luyện hôm nay!";
    DOM.logDuration.disabled = false;
    DOM.logDuration.style.opacity = '1';
  } else {
    labelTitle.textContent = "Nghỉ ngơi / Bỏ lỡ";
    labelTitle.style.color = "var(--accent-coral)";
    labelDesc.textContent = "Đánh dấu ngày này là ngày nghỉ hoặc bỏ lỡ buổi tập";
    DOM.logDuration.value = 0;
    updateLogDurationVal();
    DOM.logDuration.disabled = true;
    DOM.logDuration.style.opacity = '0.4';
  }
}

function updateLogDurationVal() {
  const val = DOM.logDuration.value;
  DOM.logDurationVal.textContent = val > 0 ? `${val} phút` : `0 phút`;
}

// ==========================================================================
// TOAST ALERT SYSTEM
// ==========================================================================

let toastTimeout;
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2000);
}

// ==========================================================================
// DATA BACKUP & RESTORE IMPLEMENTATION
// ==========================================================================

function exportBackup() {
  const backupData = {
    settings: appState.settings,
    workoutLogs: appState.workoutLogs,
    exportedAt: new Date().toISOString()
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  
  // 1. Try to copy to Clipboard
  navigator.clipboard.writeText(jsonString)
    .then(() => {
      showToast("Đã sao chép mã lưu trữ vào bộ nhớ tạm!");
    })
    .catch(() => {
      // Fallback if clipboard fails
      console.log("Clipboard write failed. Downloading file.");
    });

  // 2. Always trigger file download for reliability
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abs100_backup_${getLocalDateString(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    
    // Validation
    if (!data.settings || !data.workoutLogs) {
      showToast("Cấu trúc file sao lưu không hợp lệ.");
      return false;
    }

    // Assign & Save
    appState.settings = { ...appState.settings, ...data.settings };
    appState.workoutLogs = data.workoutLogs;
    
    saveSettings();
    saveLogs();
    
    updateUI();
    showToast("Nhập dữ liệu thành công!");
    return true;
  } catch (error) {
    showToast("Lỗi giải mã JSON. Vui lòng kiểm tra lại mã dán.");
    console.error(error);
    return false;
  }
}

// ==========================================================================
// EVENT ATTACHMENTS
// ==========================================================================

function setupEventListeners() {
  // Navigation tabs switching
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      DOM.navItems.forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      renderActiveView();
    });
  });

  // Quick Log Today Workout
  DOM.btnQuickLog.addEventListener('click', () => {
    const todayStr = getLocalDateString(new Date());
    
    // Find day index corresponding to today
    const startDate = parseLocalDate(appState.settings.startDate);
    const todayDate = parseLocalDate(todayStr);
    const diffTime = todayDate - startDate;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    openLogModal(todayStr, dayNumber);
  });

  // Log Modal internal events
  DOM.logCompleted.addEventListener('change', updateLogCheckboxLabel);
  DOM.logDuration.addEventListener('input', updateLogDurationVal);
  
  // Chip Selectors
  DOM.logChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      e.target.classList.toggle('selected');
    }
  });

  // Save Workout Log Submit Form
  DOM.formLogWorkout.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeLogDate) return;

    const completed = DOM.logCompleted.checked;
    const duration = completed ? Number(DOM.logDuration.value) : 0;
    const notes = DOM.logNotes.value.trim();
    
    // Gather selected chips
    const selectedChips = [];
    document.querySelectorAll('#log-chips .chip.selected').forEach(chip => {
      selectedChips.push(chip.dataset.value);
    });

    // Write to State
    appState.workoutLogs[activeLogDate] = {
      completed,
      duration,
      tags: selectedChips,
      notes
    };

    saveLogs();
    updateUI();
    closeLogModal();
    showToast("Đã lưu nhật ký thành công!");
  });

  // Delete Log Button click
  DOM.btnDeleteLog.addEventListener('click', () => {
    if (!activeLogDate) return;
    
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi ngày này không?")) {
      delete appState.workoutLogs[activeLogDate];
      saveLogs();
      updateUI();
      closeLogModal();
      showToast("Đã xóa bản ghi.");
    }
  });

  // Close log modals
  DOM.btnCloseModal.addEventListener('click', closeLogModal);
  DOM.logModal.addEventListener('click', (e) => {
    if (e.target === DOM.logModal) closeLogModal();
  });

  // Settings form update
  DOM.formSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const goalName = DOM.settingsGoalName.value.trim();
    const targetDays = Number(DOM.settingsTargetDays.value);
    const startDate = DOM.settingsStartDate.value;

    if (!goalName || !targetDays || !startDate) {
      showToast("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    appState.settings = { goalName, targetDays, startDate };
    saveSettings();
    updateUI();
    showToast("Cập nhật mục tiêu thành công!");
  });

  // Backup: Export click
  DOM.btnExportData.addEventListener('click', exportBackup);

  // Backup: Open Import modal
  DOM.btnImportData.addEventListener('click', () => {
    DOM.importJsonData.value = '';
    DOM.importModal.classList.add('active');
  });

  // Backup: Submit Import data
  DOM.btnSubmitImport.addEventListener('click', () => {
    const jsonText = DOM.importJsonData.value.trim();
    if (!jsonText) {
      showToast("Vui lòng nhập chuỗi JSON sao lưu.");
      return;
    }
    const success = importBackup(jsonText);
    if (success) {
      DOM.importModal.classList.remove('active');
    }
  });

  // Backup: File selection import helper
  DOM.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      DOM.importJsonData.value = evt.target.result;
      showToast("Đã nạp file. Bấm 'Nhập dữ liệu' để hoàn tất.");
    };
    reader.readAsText(file);
  });

  // Backup: Close Import modal
  DOM.btnCancelImport.addEventListener('click', () => DOM.importModal.classList.remove('active'));
  DOM.btnCloseImport.addEventListener('click', () => DOM.importModal.classList.remove('active'));
  DOM.importModal.addEventListener('click', (e) => {
    if (e.target === DOM.importModal) DOM.importModal.classList.remove('active');
  });

  // Reset all Data
  DOM.btnResetData.addEventListener('click', () => {
    if (confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ lịch sử tập luyện và cấu hình của bạn!")) {
      if (confirm("Xác nhận lần cuối: Bạn có chắc chắn muốn XÓA HẾT KHÔNG?")) {
        localStorage.removeItem(STORAGE_KEY_SETTINGS);
        localStorage.removeItem(STORAGE_KEY_LOGS);
        showToast("Đang đặt lại ứng dụng...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  });
}

// ==========================================================================
// APP START
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  updateUI();
});
