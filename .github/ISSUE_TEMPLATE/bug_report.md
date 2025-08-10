---
name: Bug Report
about: Create a report to help us improve BukaJS
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Environment

- **BukaJS Version:** (e.g., 1.0.0)
- **Browser:** (e.g., Chrome 118, Firefox 119, Safari 16)
- **Operating System:** (e.g., Windows 11, macOS 13, Ubuntu 22.04)
- **Framework:** (e.g., React 18, Vue 3, Vanilla JS)
- **Build Type:** (e.g., ESM, UMD, Development, Production)

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Load document '...'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Code Sample

Please provide a minimal code sample that reproduces the issue:

```javascript
import { BukaViewer } from '@tumbati/bukajs';

const viewer = new BukaViewer('#container');
// Add relevant code that reproduces the bug
```

## Document Sample

If the issue is related to a specific document:

- [ ] The issue occurs with all documents of this type
- [ ] The issue occurs only with specific documents
- [ ] Document type: (PDF, DOCX, Image, etc.)
- [ ] Document size: (if relevant)
- [ ] Can you share the document? (Yes/No - if yes, please attach)

## Console Errors

Please include any console errors or warnings:

```
Paste console output here
```

## Screenshots

If applicable, add screenshots to help explain your problem.

## Network Information

If the issue involves loading documents from URLs:

- [ ] Document loads from local file system
- [ ] Document loads from HTTP/HTTPS URL
- [ ] Document loads from data URL
- [ ] CORS issues present

## Workaround

If you found a temporary workaround, please describe it:

## Additional Context

Add any other context about the problem here:

- Does this happen consistently or intermittently?
- Did this work in a previous version?
- Are there any specific conditions that trigger the bug?
- Any related issues or PRs?

## Checklist

- [ ] I have searched for existing issues that might be related to this bug
- [ ] I have provided all the requested information
- [ ] I have tested this with the latest version of BukaJS
- [ ] I have included a minimal code sample that reproduces the issue