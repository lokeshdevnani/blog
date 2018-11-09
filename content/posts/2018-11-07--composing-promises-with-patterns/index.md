---
title: Promises | Composition & Patterns
subTitle: Composing powerful async patterns
cover: promises.png
category: ["javascript", "async", "promises"]
---

A Promise is a proxy for a value not necessarily known when the promise is created. It has one of 3 states: (**`pending`**, **`fulfilled`**, **`rejected`**).
If a promise is fulfilled or rejected at a moment, it is called as `settled` promise. At settled stage, it's value/error cannot change.

![unsplash.com](./promises.png)

## Why?

Promises have a lot of advantages over plain callback mechanisms. Some of these are avoiding callback hell, inversion of control, better error handling and the most important composition. Owing to these perks, it has become the fundamental building block for async stuff out there: async-await, HTTP Clients etc. People have realized that promises are just better way of representing async actions, easier to reason about and manage. There are a ton of articles on internet on 'promises vs callbacks', but you get the point.


## Creation
Creating a promise is easy, just pass in a function with resolve and reject. One thing to note here is "**Promises are eager**" i.e. they try to resolve as soon as they are created. The promise return value can be consumed anytime after the promise is created.
Also, a promise can be resolved or rejected at most once, calling resolve multiple times in a promise function will do nothing and only the first call is respected.

```javascript
const promise = new Promise((resolve, reject) => {
    // some stuff
    if (successful) {
        resolve(result)
    } else {
        reject(reason)
    }
})
```

Easiest example of a promise would be:

```javascript
const promise = new Promise((resolve, reject) => {
    resolve("done")
})

promise.then(msg => console.log(msg)) // done
```
Since promises are eager, it's a common practice to wrap the promise creation in a function.
Lets create a promise wrapper for setTimeout:

```javascript
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
```

It can be consumed by simply chaining then.
```javascript
wait(2000).then(() => { console.log('completed' )})
```

If you need advanced functionality like cancels and premature resolution, it's possible to create a wrapper for that too. 

```javascript
const wait = ms => {
    let timer, resolve, reject
    const promise = new Promise((resolveCb, rejectCb) => {
        resolve = resolveCb
        reject = rejectCb
        timer = setTimeout(resolve, ms)
    })
    promise.finish = () => {
        clearTimeout(timer)
        resolve() // Premature resolution
    }
    promise.cancel = () => {
        clearTimeout(timer);
        reject(Error("Cancelled")) // Premature cancellation
    }
    return promise
}

// Consume this by:

promise = wait(5000)
promise.then(() => { console.log('all done')})

// -- Some other place --
promise.done() // immediately resolves the above function
```

Yes, this looks a little complicated but, this is one of the things which promises lack natively. The ability to cancel.
Sometimes, there are mechanisms to sidestep this issue completely but other times there is need to do so.

While you can implement cancellable version of every async API you're gonna use, there are some promise libraries which have done it already and provide a uniform interface. Some most popular ones are [q](https://github.com/kriskowal/q), [bluebird](https://github.com/petkaantonov/bluebird) etc.

But, its worth implementing this without a library to build better intuition in terms of async actions and promises.

Okay, let's try converting a function which does some API calls and calls the passed callback.

```javascript
const fetchData = (requestArgs, successCb, errorCb) => {
    ...
}
```
Promisifying this is simpler than you think

```javascript
const fetchDataAsync = requestArgs => new Promise((resolve, reject) => {
    fetchData(requestArgs, response => resolve(response), error => reject(error))
})

fetchDataAsync({ resource_id: 1 })
    .then(res => console.log(res))
    .catch(err => console.error(err))
```

Now that you know how to create basic promises, convert existing APIs to promises and consuming them, we can move on to some advanced stuff.

Just as an small exercise, try printing numbers from 1 to 100 sequentially. But there's just one little twist, you need to wait for 1 second between each number.
I encourage you to try it out and reason about the complexity of the solution you came up with before moving forward.

While printing numbers in a sequence looks pretty straightforward, and also delaying something is something which is pretty common. When we intermingle these two things together, things start to get interesting. We need a way to solve this problem without sacrificing simplicity. Let's look at an intriguing idea that might help.

