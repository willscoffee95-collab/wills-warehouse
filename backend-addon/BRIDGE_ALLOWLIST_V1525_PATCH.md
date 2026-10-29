# Bridge.html PATCH — Wills Warehouse V1.5.2.5 (Staff Picking)

Add only these methods **inside the existing** `ALLOWED_METHODS = new Set([...])`, keeping the old allowed methods and `ALLOWED_PARENT_ORIGIN` unchanged:

```javascript
'getWarehouseRequestAvailabilityV1525',
'saveWarehouseRequestAvailabilityV1525',
```

Then add the Apps Script **file** `Code_Request_Picking_V1525.gs`, save, and manually run the **read-only** editor function `ww1525PickingAuditReadOnly`.

**Do not add** `ww1525PickingAuditReadOnly` to the web Bridge; this audit is editor-only.

On audit success, update the **existing** Web App deployment (Manage deployments → Edit → New version → Deploy; preserve /exec URL). Do **not** rerun setup, add worker triggers, reset the warehouse, or change ledger/closebook.

Backend retains canonical DRAFT SJ lines in the existing `Penyesuaian Pemenuhan SJ` log (event `FCHK-...`), including **zero for all items**. Existing `dispatchDelivery` forbids dispatch of a DRAFT with all zero approved lines. No funds, stock, or receivable/payable posting occurs at the picking stage.

**Release order**: backend add-on + Bridge allowlist → editor read-only audit → existing Web App update → frontend PR #12 deploy → smoke test with an actual linked DRAFT request, no dispatch. If backend isn't installed, frontend fails closed and printing a picking result is not available.

Audit proof alone doesn't verify functionality; test with actual linked DRAFT through a staff authorized login. Saving review writes real fulfillment audit events, so use an explicitly selected noncritical DRAFT or obtain owner approval for the specific test.