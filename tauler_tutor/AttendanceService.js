var ATTENDANCE_MONTHS = [
  { key: '09', label: 'Set', header: 'september' },
  { key: '10', label: 'Oct', header: 'october' },
  { key: '11', label: 'Nov', header: 'november' },
  { key: '12', label: 'Des', header: 'december' },
  { key: '01', label: 'Gen', header: 'january' },
  { key: '02', label: 'Feb', header: 'february' },
  { key: '03', label: 'Mar', header: 'march' },
  { key: '04', label: 'Abr', header: 'april' },
  { key: '05', label: 'Mai', header: 'may' },
  { key: '06', label: 'Jun', header: 'june' }
];

var ATTENDANCE_SCHOOL_START_MONTH = 8;
var ATTENDANCE_SCHOOL_START_DAY = 8;
var ATTENDANCE_PAGE_BATCH_SIZE = 6;

function loadStudentAttendanceSummary_(student) {
  try {
    student = student || {};
    var studentId = String(student.id || student.student_id || '').trim();
    var groupName = String(student.groupName || student.group_name || '').trim();
    if (!studentId) {
      throw new AppError('No es poden carregar les dades d assistència: falta l identificador de l alumne/a.', {
        code: 'ASS_MISSING_STUDENT_ID'
      });
    }
    if (!groupName) {
      throw new AppError('No es poden carregar les dades d assistència: falta el grup Dinantia de l alumne/a.', {
        code: 'ASS_MISSING_STUDENT_GROUP'
      });
    }

    var registry = loadTableRegistry_();
    var schoolYear = currentAttendanceSchoolYear_(new Date());
    var scope = resolveAttendanceGroupScope_(registry, groupName);
    var studentCounts = loadStudentAttendanceCounts_(studentId, schoolYear);
    var totalHoursByMonth = loadAttendanceTotalHoursFromSheet_(registry, groupName);

    return {
      ok: true,
      schoolYear: schoolYearToView_(schoolYear),
      level: {
        id: scope.id,
        name: scope.name,
        groupIds: scope.groupIds
      },
      months: ATTENDANCE_MONTHS,
      rows: buildAttendanceRows_(studentCounts, totalHoursByMonth)
    };
  } catch (error) {
    logError_('student_attendance_summary_failed', error, {
      studentId: student && student.id,
      groupName: student && student.groupName
    });
    return {
      ok: false,
      error: errorToViewModel_(error),
      schoolYear: null,
      level: null,
      months: ATTENDANCE_MONTHS,
      rows: buildAttendanceRows_(emptyAttendanceCounts_(), emptyAttendanceCounts_().totalHours)
    };
  }
}

function updateAttendanceCacheAll() {
  return updateAttendanceCache_('all', { debug: false, dryRun: false });
}

function updateAttendanceCacheCurrentMonth() {
  return updateAttendanceCache_('current', { debug: false, dryRun: false });
}

function debugAttendanceCacheAll() {
  return updateAttendanceCache_('all', { debug: true, dryRun: true });
}

function debugAttendanceCacheCurrentMonth() {
  return updateAttendanceCache_('current', { debug: true, dryRun: true });
}

