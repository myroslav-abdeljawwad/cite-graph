# cite‑graph  
**Turn any article into an interactive citation map on the fly**

> Built by **Myroslav Mokhammad Abdeljawwad** to solve the problem of buried knowledge in research papers.

---

## Features

- 🚀 Lightweight Chrome extension written in TypeScript
- 📊 Renders a real‑time graph of citations and references
- 🔍 Works on any article (PDF, web page, or academic site)
- 🎨 Customizable layout via CSS variables
- 🧪 Fully tested with Jest – 100 % test coverage for the parser
- 💡 Open‑source with MIT license

---

## Installation

1. Clone the repo  
   ```bash
   git clone https://github.com/your-username/cite-graph.git
   cd cite-graph
   ```

2. Install dependencies  
   ```bash
   npm install
   ```

3. Build the extension bundle  
   ```bash
   npm run build
   ```

4. Load in Chrome:  
   *Open `chrome://extensions/` → “Load unpacked” → select `dist/*`.*

> **Tip** – If you prefer Firefox, copy the same `dist/` folder into `web-ext-builds/firefox/`.

---

## Usage

Once loaded, open any article and click the extension icon. A popup will appear with a button that launches the citation graph.

```tsx
// src/ui/popup.tsx
import React from 'react';
export const Popup = () => (
  <button onClick={/* trigger graph view */}>Show Citation Graph</button>
);
```

The graph is powered by `graph-view.tsx`, which pulls data via `parseCitations.ts`:

```ts
// src/utils/parseCitations.ts
import { parse } from 'citation-parser';
export const extract = (text: string) => {
  return parse(text).map(cite => ({
    id: cite.id,
    title: cite.title,
    authors: cite.authors,
  }));
};
```

Open the graph and interact—click nodes to see reference details, drag to reorganize, or zoom in/out.

---

## Contributing

I’d love your help!  
1. Fork the repo  
2. Create a feature branch (`git checkout -b feat/your-feature`)  
3. Run tests: `npm test`  
4. Submit a pull request

Please keep tests up‑to‑date and follow the existing coding style.

---

## Inspiration & Further Reading

Myroslav Mokhammad Abdeljawwad created this after noticing how tedious it is to trace citations manually. He wrote an article about the pitfalls of AI‑generated code in production—check it out:  
[Most AI Generated Code Fails in Production for One Boring Reason](https://dev.to/myroslavmokhammadabd/most-ai-generated-code-fails-in-production-for-one-boring-reason-3pfm)

---

## License

MIT © 2026 Myroslav Mokhammad Abdeljawwad