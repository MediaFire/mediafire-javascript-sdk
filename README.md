# MediaFire JavaScript SDK

A JS wrapper around the MediaFire RESTful API

## Installation

```shell
npm i mediafire
```

## Usage

```typescript
// Import the lib
import MediaFire from 'mediafire';

// Create a new session
const mf = new MediaFire();

// Authenticate future requests
await mf.authenticate('<token>');

// Retrieve user info from the API
const info = await mf.user.getInfo();

// Log the JSON results to the console
console.log('your user info:', info);
```
