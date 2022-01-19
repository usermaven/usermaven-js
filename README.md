# Usermaven JavaScript SDK (usermaven.js)

Usermaven.js is a JavaScript SDK for [Usermaven](https://usermaven.com).

## Capabilities

- Session Capability via `persistence` and `persistence_name` options.

## Maintainers Guide

This section is indented only for package maintainers.

### Building and local debug

 * _**ATTENTION**_: Use `yarn` for everything except publishing
 * To spin off a local development server run `yarn devserver`, then open [http://localhost:8081](http://localhost:8081)
   * The server listens to all changes to src and rebuilds npm and `lib.js` automatically. Open test cases HTML files to see
     usermaven in action
     * http://localhost:8081/test-case/embed.html - embedded Usermaven
     * http://localhost:8081/test-case/embed-no-init.html - Usermaven without automatic initialization
     * http://localhost:8081/test-case/segment-intercept.html - test segment interception
 * `yarn test` runs [Playwright](https://playwright.dev/) test
 * `yarn build` builds both npm package and `lib.js` browser bundle
 * `npm publish --public` to publish the package (change version in `package.json` manually). You need to run `npm login` with your personal
npmjs account beforehand (make sure you have access to Usermaven team)

### Publishing new version

 * Login with your *personal* credentials with `npm login`
 * Run `yarn install && yarn build && yarn test && npm publish --access public`
