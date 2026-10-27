# Flow: recover an interrupted session

1. Device 1 operates a downloaded session offline and becomes unavailable before uploading all work.
2. Device 2 continues recording the same session. It cannot assume its copy is complete.
3. Before Session done, reconnect and check record completeness. If incomplete/inconsistent, prompt sync and ask whether the session was interrupted.
4. If Yes, wait for device 1 to return online and upload its original records.
5. Compare records. The operator reviews flagged conflicts and checks match winners. Uncontested confirmed records remain permanent.
6. Once reconciliation is complete, allow online Session done and normal profile/ranking sync.
7. If No is selected despite inconsistent records, or original records cannot be recovered, mark the session invalid. Do not generate leaderboards or apply match performance.

Do not substitute manually reconstructed results for original missing records. The precise conflict review rules and second-device access/download prerequisites remain open; see the module rules.
