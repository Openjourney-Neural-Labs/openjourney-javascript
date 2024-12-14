# Openjourney Node.js client

A Node.js client for [Openjourney API](https://my.opj.app/api).
It lets you run models from your Node.js code,
and everything else you can do with
[Openjourney's HTTP API](https://docs.opj.app/reference/rest-api).

> [!IMPORTANT]
> This library can't interact with Openjourney's API directly from a browser.

## Supported platforms

- [Node.js](https://nodejs.org) >= 18
- [Bun](https://bun.sh) >= 1.0
- [Deno](https://deno.com) >= 1.28

You can also use this client library on most serverless platforms, including
[Cloudflare Workers](https://developers.cloudflare.com/workers/),
[Vercel functions](https://vercel.com/docs/functions), and
[AWS Lambda](https://aws.amazon.com/lambda/).

## Installation

Install it from npm:

```bash
npm install openjourney
```

## Usage

Import or require the package:

```js
// CommonJS (default or using .cjs extension)
const Openjourney = require("openjourney");

// ESM (where `"module": true` in package.json or using .mjs extension)
import Openjourney from "openjourney";
```

Instantiate the client:

```js
const openjourney = new Openjourney({
  auth: "my api token", // defaults to process.env.OPENJOURNEY_API_TOKEN
});
```

Run a model and await the result:

```js
const ref = "sd/1/generative";
const input = {
  prompt: "a 19th century portrait of a raccoon gentleman wearing a suit",
};
const job = await openjourney.run(ref, input);

console.log(job.output); // 'https://delivery.opjcdn.net/user_id/job_id.png'
```

You can also run a model in the background:

```js
let job = await openjourney.request("sd/1/generative", {
  method: "POST",
  data: {
    prompt: "a 19th century portrait of a raccoon gentleman wearing a suit",
  }
});
```

Then fetch the job result later:

```js
job = await openjourney.request(`/job/${job.id}`);
```

## TypeScript

The `Openjourney` constructor and all `openjourney.*` methods are fully typed.

Currently in order to support the module format used by `openjourney` you'll need to set `esModuleInterop` to `true` in your tsconfig.json.

## API

### Constructor

```js
const openjourney = new Openjourney(options);
```

| name                           | type     | description                                                                                                                      |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `options.auth`                 | string   | **Required**. API access token                                                                                                   |
| `options.userAgent`            | string   | Identifier of your app. Defaults to `openjourney-javascript/${packageJSON.version}`                                                |
| `options.baseUrl`              | string   | Defaults to https://api.opj.app                                                                                         |
| `options.fetch`                | function | Fetch function to use. Defaults to `globalThis.fetch`                                                                            |


The client makes requests to Openjourney's API using
[fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch).
By default, the `globalThis.fetch` function is used,
which is available on [Node.js 18](https://nodejs.org/en/blog/announcements/v18-release-announce#fetch-experimental) and later,
as well as
[Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/fetch/),
[Vercel Functions](https://vercel.com/docs/functions),
and other environments.

On earlier versions of Node.js
and other environments where global fetch isn't available,
you can install a fetch function from an external package like
[cross-fetch](https://www.npmjs.com/package/cross-fetch)
and pass it to the `fetch` option in the constructor.

```js
const Openjourney = require("openjourney");
const fetch = require("fetch");

// Using ESM:
// import Openjourney from "openjourney";
// import fetch from "cross-fetch";

const openjourney = new Openjourney({ fetch });
```

You can also use the `fetch` option to add custom behavior to client requests,
such as injecting headers or adding log statements.

```js
const customFetch = (url, options) => {
  const headers = options && options.headers ? { ...options.headers } : {};
  headers["X-Custom-Header"] = "some value";

  console.log("fetch", { url, ...options, headers });

  return fetch(url, { ...options, headers });
};

const openjourney = new Openjourney({ fetch: customFetch });
```

### `openjourney.run`

Run a job and await the result.

```js
const job = await openjourney.run(ref, options);
```

| name                            | type     | description                                                                                                                                                                                                 |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ref`                    | string   | **Required**. The endpoint in the format `{variant}/{model}`, for example `sd/1`                       |
| `options`                 | object   | **Required**. An object with the model inputs.                                                                                                                                                              |

Throws `Error` if the prediction failed.

Returns `Promise<unknown>` which resolves with the output of running the model.

> [!NOTE]
> Currently the TypeScript return type of `openjourney.run()` is `Promise<object>` this is
> misleading as a model can return array types as well as primative types like strings,
> numbers and booleans.

### `openjourney.request`

Low-level method used by the Openjourney client to interact with API endpoints.

```js
const response = await openjourney.request(route, parameters);
```

| name                 | type   | description                                                  |
| -------------------- | ------ | ------------------------------------------------------------ |
| `options.route`      | string | Required. REST API endpoint path.                            |
| `options.parameters` | object | URL, query, and request body parameters for the given route. |

The `openjourney.request()` method is used by the other methods
to interact with the Openjourney API.
You can call this method directly to make other requests to the API.

## Troubleshooting

### Predictions hanging in Next.js

Next.js App Router adds some extensions to `fetch` to make it cache responses. To disable this behavior, set the `cache` option to `"no-store"` on the Openjourney client's fetch object:

```js
openjourney = new Openjourney({/*...*/})
openjourney.fetch = (url, options) => {
  return fetch(url, { ...options, cache: "no-store" });
};
```

Alternatively you can use Next.js [`noStore`](https://github.com/replicate/replicate-javascript/issues/136#issuecomment-1847442879) to opt out of caching for your component.
