# Bridge.html — Patch allowlist V1.5.2.2

**Apply to the EXISTING `Bridge.html` inside the SAME production Apps Script project** only after backing up the most recent source. Do not replace the complete Bridge.html with an old reference version.

The Warehouse PWA calls backend methods through an explicit `ALLOWED_METHODS = new Set([...])` allowlist. Without this change, new task-management actions fail with "Method tidak diizinkan" even if the addon is installed.

## Minimal change

Find the existing entries:

```js
'getWarehouseTasksV1370','updateWarehouseTaskV1370','getOfficeAttendanceV1370',
```

Keep the existing entries, and add these **three, and only these three**, next to the task methods:

```js
'createWarehouseTaskV1522',
'listWarehouseTaskTemplatesV1522',
'saveWarehouseTaskTemplateV1522',
```

Do **not** add `ww1522TaskAdminAuditReadOnly` to the public Bridge allowlist (run that read-only audit from the Apps Script editor instead). Do not remove the existing methods or grant role-based access in the Bridge; the backend methods separately enforce OWNER authorization.

## Checks

1. Verify `Bridge.html` is still valid HTML/JavaScript; preserve `ALLOWED_PARENT_ORIGIN`.
2. Run `ww1522TaskAdminAuditReadOnly()` in the Apps Script editor: `ok:true`, `templateColumns>=11`, `taskColumns>=19`.
3. Existing 5 outlet/inventory/finance lockdown flags stay unchanged.
4. **One update to the existing Web App deployment** (same `/exec` URL). Ensure PWA methods are accepted.
5. Only then merge frontend PR #8 and #9 in order and check GitHub Pages is `success`.

No stock, Surat Jalan, Bank/Kas/AR/AP, trigger or permission-matrix changes are needed.
