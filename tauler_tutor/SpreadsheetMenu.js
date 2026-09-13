function onOpen(e) {
  buildCacheMenu_();
}

function buildCacheMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('Cache')
    .addItem('Reconstrueix tauler de tutoria', 'menuRebuildTutorPanelCache')
    .addItem('Actualitza grups Dinantia', 'menuRebuildDinantiaGroupsCache')
    .addItem('Actualitza autoritzacions', 'menuRefreshAuthorizationsCache')
    .addSeparator()
    .addItem('Actualitza assistència: tot el curs', 'menuUpdateAttendanceCacheAll')
    .addItem('Actualitza assistència: mes actual', 'menuUpdateAttendanceCacheCurrentMonth')
    .addSeparator()
    .addItem('Diagnòstic assistència: tot el curs', 'menuDebugAttendanceCacheAll')
    .addItem('Diagnòstic assistència: mes actual', 'menuDebugAttendanceCacheCurrentMonth')
    .addToUi();
}

function menuRebuildTutorPanelCache() {
  runCacheMenuAction_('Reconstrueix tauler de tutoria', function() {
    return cacheRebuildTutorPanel_();
  });
}

function menuRebuildDinantiaGroupsCache() {
  runCacheMenuAction_('Actualitza grups Dinantia', function() {
    return cacheRebuildDinantiaGroups_();
  });
}

function menuRefreshAuthorizationsCache() {
  runCacheMenuAction_('Actualitza autoritzacions', function() {
    return {
      ok: true,
      authorizations: cacheRefreshAuthorizations_()
    };
  });
}

function menuUpdateAttendanceCacheAll() {
  runCacheMenuAction_('Actualitza assistència: tot el curs', function() {
    return updateAttendanceCacheAll();
  });
}

function menuUpdateAttendanceCacheCurrentMonth() {
  runCacheMenuAction_('Actualitza assistència: mes actual', function() {
    return updateAttendanceCacheCurrentMonth();
  });
}

function menuDebugAttendanceCacheAll() {
  runCacheMenuAction_('Diagnòstic assistència: tot el curs', function() {
    return debugAttendanceCacheAll();
  });
}

function menuDebugAttendanceCacheCurrentMonth() {
  runCacheMenuAction_('Diagnòstic assistència: mes actual', function() {
    return debugAttendanceCacheCurrentMonth();
  });
}

function runCacheMenuAction_(title, action) {
  var ui = SpreadsheetApp.getUi();
  try {
    SpreadsheetApp.getActive().toast('Executant...', title, 8);
    var result = action();
    SpreadsheetApp.getActive().toast('Finalitzat', title, 5);
    ui.alert(title, cacheMenuResultMessage_(result), ui.ButtonSet.OK);
  } catch (error) {
    logError_('cache_menu_action_failed', error, { title: title });
    ui.alert(title, 'Error: ' + (error && error.message ? error.message : String(error)), ui.ButtonSet.OK);
  }
}

function cacheMenuResultMessage_(result) {
  if (result === null || result === undefined) return 'Operació finalitzada.';
  if (typeof result === 'string') return result;
  var lines = ['Operació finalitzada.'];
  Object.keys(result).forEach(function(key) {
    var value = result[key];
    if (value === null || value === undefined) return;
    if (typeof value === 'object') value = JSON.stringify(value);
    lines.push(key + ': ' + value);
  });
  return lines.join('\n');
}
