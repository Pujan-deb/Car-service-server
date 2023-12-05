const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const app = express();
const port = process.env.port || 5000;

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        res.send({ Error: true, message: "unauthorized access" })
    }
    const token = authorization.toString().split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            res.send({ Error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next()
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const services = client.db(process.env.DB_NAME).collection("Services");
        const Bookings = client.db(process.env.DB_NAME).collection("bookings");


        app.get("/services", async (req, res) => {
            const search = req.query.search;
            const query = { title: { $regex: search || " ", $options: "i" } }
            const options = {
                sort: { "price": -1 }
            }
            const cursor = services.find(query, options);
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await services.findOne(query);
            res.send(result);
        })
        app.post("/bookings", async (req, res) => {
            const bookinginfo = req.body;
            const result = await Bookings.insertOne(bookinginfo);
            res.send(result)
        })
        app.get("/bookings", verifyJWT, async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await Bookings.find(query).toArray();
            res.send(result);
        })
        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { serviceId: id }
            const result = await Bookings.deleteOne(query)
            res.send(result)
        })
        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const updatedinfo = req.body
            const query = { serviceId: id }
            const updateStatus = {
                $set: {
                    status: updatedinfo.status
                }
            }
            const result = await Bookings.updateOne(query, updateStatus)
            res.send(result)

        })
        //Token
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })



    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








app.get("/", (req, res) => {
    res.send("Its running")
})

app.listen(port, () => {
    console.log(`App is running in ${port}`)
})