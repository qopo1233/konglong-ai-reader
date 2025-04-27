[English](README.md) | [中文说明](README.zh.md)

# Konglong WeChat Official Account Reader

A cross-platform Electron application for reading, searching, and managing WeChat Official Account articles, with AI-powered summarization and advanced configuration options.

## Features

- **WeChat QR Login**: Secure login via QR code.
- **Account Search & Management**: Search and favorite public accounts.
- **Article List & Favorites**: Browse, search, and favorite articles.
- **AI Reading & Summarization**: Summarize articles using OpenAI models with customizable settings.
- **PDF Export**: Export articles as PDF.
- **Image Proxy**: Built-in proxy server for WeChat images.
- **Persistent Settings**: All configuration stored locally in SQLite.
- **Modern UI**: Built with Vue 3 and Element Plus.
- **Cross-platform**: Windows, macOS, Linux.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Git](https://git-scm.com/)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)

### Installation

```bash
git clone https://github.com/yourusername/konglong-reader.git
cd konglong-reader
npm install
```

### Development

```bash
npm run start
```

### Build

```bash
npm run dist
```

For Windows/macOS specific builds:

```bash
npm run dist:win
# or
npm run dist:win:x64
# or
npm run dist:win:ia32
```

## Usage

1. **Login**: Scan QR code with WeChat.
2. **Search Accounts**: Use the search bar.
3. **Browse Articles**: Click an account to view articles.
4. **AI Reading**: Click "AI Reading" for OpenAI summary.
5. **Favorites**: Favorite articles/accounts.
6. **Settings**: Configure OpenAI API in Settings → Model Configuration.

## Configuration

- All user settings and favorites are stored in local SQLite (`fav.db`).
- OpenAI API settings can be configured in-app.

## Project Structure

```
.
├── electron/                # Electron main process & backend
│   ├── main.js              # App entry, IPC, DB, proxy, etc.
│   ├── renderer/            # Frontend (Vue 3 + Element Plus)
│   │   ├── src/
│   │   │   ├── components/  # Vue components
│   │   │   └── App.vue
│   │   └── index.html
│   └── static/              # Static assets
├── wechat_spider_allpages.js # WeChat scraping & AI summary
├── login.js                 # WeChat login logic
├── package.json
└── README.md
```

## Dependencies

- [Electron](https://www.electronjs.org/)
- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Puppeteer](https://pptr.dev/)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Axios](https://axios-http.com/)

## License

MIT License  
Copyright (c) 2025 qopo

## Contributing

Pull requests are welcome! For major changes, please open an issue first.


## Acknowledgements

- Thanks to all contributors and the open source community.