function updateAttendanceCache_(mode, options) {
  options = options || {};
  var debug = options.debug === true;
  var dryRun = options.dryRun === true;
  var startedAt = new Date();
  var registry = loadTableRegistry_();
  var schoolYear = currentAttendanceSchoolYear_(startedAt);
  var monthKeys = mode === 'current' ? [attendanceMonthKey_(startedAt, schoolYear)] : attendanceMonthKeysUntil_(startedAt, schoolYear);
  monthKeys = monthKeys.filter(Boolean);

  if (!monthKeys.length) {
    return {
      ok: true,
      mode: mode,
      updatedMonths: [],
      rows: 0,
      dryRun: dryRun,
      message: 'La data actual queda fora dels mesos lectius configurats.'
    };
  }

  var range = attendanceCacheUpdateRange_(mode, monthKeys, schoolYear, startedAt);
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.attendanceCache);
  var table = readAttendanceCacheTable_(sheet);
  var groups = loadAttendanceGroupCache_(registry);
  var debugState = debug ? createAttendanceDebugState_(mode, dryRun, schoolYear, monthKeys, range, table, groups) : null;
  var scopes = buildAttendanceCacheScopes_(table.labels, groups, debugState);
  var result = aggregateAttendanceHoursForScopes_(scopes, range.start, range.end, schoolYear, debugState);
  var totals = result.totals;

  if (!dryRun) writeAttendanceCacheMonths_(sheet, table, totals, monthKeys);
  logInfo_('attendance_cache_updated', {
    mode: mode,
    months: monthKeys,
    rows: scopes.length,
    dryRun: dryRun,
    start: range.start,
    end: range.end
  });
  if (debugState) logAttendanceDebugSummary_(debugState, scopes, totals, result.stats);

  return {
    ok: true,
    mode: mode,
    dryRun: dryRun,
    schoolYear: schoolYear.startYear + '-' + schoolYear.endYear,
    updatedMonths: monthKeys.map(attendanceMonthHeader_),
    rows: scopes.length,
    pagesScanned: result.stats.pagesScanned,
    attendancesRead: result.stats.attendancesRead,
    attendancesInRange: result.stats.attendancesInRange,
    matchedAttendances: result.stats.matchedAttendances,
    uniqueHoursByScope: attendanceDebugTotalsForReturn_(totals, monthKeys),
    startedAt: Utilities.formatDate(startedAt, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    finishedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss")
  };
}

function currentAttendanceSchoolYear_(referenceDate) {
  var date = referenceDate || new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var startYear = month >= 8 ? year : year - 1;
  return {
    startYear: startYear,
    endYear: startYear + 1,
    start: new Date(startYear, ATTENDANCE_SCHOOL_START_MONTH, ATTENDANCE_SCHOOL_START_DAY, 0, 0, 0, 0),
    end: new Date(startYear + 1, 5, 30, 23, 59, 59, 999)
  };
}

function resolveAttendanceLevelForStudentGroup_(registry, groupName) {
  var groups = loadAttendanceGroupCache_(registry);
  var byId = {};
  groups.forEach(function(group) {
    if (group.id) byId[group.id] = group;
  });

  var groupKey = textKey_(groupName);
  var matched = null;
  for (var i = 0; i < groups.length; i++) {
    if (textKey_(groups[i].id) === groupKey || textKey_(groups[i].name) === groupKey || textKey_(groups[i].tag) === groupKey) {
      matched = groups[i];
      break;
    }
  }
  if (!matched) {
    throw new AppError('No es pot resoldre el nivell Dinantia del grup "' + groupName + '". Actualitza la cache de grups Dinantia.', {
      code: 'ASS_LEVEL_NOT_FOUND'
    });
  }

  var hasChildren = groups.some(function(group) {
    return String(group.parent_id || '') === matched.id;
  });
  var parent = matched.parent_id && byId[matched.parent_id] ? byId[matched.parent_id] : null;
  var parentIsRoot = parent && !String(parent.parent_id || '').trim();
  var level = hasChildren || !parent || parentIsRoot ? matched : parent;
  var groupIds = {};
  groups.forEach(function(group) {
    if (!group.id || group.active === false) return;
    var path = ('/' + String(group.path_ids || group.id) + '/');
    if (group.id === level.id || path.indexOf('/' + level.id + '/') !== -1) groupIds[group.id] = true;
  });
  groupIds[level.id] = true;

  return {
    id: level.id,
    name: level.name || level.id,
    groupIds: Object.keys(groupIds).sort()
  };
}

function resolveAttendanceGroupScope_(registry, groupName) {
  var groups = loadAttendanceGroupCache_(registry);
  var matched = findAttendanceGroupByLabel_(groups, groupName);
  if (!matched) {
    throw new AppError('No es pot resoldre el grup Dinantia "' + groupName + '". Actualitza la cache de grups Dinantia.', {
      code: 'ASS_GROUP_NOT_FOUND'
    });
  }
  return attendanceLevelScopeForGroup_(matched, groups);
}

