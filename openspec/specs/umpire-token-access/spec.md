# Umpire Token Access Specification

## Purpose

Documented one-time Quick Umpire token generation, claim, QR, revocation, and abuse handling.

## Status

**Documented intent — not implemented.** Umpire App is coming-soon.

## Actors

Que Master (generate/revoke), person with URL/QR (claim).

## Requirements

### Requirement: Exclusive token access
The Umpire App SHALL be reachable only via a Que Master-generated one-time token (URL and QR encoding the same URL). There SHALL be no public login entry for scoring.

#### Scenario: Direct URL without token
- GIVEN no valid token
- WHEN someone opens the Umpire App
- THEN they do not receive a scoring session

### Requirement: Token properties
A token SHALL be scoped to a single match, cryptographically random, HTTPS-only, and valid until score submit or session end, whichever first. Only one valid token SHALL exist per match; generating a new token SHALL invalidate the previous. Opening the Umpire View SHALL claim the token. A second device after claim SHALL be rejected with a generic error. First to reach the server SHALL win simultaneous opens.

#### Scenario: Second device
- GIVEN a token already claimed on device A
- WHEN device B opens the same URL
- THEN access is rejected

### Requirement: Invalid states
Invalid or expired tokens SHALL show “This umpire link is no longer active”. After score submit: “This match has already been scored”. After session end: “This session has ended”. If the Que Master closes the session while scoring, the umpire SHALL see “Session ended” and the score SHALL NOT be submitted.

#### Scenario: Open after submit
- GIVEN the match score was already submitted
- WHEN the token is opened
- THEN the already-scored error is shown

### Requirement: Revocation
Que Master MAY revoke immediately. An active umpire SHALL see “Umpire access has been revoked by the Que Master” and the session SHALL end. A new token MAY be issued immediately.

#### Scenario: Revoke mid-match
- GIVEN an umpire is scoring
- WHEN the Que Master revokes
- THEN scoring ends immediately

### Requirement: Offline mid-match
If the umpire loses connection, locally scored points SHALL be queued and synced on reconnect; the session SHALL be preserved.

#### Scenario: Reconnect
- GIVEN points were tapped offline
- WHEN the connection returns
- THEN queued points sync
- AND the scoring session continues

## Source

- `docs/business_logic/umpire_app/02_token_access.md`