## Composition

Composition is a very elegant way of approaching problems which is embraced in various programming methodologies. Instead of building a large brittle block, we can have few smaller blocks and fit them together.

In OO Design, we can use composition to reduce complexity & increase agility of the software. In functional programming, we can use function composition to compose multiple functions together to build a new function. 

We can borrow this powerful idea to solve async problems using promises. Promises enable composition by chaining. A promise can have arbitrary long `then` chain, through which control flows sequentially. So, effectively multiple independent promises can be combined in a promise chain to achieve a functionality. For this to work, each promise in the promise chain must return a promise, which gets resolved in order to pass control on to next promise.

Let's revisit the 1-100 counting problem. This time we'll try thinking in terms of composition of promises. Developing this mental model by identifying smaller pieces which build up to become the full piece takes some time, but it's important to build up the intuition.
In this problem, the smaller pieces are:

- Wait for 1000ms
- Print 'x'
- Increment x

These 3 operations are quite straightforward on their own:

We have already discussed how to implement a promise version of setTimeout as 'wait'

```javascript
wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// A specialized version of wait which waits 1 second before resolving.
wait1 = () => wait(1000)

```
For `print 'x'`, we just need to print the number. Here, `Promise.resolve(value)` is a special API which returns a promise that always resolves to the `value` passed as argument. This is required since, we need to return a promise to make it chainable.

```javascript
print = x => { console.log(x); return Promise.resolve(x) }
```

The increment operation is as easy as promise which resolves to next number in sequence.
```javascript
increment = x => Promise.resolve(x+1)
```

Now that we have all 3, we just need to compose them together.

```javascript
waitAndPrint = x =>  wait1().then(() => print(x)).then(increment)
```

This gives us a function which will wait for 1000ms, print the number passed as argument and returns a promise with incremented number. The best part about this approach is, it is independent of our application. It is not embedded with any of the context of the app, and thus, we can use this code anywhere we want.

Only part left is doing this process N times i.e. after increment repeat this process with the incremented number. It looks something like this:

```javascript
waitAndPrint(1)
    .then(x => waitAndPrint(x))
    .then(x => waitAndPrint(x))
    ...
    .then(x => waitAndPrint(x))
```

Or even better

```javascript
waitAndPrint(1)
    .then(waitAndPrint)
    .then(waitAndPrint)
    ...
    .then(waitAndPrint)
```

If this makes sense, we can just automate this part using plain old loops. You can also use `_.times` or `reduce` to achieve the same result.

```javascript
waitAndPrintSequence = (start, end) => {
    chain = waitAndPrint(start)
    for(let x = start; x < end; x++) {
        chain = chain.then(waitAndPrint)
    }
    return chain
}

waitAndPrintSequence(1, 100) // that's it.
```
What's even interesting is, since it returns a promise in the end, we can chain this to build more complex task on top.

```javascript
waitAndPrintSequence(1, 10)
    .then(() => waitAndPrintSequence(101, 110))
    .then(() => waitAndPrintSequence(201, 210))
```

This code needs no explaination or documentation. Since, we have already broken down the task into meaningful pieces, its composition steps act as documentation.

There are multiple other ways to solve this problem, as long as you can reason about its complexity with respect to the task in hand, it is a fair solution.

## Composition Patterns

For dealing with some complex async problems, you need to compose promises in a certain way to achieve the desired behaviour. There are some patterns which are actually the solutions to commonly occuring problems, we can customize and compose these patterns to satisfy our use case.

For all the pattern examples, I'll be using the below code to simulate async API calls.

```javascript
const randomWait = () => wait(Math.random() * 100)
const api = {
    getSquare: id => randomWait().then(() => Promise.resolve(id * id)),
    getProduct: (a, b) => randomWait().then( () => Promise.resolve(a * b))
}
```

### Concurrent Tasks

For firing up multiple promises at once, and operating on the result set when every promise is resolved, we already have an in-built API we can leverage.

```javascript
const sum = arr => arr.reduce((acc, x) => acc + x, 0)
const numbers = [1, 2, 3, 4, 5]
promises = numbers.map(api.getSquare)
Promise.all(promises).then(values => {
    // resolves when every promise is resolved
    console.log(sum(values)) // 55
})
```