function loadAttendanceGroupCache_(registry) {
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.dinantiaGroups);
  var headers = requireHeaders_(sheet, ['id', 'name', 'tag', 'parent_id', 'path_ids', 'path_names', 'active'], TABLES.dinantia + ' -> ' + SHEETS.dinantiaGroups);
  if (sheet.getLastRow() < 2) {
    throw new AppError('La cache de grups Dinantia és buida. Cal actualitzar-la abans de carregar assistència.', {
      code: 'ASS_GROUP_CACHE_EMPTY'
    });
  }
  var values = sheet.getDataRange().getValues();
  var groups = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = String(row[headers.id] || '').trim();
    if (!id) continue;
    groups.push({
      id: id,
      name: String(row[headers.name] || '').trim(),
      tag: String(row[headers.tag] || '').trim(),
      parent_id: String(row[headers.parent_id] || '').trim(),
      path_ids: String(row[headers.path_ids] || '').trim(),
      path_names: String(row[headers.path_names] || '').trim(),
      active: row[headers.active] === '' ? true : isTrue_(row[headers.active])
    });
  }
  return groups;
}

function loadStudentAttendanceCounts_(studentId, schoolYear) {
  var cacheKey = 'ass:student:' + studentId + ':' + schoolYear.startYear + '-' + schoolYear.endYear + ':v1';
  var cached = getAttendanceCache_(cacheKey);
  if (cached) return cached;

  var counts = aggregateStudentAttendanceCounts_(studentId, schoolYear);
  putAttendanceCache_(cacheKey, counts);
  return counts;
}

function aggregateStudentAttendanceCounts_(studentId, schoolYear) {
  var studentHourStatus = {};
  var counts = emptyAttendanceCounts_();
  var pages = fetchDinantiaAttendancePagesUntil_(schoolYear.start);

  pages.forEach(function(pageInfo) {
    var rows = pageInfo.body.data || [];
    rows.forEach(function(attendance) {
      var date = parseDinantiaAttendanceDate_(attendance.date);
      if (!date) return;
      if (date < schoolYear.start || date > schoolYear.end) return;

      var monthKey = attendanceMonthKey_(date, schoolYear);
      if (!monthKey) return;

      var hourKey = Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm');

      (attendance.attendees || []).forEach(function(attendee) {
        var attendeeId = String(attendee && attendee.account_id || '').trim();
        var status = String(attendee && attendee.status || '').trim().toLowerCase();
        if (attendeeId !== studentId || (status !== 'absent' && status !== 'justified' && status !== 'late')) return;
        if (studentHourStatus[hourKey]) return;
        studentHourStatus[hourKey] = true;
        counts[status][monthKey]++;
      });
    });
  });

  return counts;
}

function loadAttendanceTotalHoursFromSheet_(registry, groupName) {
  var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.attendanceCache);
  var table = readAttendanceCacheTable_(sheet);
  var scope = resolveAttendanceGroupScope_(registry, groupName);
  var cacheRow = findAttendanceCacheRowForGroup_(table.rows, groupName, scope);
  var totals = emptyAttendanceCounts_().totalHours;

  if (cacheRow) {
    ATTENDANCE_MONTHS.forEach(function(month) {
      if (table.headers[month.header] === undefined) return;
      totals[month.key] = Number(cacheRow.row[table.headers[month.header]]) || 0;
    });
    return totals;
  }

  logWarn_('attendance_cache_row_missing', {
    groupName: groupName,
    expectedLevelRow: scope.label
  });
  return totals;
}

function findAttendanceCacheRowForGroup_(rows, groupName, scope) {
  var candidates = [
    groupName,
    scope && scope.label,
    scope && scope.name,
    scope && scope.scopeName,
    scope && scope.matchedName
  ].filter(Boolean);

  var exactKeys = {};
  candidates.forEach(function(candidate) {
    exactKeys[textKey_(candidate)] = true;
  });

  var bestPrefix = null;
  var bestPrefixLength = -1;
  for (var i = 0; i < (rows || []).length; i++) {
    var row = rows[i];
    var rowKey = textKey_(row.label);
    if (exactKeys[rowKey]) return row;

    for (var j = 0; j < candidates.length; j++) {
      var candidateKey = textKey_(candidates[j]);
      if (candidateKey.indexOf(rowKey + ' ') !== 0) continue;
      if (rowKey.length > bestPrefixLength) {
        bestPrefix = row;
        bestPrefixLength = rowKey.length;
      }
    }
  }
  return bestPrefix;
}

