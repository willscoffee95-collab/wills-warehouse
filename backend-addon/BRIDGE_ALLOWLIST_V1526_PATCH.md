# Warehouse V1.5.2.6 — Backend activation (additive only)

**Production must remain on V1.5.2.5.1 until backend is installed and audit passes.**

## Install in the EXISTING Warehouse Apps Script project
1. Create new Apps Script code file named `Code_Request_Lifecycle_V1526`.
2. Paste the **full contents** of `Code_Request_Lifecycle_V1526.gs` from this PR.
3. In existing `Bridge.html`, append these exact three method strings **inside** `ALLOWED_METHODS = new Set([...])`, preserving every old method, `ALLOWED_PARENT_ORIGIN`, and the existing bridge implementation:

```js
    // V1.5.2.6 — canonical outlet request lifecycle + prices + print trail
    'getWarehouseRequestLifecycleV1526',
    'getWarehousePickingPricesV1526',
    'markWarehousePickingPrintRequestedV1526',
```

4. Optionally update `BRIDGE_VERSION` to `1.5.2.6-REQUEST-LIFECYCLE` (label only).
5. Save. In Apps Script editor, run **`ww1526RequestStatusAuditReadOnly`** and share the log. It must report `ok:true, readOnly:true`. It reads the live 558-ish request rows and associated canonical SJ statuses; counts may change as outlets operate. The audit DOES NOT post transaction.
6. Update **the existing** Web App deployment (Deploy → Manage deployments → Edit → New version → Deploy), keeping the **same** `/exec` URL, origin and permissions.
7. Only after the audit and Web App redeployment should the GitHub PR be merged and GitHub Pages deployed. Do not run setup, reset stock, install extra triggers, touch historical journals, or closebook.

## What this actually changes
- Request queue uses canonical status on the linked SJ. DRAFT remains in picking; dispatched/received/completed are shown in progress/history, never in **Perlu Disiapkan**.
- Picking form is visually redesigned, includes spinners and price read-only from existing positive SJ snapshot; prices are not overwritten.
- Print Thermal/A4 show requested, prepared, shortage, **harga per unit**, subtotal and total. Backend pricing read permits staff `DELIVERY_PREPARE` role but not bank/cash ledgers.
- Audit Trail logs `REQUEST_PICKING_PRINT_ISSUED`, a **print command**, not confirmation that physical paper exited the printer. SJ remains DRAFT until canonical `dispatchDelivery`. Only receipt synchronization advances DITERIMA/SELESAI.
- Supplier price changes: update **Pusat Harga Bahan**, which affects newly generated SJ. Historical SJ price snapshots remain fixed. When effective current price differs, the app shows a warning and prints the SJ snapshot for consistent purchase value. **No unapproved automatic repricing.**

## Mandatory validation
- Frontend JavaScript syntactic validation PASS.
- Pure status mapping tests: DRAFT → SUDAH DIPERIKSA → STRUK DIMINTA CETAK → DIKIRIM → DITERIMA → SELESAI; SELISIH/DIBATALKAN distinct.
- Price read must not change SJ/ledger; print log only writes to Audit Trail.
- E2E on an explicitly approved DRAFT: check qty 0 + reason, save, print/read price, verify status STRUK DIMINTA CETAK, verify another SJ in DIKIRIM/SELESAI excluded from prep; do not dispatch in QA.
- If backend not installed, PWA deliberately refuses to treat queued requests/prices as verified and disables print. Do NOT merge frontend first.
