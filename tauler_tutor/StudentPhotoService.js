function loadStudentPhoto_(studentId) {
  var student = requireAccessibleStudent_(studentId);
  var photoUrl = String(student.photoUrl || '').trim();

  if (!photoUrl) {
    var account = fetchDinantiaAccount_(student.id, getDinantiaCredentials_());
    photoUrl = studentPhotoUrlFromFields_(account && account.fields, resolveDinantiaStudentPhotoFieldId_());
    if (photoUrl) cacheUpdateStudentPhotoUrl_(student.id, photoUrl);
  }

  if (!photoUrl) return { ok: true, hasPhoto: false, studentId: student.id };

  var fileId = driveFileIdFromUrl_(photoUrl);
  if (!fileId) {
    logWarn_('student_photo_invalid_drive_url', { studentId: student.id, photoUrl: photoUrl });
    return { ok: true, hasPhoto: false, studentId: student.id };
  }

  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    var contentType = String(blob.getContentType() || 'image/jpeg');
    if (contentType.indexOf('image/') !== 0) throw new Error('The stored file is not an image.');
    return {
      ok: true,
      hasPhoto: true,
      studentId: student.id,
      photoUrl: photoUrl,
      dataUrl: 'data:' + contentType + ';base64,' + Utilities.base64Encode(blob.getBytes())
    };
  } catch (error) {
    logError_('student_photo_load_failed', error, { studentId: student.id, fileId: fileId });
    return { ok: false, hasPhoto: false, studentId: student.id, error: errorToViewModel_(error) };
  }
}

function saveStudentPhoto_(request) {
  request = request || {};
  var userEmail = getCurrentUserEmail_();
  var student = requireAccessibleStudent_(request.studentId);
  var image = parseStudentPhotoDataUrl_(request.dataUrl);
  var folder = DriveApp.getFolderById(APP_CONFIG.studentPhotoFolderId);
  var timestamp = Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyyMMdd-HHmmss');
  var safeStudentId = String(student.id).replace(/[^A-Za-z0-9_-]/g, '_');
  var filename = 'student-' + safeStudentId + '-' + timestamp + '.jpg';
  var file = folder.createFile(Utilities.newBlob(image.bytes, 'image/jpeg', filename));
  var photoUrl = file.getUrl();

  try {
    var account = fetchDinantiaAccount_(student.id, getDinantiaCredentials_());
    if (!account) throw new Error("No s'ha trobat l'alumne/a a Dinantia.");
    var fieldId = resolveDinantiaStudentPhotoFieldId_();
    var oldFieldValue = dinantiaFieldValue_(account.fields, fieldId);
    var oldPhotoUrl = studentPhotoUrlFromValue_(oldFieldValue);
    var fields = mergeDinantiaFieldValue_(account.fields, fieldId, mergeStudentPhotoUrlIntoValue_(oldFieldValue, photoUrl));
    updateDinantiaAccountFields_(student.id, { id: student.id, fields: fields });
    cacheUpdateStudentPhotoUrl_(student.id, photoUrl);
    appendChangelogRows_([{
      studentId: student.id,
      fieldChanged: CHANGELOG_FIELDS.studentPhoto,
      oldValue: oldPhotoUrl,
      newValue: photoUrl
    }], userEmail);
  } catch (error) {
    file.setTrashed(true);
    throw error;
  }

  logInfo_('student_photo_saved', { studentId: student.id, fileId: file.getId(), userEmail: userEmail });
  return {
    ok: true,
    studentId: student.id,
    photoUrl: photoUrl,
    dataUrl: 'data:image/jpeg;base64,' + Utilities.base64Encode(image.bytes)
  };
}

function requireAccessibleStudent_(studentId) {
  studentId = String(studentId || '').trim();
  if (!studentId) throw new Error("Falta l'identificador de l'alumne/a.");
  var email = getCurrentUserEmail_();
  var tutorGroup = resolveTutorGroupForEmail_(email);
  var students = loadStudentsForTutorGroupsCached_(tutorGroup.groups);
  var student = students.filter(function(item) {
    return String(item && item.id || '').trim() === studentId;
  })[0];
  if (!student) throw accessError_('No tens accés a aquest alumne/a.');
  return student;
}

function parseStudentPhotoDataUrl_(dataUrl) {
  var match = String(dataUrl || '').match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('El format de la imatge no és vàlid.');
  var bytes = Utilities.base64Decode(match[1]);
  if (!bytes.length) throw new Error('La imatge és buida.');
  if (bytes.length > APP_CONFIG.studentPhotoMaxBytes) throw new Error('La imatge supera el límit de 5 MB.');
  return { bytes: bytes };
}

function dinantiaFieldValue_(fields, fieldId) {
  var target = String(fieldId || '').trim();
  var field = (fields || []).filter(function(item) {
    return String(item && item.id || '').trim() === target;
  })[0];
  return field ? String(field.value || '') : '';
}

function mergeDinantiaFieldValue_(fields, fieldId, value) {
  var target = String(fieldId || '').trim();
  var found = false;
  var merged = (fields || []).map(function(field) {
    if (String(field && field.id || '').trim() !== target) {
      return { id: field.id, value: field.value === undefined || field.value === null ? '' : field.value };
    }
    found = true;
    return { id: target, value: value };
  });
  if (!found) merged.push({ id: target, value: value });
  return merged;
}

function mergeStudentPhotoUrlIntoValue_(value, photoUrl) {
  var text = String(value || '').trim();
  var driveUrlPattern = /https:\/\/drive\.google\.com\/[^\s]+/i;
  if (driveUrlPattern.test(text)) return text.replace(driveUrlPattern, photoUrl);
  return text ? text + '\n' + photoUrl : photoUrl;
}

function studentPhotoUrlFromFields_(fields, fieldId) {
  if (!fieldId) return '';
  return studentPhotoUrlFromValue_(dinantiaFieldValue_(fields, fieldId));
}

function studentPhotoUrlFromValue_(value) {
  var match = String(value || '').match(/https:\/\/drive\.google\.com\/[^\s]+/i);
  return match ? match[0] : '';
}

function driveFileIdFromUrl_(url) {
  var text = String(url || '').trim();
  var pathMatch = text.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  var queryMatch = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return queryMatch ? queryMatch[1] : '';
}