function readAttendanceCacheTable_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) {
    throw new AppError('La taula Dinantia -> attendance_cache és buida.', { code: 'ASS_ATTENDANCE_CACHE_EMPTY' });
  }
  var headers = {};
  values[0].forEach(function(header, index) {
    var key = String(header || '').trim().toLowerCase();
    if (key) headers[key] = index;
  });
  ATTENDANCE_MONTHS.forEach(function(month) {
    if (headers[month.header] === undefined) {
      throw new AppError('Falta la columna "' + month.header + '" a Dinantia -> attendance_cache.', {
        code: 'ASS_ATTENDANCE_CACHE_HEADER_MISSING'
      });
    }
  });

  var rows = [];
  var labels = [];
  for (var i = 1; i < values.length; i++) {
    var label = String(values[i][0] || '').trim();
    if (!label) continue;
    labels.push(label);
    rows.push({
      sheetRow: i + 1,
      label: label,
      row: values[i]
    });
  }
  return {
    headers: headers,
    labels: labels,
    rows: rows
  };
}

function buildAttendanceCacheScopes_(labels, groups, debugState) {
  var scopes = [];
  (labels || []).forEach(function(label) {
    var group = findAttendanceGroupByLabel_(groups, label);
    var scope = group ? attendanceScopeForGroup_(group, groups, label) : attendanceSyntheticLevelScopeForLabel_(groups, label);
    if (!scope) {
      logWarn_('attendance_cache_scope_missing', { label: label });
      if (debugState) debugState.missingLabels.push(label);
      return;
    }
    scopes.push(scope);
    if (debugState) {
      debugState.scopeResolution.push({
        label: label,
        matchedId: group ? group.id : '',
        matchedName: group ? group.name : '',
        matchedTag: group ? group.tag : '',
        matchedPath: group ? group.path_names : '',
        scopeId: scope.id,
        scopeName: scope.scopeName,
        synthetic: scope.synthetic === true,
        syntheticMatches: scope.syntheticMatches || [],
        groupIdsCount: scope.groupIds.length,
        groupIdsSample: scope.groupIds.slice(0, 25)
      });
    }
  });
  return scopes;
}

function findAttendanceGroupByLabel_(groups, label) {
  var wanted = textKey_(label);
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var names = attendanceGroupComparableNames_(group);
    if (names.some(function(name) { return textKey_(name) === wanted; })) {
      return groups[i];
    }
  }
  return null;
}

function attendanceScopeForGroup_(group, groups, label) {
  var groupIds = {};
  groups.forEach(function(candidate) {
    if (!candidate.id || candidate.active === false) return;
    var path = ('/' + String(candidate.path_ids || candidate.id) + '/');
    if (candidate.id === group.id || path.indexOf('/' + group.id + '/') !== -1) groupIds[candidate.id] = true;
  });
  groupIds[group.id] = true;

  return {
    id: group.id,
    name: label || group.name || group.id,
    label: label || group.name || group.id,
    scopeName: group.name || group.id,
    groupIds: Object.keys(groupIds).sort()
  };
}

function attendanceSyntheticLevelScopeForLabel_(groups, label) {
  var wanted = textKey_(label);
  var prefix = wanted + ' ';
  var matchedGroups = [];
  (groups || []).forEach(function(group) {
    if (!group || !group.id || group.active === false) return;
    var names = attendanceGroupComparableNames_(group);
    var matches = names.some(function(name) {
      var key = textKey_(name);
      return key.indexOf(prefix) === 0;
    });
    if (matches) matchedGroups.push(group);
  });
  if (!matchedGroups.length) return null;

  var groupIds = {};
  matchedGroups.forEach(function(group) {
    var scope = attendanceScopeForGroup_(group, groups, label);
    (scope.groupIds || []).forEach(function(groupId) {
      groupIds[groupId] = true;
    });
  });

  return {
    id: 'synthetic:' + label,
    name: label,
    label: label,
    scopeName: label,
    groupIds: Object.keys(groupIds).sort(),
    synthetic: true,
    syntheticMatches: matchedGroups.map(function(group) {
      return {
        id: group.id,
        name: group.name,
        tag: group.tag,
        pathNames: group.path_names
      };
    }).slice(0, 30)
  };
}

