const cors = require('cors')
const express = require("express")
const { MongoClient, ObjectId } = require('mongodb')
const axios = require("axios").default
const { LruCache } = require('../lrucache/cache')

const app = express()
app.use(cors())
app.use(express.json())
const port = process.env.port || 27017
const commentsCollectionName = `comments`
const cacheCapacity = parseInt(process.env.CACHECAPACITY) ?? 10
const cache = new LruCache(cacheCapacity)

const connectToDatabase = async () => {
    try {
        const dbConnectionString = process.env.DBCONNECTIONSTRING
        const dbName = process.env.DBNAME
        if (!dbConnectionString || !dbName)
            throw new Error("Environment variable for db connection string or db name not defined.")
        
        const url = `mongodb://${dbConnectionString}/${dbName}`
        const client = new MongoClient(url)
        await client.connect()
        console.log('connected!')
        return client.db(dbName)
    }
    catch(error) {
        console.error(error.message)
        return undefined
    }
}

const runServer = async () => {
    try {
        const connection = await connectToDatabase()
        if (!connection) {
            throw new Error("Unable to connect to database.")
        }
        
        app.post('/', async (req, res) => {
            const payload = req.body
            const { postId, message } = payload
            try {
                if (postId == null || message == null) {
                    throw new Error("Incorrect payload")
                }
                const postServiceName = process.env.POSTS
                if (!postServiceName) {
                    return res.status(400).json({"msg": "Environment variable for posts service name not set!"})
                }
                const fetchPostRequest = await axios.get(`http://${postServiceName}:${port}/${postId}`)
                const post = await fetchPostRequest.data
                if (!post) {
                    return res.status(400).json({"msg": `Post with ID #${postId} not found!`})
                }

                console.log(`Writing comment with message '${message.substring(0, Math.min(10, message.length))}...' to database`)
                const collection = connection.collection(commentsCollectionName)
                const comment = await collection.insertOne(payload)
                
                console.log(`Writing comment with postID #${comment.insertedId} to cache.`)
                let cachedComments = cache.get(postId)
                if (cachedComments == null) {
                    console.log('Cache miss.')
                    cachedComments = []    
                }
                cachedComments.push({
                    ...payload,
                    _id: comment.insertedId
                })
                cache.put(postId, cachedComments)
                console.log(`Cache insertion successful, ${cache.capacity - cache.map.size} slots remaining`)

                return res.status(201).json(comment)
            }
            catch (error) {
                console.error(error)
                return res.status(500).json({error: error.message})
            }
        })
        
        app.get('/:id', async (req, res) => {
            try {
                const postId = req.params['id']
                console.log(`Incoming request to return comments associated with post ID #${postId}`)

                let comments = cache.get(postId)
                if (comments == null) {
                    console.log(`Cache miss for comments with post ID #${postId}. Inserting them into cache.`)
                    const collection = connection.collection(commentsCollectionName)
                    comments = await collection.find({postId: postId}).toArray()
                    cache.put(postId, comments)
                    console.log(`Cache insertion successful, ${cache.capacity - cache.map.size} slots remaining`)
                }
                return res.status(200).json(comments)
            }
            catch(error) {
                console.error(error)
                return res.status(500).json({"error": error.message})
            }
        })
    
        app.listen(port, '0.0.0.0', () => {
            console.log(`Server listening on port ${port}`)
        })
    
    }
    catch (error) {
        console.error(error.message)
    }
}

runServer()
