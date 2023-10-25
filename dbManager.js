import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config'
const uri = process.env.MONGODB_CONNECTION_STRING;


const initializeDbClient = async () => {
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  if (!client) {
    client = new MongoClient(uri, {
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
}


const collectionExists = async (dbName, collectionName) => {
  const client = new MongoClient(uri);
  await client.connect();
  const collections = await client.db(dbName).listCollections({ name: collectionName }).toArray();
  return collections.length > 0;
};

async function saveItemToCollection(collectionName, item) {
  const client = new MongoClient(uri);
  await client.connect();
  return await client.db("deuxPrinces").collection(collectionName).insertOne(item);
}


// Function to check if a video is already in the subtitles collection
async function isVideoInCollection(videoId, collection) {
  const client = new MongoClient(uri);
  await client.connect();
  const video = await client.db('deuxPrinces').collection(collection).findOne({ videoId });
  return !!video; // Returns true if the video is found in the collection
}

const searchSubtitles = async (query) => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db('deuxPrinces');
    const subtitlesCollection = database.collection('subtitles');

    const cursor = subtitlesCollection.aggregate([
      {
        $match: {
          'captions.text': { $regex: query, $options: 'i' }, // Case-insensitive search
        },
      },
      {
        $addFields: {
          captions: {
            $filter: {
              input: '$captions',
              as: 'caption',
              cond: {
                $regexMatch: {
                  input: '$$caption.text',
                  regex: query,
                  options: 'i', // Case-insensitive search
                },
              },
            },
          },
        },
      },
    ]);

    const results = await cursor.toArray();
    return results;
  } catch {
  }
};

export { initializeDbClient, saveItemToCollection, isVideoInCollection, searchSubtitles };