function attendanceGroupComparableNames_(group) {
  var names = [
    group.id,
    group.name,
    group.tag
  ];
  var pathNames = String(group.path_names || '').split('/').map(function(part) {
    return String(part || '').trim();
  }).filter(Boolean);
  if (pathNames.length >= 2) names.push(pathNames.slice(-2).join(' '));
  if (pathNames.length >= 3) names.push(pathNames.slice(-3).join(' '));
  return names.filter(Boolean);
}

function attendanceLevelScopeForGroup_(group, groups, label) {
  var byId = {};
  groups.forEach(function(candidate) {
    if (candidate.id) byId[candidate.id] = candidate;
  });
  var hasChildren = groups.some(function(candidate) {
    return String(candidate.parent_id || '') === group.id;
  });
  var parent = group.parent_id && byId[group.parent_id] ? byId[group.parent_id] : null;
  var parentIsRoot = parent && !String(parent.parent_id || '').trim();
  var scopeGroup = hasChildren || !parent || parentIsRoot ? group : parent;
  var scope = attendanceScopeForGroup_(scopeGroup, groups, label || scopeGroup.name || scopeGroup.id);
  scope.matchedId = group.id;
  scope.matchedName = group.name || group.id;
  return scope;
}

function aggregateAttendanceHoursForScopes_(scopes, start, end, schoolYear, debugState) {
  var scopeSets = {};
  var hourKeysByScopeMonth = {};
  var scopeStats = {};
  (scopes || []).forEach(function(scope) {
    scopeSets[scope.label] = {};
    (scope.groupIds || []).forEach(function(groupId) {
      scopeSets[scope.label][String(groupId)] = true;
    });
    hourKeysByScopeMonth[scope.label] = {};
    scopeStats[scope.label] = {
      matchedAttendances: 0,
      duplicatedHourHits: 0,
      uniqueHoursByMonth: emptyAttendanceCounts_().totalHours,
      duplicateHitsByMonth: emptyAttendanceCounts_().totalHours,
      samples: []
    };
    ATTENDANCE_MONTHS.forEach(function(month) {
      hourKeysByScopeMonth[scope.label][month.key] = {};
    });
  });

  var stats = {
    pagesScanned: 0,
    attendancesRead: 0,
    invalidDateRows: 0,
    beforeStartRows: 0,
    afterEndRows: 0,
    outOfAcademicMonthRows: 0,
    emptyAttendeesRows: 0,
    attendancesInRange: 0,
    matchedAttendances: 0,
    pageSummaries: []
  };
  var pages = fetchDinantiaAttendancePagesUntil_(start);

  pages.forEach(function(pageInfo) {
    var body = pageInfo.body;
    var rows = body.data || [];
    var pageStats = {
      page: pageInfo.page,
      rows: rows.length,
      invalidDate: 0,
      beforeStart: 0,
      afterEnd: 0,
      emptyAttendees: 0,
      inRange: 0,
      matched: 0,
      firstDate: '',
      lastDate: ''
    };
    stats.pagesScanned++;
    stats.attendancesRead += rows.length;

    rows.forEach(function(attendance) {
      var date = parseDinantiaAttendanceDate_(attendance.date);
      if (!date) {
        stats.invalidDateRows++;
        pageStats.invalidDate++;
        return;
      }
      var dateText = Utilities.formatDate(date, APP_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss");
      if (!pageStats.firstDate) pageStats.firstDate = dateText;
      pageStats.lastDate = dateText;
      if (date >= start) pageHasDateInRangeOrNewer = true;
      if (date < start) {
        stats.beforeStartRows++;
        pageStats.beforeStart++;
        return;
      }
      if (date > end) {
        stats.afterEndRows++;
        pageStats.afterEnd++;
        return;
      }
      stats.attendancesInRange++;
      pageStats.inRange++;
      var monthKey = attendanceMonthKey_(date, schoolYear);
      if (!monthKey) {
        stats.outOfAcademicMonthRows++;
        return;
      }
      if (!attendance.attendees || !attendance.attendees.length) {
        stats.emptyAttendeesRows++;
        pageStats.emptyAttendees++;
        return;
      }
      var hourKey = Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm');
      var attendanceGroups = attendance && attendance.groups ? attendance.groups : [];

      scopes.forEach(function(scope) {
        if (!attendanceBelongsToLevel_(attendance, scopeSets[scope.label])) return;
        stats.matchedAttendances++;
        pageStats.matched++;
        scopeStats[scope.label].matchedAttendances++;
        if (hourKeysByScopeMonth[scope.label][monthKey][hourKey]) {
          scopeStats[scope.label].duplicatedHourHits++;
          scopeStats[scope.label].duplicateHitsByMonth[monthKey]++;
        } else {
          hourKeysByScopeMonth[scope.label][monthKey][hourKey] = true;
          scopeStats[scope.label].uniqueHoursByMonth[monthKey]++;
        }
        if (scopeStats[scope.label].samples.length < 12) {
          scopeStats[scope.label].samples.push({
            id: String(attendance.id || ''),
            date: dateText,
            hourKey: hourKey,
            month: attendanceMonthHeader_(monthKey),
            groups: attendanceGroups.slice(0, 12),
            courseId: String(attendance.course_id || ''),
            attendeesCount: (attendance.attendees || []).length
          });
        }
      });
    });

    stats.pageSummaries.push(pageStats);
  });

  var totals = {};
  Object.keys(hourKeysByScopeMonth).forEach(function(label) {
    totals[label] = {};
    ATTENDANCE_MONTHS.forEach(function(month) {
      totals[label][month.key] = Object.keys(hourKeysByScopeMonth[label][month.key]).length;
    });
  });
  if (debugState) debugState.scopeStats = scopeStats;
  return {
    totals: totals,
    stats: stats
  };
}

function fetchDinantiaAttendancePagesUntil_(cutoffDate) {
  var credentials = getDinantiaCredentials_();
  var pages = [];
  var firstBody = fetchDinantiaJson_('/v1/attendances/index?limit=100&page=1', credentials);
  pages.push({ page: 1, body: firstBody });

  if (!firstBody.pagination || !firstBody.pagination.has_next_page || !attendancePageHasDateAtOrAfter_(firstBody, cutoffDate)) {
    return pages;
  }

  var pageCount = Number(firstBody.pagination.page_count) || 1;
  var page = 2;
  while (page <= pageCount) {
    var paths = [];
    var pageNumbers = [];
    for (var i = 0; i < ATTENDANCE_PAGE_BATCH_SIZE && page <= pageCount; i++, page++) {
      paths.push('/v1/attendances/index?limit=100&page=' + page);
      pageNumbers.push(page);
    }

    var bodies = fetchDinantiaJsonBatch_(paths, credentials);
    for (var j = 0; j < bodies.length; j++) {
      pages.push({ page: pageNumbers[j], body: bodies[j] });
      if (!attendancePageHasDateAtOrAfter_(bodies[j], cutoffDate)) return pages;
      if (!bodies[j].pagination || !bodies[j].pagination.has_next_page) return pages;
    }
  }

  return pages;
}

function attendancePageHasDateAtOrAfter_(body, cutoffDate) {
  var rows = body && body.data ? body.data : [];
  for (var i = 0; i < rows.length; i++) {
    var date = parseDinantiaAttendanceDate_(rows[i] && rows[i].date);
    if (!date) return true;
    if (date >= cutoffDate) return true;
  }
  return false;
}

function writeAttendanceCacheMonths_(sheet, table, totals, monthKeys) {
  table.rows.forEach(function(item) {
    monthKeys.forEach(function(monthKey) {
      var header = attendanceMonthHeader_(monthKey);
      var columnIndex = table.headers[header];
      if (columnIndex === undefined) return;
      var value = totals[item.label] && totals[item.label][monthKey] !== undefined ? totals[item.label][monthKey] : '';
      sheet.getRange(item.sheetRow, columnIndex + 1).setValue(value);
    });
  });
}

function attendanceMonthKeysUntil_(referenceDate, schoolYear) {
  var currentKey = attendanceMonthKey_(referenceDate, schoolYear);
  if (!currentKey) return [];
  var keys = [];
  for (var i = 0; i < ATTENDANCE_MONTHS.length; i++) {
    keys.push(ATTENDANCE_MONTHS[i].key);
    if (ATTENDANCE_MONTHS[i].key === currentKey) break;
  }
  return keys;
}

function attendanceCacheUpdateRange_(mode, monthKeys, schoolYear, referenceDate) {
  if (mode === 'current') {
    var monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0, 0);
    return {
      start: monthStart < schoolYear.start ? schoolYear.start : monthStart,
      end: endOfDay_(referenceDate)
    };
  }
  return {
    start: schoolYear.start,
    end: endOfDay_(referenceDate < schoolYear.end ? referenceDate : schoolYear.end)
  };
}

