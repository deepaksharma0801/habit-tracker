function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tracker Tools')
    .addItem('Setup / Refresh dashboard', 'setupHabitDashboard')
    .addItem('Archive current month', 'archiveCurrentMonth')
    .addToUi();
  ensureNamedRanges_();
}

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Tracker') return;
  if (e.range.getA1Notation() === 'D1') {
    updateTrackerMonth_();
    ensureNamedRanges_();
    buildDashboardCharts_();
  }
}

function setupHabitDashboard() {
  updateTrackerMonth_();
  applyTrackerCheckboxes_();
  ensureNamedRanges_();
  buildDashboardCharts_();
}

function updateTrackerMonth_() {
  const ss = SpreadsheetApp.getActive();
  const tracker = ss.getSheetByName('Tracker');
  const dashboard = ss.getSheetByName('Dashboard');
  const monthValue = tracker.getRange('D1').getValue();
  const monthStart = new Date(monthValue);
  if (!monthValue || Number.isNaN(monthStart.getTime())) return;

  monthStart.setDate(1);
  tracker.getRange('D1').setValue(monthStart).setNumberFormat('mmmm yyyy');
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const headerValues = [];
  for (let i = 1; i <= 31; i += 1) {
    if (i <= daysInMonth) {
      headerValues.push([new Date(monthStart.getFullYear(), monthStart.getMonth(), i)]);
    } else {
      headerValues.push(['']);
    }
  }

  tracker.getRange(2, 4, 1, 31).setValues([headerValues.map(v => v[0])]).setNumberFormat('d');
  tracker.showColumns(4, 31);
  if (daysInMonth < 31) tracker.hideColumns(4 + daysInMonth, 31 - daysInMonth);

  applyTrackerCheckboxes_();
  dashboard.getRange('A1').setFormula('="Monthly Habit Dashboard — "&TEXT(Tracker!D1,"MMMM YYYY")');
}

function applyTrackerCheckboxes_() {
  const tracker = SpreadsheetApp.getActive().getSheetByName('Tracker');
  const range = tracker.getRange('D3:AH32');
  range.insertCheckboxes();
}

function ensureNamedRanges_() {
  const ss = SpreadsheetApp.getActive();
  const tracker = ss.getSheetByName('Tracker');
  const summary = ss.getSheetByName('Summary');
  const dashboard = ss.getSheetByName('Dashboard');

  const namedRanges = [
    ['Tracker_Month', tracker.getRange('D1')],
    ['Tracker_Dates', tracker.getRange('D2:AH2')],
    ['Tracker_Habits', tracker.getRange('B3:B32')],
    ['Tracker_Categories', tracker.getRange('C3:C32')],
    ['Tracker_DataRange', tracker.getRange('D3:AH32')],
    ['Summary_Progress', summary.getRange('D2:D31')],
    ['Dashboard_TopN', dashboard.getRange('Q11')],
  ];

  namedRanges.forEach(([name, range]) => {
    const existing = ss.getNamedRanges().find(item => item.getName() === name);
    if (existing) {
      existing.remove();
    }
    ss.setNamedRange(name, range);
  });
}

function archiveCurrentMonth() {
  const ss = SpreadsheetApp.getActive();
  const tracker = ss.getSheetByName('Tracker');
  const summary = ss.getSheetByName('Summary');
  const history = ss.getSheetByName('History');
  const monthStart = tracker.getRange('D1').getValue();
  if (!monthStart) return;

  const existing = history.getDataRange().getValues();
  const stamp = new Date(monthStart);
  stamp.setDate(1);
  const stampKey = Utilities.formatDate(stamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const rows = summary.getRange('B2:F31').getValues()
    .filter(row => row[0])
    .map(row => [stamp, row[0], row[1], row[2], row[3], row[4], new Date()]);

  const alreadyArchived = existing.some((row, index) => {
    if (index === 0) return false;
    return Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') === stampKey;
  });

  if (!alreadyArchived && rows.length) {
    history.getRange(history.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function buildDashboardCharts_() {
  const ss = SpreadsheetApp.getActive();
  const dashboard = ss.getSheetByName('Dashboard');
  const helper = ss.getSheetByName('Helper');

  dashboard.getCharts().forEach(chart => dashboard.removeChart(chart));

  const lineChart = dashboard.newChart()
    .asLineChart()
    .addRange(helper.getRange('B1:D32'))
    .setPosition(10, 1, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'Monthly Completion Trend')
    .setOption('curveType', 'function')
    .setOption('legend.position', 'bottom')
    .setOption('pointSize', 5)
    .setOption('hAxis.title', 'Day')
    .setOption('vAxis.title', 'Completion %')
    .setOption('vAxis.viewWindow.min', 0)
    .setOption('vAxis.viewWindow.max', 1)
    .setOption('chartArea', {left: 60, top: 40, width: '78%', height: '70%'})
    .setOption('series', {
      0: {color: '#2E7D57', lineWidth: 3},
      1: {color: '#7AA5A9', lineDashStyle: [6, 4], lineWidth: 2, targetAxisIndex: 1}
    })
    .build();
  dashboard.insertChart(lineChart);

  const barChart = dashboard.newChart()
    .asBarChart()
    .addRange(helper.getRange('O1:P21'))
    .setPosition(38, 1, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'Habit Consistency (Top N)')
    .setOption('legend.position', 'none')
    .setOption('hAxis.title', 'Completion %')
    .setOption('vAxis.title', 'Habit')
    .setOption('hAxis.viewWindow.min', 0)
    .setOption('hAxis.viewWindow.max', 1)
    .setOption('annotations.alwaysOutside', true)
    .setOption('series', {0: {color: '#6BBF77'}})
    .build();
  dashboard.insertChart(barChart);

  const streakChart = dashboard.newChart()
    .asColumnChart()
    .addRange(helper.getRange('R1:T11'))
    .setPosition(24, 9, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'Streak Leaderboard')
    .setOption('legend.position', 'bottom')
    .setOption('hAxis.title', 'Habit')
    .setOption('vAxis.title', 'Days')
    .setOption('series', {
      0: {color: '#2E7D57'},
      1: {color: '#D9A441'}
    })
    .build();
  dashboard.insertChart(streakChart);

  const categoryChart = dashboard.newChart()
    .asColumnChart()
    .addRange(helper.getRange('U1:V10'))
    .setPosition(38, 9, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'Category Completion')
    .setOption('legend.position', 'none')
    .setOption('hAxis.title', 'Category')
    .setOption('vAxis.title', 'Avg Completion %')
    .setOption('vAxis.viewWindow.min', 0)
    .setOption('vAxis.viewWindow.max', 1)
    .setOption('series', {0: {color: '#7AA5A9'}})
    .build();
  dashboard.insertChart(categoryChart);

  const donutChart = dashboard.newChart()
    .asPieChart()
    .addRange(helper.getRange('W1:X3'))
    .setPosition(4, 16, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'Monthly Progress')
    .setOption('pieHole', 0.68)
    .setOption('legend.position', 'none')
    .setOption('pieSliceText', 'percentage')
    .setOption('slices', {
      0: {color: '#2E7D57'},
      1: {color: '#D6DEE2'}
    })
    .build();
  dashboard.insertChart(donutChart);
}
