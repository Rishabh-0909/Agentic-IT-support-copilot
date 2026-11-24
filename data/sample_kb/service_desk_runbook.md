# NexaCore Systems — IT Helpdesk Operations Runbook

## Email Troubleshooting

If a user cannot send or receive corporate emails (`@nexacore.io`), first determine whether the issue is isolated to one employee or impacting multiple team members. Verify local internet connectivity and check the **NexaCore System Status Page**. For an isolated case, have the user sign out and re-authenticate, inspect their mailbox storage quota, and test sending via the **NexaMail Web Client**. If multiple users are affected, do not instruct staff to reinstall desktop mail clients; immediately escalate the incident to the **Messaging & Cloud Infrastructure** team.

## Laptop Performance

When troubleshooting a sluggish workstation, inspect CPU utilization, RAM consumption, available SSD storage, background startup processes, pending OS patches, and the active endpoint security scan status. **Never** pause or disable EDR/endpoint security agents as a temporary fix. Escalate the ticket to **Hardware & Endpoint Engineering** if built-in hardware diagnostics fail or if unexpected thermal/system shutdowns persist after software remediation.

## Ticket Priority

* **P1 (Critical):** Organization-wide service outage or active security breach.
* **P2 (High):** Core engineering or business team blocked with no viable workaround.
* **P3 (Medium):** Individual employee blocked or experiencing degraded service with a limited workaround.
* **P4 (Low):** Routine service request, general inquiry, or minor issue with minimal workflow impact.