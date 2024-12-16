const packageJSON = require("./package.json");

/**
 * Openjourney API client library
 *
 * @see https://docs.opj.app/docs/reference/rest-api
 * @example
 * // Create a new Openjourney API client instance
 * const Openjourney = require("openjourney");
 * const openjourney = new Openjourney({
 *     // get your token from https://my.opj.app/api
 *     auth: process.env.OPENJOURNEY_API_TOKEN,
 *     userAgent: "my-app/1.2.3"
 * });
 *
 * // Run a model and await the result:
 * const ref = 'variant/model'
 * const input = {text: 'Hello, world!'}
 * const output = await openjourney.run(ref, { input });
 */
class Openjourney {
    /**
     * Creates an instance of Openjourney.
     * @param {Object} [options={}] - The options to configure the Openjourney client.
     * @param {string} [options.auth] - The authentication token for the API.
     * @param {string} [options.userAgent] - The user agent string to use for requests.
     * @param {string} [options.baseUrl] - The base URL of the API.
     * @param {Function} [options.fetch] - A custom fetch function to use for requests.
     * @param {Object} [options.options] - Additional options for the client.
     * @param {Object} [options.options.wait] - Options for wait behavior.
     * @param {number} [options.options.wait.interval] - The interval between status checks in milliseconds.
     */
    constructor(options = {}) {
        this.auth =
            options.auth ||
            (typeof process !== "undefined" ? process.env.OPENJOURNEY_API_TOKEN : null);
        this.userAgent =
            options.userAgent || `openjourney-javascript/${packageJSON.version}`;
        this.baseUrl = options.baseUrl || "https://api.opj.app";
        this.fetch = options.fetch || globalThis.fetch;
        this.options = options.options || {};
        this.options.wait = this.options.wait || {};
        this.options.wait.interval = this.options.wait.interval || 5000;
    }

    /**
     * Runs a job with the specified reference and input.
     * @param {string} ref - The reference for the job.
     * @param {Object} [input={}] - The input data for the job.
     * @returns {Promise<Object>} The completed job object.
     * @throws {Error} If the job fails or is cancelled.
     */
    async run(ref, input = {}) {
        let job = await this.request(`/${ref}`, {
            method: "POST",
            data: input
        });

        await new Promise((resolve) => {
            const interval = setInterval(async () => {
                job = await this.request(`/job/${job.id}`);
<<<<<<< HEAD
                if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
=======
                if (job.status !== 'starting' && job.status !== 'booting' && job.status !== 'processing') {
>>>>>>> 6457d63626653d3f7e5e057e21e87e13f921f892
                    clearInterval(interval);
                    resolve();
                }
            }, this.options.wait.interval);
        });

        if (job.status === 'failed' || job.status === 'cancelled') throw new Error(job.error || 'Failed to process image');
        return job;
    }

    /**
     * Sends a request to the API.
     * @param {string|URL} route - The route to request.
     * @param {Object} [options={}] - The options for the request.
     * @param {string} [options.method="GET"] - The HTTP method to use.
     * @param {Object} [options.params={}] - The query parameters to include.
     * @param {Object|FormData} [options.data=null] - The data to send with the request.
     * @param {Object} [options.headers] - Additional headers to include.
     * @returns {Promise<Object>} The parsed JSON response.
     * @throws {Error} If the request fails.
     */
    async request(route, options = { method: "GET", params: {}, data: null }) {
        const { auth, baseUrl, userAgent } = this;

        let url;
        if (route instanceof URL) {
            url = route;
        } else {
            url = new URL(
                route.startsWith("/") ? route.slice(1) : route,
                baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
            );
        }

        const { method = "GET", params = {}, data } = options;
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': userAgent
        };

        if (auth) {
            headers['Authorization'] = `Bearer ${auth}`;
        }

        if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                headers[key] = value;
            }
        }

        let body = undefined;
        if (data instanceof FormData) {
            body = data;
            // biome-ignore lint/performance/noDelete:
            delete headers["Content-Type"]; // Use automatic content type header
        } else if (data) {
            body = JSON.stringify(data);
        }

        const init = {
            method,
            headers,
            body,
        };

        const shouldRetry = method === "GET" ? (response) => response.status === 429 || response.status >= 500 : (response) => response.status === 429;

        const _fetch = this.fetch; // eslint-disable-line no-underscore-dangle
        const response = await this.withAutomaticRetries(async () => _fetch(url, init), {
            shouldRetry,
        });

        if (!response.ok) {
            const request = new Request(url, init);
            const responseText = await response.text();
            throw new Error(
                `Request to ${url} failed with status ${response.status} ${response.statusText}: ${responseText}.`,
                request,
                response
            );
        }

        return await response.json();
    }

    /**
     * Executes a request with automatic retries.
     * @param {Function} request - The request function to execute.
     * @param {Object} [options={}] - The options for retrying.
     * @param {Function} [options.shouldRetry] - A function that determines if a retry should be attempted.
     * @param {number} [options.maxRetries=5] - The maximum number of retry attempts.
     * @param {number} [options.interval=500] - The base interval between retries in milliseconds.
     * @param {number} [options.jitter=100] - The maximum random jitter to add to the retry interval.
     * @returns {Promise<Response>} The response from the successful request.
     */
    async withAutomaticRetries(request, options = {}) {
        const shouldRetry = options.shouldRetry || (() => false);
        const maxRetries = options.maxRetries || 5;
        const interval = options.interval || 500;
        const jitter = options.jitter || 100;

        // eslint-disable-next-line no-promise-executor-return
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        let attempts = 0;
        do {
            let delay = interval * 2 ** attempts + Math.random() * jitter;

            /* eslint-disable no-await-in-loop */
            try {
                const response = await request();
                if (response.ok || !shouldRetry(response)) {
                    return response;
                }
            } catch (error) {
                if (error instanceof Error) {
                    const retryAfter = error.response.headers.get("Retry-After");
                    if (retryAfter) {
                        if (!Number.isInteger(retryAfter)) {
                            // Retry-After is a date
                            const date = new Date(retryAfter);
                            if (!Number.isNaN(date.getTime())) {
                                delay = date.getTime() - new Date().getTime();
                            }
                        } else {
                            // Retry-After is a number of seconds
                            delay = retryAfter * 1000;
                        }
                    }
                }
            }

            if (Number.isInteger(maxRetries) && maxRetries > 0) {
                if (Number.isInteger(delay) && delay > 0) {
                    await sleep(interval * 2 ** (options.maxRetries - maxRetries));
                }
                attempts += 1;
            }
        } while (attempts < maxRetries);

        return request();
    }
}

module.exports = Openjourney;
