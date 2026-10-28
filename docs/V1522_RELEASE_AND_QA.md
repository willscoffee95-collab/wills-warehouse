# Wills Warehouse V1.5.2.2 — UI/Task Admin Candidate

**Status: DRAFT. Does not modify live Warehouse or Google Sheets.**

## Changes
1. Login card narrower (356px max), shorter inputs and gaps, preserving brand.
2. Main and feature toast can be swiped horizontally >72px to dismiss early; the operational alert toast supports the same helper.
3. Dispatch request list grouped by **canonical outlet** (RB, TM including TGM alias, UPI, CPK, CPS), one outlet list visible at a time; Surat Jalan history collapsed by default. UI groups only, **no changes to requests, counts, or synchronization**.
4. Warehouse stock grouped into Gudang, Curah, Hasil Packing with icon tabs and compact two-column material tiles, constrained inner scrolling, search within selected category. No data writes.
5. OWNER: user account CRUD via **existing `saveUser` backend**: create, edit, change role assignment, deactivate/re-activate account. Historical users and transactions retained. The last active OWNER remains protected server-side. No deletion of built-in role definitions.
6. Tasks: group Opening/Operasional/Closing; owner can **archive/restore** via existing `updateWarehouseTaskV1370` and create a new **dated** manual task using separate add-on `createWarehouseTaskV1522`. Archived task is `TIDAK BERLAKU`, not physically deleted. No edit/delete of historical task rows.

## Backend prerequisite for new task creation
Install `backend-addon/Code_Tasks_V1522.gs` as a separate file in the **existing production** Apps Script project only **after source backup and Owner approval**. Do not replace Code.gs or add triggers. The addon is OWNER-only and idempotent. Before publishing frontend, run `ww1522TaskAdminAuditReadOnly`: expected `ok:true`, `taskSheetPresent:true`, `taskColumns>=19`, `stockMoneySjWorkerChanged:false`.

**Do not merge this PR before the task backend addon has been installed and verified**. It is based on the pending PR #8 frontend safety work; merge #8 first and retarget this PR to main.

## Production acceptance tests
- Login mobile width 320/375/430 and desktop: label PIN immediately follows username with consistent spacing.
- Toast main/feature/operational notice: horizontal swipe closes; manual X and auto-timeout still work.
- Request tabs: per-outlet counts equal distinct source requests; TGM maps into TM only visually; no new SJs created by tab switches. Details and A4/thermal remain available.
- Stock: category tabs, status badges, search, all three groups, zero inventory; physical quantities/HPP unchanged.
- Owner user management: create, edit no-PIN-reset, deactivate, reactivate; ordinary staff cannot open, last active Owner can't be disabled; audit trail persists.
- Tasks: Owner-only create; double submit with same idempotency key makes one row; archive/restore; staff can still update own task status; historical rows untouched.
- Verify no new Ledger Bank/Kas/AR/AP or stock rows from UI-only actions.
- Check GitHub Pages status success and refresh PWA cached app and feature assets.

## Known boundaries
- Built-in permission roles are static constants: role **definitions** cannot be deleted without a separate permission-model migration. Owner can remove a role **assignment** from a user or deactivate that account.
- Manual task CREATE is a dated task, not a recurring master template. Recurring task template management requires a different master-table schema and migration; not implemented in this candidate.
- No backend creation support until add-on deployment; frontend must not be published independently.
