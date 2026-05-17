# 🎨 AI Background Remover

A production-ready, full-stack web application for removing image backgrounds using AI. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## ✨ Features

- **Single Image Processing** - Upload and remove backgrounds with AI precision
- **Bulk Processing** - Process up to 20 images simultaneously
- **Background Editor** - Replace with colors, gradients, images, or blur effects
- **Before/After Comparison** - Interactive slider to compare results
- **Download Options** - PNG (transparent) or JPG (with background)
- **Bulk ZIP Download** - Download all processed images as a ZIP file
- **User Authentication** - Email/password and OAuth (Google, GitHub)
- **User Dashboard** - Track usage, credits, and history
- **Admin Panel** - System-wide statistics and management
- **Subscription Plans** - Free and premium tier with Stripe
- **Dark/Light Mode** - Theme support with system preference detection
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + ShadCN UI |
| **Animation** | Framer Motion |
| **Database** | PostgreSQL (via Supabase) |
| **ORM** | Prisma |
| **Auth** | NextAuth.js |
| **Storage** | Local filesystem / Supabase Storage |
| **AI** | Sharp-based background removal + API fallbacks |
| **Payments** | Stripe |
| **Forms** | React Dropzone + Zod |
| **Deployment** | Vercel (frontend), Railway/Render (backend) |

## 📁 Project Structure

```
background-remover/
├── prisma/              # Database schema
├── public/              # Static assets
├── scripts/             # Utility scripts
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (auth)/      # Login & register pages
│   │   ├── admin/       # Admin dashboard
│   │   ├── api/         # API routes
│   │   ├── bulk/        # Bulk processing page
│   │   ├── dashboard/   # User dashboard
│   │   ├── editor/      # Single image editor
│   │   └── pricing/     # Pricing page
│   ├── components/
│   │   ├── features/    # Feature-specific components
│   │   ├── layout/      # Layout components
│   │   ├── sections/    # Landing page sections
│   │   └── ui/          # ShadCN UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and services
│   ├── providers/       # React providers
│   └── types/           # TypeScript types
├── supabase/            # Database schema SQL
├── uploads/             # Local file storage
└── docker-compose.yml   # Docker setup
```

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- npm or yarn

### Setup

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd background-remover
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in your `.env.local`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Supabase (for auth & storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Auth providers (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Stripe (optional - for subscriptions)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

4. Set up the database:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

After seeding:
- **Admin**: admin@bgremover.com / Admin123!
- **Demo**: demo@bgremover.com / Demo1234!

## 🧪 AI Background Removal

The app uses Sharp-based edge detection for local background removal. For better results, configure one of the following API providers:

### Option 1: Replicate API (Recommended)

```env
REPLICATE_API_TOKEN=your-token
```

Uses the `rembg` model on Replicate for high-quality AI segmentation.

### Option 2: Remove.bg API

```env
REMOVE_BG_API_KEY=your-key
```

Uses the remove.bg API for professional-grade background removal.

### Option 3: Local Processing (Default)

Uses Sharp to detect and remove backgrounds based on edge color analysis. Works well for images with uniform backgrounds.

## 🚢 Deployment

### Deploy to Vercel (Frontend)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables
4. Deploy!

```bash
npm i -g vercel
vercel --prod
```

### Deploy to Railway/Render (Backend)

For the database and API processing:

1. Create a PostgreSQL database on Supabase
2. Deploy the backend on Railway or Render
3. Set all environment variables
4. Run migrations: `npx prisma db push`

### Docker Deployment

```bash
# Build
docker compose build

# Run
docker compose up -d

# Stop
docker compose down
```

### Database (Supabase)

1. Create a Supabase project
2. Run SQL from `supabase/schema.sql` in the SQL Editor
3. Copy connection details to `.env`

## 📊 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/remove-bg` | POST | Remove background from image |
| `/api/download/bulk` | POST | Create ZIP of processed images |
| `/api/file/[...path]` | GET | Serve uploaded files |
| `/api/admin/stats` | GET | Admin statistics |

## 🔒 Environment Variables

See `.env.example` for a complete list of all environment variables.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Supabase](https://supabase.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Sharp](https://sharp.pixelplumbing.com/)
- [Framer Motion](https://www.framer.com/motion/)
