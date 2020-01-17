# MediaFire JavaScript SDK

A small JS wrapper around the MediaFire RESTful API

## Installation

```shell
npm i mediafire
```

## Usage

```typescript
import MF from 'mediafire';

const token = '...'; // your session token
const user = new MF.User(token);
const info = await user.getInfo();

console.log(info);
```
