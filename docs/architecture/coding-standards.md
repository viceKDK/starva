# Coding Standards

## Critical Fullstack Rules

- **Type Safety:** Always define TypeScript interfaces for data models and service methods
- **GPS Accuracy:** Use Location.Accuracy.BestForNavigation for tracking, High for single points
- **Database Transactions:** Wrap multi-step database operations in transactions for data integrity
- **Error Handling:** All GPS and database operations must include proper try/catch error handling
- **Permission Checks:** Always verify location permissions before attempting GPS operations
- **Data Validation:** Validate GPS coordinates and run data before saving to database
- **Memory Management:** Remove location subscriptions and clean up resources on component unmount
- **State Immutability:** Never mutate GPS tracking state directly - use proper state setters

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `RunTrackingScreen.tsx` |
| Hooks | camelCase with 'use' | - | `useGPSTracking.ts` |
| Services | camelCase | - | `gpsService.ts` |
| Database Tables | - | snake_case | `personal_records` |
| Database Columns | - | snake_case | `start_time` |
| TypeScript Interfaces | PascalCase | - | `interface GPSPoint` |
