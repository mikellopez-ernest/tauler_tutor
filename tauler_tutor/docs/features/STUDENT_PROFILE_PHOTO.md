# Student Profile Photo

## Purpose

The student profile header shows a square photo next to the student name. Tutors who can open that student profile can create or replace the photo.

## User Interface

- With no saved photo, show a neutral silhouette rendered as a PNG data URL.
- Clicking either the silhouette or a saved photo opens the photo modal.
- `Fes una foto` requests the laptop camera through the browser `MediaDevices` API and shows a square live viewport.
- `Puja una foto` accepts JPG, PNG, or WebP files.
- Captured and uploaded images open in a square Canvas editor.
- The tutor can drag the image and adjust zoom before saving.
- The browser exports a 640 x 640 JPEG for upload.

Camera access requires HTTPS and the tutor's browser permission. If camera access is unavailable or denied, the modal keeps the upload option available and shows a Catalan error.

## Storage

The destination Google Drive folder is configured in `APP_CONFIG.studentPhotoFolderId` with initial value:

`1zBlLMMASc7S0fFCUeC_PRKXx_ZojL2lA`

Files use the name pattern `student-{student_id}-{yyyyMMdd-HHmmss}.jpg`. Files remain private in Drive. The app does not enable public or link sharing.

The Drive file URL is stored in the Dinantia Student custom field `Observacions`. The field is resolved from `GET /v1.2/fields/index` by exact normalized name/id and Student role. Before calling `POST /v1.2/accounts/update/:id`, the app:

1. Loads the current student account.
2. Preserves every existing custom field.
3. Preserves non-photo text in `Observacions`.
4. Replaces the existing Google Drive URL, or appends the URL when none exists.

After Dinantia accepts the update, the app writes the URL to `Dinantia -> students_cache.photo_url` and appends a `StudentPhoto` changelog row. If the Dinantia update fails, the newly created Drive file is moved to trash.

## Authorized Reads

Drive URLs are not rendered directly in the browser. `loadStudentPhotoJson(studentId)` first resolves the logged-in teacher and confirms that the student belongs to one of that teacher's visible groups. It then reads the private Drive file server-side and returns an image data URL.

`saveStudentPhotoJson(request)` performs the same student-access check before accepting an image. The decoded payload must be an image data URL and cannot exceed 5 MB.

Required Apps Script OAuth scope:

`https://www.googleapis.com/auth/drive`
