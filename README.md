<p align="center">
  <img src="https://img.shields.io/badge/Electron-28.1.0-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="Community License">
  <img src="https://img.shields.io/badge/Pro-Commercial-orange.svg" alt="Pro License">
</p>

<h1 align="center">9000 Code</h1>

<p align="center">
  <strong>The Ultimate Desktop Companion for Claude Code CLI</strong>
</p>

<p align="center">
  Session management, split terminals, remote access — take your Claude Code development experience to the next level
</p>

---

## Why 9000 Code?

Claude Code CLI is powerful, but the terminal alone has its limits. **9000 Code** combines GUI convenience with CLI power to maximize your development productivity.

<table>
<tr>
<td width="50%">

### The Old Way
- Digging through files to find session history
- Constantly switching between multiple terminal tabs
- Remembering file paths for skills and agents
- Repeatedly typing frequently used commands
- Difficult remote pair programming

</td>
<td width="50%">

### With 9000 Code
- Browse all sessions at a glance
- Work simultaneously with split views
- Run skills/agents with one click
- Execute quick commands instantly
- Share terminal via browser

</td>
</tr>
</table>

---

## Key Features

### Smart Split Terminal

<table>
<tr>
<td align="center"><strong>Single</strong><br>┌─────┐<br>│     │<br>│     │<br>└─────┘</td>
<td align="center"><strong>Horizontal 2</strong><br>┌──┬──┐<br>│  │  │<br>│  │  │<br>└──┴──┘</td>
<td align="center"><strong>Vertical 2</strong><br>┌─────┐<br>│     │<br>├─────┤<br>│     │<br>└─────┘</td>
<td align="center"><strong>2x2 Grid</strong><br>┌──┬──┐<br>│  │  │<br>├──┼──┤<br>│  │  │<br>└──┴──┘</td>
</tr>
</table>

- **7 Layouts**: Configure your screen to match your workflow
- **Drag Resize**: Adjust panel ratios by dragging borders
- **Independent Terminals**: Assign different terminal tabs to each panel
- **Persistent Settings**: Layout is automatically saved for next session

---

### Session Browser

```
┌─────────────────────────────────────┐
│ Sessions by Project                 │
│ ├─ my-react-app                     │
│ │  ├─ Bug fix session (active)      │
│ │  ├─ Feature implementation        │
│ │  └─ Refactoring session           │
│ └─ backend-api                      │
│    └─ API design session            │
└─────────────────────────────────────┘
```

- Auto-collects all sessions from `~/.claude/projects/`
- **Real-time Updates**: New sessions appear automatically
- **Bookmarks**: Star important sessions
- **Message Preview**: Quick peek at session content
- **Resume Sessions**: One-click `claude --resume`

---

### Skills & Agents Management

<table>
<tr>
<td width="50%">

#### Skills Browser
- Display skills from `~/.claude/skills/`
- Categorized by type (Development, Git, Design...)
- Favorite frequently used skills
- Preview and edit skill content

</td>
<td width="50%">

#### Agent Manager
- Global agents (`~/.claude/agents/`)
- Project-specific agents (`.claude/agents/`)
- Direct editing of agent config files
- Create new agents

</td>
</tr>
</table>

---

### Quick Commands & Launch Commands

```
┌─────────────────────────────────────────────────────┐
│ Quick: [/usage] [/help] [/clear] [/compact] [+]     │
├─────────────────────────────────────────────────────┤
│ Launch: [claude] [--resume] [--chrome] [--skip]     │
└─────────────────────────────────────────────────────┘
```

- **Quick Commands**: Save frequently used commands as buttons
- **Launch Commands**: One-click Claude CLI start options
- **Customizable**: Add, edit, or remove freely

---

### Remote Terminal Sharing

```
┌──────────────────────────────────────┐
│ Remote Access                        │
│                                      │
│ Status: ● Online                     │
│ URL: http://192.168.1.100:3001       │
│ Connected: 1/2 clients               │
│                                      │
│ [Regenerate Token] [Stop Server]     │
└──────────────────────────────────────┘
```

- **WebSocket-based**: Real-time bidirectional terminal sharing
- **Token Auth**: Secure access control with tokens
- **Concurrent Access**: Up to 2 simultaneous connections
- **Pair Programming**: Share terminal screen with colleagues

---

### File Browser

- Browse project file system
- File preview (code, text, images)
- Drag & drop to insert paths into terminal
- Windows drive list support

---

### Notes & Memos

- **Todo List**: Manage task checklists
- **Memos**: Free-form note taking
- **Auto-save**: Persists across app restarts

---

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/9000labs/9000-code.git
cd 9000-code

# Install dependencies
npm install

# Rebuild native modules (required!)
npx electron-rebuild
```

### Running

```bash
# Development mode (Hot Reload)
npm run dev:electron

# Production build
npm run build:electron
```

### System Requirements

| Item | Requirement |
|------|-------------|
| OS | Windows 10+, macOS 10.15+, Linux |
| Node.js | 18.x or higher |
| Claude Code CLI | Must be installed and in PATH |

---

## Tech Stack

<table>
<tr>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/electron/electron-original.svg" width="40"><br><strong>Electron</strong></td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40"><br><strong>React</strong></td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="40"><br><strong>TypeScript</strong></td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="40"><br><strong>Tailwind</strong></td>
</tr>
</table>

- **Frontend**: React 18 + Zustand + Tailwind CSS
- **Terminal**: xterm.js + @lydell/node-pty
- **Backend**: Express + Socket.io (remote access)
- **Build**: Vite + electron-builder

---

## Contributing

Bug reports, feature suggestions, and PRs are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

---

## License

9000 Code is available under a **dual license**:

### Community Edition — AGPL v3

Free for personal use and open-source projects.

| Features | Limits |
|----------|--------|
| Split Terminal | Up to 4 |
| Session Browser | Basic features |
| Skills/Agents | - |
| Quick Commands | Up to 5 |
| Remote Access | 1 concurrent |
| File Browser | - |

### Pro / Enterprise Edition — Commercial

Commercial license required for enterprise use, SaaS services, or proprietary integrations.

| Additional Features |
|---------------------|
| Unlimited split terminals |
| Session search / filter / tags |
| Skill marketplace |
| Unlimited commands + cloud sync |
| Team collaboration (unlimited + recording) |
| Git integration + history |
| Custom themes + branding |
| SSO / LDAP integration |
| Audit logs |
| Priority support |

### License Selection Guide

| Use Case | Required License |
|----------|------------------|
| Personal learning/use | AGPL v3 (Free) |
| Open-source project | AGPL v3 (Free) |
| Enterprise internal use | Commercial |
| SaaS / Cloud service | Commercial |
| Proprietary integration | Commercial |

Contact for commercial license: 9000labs@gmail.com

---

<p align="center">
  <strong>If this project helps you, please give it a Star!</strong>
</p>

<p align="center">
  Made with love for Claude Code users
  <br><br>
  <sub><strong>© 2026 9000labs</strong> | Community: AGPL v3 | Pro: Commercial</sub>
</p>
