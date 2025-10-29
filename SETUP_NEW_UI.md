# New Dark-Mode UI Setup

Your document paraphraser now has a sleek, modern dark-mode UI built with Next.js, shadcn/ui, and an animated Three.js background!

## 🎨 What Changed

- ✨ **Modern Dark-Mode UI**: Professional, sleek interface with animated DottedSurface background
- 🎯 **Better UX**: Drag-and-drop file upload, real-time progress tracking, smooth animations
- 🚀 **Next.js Frontend**: Separate frontend in `client/` directory with shadcn/ui components
- 📱 **Responsive Design**: Works beautifully on all screen sizes
- 🎨 **Professional Look**: No more "AI-generated" feeling—clean, modern design

## 🚀 Running the Application

### 1. Start the Backend (Terminal 1)

```bash
# From project root
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Start the Frontend (Terminal 2)

```bash
# From project root
cd client
npm run dev
```

Frontend runs on `http://localhost:3001`

### 3. Open Your Browser

Navigate to: **http://localhost:3001**

## 📁 Project Structure

```
doc-paraphraser-service/
├── client/                      # Next.js frontend
│   ├── app/
│   │   ├── page.tsx            # Main paraphraser UI
│   │   ├── layout.tsx          # Theme provider wrapper
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/
│   │   │   └── dotted-surface.tsx   # Animated background
│   │   └── theme-provider.tsx       # Theme context
│   └── lib/
│       └── utils.ts            # Utility functions
├── src/                        # Express backend (unchanged)
├── public/                     # Old HTML UI (kept for reference)
└── uploads/                    # Document storage
```

## 🎯 Features

### Upload
- Drag-and-drop or click to browse
- Supports PDF, DOCX, TXT files
- Visual feedback during upload
- File size display

### Configuration
- Tone selection (Neutral, Formal, Casual)
- Formality level (High, Medium, Low)
- Creativity control (Conservative, Moderate, Creative)
- AI model selection with multiple options

### Progress Tracking
- Real-time percentage display
- Smooth progress bar animation
- Status updates during processing

### Download
- Clear success message
- One-click download button
- Visual completion feedback

## 🔧 Customization

### Change Colors
Edit `client/app/globals.css` to modify the color scheme:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... more variables */
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... more variables */
  }
}
```

### Adjust Animation
Modify the DottedSurface component parameters in `client/components/ui/dotted-surface.tsx`:

```typescript
const SEPARATION = 150;  // Distance between particles
const AMOUNTX = 40;      // Particles on X axis
const AMOUNTY = 60;      // Particles on Y axis
```

### API Endpoint
If your backend runs on a different port, update the fetch URLs in `client/app/page.tsx`:

```typescript
// Change from:
fetch('http://localhost:3000/api/upload')

// To your port:
fetch('http://localhost:YOUR_PORT/api/upload')
```

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd client
rm -rf node_modules
npm install
npm run dev
```

### Backend CORS errors
The backend already has CORS enabled. If you still see errors, make sure:
1. Backend is running on port 3000
2. Frontend is making requests to `http://localhost:3000`

### Three.js errors
If you see WebGL errors, your browser may not support WebGL. Try:
1. Updating your browser
2. Enabling hardware acceleration
3. Using a different browser (Chrome/Firefox recommended)

## 📦 Production Deployment

### Build Frontend
```bash
cd client
npm run build
```

### Serve Frontend
```bash
cd client
npm start
```

Or integrate the frontend build into your Express backend by serving the `client/.next` directory.

## 🎉 Next Steps

1. Start both backend and frontend
2. Open http://localhost:3001
3. Upload a test document
4. Enjoy the new sleek UI!

The old HTML UI is still available at `http://localhost:3000` if you need it.
