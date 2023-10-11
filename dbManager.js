import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';
config({ path: '../.env' });
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

async function saveItemsToCollection(collectionName, items) {
  if (!await collectionExists('deuxPrinces', collectionName)) {
    await client.db("deuxPrinces").collection(collectionName).insertMany(items);
    return true;
  }
  return false;
}

const fetchItemsByQuery = async (query) => {
  const allCollections = await client.db('deuxPrinces').listCollections().toArray();
  const result = {};

  for (const collection of allCollections) {
    const collectionName = collection.name;
    const items = await client.db('deuxPrinces').collection(collectionName)
      .find({ text: { $regex: query, $options: 'i' } })
      .project({ _id: 1, startTime: 1, text: 1 })
      .toArray();

    if (items.length > 0) {
      result[collectionName] = items;
    }
  }
  
  return result;
};



const fetchItemsByQuery2 = async (query) => {
  const allCollections = await client.db('deuxPrinces').listCollections().toArray();
  const result = [];

  for (const collection of allCollections) {
    const collectionName = collection.name;
    const items = await client.db('deuxPrinces').collection(collectionName)
      .find({ text: { $regex: query, $options: 'i' } })
      .project({ _id: 1, startTime: 1, text: 1 })
      .toArray();

    result.push({
      id: collectionName,
      captions: items
    })

    if (items.length > 0) {
      result.push({
        id: collectionName,
        captions: items
      })
    }
  }

  return result;
};


// Function to check if a video is already in the subtitles collection
async function isVideoInCollection(videoId, collection) {
  const video = await client.db('deuxPrinces').collection(collection).findOne({ videoId });
  return !!video; // Returns true if the video is found in the collection
}



const searchSubtitles = async (query) => {
  try {
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
  } finally {
    client.close();
  }
};



export { initializeDbClient,
        saveItemToCollection,
        saveItemsToCollection,
      fetchItemsByQuery,
    fetchItemsByQuery2,
  searchSubtitles,
  isVideoInCollection };