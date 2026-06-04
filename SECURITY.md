# Security Policy

Fridge Radar stores user inventory data through WeChat Cloud Development / CloudBase. Security reports are welcome, especially for issues that could expose user data, cloud function secrets, or provider API keys.

## Supported Version

The repository is currently in MVP development. Security fixes should target the `main` branch unless the maintainer creates release branches later.

## What To Report

Please report:

- exposed API keys, tokens, or service credentials
- CloudBase permission issues
- unauthorized access to another user's inventory records
- cloud function input validation problems
- unsafe logging of user images, OCR text, or food records
- dependency vulnerabilities that affect the active mini program or cloud functions

## What Not To Report

Please do not report:

- test data created in your own fork
- issues caused by reusing the maintainer's CloudBase environment instead of your own
- unsupported use of old React/Vite H5 files as the main product

## Reporting Process

If GitHub private vulnerability reporting is available for this repository, please use it.

If not, contact the maintainer through GitHub and avoid posting sensitive details in a public issue. A short public issue that says "I found a possible security issue and would like a private contact path" is enough.

Please include:

- affected file or cloud function
- impact
- reproduction steps
- whether the issue affects the current mini program path
- any safe suggested fix

## Maintainer Notes

Before publishing public demos or screenshots, check that they do not expose:

- API keys
- CloudBase secrets
- real user food records
- private OpenID values
- provider request or response payloads containing sensitive data