function attendanceMonthHeader_(monthKey) {
  for (var i = 0; i < ATTENDANCE_MONTHS.length; i++) {
    if (ATTENDANCE_MONTHS[i].key === monthKey) return ATTENDANCE_MONTHS[i].header;
  }
  return '';
}

function attendanceBelongsToLevel_(attendance, levelGroupSet) {
  var groups = attendance && attendance.groups ? attendance.groups : [];
  for (var i = 0; i < groups.length; i++) {
    if (levelGroupSet[String(groups[i])]) return true;
  }
  return false;
}

function attendanceMonthKey_(date, schoolYear) {
  var year = Number(Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy'));
  var month = Utilities.formatDate(date, APP_CONFIG.timezone, 'MM');
  if (year === schoolYear.startYear && ['09', '10', '11', '12'].indexOf(month) !== -1) return month;
  if (year === schoolYear.endYear && ['01', '02', '03', '04', '05', '06'].indexOf(month) !== -1) return month;
  return '';
}

function emptyAttendanceCounts_() {
  var counts = {
    absent: {},
    justified: {},
    late: {},
    totalHours: {}
  };
  ATTENDANCE_MONTHS.forEach(function(month) {
    counts.absent[month.key] = 0;
    counts.justified[month.key] = 0;
    counts.late[month.key] = 0;
    counts.totalHours[month.key] = 0;
  });
  return counts;
}

function buildAttendanceRows_(studentCounts, totalHoursByMonth) {
  studentCounts = studentCounts || emptyAttendanceCounts_();
  totalHoursByMonth = totalHoursByMonth || emptyAttendanceCounts_().totalHours;
  return [
    { key: 'absent', label: 'Absent no justificat', values: normalizeAttendanceMonthValues_(studentCounts.absent) },
    { key: 'justified', label: 'Justificat', values: normalizeAttendanceMonthValues_(studentCounts.justified) },
    { key: 'late', label: 'Retard', values: normalizeAttendanceMonthValues_(studentCounts.late) },
    { key: 'totalHours', label: 'Total hores', values: normalizeAttendanceMonthValues_(totalHoursByMonth) }
  ];
}

function normalizeAttendanceMonthValues_(values) {
  var normalized = {};
  ATTENDANCE_MONTHS.forEach(function(month) {
    normalized[month.key] = Number(values && values[month.key]) || 0;
  });
  return normalized;
}

function parseDinantiaAttendanceDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  var text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return null;
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?([+-]\d{2}:?\d{2})?$/);
  if (match) {
    var tz = match[7] || '';
    if (tz && tz.indexOf(':') === -1) tz = tz.slice(0, 3) + ':' + tz.slice(3);
    parsed = new Date(match[1] + '-' + match[2] + '-' + match[3] + 'T' + match[4] + ':' + match[5] + ':' + (match[6] || '00') + tz);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function getAttendanceCache_(key) {
  try {
    var cached = CacheService.getScriptCache().get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logWarn_('attendance_cache_read_failed', { key: key, message: error && error.message ? error.message : String(error) });
    return null;
  }
}

function putAttendanceCache_(key, value) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), 1800);
  } catch (error) {
    logWarn_('attendance_cache_write_failed', { key: key, message: error && error.message ? error.message : String(error) });
  }
}

