function loadStudentTutories_(student) {
  try {
    student = student || {};
    var studentId = String(student.id || student.student_id || '').trim();
    if (!studentId) {
      throw new AppError('No es poden carregar les tutories: falta l identificador de l alumne/a.', {
        code: 'TUT_MISSING_STUDENT_ID'
      });
    }

    var registry = loadTableRegistry_();
    var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.tutorMeetings);
    var headers = requireTutoriaHeaders_(sheet);
    var values = sheet.getDataRange().getValues();
    var rows = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (String(row[headers.student_id] || '').trim() !== studentId) continue;
      rows.push(tutoriaRowToView_(row, headers, i + 1));
    }

    rows.sort(function(a, b) {
      if (a.sortKey !== b.sortKey) return String(b.sortKey || '').localeCompare(String(a.sortKey || ''));
      return Number(b.id || 0) - Number(a.id || 0);
    });

    return {
      ok: true,
      studentId: studentId,
      tutories: rows
    };
  } catch (error) {
    logError_('student_tutories_load_failed', error, {
      studentId: student && student.id
    });
    return {
      ok: false,
      error: errorToViewModel_(error),
      tutories: []
    };
  }
}

function saveStudentTutoria_(record) {
  try {
    record = record || {};
    var studentId = String(record.studentId || record.student_id || '').trim();
    if (!studentId) {
      throw new AppError('No es pot desar la tutoria: falta l identificador de l alumne/a.', {
        code: 'TUT_SAVE_MISSING_STUDENT_ID'
      });
    }

    var meetingDate = parseTutoriaDate_(record.date || record.data);
    if (!meetingDate) {
      throw new AppError('No es pot desar la tutoria: la data no és vàlida.', {
        code: 'TUT_SAVE_INVALID_DATE'
      });
    }

    var registry = loadTableRegistry_();
    var sheet = openTableSheet_(registry, TABLES.dinantia, SHEETS.tutorMeetings);
    var headers = requireTutoriaHeaders_(sheet);
    var width = sheet.getLastColumn();
    var values = sheet.getDataRange().getValues();
    var id = String(record.id || '').trim();
    var rowNumber = 0;

    if (id) {
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][headers.id] || '').trim() === id && String(values[i][headers.student_id] || '').trim() === studentId) {
          rowNumber = i + 1;
          break;
        }
      }
      if (!rowNumber) {
        throw new AppError('No es pot desar la tutoria: no s ha trobat el registre.', {
          code: 'TUT_SAVE_NOT_FOUND'
        });
      }
    } else {
      id = String(nextNumericId_(sheet, headers.id));
      rowNumber = sheet.getLastRow() + 1;
    }

    var row = rowNumber <= sheet.getLastRow()
      ? sheet.getRange(rowNumber, 1, 1, width).getValues()[0]
      : new Array(width).fill('');
    row[headers.id] = id;
    row[headers.student_id] = studentId;
    row[headers.data] = meetingDate;
    row[headers.assistents] = tutoriaText_(record.assistents);
    row[headers['motiu de la reunió']] = tutoriaText_(record.motiu);
    row[headers.desenvolupament] = tutoriaText_(record.desenvolupament);
    row[headers.acords] = tutoriaText_(record.acords);

    sheet.getRange(rowNumber, 1, 1, width).setValues([row]);
    sheet.getRange(rowNumber, headers.data + 1).setNumberFormat('dd/MM/yyyy');

    var saved = tutoriaRowToView_(row, headers, rowNumber);
    logInfo_('student_tutoria_saved', {
      id: saved.id,
      studentId: studentId,
      row: rowNumber
    });

    return {
      ok: true,
      tutoria: saved
    };
  } catch (error) {
    logError_('student_tutoria_save_failed', error, {
      studentId: record && (record.studentId || record.student_id),
      id: record && record.id
    });
    return {
      ok: false,
      error: errorToViewModel_(error)
    };
  }
}

function requireTutoriaHeaders_(sheet) {
  return requireHeaders_(sheet, [
    'id',
    'student_id',
    'data',
    'assistents',
    'motiu de la reunió',
    'desenvolupament',
    'acords'
  ], TABLES.dinantia + ' -> ' + SHEETS.tutorMeetings);
}

function tutoriaRowToView_(row, headers, sheetRow) {
  var date = parseTutoriaDate_(row[headers.data]);
  return {
    id: String(row[headers.id] || '').trim(),
    studentId: String(row[headers.student_id] || '').trim(),
    sheetRow: sheetRow,
    date: date ? Utilities.formatDate(date, APP_CONFIG.timezone, 'dd/MM/yyyy') : '',
    dateInput: date ? Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd') : '',
    sortKey: date ? Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM-dd') : '',
    assistents: tutoriaText_(row[headers.assistents]),
    motiu: tutoriaText_(row[headers['motiu de la reunió']]),
    desenvolupament: tutoriaText_(row[headers.desenvolupament]),
    acords: tutoriaText_(row[headers.acords])
  };
}

function tutoriaText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function parseTutoriaDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return startOfDay_(value);
  var text = String(value === null || value === undefined ? '' : value).trim();
  if (!text) return null;
  var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  var local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  return null;
}
