import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let expenseCollection: any;

async function run() {
  try {
    await client.connect();
    const db = client.db("expense_db");
    expenseCollection = db.collection("expense");
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.log('Failed to connect the database:', error);
    process.exit(1);
  }
}

async function getCollection() {
  if (!expenseCollection) {
    await run();
  }
  return expenseCollection;
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/api/expense', async (req: Request, res: Response) => {
  try {
    const collection = await getCollection();
    const expense = await collection.find({}).sort({ date: -1 }).toArray();
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving expense data' });
  }
});

app.post('/api/expense', async (req: Request, res: Response) => {
  try {
    const collection = await getCollection();
    const { title, amount, category, date } = req.body;

    const newExpense = {
      title: title ? title.trim() : 'Untitled',
      amount: Number(amount),
      category,
      date,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newExpense);
    res.status(201).json({ _id: result.insertedId, ...newExpense });
  } catch (error) {
    res.status(500).json({ message: 'Error creating expense data' });
  }
});

app.put('/api/expense/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const collection = await getCollection();
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ObjectId' });
    }

    const { title, amount, category, date } = req.body;

    const updatedExpense = {
      title: title ? title.trim() : 'Untitled',
      amount: Number(amount),
      category,
      date,
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedExpense }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ _id: id, ...updatedExpense });
  } catch (error) {
    res.status(500).json({ message: 'Error updating expense data' });
  }
});

app.delete('/api/expense/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const collection = await getCollection();
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ObjectId' });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ message: `Expense with id ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense data' });
  }
});

run();
export default app;