function schoolYearToView_(schoolYear) {
  return {
    label: schoolYear.startYear + '-' + schoolYear.endYear,
    start: Utilities.formatDate(schoolYear.start, APP_CONFIG.timezone, 'yyyy-MM-dd'),
    end: Utilities.formatDate(schoolYear.end, APP_CONFIG.timezone, 'yyyy-MM-dd')
  };
}

function createAttendanceDebugState_(mode, dryRun, schoolYear, monthKeys, range, table, groups) {
  var debugState = {
    mode: mode,
    dryRun: dryRun,
    schoolYear: schoolYear.startYear + '-' + schoolYear.endYear,
    monthKeys: monthKeys,
    monthHeaders: monthKeys.map(attendanceMonthHeader_),
    rangeStart: range.start,
    rangeEnd: range.end,
    tableRows: table.labels.length,
    tableLabels: table.labels,
    groupCacheRows: groups.length,
    groupCacheSamples: groups.slice(0, 25).map(function(group) {
      return {
        id: group.id,
        name: group.name,
        tag: group.tag,
        parentId: group.parent_id,
        pathNames: group.path_names,
        active: group.active
      };
    }),
    scopeResolution: [],
    missingLabels: [],
    scopeStats: {}
  };
  logInfo_('attendance_cache_debug_start', debugState);
  return debugState;
}

