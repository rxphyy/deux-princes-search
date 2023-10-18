import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = process.env.MONGODB_CONNECTION_STRING;

const initializeDbClient = async () => {
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error; // Re-throw the error to handle it further up the call stack
  }
}

const client = await initializeDbClient();

const collectionExists = async (dbName, collectionName) => {
  const collections = await client.db(dbName).listCollections({ name: collectionName }).toArray();
  return collections.length > 0;
};

async function saveItemToCollection(collectionName, item) {
  return await client.db("deuxPrinces").collection(collectionName).insertOne(item);
}


// Function to check if a video is already in the subtitles collection
async function isVideoInCollection(videoId, collection) {
  const video = await client.db('deuxPrinces').collection(collection).findOne({ videoId });
  return !!video; // Returns true if the video is found in the collection
}

export { initializeDbClient, saveItemToCollection, isVideoInCollection };