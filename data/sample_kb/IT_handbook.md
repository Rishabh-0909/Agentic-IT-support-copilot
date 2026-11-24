# NexaCore Systems — Internal IT Support Handbook

## VPN Access

Employees working outside the office must connect to the company VPN before accessing internal repositories, staging environments, or corporate systems. Install the **NexaGuard VPN** client from the internal **DevPortal**. Sign in with your company email (`@nexacore.io`) and password, complete MFA, and select the closest regional gateway (`US-West`, `EU-Central`, or `AP-South`). If the connection fails, first confirm internet connectivity, restart the VPN client, and try another corporate gateway. Do not disable endpoint security or firewall settings to make the VPN work. If the problem remains, open an IT ticket in **NexaDesk** with a screenshot of the error.

## Password Reset Policy

Company passwords must be at least **16 characters**. Employees should use the **NexaID Self-Service Portal** for normal password resets. After **four** failed login attempts, the account is temporarily locked for 30 minutes. If self-service recovery fails, contact the **IT Helpdesk**. Employees must never share passwords or MFA codes with support personnel.

## Multi-Factor Authentication

MFA is mandatory for email, VPN, cloud administration, and other protected company systems. The approved methods are the **NexaAuth** mobile app and registered **FIDO2 hardware security keys**. SMS should only be used when explicitly enabled as an emergency recovery method.

## Software Installation

Employees should install business and developer software only from the company **DevPortal**. Requests for software not listed in the portal require Engineering Manager approval and an InfoSec review. Local administrator access is not granted simply to install unapproved applications.

## Lost or Stolen Laptop

Immediately report a lost or stolen company laptop to the **IT Helpdesk** and your Engineering Manager. Provide the device asset tag (**NC-Asset ID**) if available and the last known location. IT will initiate remote device lock/wipe procedures and coordinate with Security Operations. Do not attempt to remotely recover or track the device yourself.