# Osudh24.in website prototype

React + TypeScript + Vite + Tailwind CSS v4. Responsive frontend inspired by the supplied app splash screen: white surfaces, royal blue gradients, green accents, rounded controls and a clean geometric variable font. The supplied logo is cropped to remove its empty white margins, with its artwork preserved.

## Run

Use Node.js 20.19+ or 22.12+ and npm:

```sh
npm install
npm run dev
npm run build
```

This workspace was installed with pnpm; `pnpm install`, `pnpm dev` and `pnpm build` also work. `pnpm-lock.yaml` records the installed versions.

## Project paths and shadcn

- Components: `src/components/`
- Shared UI: `src/components/ui/` (the `@/components/ui` import path)
- Global styles / Tailwind entry: `src/index.css`
- Class helper: `src/lib/utils.ts`
- Static assets: `public/`

The `/components/ui` convention lives under `src` because this project uses a `src` source root. Keeping reusable components there makes the supplied imports work and gives the shadcn CLI a consistent destination. `components.json`, TypeScript and Vite aliases are configured. Tailwind v4 uses the Vite plugin, without a legacy tailwind.config.js. To add shadcn components: `npx shadcn@latest add button`.

## BreathingText

`src/components/ui/breathing-text.tsx` integrates the supplied component with TypeScript type-only imports. `src/components/ui/demo.tsx` includes its supplied preview. The live component animates the variable-font phrase “Every single day.” in the app section and the footer signature. Manrope and DM Sans are variable Google Fonts. No context provider or external state library is needed. Props control text, font variation, stagger direction and timing; React state manages the preview shopping interactions.

## Behavior

- Three-second opening logo animation, followed by hero entrance animations.
- Sections reveal as they enter the viewport.
- Reduced-motion preferences skip the intro and breathing animation and shorten entrance transitions.
- Search, category filters, quantity changes and sample cart totals work locally.
- PIN entry validates six digits; it does not validate actual delivery coverage.
- Prescription selection validates JPG, PNG or PDF and a 10 MB limit; files remain on the device and are not uploaded.
- FAQs, responsive navigation, informational dialogs and email links work.
- Email signup demonstrates form validation only; it does not save or submit addresses.

## Before launch

This is a design prototype. Products, prices, packaging and availability are illustrative. Authentication, product inventory, pharmacist review, secure prescription storage, real shipping coverage, checkout, payments and email signup require backend integration. The domain Osudh24.in is presented as the intended brand/domain; domain registration, DNS and public deployment have not been configured.

The hero image is served from Unsplash; Google Fonts are externally hosted. Replace sample product packaging with approved real catalog assets before launch. The contact email is a proposed brand address and has not been verified.

## Research

Reviewed official sites on 23 October 2026:
- https://www.1mg.com/ — medicine search, health services, prescription ordering and product collections.
- https://pharmeasy.in/ — delivery location, medicine and healthcare navigation, wellness categories and cart.
- https://www.apollopharmacy.in/ — prescription ordering, everyday needs and condition-based navigation.
- https://www.medplusmart.com/ — attempted access; the site returned HTTP 403, so its layout was not inspected.

These patterns informed information architecture; competitor branding and content were not copied.

## Validation

TypeScript compilation and Vite production build pass. Browser smoke check confirmed page rendering, navigation to essentials and a sample cart with one item and a ₹299 subtotal. Vite emits harmless ignored `use client` directives from Framer Motion during its static SPA build.

## Local cart and profile flows

Cart, profile and demo orders now persist in versioned browser-local storage. Cart quantities are capped at 99, individual lines can be removed, and checkout validates contact and delivery fields. `WELCOME10` applies a 10% demo discount; demo delivery is ₹49 below ₹499 after discounts and free above that threshold. Checkout creates a local demo order and clears the cart, without payment or fulfilment. Profile supports editing saved details, inspecting order history, cancelling demo orders and deleting local profile/history. No authenticated account is created. The privacy dialog describes these storage changes. Doctor consultations replace Lab tests in navigation and display a coming-soon panel; duplicate medicine navigation has been consolidated.

## Local doctor consultations

Consult doctors now opens a fictional directory with General physician, Dermatology, Pediatrics and Cardiology filters. Each sample profile includes illustrative credentials, experience, languages, care focus and a demo fee. Booking offers four IST time slots per day for the next seven days, requires a patient name and demo acknowledgment, and saves an appointment in `osudh24.appointments.v1`. Active bookings disable the matching doctor/date/time slot; cancelling from Profile releases it. Appointment history survives refresh and is included when deleting local profile/history. No real provider, payment, video session or reminder is connected.
