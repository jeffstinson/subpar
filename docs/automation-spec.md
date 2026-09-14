# Subpar OS — Vehicle Automation Engine

## Purpose
Subpar OS should allow Doug to trigger onboarding and tuning workflow automation from the actual vehicle/tune context, not just from generic order status.

## Core trigger model
Rules can trigger from:
- Wix order created / paid
- vehicle intake completed
- vehicle/chassis identified
- engine identified
- tuning platform selected (MHD / bootmod3 / EcuTek)
- tune product selected
- hardware/modification state
- fuel target selected
- status change
- customer upload received
- stock file received
- datalog received
- revision delivered
- customer inactivity / missing requirement

## Rule conditions
Rules should support combinations of:
- make/model/generation
- chassis code
- engine family
- model year range
- tuning platform
- fuel type / ethanol target
- tune product
- transmission
- hardware/mod list
- region / market where relevant
- current workflow status

Example:
IF platform = MHD
AND engine = B58TU
AND stock file missing
THEN request MHD stock file + show upload task + send vehicle-specific preparation checklist.

## Actions
Rules can:
- send a customer email through Doug's Gmail
- request an MHD stock file
- request a datalog / Datazap link
- request specific intake fields
- send vehicle/platform-specific instructions
- send tuning parameter / logging parameter pack
- attach files or links to the customer portal
- create an internal task for Doug
- assign queue/status
- set priority
- create reminders / follow-ups
- notify Doug of compatibility exceptions
- create a revision placeholder
- mark prerequisites complete when files arrive

## MHD stock-file workflow
For an applicable MHD vehicle:
1. Order is matched to customer + vehicle.
2. Vehicle/engine/platform rule evaluates.
3. If stock file is required and missing, Subpar OS automatically sends Doug's approved stock-file request instructions.
4. Customer sees a portal task: `Upload MHD stock file`.
5. Uploaded file is attached to that vehicle + tune project.
6. Receipt clears the prerequisite and moves the tune forward automatically.

The app should not imply it can retrieve an MHD stock file automatically unless a verified MHD integration later supports that. The default workflow is request/upload/attach/verify.

## Tuning parameter pack
Doug will provide his preferred logging/tuning-parameter pack. Store it as versioned tuner-owned reference data.

It should support:
- platform-specific packs
- engine-specific packs
- vehicle/generation-specific overrides
- revision/version history
- active/inactive state
- notes for Doug only vs customer-visible instructions
- downloadable/customer-visible attachments where appropriate

Example hierarchy:
`MHD > S58 > G8X > Parameter Pack v3`

When the correct vehicle/platform is identified, Subpar OS can automatically:
- show the correct required channels/parameters
- send the matching instruction pack
- attach it to the customer portal
- create a `logging setup complete` prerequisite

## Safety / control
Every automation should have:
- enabled/disabled toggle
- dry-run/test option
- manual override
- visible audit trail
- rule version
- last triggered time
- customer/order/tune record showing what was sent and why

Doug should be able to create rules without editing code.

## Proposed UI
Add `Automations` to the left navigation.

Automation dashboard:
- Active Rules
- Runs Today
- Waiting on Customer
- Failed / Needs Review
- Templates

Rule builder:
`WHEN` trigger
`IF` vehicle/tune conditions
`THEN` one or more actions

Initial templates:
- MHD — Request stock file
- MHD — Send logging parameter pack
- BM3 — Send platform intake checklist
- EcuTek — Send ECU Connect prep steps
- Missing intake — remind after X hours/days
- Log received — move to Datalog Review
- Revision delivered — request next log / customer feedback