function logAttendanceDebugSummary_(debugState, scopes, totals, stats) {
  logInfo_('attendance_cache_debug_pages', {
    mode: debugState.mode,
    dryRun: debugState.dryRun,
    pagesScanned: stats.pagesScanned,
    attendancesRead: stats.attendancesRead,
    attendancesInRange: stats.attendancesInRange,
    matchedAttendances: stats.matchedAttendances,
    invalidDateRows: stats.invalidDateRows,
    beforeStartRows: stats.beforeStartRows,
    afterEndRows: stats.afterEndRows,
    outOfAcademicMonthRows: stats.outOfAcademicMonthRows,
    emptyAttendeesRows: stats.emptyAttendeesRows,
    pageSummaries: stats.pageSummaries
  });
  logInfo_('attendance_cache_debug_resolution', {
    mode: debugState.mode,
    dryRun: debugState.dryRun,
    tableRows: debugState.tableRows,
    groupCacheRows: debugState.groupCacheRows,
    missingLabels: debugState.missingLabels,
    scopeResolution: debugState.scopeResolution
  });
  scopes.forEach(function(scope) {
    var scopeStats = debugState.scopeStats[scope.label] || {};
    logInfo_('attendance_cache_debug_scope', {
      mode: debugState.mode,
      dryRun: debugState.dryRun,
      label: scope.label,
      matchedId: scope.id,
      matchedRowGroupId: scope.matchedId || scope.id,
      scopeName: scope.scopeName || '',
      groupIdsCount: scope.groupIds.length,
      groupIds: scope.groupIds,
      matchedAttendances: scopeStats.matchedAttendances || 0,
      duplicatedHourHits: scopeStats.duplicatedHourHits || 0,
      uniqueHoursByMonth: scopeStats.uniqueHoursByMonth || {},
      duplicateHitsByMonth: scopeStats.duplicateHitsByMonth || {},
      totalsToWrite: totals[scope.label] || {},
      samples: scopeStats.samples || []
    });
  });
  logInfo_('attendance_cache_debug_finish', {
    mode: debugState.mode,
    dryRun: debugState.dryRun,
    uniqueHoursByScope: attendanceDebugTotalsForReturn_(totals, debugState.monthKeys)
  });
}

function attendanceDebugTotalsForReturn_(totals, monthKeys) {
  var out = {};
  Object.keys(totals || {}).forEach(function(label) {
    out[label] = {};
    (monthKeys || []).forEach(function(monthKey) {
      out[label][attendanceMonthHeader_(monthKey)] = Number(totals[label] && totals[label][monthKey]) || 0;
    });
  });
  return out;
}
