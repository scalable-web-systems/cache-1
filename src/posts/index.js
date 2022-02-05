const cors = require('cors')
const express = require("express")
const { MongoClient, ObjectId } = require('mongodb')
const axios = require('axios').default
const { LruCache } = require('../lrucache/cache')


const app = express()
app.use(cors())
app.use(express.json())
const port = process.env.port || 5000
const postsCollection = `posts`
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
    
        app.get('/', async (req, res) => {
            try {
                const commentServiceName = process.env.COMMENTS
                if (!commentServiceName) {
                    return res.status(400).json({"error": "Comments service name environment variable - COMMENTS not defined."})
                }
        
                const collection = connection.collection(postsCollection)
                let posts = await collection
                    .find({})
                    .toArray()
                
                posts = await Promise.all(posts
                    .map(async (post) => {
                        const comments = await (await axios.get(`http://${commentServiceName}:${port}/${post._id.toHexString()}`)).data
                        return {
                            ...post,
                            comments
                        }
                    }))
        
                return res.status(200).json(posts)
            }
            catch (error) {
                console.error(error)
                return res.status(500).json({"error": error.message})
            }
        })
        
        app.get('/:id', async (req, res) => {
            try {
                const _id = req.params['id']
                const oid = new ObjectId(_id)
                console.log(`Incoming request to find post with ID #${_id}`)

                let post = cache.get(_id)
                if (!post) { // cache miss
                    const collection = connection.collection(postsCollection)
                    post = await collection
                        .findOne({_id: oid})
                    console.log(`Cache miss for post with ID #${post._id}. Inserting it into cache.`)
                    cache.put(post._id.toHexString(), post)
                    console.log(`Cache insertion successful, ${cache.capacity - cache.map.size} slots remaining`)
                }
                else {
                    console.log(`Returning post with ID #${post._id} from cache`)
                }
                return res.status(post ? 200 : 404).json(post)
            }
            catch (error) {
                return res.status(500).json({"error": error.message})
            }
        })
        
        app.post('/', async (req, res) => {
            const payload = req.body
            const { title, description } = payload
            try {
                if (title == null || description == null) {
                    throw new Error("Incorrect payload")
                }
        
                console.log(`Writing post with title '${title}' to database`)
                const collection = connection.collection(postsCollection)
                const post = await collection
                    .insertOne(payload)
                console.log(`Database insertion successful.`)
                return res.status(201).json(post)
            }
            catch (error) {
                console.error(error)
                return res.status(500).json({error: error.message})
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
