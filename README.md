# InvestmentPlanner

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Deploying to Vercel

This repository includes `vercel.json` with the Angular build output path and SPA rewrites for routes such as `/dashboard`, `/yearly-plan`, and `/month/September`.

### Vercel dashboard

1. Import this repository into Vercel.
2. Keep the detected framework as Angular.
3. Use the default build command: `npm run build`.
4. Deploy.

### Vercel CLI

From the project directory:

```bash
npm install -g vercel
vercel
```

The configured output directory is `dist/investment-planner/browser`.

The planner currently stores entered data in browser `localStorage`. A backend is required to synchronize data between different browsers or devices.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
