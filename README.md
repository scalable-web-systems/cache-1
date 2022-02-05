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


