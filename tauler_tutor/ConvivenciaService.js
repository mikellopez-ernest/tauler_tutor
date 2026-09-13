function loadStudentConvivenciaSummary_(student) {
  try {
    student = student || {};
    var studentId = String(student.id || student.student_id || '').trim();
    if (!studentId) {
      throw new AppError('No es poden carregar les dades de convivència: falta l identificador de l alumne/a.', {
        code: 'CONV_MISSING_STUDENT_ID'
      });
    }

    var registry = loadTableRegistry_();
    var term = loadCurrentIncidentTerm_(registry, new Date());
    var summary = aggregateStudentIncidentsForTerm_(registry, studentId, term);
    summary.ok = true;
    return summary;
  } catch (error) {
    logError_('student_convivencia_summary_failed', error, {
      studentId: student && student.id
    });
    return {
      ok: false,
      error: errorToViewModel_(error),
      term: null,
      totals: emptyConvivenciaTotals_(),
      details: emptyConvivenciaDetails_()
    };
  }
}

function loadCurrentIncidentTerm_(registry, referenceDate) {
  var sheet = openTableSheet_(registry, TABLES.incidents, SHEETS.incidentsConfig);
  var headers = requireHeaders_(sheet, ['1r trimestre', '2n trimestre', '3r trimestre', 'Fi curs'], TABLES.incidents + ' -> ' + SHEETS.incidentsConfig);
  var values = sheet.getDataRange().getValues();
  var termDates = null;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var first = parseIncidentDateOnly_(row[headers['1r trimestre']]);
    var second = parseIncidentDateOnly_(row[headers['2n trimestre']]);
    var third = parseIncidentDateOnly_(row[headers['3r trimestre']]);
    var end = parseIncidentDateOnly_(row[headers['Fi curs']]);
    if (first || second || third || end) {
      termDates = { first: first, second: second, third: third, end: end };
      break;
    }
  }

  if (!termDates || !termDates.first || !termDates.second || !termDates.third || !termDates.end) {
    throw new AppError('No es poden carregar les dades de convivència: falten dates de trimestre a Incidències -> config.', {
      code: 'CONV_TERM_DATES_MISSING'
    });
  }

  var current = startOfDay_(referenceDate || new Date());
  var term = null;
  if (current >= termDates.first && current < termDates.second) {
    term = { key: '1', label: '1r trimestre', start: termDates.first, end: new Date(termDates.second.getTime() - 1), periodEnd: current };
  } else if (current >= termDates.second && current < termDates.third) {
    term = { key: '2', label: '2n trimestre', start: termDates.second, end: new Date(termDates.third.getTime() - 1), periodEnd: current };
  } else if (current >= termDates.third && current <= termDates.end) {
    term = { key: '3', label: '3r trimestre', start: termDates.third, end: termDates.end, periodEnd: current };
  }

  if (!term) {
    return {
      key: '',
      label: 'Fora del curs configurat',
      start: null,
      end: null,
      periodEnd: current,
      outsideSchoolYear: true
    };
  }

  return {
    key: term.key,
    label: term.label,
    start: term.start,
    end: term.end,
    periodEnd: term.periodEnd,
    outsideSchoolYear: false
  };
}

function aggregateStudentIncidentsForTerm_(registry, studentId, term) {
  var totals = emptyConvivenciaTotals_();
  var details = emptyConvivenciaDetails_();
  if (!term || term.outsideSchoolYear) {
    return {
      term: termToView_(term),
      totals: totals,
      details: details
    };
  }

  var sheet = openTableSheet_(registry, TABLES.incidents, SHEETS.incidentsAnnual);
  var headers = requireHeaders_(sheet, ['Id', 'Alumne', 'Activitat', 'Assignatura', 'Puntuació', 'Data', 'Professor', 'Missatge', 'Nota interna'], TABLES.incidents + ' -> ' + SHEETS.incidentsAnnual);
  var values = sheet.getDataRange().getValues();
  var studentKey = codeKey_(studentId);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (codeKey_(row[headers.Id]) !== studentKey) continue;
    var incidentDate = parseIncidentDateTime_(row[headers.Data]);
    if (!incidentDate || incidentDate < term.start || incidentDate > endOfDay_(term.periodEnd)) continue;

    var points = parseIncidentPoints_(row[headers['Puntuació']]);
    if (points !== null) totals.points += points;

    var activity = String(row[headers.Activitat] || '').trim().toUpperCase();
    var detail = buildConvivenciaIncidentDetail_(row, headers, incidentDate, i + 2);
    if (activity === 'FLLEU') {
      totals.yellowCards++;
      details.yellowCards.push(detail);
    }
    if (activity === 'FALTA GREU') {
      totals.redCards++;
      details.redCards.push(detail);
    }
    if (activity === 'RETARD') {
      totals.lateAssistances++;
      details.lateAssistances.push(detail);
    }
    totals.incidents++;
  }

  Object.keys(details).forEach(function(key) {
    details[key].sort(sortIncidentDetailsNewestFirst_);
  });

  return {
    term: termToView_(term),
    totals: totals,
    details: details
  };
}

function emptyConvivenciaTotals_() {
  return {
    points: 0,
    yellowCards: 0,
    redCards: 0,
    lateAssistances: 0,
    incidents: 0
  };
}

function emptyConvivenciaDetails_() {
  return {
    yellowCards: [],
    redCards: [],
    lateAssistances: []
  };
}

function buildConvivenciaIncidentDetail_(row, headers, incidentDate, sheetRow) {
  return {
    sheetRow: sheetRow,
    timestamp: incidentDate.getTime(),
    date: Utilities.formatDate(incidentDate, APP_CONFIG.timezone, 'dd/MM/yyyy'),
    time: Utilities.formatDate(incidentDate, APP_CONFIG.timezone, 'HH:mm'),
    subject: incidentTextValue_(row[headers.Assignatura]),
    activity: incidentTextValue_(row[headers.Activitat]),
    points: incidentTextValue_(row[headers['Puntuació']]),
    teacher: incidentTextValue_(row[headers.Professor]),
    message: incidentTextValue_(row[headers.Missatge]),
    internalNote: incidentTextValue_(row[headers['Nota interna']])
  };
}

function incidentTextValue_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function sortIncidentDetailsNewestFirst_(a, b) {
  if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
  return b.sheetRow - a.sheetRow;
}

function termToView_(term) {
  term = term || {};
  return {
    key: term.key || '',
    label: term.label || '',
    start: term.start ? Utilities.formatDate(term.start, APP_CONFIG.timezone, 'yyyy-MM-dd') : '',
    end: term.periodEnd ? Utilities.formatDate(term.periodEnd, APP_CONFIG.timezone, 'yyyy-MM-dd') : '',
    outsideSchoolYear: term.outsideSchoolYear === true
  };
}

function parseIncidentPoints_(value) {
  if (typeof value === 'number' && !isNaN(value)) return value;
  var text = String(value === null || value === undefined ? '' : value).trim().replace(',', '.');
  if (!text) return null;
  var number = Number(text.replace(/^\+/, ''));
  return isNaN(number) ? null : number;
}

function parseIncidentDateOnly_(value) {
  var parsed = parseIncidentDateTime_(value);
  return parsed ? startOfDay_(parsed) : null;
}

function parseIncidentDateTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  var text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return null;

  var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0));
  }

  var local = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (local) {
    var year = Number(local[3]);
    if (year < 100) year += 2000;
    return new Date(year, Number(local[2]) - 1, Number(local[1]), Number(local[4] || 0), Number(local[5] || 0), Number(local[6] || 0));
  }

  return null;
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
