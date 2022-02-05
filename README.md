# Tutorial on Caching
> **Author -** Ishaan Khurana, [LinkedIn](https://www.linkedin.com/in/ishaan-khurana-46968679/)

## Objective
This tutorial is the first tutorial in the **caching** series. We'll be learning about caching and its importance, different cache eviction and write policies, various tradeoffs to keep in mind when applying these write policies. Finally, we'll be inspecting the source code and going over the implementation of a Linked List based LRU cache.

## Prerequisites
##### Side note: There are links attached to the bottom of this tutorial for our readers who may not be familiar with the technologies used here.
1. The reader should have completed the [first](https://github.com/scalable-web-systems/docker-compose-node), [second](https://github.com/scalable-web-systems/docker-compose-gateway) and [third](https://github.com/scalable-web-systems/docker-compose-mongo) of **Docker compose** series. 
2. The reader should have a working knowledge of Linked Lists and Maps. Additionally, the reader should also be aware of how a linked list is implemented under the hood.
3. The reader should be familiar with axios, asynchrous operations, promises, etc.
4. The reader should have PostMan installed on their machine. Alternatively, one can use CLI tools such as Curl, WGet etc. to make the API calls.
5. The reader should clone this repository to their local machine before moving on to the next section.

## Why Caching?
Making round trips to the database is expensive. And doing it for a system that has a considerable amount of read requests, communicating with the database every time someone wants to retrieve some information can cause some serious performance issues. Caching is defined as the process of storing data in a temporary storage for faster lookups. Introducing cache as an additional storage layer that sits in front of the database layer abridges the gap between the API and the database layer and the lookup trips consequently can be completed with lesser fuel. In the [first]() tutorial of the **docker-compose** series, we store the posts in an array variable called **posts** i.e in the local memory of our NodeJS server. That array acts as **cache**. Lookup is significantly faster compared to reading from a database. However, the storage is temporary and we lose our data the moment the server is shut down.

### Cache Writing Policies
There are at least 3 different ways of writing information to a cache, each having its pros and cons, and different use cases.
1. **Write Through:**  This policy dictates that we write the data to both permanent data storage and the cache. This is the simplest, most reliable cache writing policy. It ensures high consistency between the 2 data storages. This policy, however, results in higher latency since the data needs to be writtent to both the database and the cache.
2. **Write Around:** Under this policy, cache writing is forgone and the data is written directly to the database. This does not significantly improve the latency of the overall write operation. However, this is useful in situations when the inserted record may not be accessed as much as other resources on the cache. In this case, cache is updated if there's a cache miss for the record, i.e when there is an attempt to search for the record in the cache and it doesn't exist there. The data is then looked for in the database and if the record is found, the data is first written to the cache before being returned. This policy improves the overall performance of the system by retaining the highly accessed records on the cache layer and not writing every single new record to cache, thus not risking replacing a highly accessed object with the one that may be accessed very infrequently.
3. **Write Back:** Under this policy, on insert/update, data is only written to the cache layer, thereby dramatically improving the write performance. The data is then persisted to the permanent storage periodically or when the object is about to be replaced with another object. The notable downside to working with this policy is loss of data and lack of consistency.If there is a power outage between the time the data is written onto the cache layer and the time the data is finally persisted, that data will be lost and will cause reliability issues for the client. On the flip side, this policy can yield great performance results when the write operations significantly outnumber the read operations. The system, in this case, will benefit from writing 100 records in one trip to the database instead of making 100 individual trips.

### Cache Eviction Policies
Cache is never meant to be a substitute for permanent storage. There is only finite amount of information (significantly lesser than the size of database) that can and should be stored on the cache layer. With that being said, the system can't throw in the towel when the cache gets full. Hence, we have cache eviction policies in place that help us determine which object to discard every time there is an overflow. There are 6 main cache eviction policies - FIFO (**F**irst **I**n **F**irst **O**ut), LIFO (**L**ast **I**n **F**irst **O**ut), LRU (**L**east **R**ecently **U**sed), LFU (**L**east **F**requently **U**sed), MRU (**M**ost **R**ecently **U**sed), Random Eviction. All these policies should be self explanatory. In this tutorial, we'll work on using maps and linked lists to design our own implementation of the **Least Recently Used** cache.

## Let's Look at the Code
> src/lrucache/cache.js
```
class CacheNode {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}
class LruCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.head = new CacheNode();
        this.tail = new CacheNode();
        this.head.next = this.tail;
        this.tail.previous = this.head;
        this.map = new Map();
    }

    removeNode = (node) => {
        node.previous.next = node.next;
        node.next.previous = node.previous;
    };

    addNode = (node) => {
        this.head.next.previous = node;
        node.next = this.head.next;
        this.head.next = node;
        node.previous = this.head;
    };
    
    get = (key) => {
        const result = this.map.get(key);
        if (result != null) {
            this.removeNode(result);
            this.addNode(result);
            return result.value;
        }
        return undefined;
    };
    
    put = (key, value) => {
        const node = this.map.get(key);
        if (node != null) {
            console.log(`Object with key ${key} already in the cache!`)
            this.removeNode(node);
            node.value = value;
            this.map.set(key, node);
            this.addNode(node);
            return;
        }
        if (this.capacity === this.map.size) {
            console.log('cache overflow!')
            this.map.delete(this.tail.previous.key);
            this.removeNode(this.tail.previous);
        }
        const newNode = new CacheNode(key, value);
        this.addNode(newNode);
        this.map.set(key, newNode);
    };
}

module.exports = { LruCache }
```

Woah!! That's a LOT of code. Let's break it down into the 2 classes that's composed of - **CacheNode** and **LruCache**. **LruCache** will serve as our main cache class and will be responsible for storing data while **CacheNode** is the standard Linked List Node class with a next and a tail pointer as well as to members to store key and value properties of the incoming object. **CacheNode** class is fairly small and intuitive. Let's take a deep dive into the **LruCache** class. Let's look at the constructor:

```
    constructor(capacity) {
        this.capacity = capacity;
        this.head = new CacheNode();
        this.tail = new CacheNode();
        this.head.next = this.tail;
        this.tail.previous = this.head;
        this.map = new Map();
    }
```

The constructor accepts an integer defining the capacity of the cache as the only argument. We define quite a few data members here - capacity of the cache, 2 dummy linked list nodes (head and tail) and a map to store our data. We connect the head and tail pointers to each other. Head's next node is tail and tail's previous node is head.

Next, let's inspect the two helper methods - **addNode** and **removeNode**:

```
    removeNode = (node) => {
        node.previous.next = node.next;
        node.next.previous = node.previous;
    };

    addNode = (node) => {
        this.head.next.previous = node;
        node.next = this.head.next;
        this.head.next = node;
        node.previous = this.head;
    };
```

**removeNode** accept a node adjusts the pointers of its neighboring nodes to remove it from the list. **addNode** accepts a node and appends it to the front of the list, right next to the dummy head node.

Next, let's look at the method **get** that is used to retrieve information from the cache:

```
    get = (key) => {
        const result = this.map.get(key);
        if (result != null) {
            this.removeNode(result);
            this.addNode(result);
            return result.value;
        }
        return undefined;
    };
```

Very simple. It accepts a key as the argument and tries to fetch the correspoinding node from the map. If the node exists in the cache, then we remove the node from the list and add it to the front of the list. This way, the most recently used node is placed in front of the list while the least recently used node is towards the back of the list. We then return the node's value i.e the requested information. If the node doesn't exist in the cache, we return undefined.

Now, let's look at the method **put** that is used to write data to the cache.

```
    put = (key, value) => {
        const node = this.map.get(key);
        if (node != null) {
            console.log(`Object with key ${key} already in the cache!`)
            this.removeNode(node);
            node.value = value;
            this.map.set(key, node);
            this.addNode(node);
            return;
        }
        if (this.capacity === this.map.size) {
            console.log('cache overflow!')
            this.map.delete(this.tail.previous.key);
            this.removeNode(this.tail.previous);
        }
        const newNode = new CacheNode(key, value);
        this.addNode(newNode);
        this.map.set(key, newNode);
    };
}
```

Here, we accept 2 parameters - key and value. We first check whether a node with the given key already exists in the map. If it does, then we log that, remove the node from the list, update its value, update it in the map, add it to the front of the list and return. Otherwise, we do a sanity check to ensure that we have reached the cache's capacity. If we do fill out our cache, we log that and remove the last node (right before the dummy tail node) from the map by accessing its key and remove it from the list as well. Finally, we create a new node object and propagate down to it the given key and value. We add this new node to the front of the list and set it in the map. Interesting huh? Just the way our social systems work. _Stay popular enough to remain alive or face being edged out._



## Steps

**IMPORTANT:** Create a new folder called **data** in the root directory of the cloned repository before performing the steps.

Perform the steps outlined in [Tutorial 2](https://github.com/scalable-web-systems/docker-compose-gateway) of **Docker Compose** series. We'll be inspecting logs to understand how the reads and writes are being peformed. 

## Conclusion
After doing this tutorial, one should have a firm grasp on caching fundamentals. Additionally, one should be able to create their own LRU cache.

### Links
1. [Javascript Tutorial](https://www.w3schools.com/js/)
2. [Npm](https://www.npmjs.com/)
3. [NodeJS](https://nodejs.org/en/docs/)
4. [Express](https://expressjs.com/en/starter/hello-world.html)
5. [Docker](https://docs.docker.com/get-started/)
6. [Fast Gateway NPM Package](https://www.npmjs.com/package/fast-gateway)
7. [Promises, Async, Await - JS](https://javascript.info/async)
8. [Axios](https://github.com/axios/axios)
9. [MongoDB NPM package](https://www.npmjs.com/package/mongodb)


