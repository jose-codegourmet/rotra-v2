# Flow: request a phone or email change

1. The player contacts the platform owner or submits a change request. The owner may also enter a new email for a player from Edit profile (email only, #564); it creates the same request (source `owner`) and goes through the same review below. Edit profile never changes the email directly.
2. Retain the existing login identity until the request is reviewed; the player cannot directly overwrite it.
3. The owner reviews the request in Admin and checks the proposed contact does not conflict with another identity.
4. Apply only after manual approval, retaining the permanent RTR ID and player history.

Verification evidence, request interface, contact notifications, and account recovery when both contacts are unavailable remain open. This flow does not prescribe a new API or database field.
