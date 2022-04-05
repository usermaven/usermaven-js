# Usermaven JavaScript SDK (usermaven.js)

Usermaven.js is a JavaScript SDK for [Usermaven](https://usermaven.com).

## Capabilities

- Session Capability via `persistence`, `persistence_name` and `persistence_time` options.
- Autocapturing via `autocapture`, `capture_pageview`, `properties_string_max_length` and `property_blacklist` options.
- Cross sub-domain compatibility added.

## Maintainers Guide

This section is indented only for package maintainers.

### Building and local debug

 * _**ATTENTION**_: Use `yarn` for everything except publishing
 * To spin off a local development server run `yarn devserver`, then open [http://localhost:8081](http://localhost:8081)
   * The server listens to all changes to src and rebuilds npm and `lib.js` automatically. Open test cases HTML files to see
     usermaven in action
     * http://localhost:8081/test-case/embed.html - embedded Usermaven
     * http://localhost:8081/test-case/autocapture.html - embedded Usermaven with autocapturing events
 * `yarn test` runs [Playwright](https://playwright.dev/) test
 * `yarn build` builds both npm package and `lib.js` browser bundle
 * `npm publish --public` to publish the package (change version in `package.json` manually). You need to run `npm login` with your personal
npmjs account beforehand (make sure you have access to Usermaven team)
 * In order to check usermaven sdk locally. 
    * `cd dist/npm` --- navigate to npm directory
    * `npm link` --- creates a symbolic link to be accessed globally
    * `cd ../../__tests__/sdk/` --- navigate to sdk test project
    * `npm i` --- install npm dependencies
    * `npm link @usermaven/sdk-js` --- use npm package locally whose symlink is just published
    * `npm start` --- start the application and monitor events

### Checking Cross Domain Session locally
Setup a custom domain and sub-domain locally to test cross domain session persistence.

```bash
sudo nano /etc/hosts
```
Add the following lines in the hosts file
```bash
127.0.0.1       localhost.com
127.0.0.1       app.localhost.com
```

You will be able to access the domains at [localhost domain](http://localhost.com:8081/test-case/embed.html) and [localhost sub-domain](http://app.localhost.com:8081/test-case/embed.html)

### Publishing new version

 * Login with your *personal* credentials with `npm login`
 * Run `yarn install && yarn build && yarn test && npm publish --access public`
