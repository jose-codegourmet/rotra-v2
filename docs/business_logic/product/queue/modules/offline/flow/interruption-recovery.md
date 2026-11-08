# Flow: recover an interrupted session

**Owner decisions:** November 8, 2026. See [offline rules](../README.md). This describes the target, not the current implementation.

1. Device 1 records an active session offline. Device 2 may continue offline using an existing copy or imported CSV.
2. Each device retains its changes in its own durable session log. When online, sync the logs; importing a CSV transfers records but does not itself sync them to the database.
3. ROTRA merges non-conflicting changes and flags collisions. The Queue Master reviews the source records and resolves disputed matches, timestamps, availability and payment states. A match whose correct result cannot be determined may be marked invalid.
4. Before Session done, ROTRA shows known device status and asks the Queue Master to confirm all devices have synced or been imported. If records are missing, the Queue Master may accept the warning that games and payments may be lost and finish with the available records.
5. Session done is online and only succeeds after the final data is saved to the database. A new session cannot start before this succeeds. Late records are not automatically merged after Session done; reviewed recovery remains to be specified.

Timestamps can flag suspicious records but cannot prove all device records are present. Original records and the Queue Master's choices are retained; a device that never contacted the server may be unknown to it.
