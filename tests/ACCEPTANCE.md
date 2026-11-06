# Acceptance items 1–24: evidence, not a pass claim

No dedicated complete 24-scenario API acceptance suite was run. This maps actual narrower test coverage to the original brief. TESTED refers only to the stated scope.

| Item | Requirement | Status | Evidence / remaining work |
|---|---|---|---|
|1|Mixed line discounts|PARTIAL|Exact fixture and allocation properties pass; exact 10-line scenario not run.|
|2|Manager discount cap|PARTIAL|Fixture/permissions tests cover engine; desktop approval flow unavailable.|
|3|FEFO and monthly lots|PARTIAL|100 FEFO cycles pass; month-group acceptance scenario not run.|
|4|Cancellation original-lot restoration|TESTED|FEFO cycles and sale/return/cancel smoke pass.|
|5|Manager financial redaction|TESTED|Reachable manager reads/nested responses and role tests pass; not exhaustive every method.|
|6|Grid old/new audit|NOT RUN|Implementation present; no dedicated complete acceptance scenario.|
|7|Loadsheet shortage/value|NOT RUN|Backend available; visual red indicator is frontend work.|
|8|Offline plus Drive reconnection|NOT DONE|Offline engine exercised; Drive unavailable.|
|9|PDF multilingual fonts and three paper sizes|NOT RUN|Frontend integration/printing unavailable.|
|10|5000 products/50000 lines performance|FAILED|Measured products 34479ms, dashboard 922ms, durable sale 176ms; 150ms gate failed.|
|11|Upgrade preserves database|PARTIAL|Migrations applied to fresh databases; historical upgrade fixture not run.|
|12|Manager cannot delete/restore backups|PARTIAL|Owner-method permission test passes; restore implementation absent.|
|13|Carton/kg import exactness|PARTIAL|Exact quantity utilities tested; specified file-import scenario not run.|
|14|375g tea rounding invoice/report|PARTIAL|Original calculation vectors verified; full invoice/report acceptance not run.|
|15|Commission net kg and slabs|PARTIAL|984kg/607200 fixture verified; closed-period corrections absent.|
|16|Manager commission redaction|TESTED|Role and redaction tests pass for exercised endpoints.|
|17|Missing company/price/size import|NOT RUN|needs_setup implemented; exact source CSV acceptance not run.|
|18|120000 taka bKash oldest allocation|TESTED|Full payment fixture verifies amount12000000, prior16493000, remaining4493000 and receiptRCV01042.|
|19|Owner payment reversal and immutability|PARTIAL|Immutable DB guards tested; complete reversal scenario not run.|
|20|Overpayment and bounced cheque|NOT RUN|Owner default overrides original overpayment prohibition with credit; cheque full scenario not run.|
|21|License setup gate/reset|PARTIAL|Tests activate/setup with test secret; reset and packaged gate acceptance not run.|
|22|Language/theme/invoice bilingual|NOT RUN|Preferences exist; frontend visual test excluded.|
|23|Calculator F8 and exact insert|NOT RUN|Frontend-owned, no UI work performed.|
|24|Games/scores/settings/lock|NOT RUN|Frontend-owned integration not exercised.|
