const express = require ('express')
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

//stripe
const stripe = require("stripe")(process.env.MELODY_PAYMENT_SECRET_KEY)

// connect to the database 



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i52gyay.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

// database connect

const database = client.db("melodyDb");

const userCollection = database.collection("users");
const instrumentsCollection = database.collection("instruments");
const classCollection = database.collection("classes");
const selectClassCollection = database.collection("selectClasses");
const EnrolledCollection = database.collection("enrolledClasses");




    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

  
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      console.log('email',email)
    
      const query = { email: email };
      const user = await userCollection.findOne(query);
    console.log('user',user)
      if (!user) {
      
        res.send({ admin: false });
        return;
      }
    
      const result = { admin: user.role === 'admin' };
      console.log(result)
      res.send(result);
    });

    
   

    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;
      
    
      const query = { email: email };
      const user = await userCollection.findOne(query);
    console.log('user',user)
      if (!user) {
   
        res.send({ instructor: false });
        return;
      }
    
      const result = { instructor: user.role === 'instructor' };
     
      res.send(result);
    });




    app.get('/users/student/:email', async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const result = { student: user?.role === 'student' }
    
      res.send(result)

    })

    
    //update user to admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      // role field to change
      const updateDoc = {
        $set: {
          role: "admin"
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      
      
    })


    //update user to instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      // role field to change
      const updateDoc = {
        $set: {
          role: "instructor"
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //user related api- add user login,signUp
    app.post('/users', async (req, res) => {
      const user = req.body
      console.log(user)
      user.role = 'student'; 
    
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/instruments',  async (req, res) => {
      const result = await instrumentsCollection.find().toArray()
      res.send(result);
    })
    
    //add class
    app.post('/classes',  async (req, res) => {
      const newItem = req.body
      const result = await classCollection.insertOne(newItem)
      res.send(result)
    })


       //get class my email
       app.get('/classes',  async (req,res)=>{
        const email = req.query.email;
    
        if (!email) {
          res.send([])
        }

        
        const query = { InstructorEmail: email };
        const classes = await classCollection.find(query).toArray()
      
        res.send(classes)
      })

       //update class by id
     app.patch('/updateClass/:id',  async (req, res) => {
      const id = req.params.id
      const updateData = req.body
      
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.updateOne(query, { $set: updateData });

      res.send(result);

    })



    //get all classes for Manages
    app.get('/manageClasses', async (req,res)=>{

      const result = await classCollection.find().toArray()
      res.send(result)
    })


    //make class approve
    app.patch('/classes/approve/:id', async(req,res)=>{
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: "approve"
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    app.patch('/classes/denied/:id', async(req,res)=>{
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: "denied"
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


// // showing instructor 
// app.get('/instructor', async (req, res) => {
//   const result = await instructorCollection.find().toArray();
//   res.send(result);
// });

//Send feed back= add feedback to class by id
app.patch('/classes/feedback/:id', async(req,res)=>{
  const id = req.params.id
  const feedback = req.body
  // console.log(feedback)
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      feedback: feedback.feedback
    },
  };
  const result = await classCollection.updateOne(filter, updateDoc);
  res.send(result)
})


  // Instructor page - which are approve by admin
  app.get('/instructors', async (req, res) => {
    const query = { role: "instructor" };
    
    const result = await userCollection
      .find(query)
      .sort({ _id: -1 })
      .toArray();
    
    res.send(result);
  });

  // get total class and total class name by  instructor email
  app.get('/classes/:instructorEmail', async (req, res) => {
    const instructorEmail = req.params.instructorEmail;
    const count = await classCollection.countDocuments({ InstructorEmail: instructorEmail });
    const classes = await classCollection.find({ InstructorEmail: instructorEmail }).project({ _id: 0, name: 1  }).toArray();
    const classNames = classes.map((classObj) => classObj.name);
    res.send({ count, className: classNames , instructorEmail})

  })
// get approve Class
app.get('/approveClasses' , async(req, res)=>{

const query = { status: "approve"}
const result = await classCollection.find(query).toArray()
res.send(result);
})

//post selected class to database
app.post('/selectClass', async (req, res) => {
const selectClass = req.body;
// 
// i
  const result = await selectClassCollection.insertOne(selectClass);
  res.send(result);
});

// get user status by id for button
app.get('/user/:email' ,async(req,res)=>{
const email = req.params.email;
const result = await userCollection.findOne({ email: email });
res.send(result)

})
//get selected class to database
app.get('/selectedClasses/:email', async(req,res)=>{
const email = req.params.email
// console.log(email)
const query = { email : email}
const result = await selectClassCollection.find(query).toArray()
res.send(result)
})
// delete selected class by id
app.delete('/selectedClasses/:id', async(req,res)=>{
const id = req.params.id
// console.log(id)


const query = { _id : new ObjectId(id)}
const result = await selectClassCollection.deleteOne(query)
res.send(result)
})


//payment intent
app.post('/create-melody-payment-intent' , async(req,res)=>{
  const { price } = req.body
 
  const amount = Math.floor(price * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card'],
  });
  res.send({
    clientSecret: paymentIntent.client_secret
    
  });
})

//save payments to data base 
app.post('/payments',  async (req,res)=>{
  const {payment, selectedClass} = req.body
  const insertedResult = await paymentCollection.insertOne(payment)
  const query = { _id : new ObjectId(payment.selectedClass)}
 
  const deleteResult = await selectClassCollection.deleteOne(query)
  
  const decreaseSeatAndIncreaseEnroll = await classCollection.updateOne(
    { _id: new ObjectId(payment.classID) },
    { $inc: { seats: -1, TotalEnrolled: 1 } })
const EnrolledClass = await EnrolledCollection.insertOne(selectedClass)


 ;res.send({insertedResult,deleteResult,decreaseSeatAndIncreaseEnroll,EnrolledClass})
})


// get enrolled classes bt email
app.get('/enrolledClass/:email' , async(req,res)=>{
  const email = req.params.email
  const query = {email: email }
  const result = await EnrolledCollection.find(query).toArray()
  res.send(result)
})

//popular class top 6 class base on student
app.get('/popularClasses', async (req, res) => {
  const query = { status: "approve" };

  const result = await classCollection
    .find(query)
    .sort({ TotalEnrolled: -1 })
    .limit(6)
    .toArray();

  res.send(result);
});








    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('melody is running')
})

app.listen(port, () =>{
    console.log(`melody is running on port ${port}`);
})