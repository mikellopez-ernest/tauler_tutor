# Student Profile Photo

## Purpose

The student profile header shows a square photo next to the student name. Tutors who can open that student profile can create or replace the photo.

## User Interface

- With no saved photo, show a neutral silhouette rendered as a PNG data URL.
- Clicking either the silhouette or a saved photo opens the photo modal.
- `Fes una foto` opens a small top-level camera window. The tutor clicks `Activa la càmera`, Firefox asks for camera permission, and the window shows a square live viewport.
- `Puja una foto` accepts JPG, PNG, or WebP files.
- Captured and uploaded images open in a square Canvas editor.
- The tutor can drag the image and adjust zoom before saving.
- The browser exports a 640 x 640 JPEG for upload.

Apps Script HTML runs inside a sandboxed iframe. Firefox does not show a camera permission prompt to that iframe unless the top-level document delegates the `camera` Permissions Policy, which Apps Script does not expose. The separate top-level window avoids that restriction while keeping capture inside the same app workflow. Camera access still requires HTTPS, browser permission, and permission for app popups. If access is unavailable or denied, the modal keeps the upload option available and shows a Catalan error.

## Storage

The destination Google Drive folder is configured in `APP_CONFIG.studentPhotoFolderId` with initial value:

`1zBlLMMASc7S0fFCUeC_PRKXx_ZojL2lA`

Files use the name pattern `student-{student_id}-{yyyyMMdd-HHmmss}.jpg`. Files remain private in Drive. The app does not enable public or link sharing.

The Drive file URL is stored in the Dinantia Student custom field `Observacions`. The field is resolved from `GET /v1.2/fields/index` by exact normalized name/id and Student role. Before calling `POST /v1.2/accounts/update/:id`, the app:

1. Loads the current student account.
2. Preserves every existing custom field.
3. Preserves non-photo text in `Observacions`.
4. Replaces the existing Google Drive URL, or appends the URL when none exists.

During `cacheRebuildTutorPanel()`, the URL is read from each Dinantia account's `Observacions` field and written to the `photo_url` header in `Dinantia -> students_cache`. The sheet column position is irrelevant; when `photo_url` is column N, values are written to column N. If the field-definition endpoint is temporarily unavailable, the rebuild falls back to the verified Dinantia field ID `Observacions` instead of blanking the photo cache.

After Dinantia accepts the update, the app immediately writes the same URL to every matching `Dinantia -> students_cache.photo_url` row and verifies that at least one row was updated. It then appends a `StudentPhoto` changelog row. This double write makes the new photo available from the cache without waiting for a complete cache rebuild.

If the Dinantia update fails, the newly created Drive file is moved to trash. If Dinantia succeeds but the cache update fails, the Drive file is preserved because Dinantia already references it. The save reports the cache error and `cacheRebuildTutorPanel()` is the repair path.

## Authorized Reads

Drive URLs are not rendered directly in the browser. `loadStudentPhotoJson(studentId)` first resolves the logged-in teacher and confirms that the student belongs to one of that teacher's visible groups. The URL is read exclusively from `Dinantia -> students_cache.photo_url`; profile rendering never calls the Dinantia API. A blank cache value therefore displays the standard silhouette until a photo is saved or the cache is rebuilt. When a URL exists, the app reads the private Drive file server-side and returns an image data URL.

`saveStudentPhotoJson(request)` performs the same student-access check before accepting an image. The decoded payload must be an image data URL and cannot exceed 5 MB.

Required Apps Script OAuth scope:

`https://www.googleapis.com/auth/drive`

After deploying a version that adds this scope, the script owner must run this public function once from the Apps Script editor:

```javascript
authorizeStudentPhotoDrive()
```

The helper calls `ScriptApp.requireScopes` for `https://www.googleapis.com/auth/drive`, so the Apps Script editor shows the missing granular-consent prompt when write access has not been granted. Accept the full Drive permission and run the helper again if the first execution stops after authorization.

The helper then creates `.tauler-tutor-drive-authorization-check.txt` in the configured folder and immediately moves it to trash. A successful execution returns `writeVerified: true`, folder details, and `Permís de lectura i escriptura de Google Drive verificat correctament.` Run it with the account that owns the web-app deployment, because the production web app executes as that user.