Its resolution time is limited by the slowest promise in the array of promises.

### Racing Between Tasks

If we need to consume any one of the result of the promises we have as soon as any one of the promise is resolved/rejected, we can use race pattern. Again, this is already there in the in-built promise API.
In below example, two APIs race with a timer, If any of the APIs finish first, the result is the API response which gets console logged in `.then` block. If timeout finishes first, it rejects with an error, so in that case it gets caught by `.catch`.

```javascript
timeout = t => wait(t).then(() => Promise.reject("Request Timeout"))
promises = [api.getSquare(10), someOtherApi.getSquare(10), timeout(5000)]
Promise.race(promises)
       .then(val => console.log("10^2 = " + val))
       .catch(err => console.error(err))
```

### Sequential Dependent tasks

Sequential tasks which depend upon value of previous tasks can be chained together programmatically

```javascript
const numbers = [1, 2, 3, 4, 5]
numbers.reduce((promiseChain, number) => {
    return promiseChain.then(res => api.getProduct(res, number))
}, Promise.resolve(1)).then(res => console.log("Product is " + res)) // 120
```

### Independent Concurrent Tasks with CWR (Consume when ready) policy

When there are multiple concurrent tasks, and results need to be used as soon as it's resolved, we cannot directly use `Promise.all`. As it doesn't need to wait for all of the promises to be resolved to start consuming result of a resolved promise.

Here, we are chaining `then` onto each promise by which we can access result early on independently of other promises.

```javascript
const sum = arr => arr.reduce((acc, x) => acc + x, 0)
const consume = num => console.log("Resolved: " + num)
const numbers = [1, 2, 3, 4, 5]
promises = numbers.map(api.getSquare)
                    .map(promise => promise.then(result => {
                        consume(result)
                        return result
                    }))
Promise.all(promises).then(values => {
    console.log("Every promise resolved")
})
```

### Passing values along the promise chain

When there are dependent sequential promises, we can easily access values from just previous promise in the promise chain. But when we need to access values obtained from promises higher in the chain, we can either:
    
* Maintain a state throughout, which stores all the values accessible by anyone.

    ```javascript
    values = []
    api.getSquare(2).then(num => {
        values.push(num)
        return api.getSquare(num)
    }).then(num => {
        values.push(num)
        console.log(values) // [4, 16]
    })
    ```


* Pass down the resolved values along with new value

    ```javascript
    api.getSquare(2).then(num => {
        return api.getSquare(num).then(squared => [num, squared])
    }).then(squares => {
        // now we have both square(2) and square(square(2)) in scope
        console.log(squares) // [4, 16]
    })
    ```

These are some of the patterns that I've used in some way or another. Feel free to comment below other patterns that you find useful.


## What's Next?

Now that we fully understand how promises work and how to compose promises to solve difficult async problems elegantly, it's time to dig deeper.

There are other powerful ways/frameworks with different philosophies designed to solve async problems. There are pros and cons in using each of them.

In ES2017, there is `async/await` which makes it super-easy to write async code in a synchronous fashion. It provides a great abstraction on top of promises.

`Observables` are another powerful pattern abstraction for dealing with async events, and by design it has support of dealing with recurring events which `promises` don't support inherently. [RxJS](http://reactivex.io/documentation/observable.html) provides really great API for handling async events based on Observable philosophy.

Besides understanding various concurrent programming abstractions, it is beneficial to understand how browser and javascript engines work to get a sense of inherent limitations and advantages.


## Interesting Reads

* [MDN | Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)

* [SessionStack | How JavaScript works: Event loop and the rise of Async programming + 5 ways to better coding with async/await](https://blog.sessionstack.com/how-javascript-works-event-loop-and-the-rise-of-async-programming-5-ways-to-better-coding-with-2f077c4438b5)

* [How JavaScript works: inside the V8 engine + 5 tips on how to write optimized code](https://blog.sessionstack.com/how-javascript-works-inside-the-v8-engine-5-tips-on-how-to-write-optimized-code-ac089e62b12e)

* [DZone | RxJS Tutorial](https://dzone.com/refcardz/rxjs-streams?chapter=2)