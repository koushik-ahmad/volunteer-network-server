const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// const data = require('./data/data.json');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mxcrgiz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// token function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'Forbidden access' });
        }
        else {
            req.decoded = decoded;
            next();
        }
    })
};


async function run() {
    try {
        const dataCollection = client.db('volunteerNetwork').collection('data');
        const userCollection = client.db('volunteerNetwork').collection('user');
        const eventCollection = client.db('volunteerNetwork').collection('event');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
            res.send({ token });
        });

        app.get('/data', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            console.log(page, size);
            const query = {};
            const cursor = dataCollection.find(query);
            const data = await cursor.skip(page * size).limit(size).toArray();
            const count = await dataCollection.estimatedDocumentCount();
            res.send({ count, data });
        });

        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get('/user', async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        });

        app.post('/event', verifyJWT, async (req, res) => {
            const event = req.body;
            const result = await eventCollection.insertOne(event);
            res.send(result);
        });


        // event api 
        app.get('/event', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log('inside orders api', decoded);
            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'unauthorized access' });
            }

            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = eventCollection.find(query);
            const event = await cursor.toArray();
            res.send(event);
        });

        app.delete('/user/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/event/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await eventCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/event/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await eventCollection.findOne(query);
            res.send(result);
        });

        app.put('/event/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const user = req.body;
            const option = { upsert: true };
            const updateUser = {
                $set: {
                    title: user.title,
                    date: user.date,
                    text: user.text,
                    banner: user.banner
                }
            }
            const result = await eventCollection.updateMany(filter, updateUser, option);
            res.send(result);
        });


        console.log("Connected to MongoDB");
    } finally {

    }
}
run().catch(error => console.error(error));



app.get('/', (req, res) => {
    res.send('Volunteer server is running');
});

app.get('/data', (req, res) => {
    res.send(data);
});

app.listen(port, () => {
    console.log(`volunteer server running on: ${port}`);
});
