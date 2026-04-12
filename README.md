# GramInfo

GramInfo is an Expo + React Native application for panchayat-level household record management. It combines authenticated access, household profiling, member and scheme tracking, QR-based lookup, and CSV/PDF reporting in a single mobile-first admin app backed by Convex.

## What It Does

- Sign up and sign in officials using Convex Auth with email/password.
- Create and manage household records with generated `GH-...` house codes.
- Track family members, government schemes, and key identity/contact fields.
- Scan or search QR/house codes to quickly open a household profile.
- Export records as CSV or PDF and import bulk data from CSV.
- Keep QR links protected so full household data is visible only to authenticated users inside the app.

## Tech Stack

- Expo 54
- React Native 0.81
- React 19
- Convex backend and database
- `@convex-dev/auth` for authentication
- `expo-camera` for QR scanning
- `papaparse` for CSV import/export
- `expo-print` and `expo-sharing` for report generation

## Project Structure

```text
.
|-- App.js
|-- index.js
|-- src/
|   |-- screens/
|   |   |-- AuthScreen.js
|   |   `-- MainAppScreen.js
|   `-- secureStore.js
|-- convex/
|   |-- auth.js
|   |-- auth.config.js
|   |-- households.js
|   |-- http.js
|   |-- profiles.js
|   |-- public.js
|   `-- schema.js
|-- samples/
|   |-- households_sample.csv
|   |-- households_sample_govt.csv
|   `-- households_sample_govt_v2.csv
`-- assets/
```

## Main Features

### Authentication

- Officials can sign up with email, password, full name, phone, designation, panchayat name, and village name.
- Auth state is handled by Convex Auth.
- On native devices, auth tokens are stored securely with Expo Secure Store.

### Household Management

- Create, update, and delete household records.
- Store head of household, address, phone, Aadhaar, ration card, voter ID, and secondary mobile.
- Each household receives a unique house code such as `GH-24000123-123`.

### Members and Schemes

- Add, edit, and remove family members.
- Capture age, DOB, gender, Aadhaar, mobile number, marital status, disability status, and occupation.
- Add, edit, and remove government scheme entries with status, benefit amount, and remarks.
- Mark the current head as deceased and promote the eldest eligible member.

### QR Workflows

- Generate a QR code for a selected household.
- Scan QR codes using the device camera.
- Match QR payloads or house codes back to household records.
- Public QR access is intentionally blocked and returns a protected access page.

### Reports

- Import household data from CSV.
- Export data to CSV.
- Export administrative summaries to PDF.
- Sample CSV files are included in [`samples/`](./samples).

## Environment Variables

Create a `.env.local` file in the project root.

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=https://your-deployment.convex.site
```

### Variable Notes

- `EXPO_PUBLIC_CONVEX_URL`: used by the Expo app in [`index.js`](./index.js) to connect the client.
- `CONVEX_SITE_URL`: used by [`convex/auth.config.js`](./convex/auth.config.js) for Convex Auth.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Convex

```bash
npm run convex:dev
```

This will start the Convex dev environment and help provision a deployment if needed.

### 3. Set up auth

If this is the first time you are wiring up Convex Auth for the deployment:

```bash
npm run auth:setup
```

### 4. Start the Expo app

```bash
npm start
```

You can also run:

```bash
npm run android
npm run ios
npm run web
```

## Available Scripts

- `npm start` - start the Expo development server
- `npm run android` - launch Expo for Android
- `npm run ios` - launch Expo for iOS
- `npm run web` - launch Expo for web
- `npm run convex:dev` - run Convex locally against your dev deployment
- `npm run convex:codegen` - regenerate Convex generated files
- `npm run auth:setup` - initialize Convex Auth helpers

## CSV Import Format

The app expects CSV rows that map into household records plus embedded JSON for members and schemes. The included sample files show the expected shape.

Sample columns:

- `house_code`
- `address`
- `head_name`
- `phone`
- `aadhaar_number`
- `secondary_mobile`
- `ration_card_number`
- `voter_id_number`
- `language_preference`
- `members_json`
- `schemes_json`

Example sample file:

- [`samples/households_sample.csv`](./samples/households_sample.csv)

## Data Model

Convex schema includes these main tables:

- `households`
- `members`
- `schemes`
- `profiles`
- auth tables managed by `@convex-dev/auth`

See [`convex/schema.js`](./convex/schema.js) for the full schema.

## Security Notes

- Household data is protected behind authenticated app access.
- Public QR routes do not expose private household details.
- Native auth tokens use secure device storage.

## Future Improvements

- Role-based access control for different official types
- Better validation for ID formats and phone numbers
- Offline sync support for field usage
- Dedicated test coverage for CSV import/export and QR flows

## License

This project currently has no license file. Add one if you plan to distribute it publicly.
