# Unified Project Structure

```
personal-running-tracker/
├── .expo/                         # Expo configuration
├── .git/                          # Git repository
├── assets/                        # App icons, splash screens
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── src/                           # Source code
│   ├── components/                # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── PermissionPrompt.tsx
│   │   ├── tracking/
│   │   │   ├── ActiveRunDisplay.tsx
│   │   │   ├── RunControls.tsx
│   │   │   └── MetricsDisplay.tsx
│   │   ├── history/
│   │   │   ├── RunList.tsx
│   │   │   ├── RunListItem.tsx
│   │   │   └── PersonalRecordsCard.tsx
│   │   └── maps/
│   │       ├── RouteMap.tsx
│   │       └── RunSummaryMap.tsx
│   ├── screens/                   # Screen components
│   │   ├── TrackingScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── RunDetailScreen.tsx
│   │   └── EditRunScreen.tsx
│   ├── services/                  # Business logic services
│   │   ├── gpsService.ts
│   │   ├── databaseService.ts
│   │   ├── personalRecordsService.ts
│   │   └── runCalculations.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useGPS.ts
│   │   ├── useDatabase.ts
│   │   ├── useRunTracking.ts
│   │   └── usePersonalRecords.ts
│   ├── context/                   # React Context providers
│   │   ├── AppContext.tsx
│   │   └── RunTrackingContext.tsx
│   ├── types/                     # TypeScript type definitions
│   │   ├── Run.ts
│   │   ├── GPSPoint.ts
│   │   ├── PersonalRecord.ts
│   │   └── AppState.ts
│   ├── utils/                     # Utility functions
│   │   ├── formatters.ts
│   │   ├── calculations.ts
│   │   ├── permissions.ts
│   │   └── constants.ts
│   └── styles/                    # Shared styles and themes
│       ├── colors.ts
│       ├── typography.ts
│       └── globalStyles.ts
├── __tests__/                     # Test files
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── __mocks__/
├── docs/                          # Project documentation
│   ├── brief.md
│   ├── prd.md
│   └── architecture.md
├── app.json                       # Expo app configuration
├── App.tsx                        # Root app component
├── babel.config.js                # Babel configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```
