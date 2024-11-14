import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const port = 8081;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

const mongoURI = 'mongodb://localhost:27017/book_library';

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(error => console.error('Database connection error:', error));

const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: String,
  phone: String,
});

const collection = mongoose.model('users', userSchema);

app.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const check = await collection.findOne({ email: email });
    if (check) {
      if (check.password === password) {
        console.log(check.role);
        return res.json({
          message: "exist",
          userId: check._id,
          email: check.email,
          role: check.role
        });
      } else {
        return res.json({ message: "fail" }); 
      }
    } else {
      return res.json({ message: "notexist" }); 
    }
  } catch (e) {
    console.error("Login error:", e);
    return res.json({ message: "error" }); 
  }
});


app.post('/api/signup', async (req, res) => {
  const { email, password, firstname, lastname, phone } = req.body;

  if (!firstname || !email || !password || !lastname) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const data = { email, password, firstname, lastname, phone };
  try {
    console.log("Request received:", req.body);
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      console.log("User already exists");
      return res.json("exist");
    } else {
      const newUser = new collection(data);
      await newUser.save();
      console.log("User created successfully");
      return res.json("notexist");
    }
  } catch (e) {
    console.error("Error during signup:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/send-confirmation', async (req, res) => {
  const { userEmail, orderDetails } = req.body;

  console.log('Received request to send email to:', userEmail);

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'sivakavindratamilselvan@gmail.com',
      pass: 'lvnbdnftzntovzuh',
    },
    debug: true,
    logger: true,
  });

  console.log('Transporter created successfully');
  const mailOptions = {
    from: 'sivakavindratamilselvan@gmail.com',
    to: userEmail,
    subject: 'New SignUp',
    text: `You have created an account for book library successfully.`,
  };

  try {
    console.log('Sending email...');
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

const BookSchema = new mongoose.Schema({
  isbn: String,
  title: String,
  series_title: String,
  authors: String,
  publisher: String,
  language: String,
  description: String,
  num_pages: String,
  format: String,
  genres: String,
  publication_date: String,
  rating_score: Number,
  num_ratings: Number,
  num_reviews: Number,
  current_readers: Number,
  want_to_read: Number,
  price: Number,
  url: String,
  number_of_copies:Number
});

const Book = mongoose.model('books', BookSchema);

app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const favoritesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  isbn: { type: String, required: true },
});
let a=2;
const Favorites = mongoose.model('Favorites', favoritesSchema);
app.post('/api/selected-books', async (req, res) => {
  try {
    a=a+1;
    const { userId, isbn } = req.body;
    console.log(userId+" "+isbn+"+"+a);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!isbn) {
      return res.status(400).json({ error: 'ISBN is required' });
    }

    const existingFavorite = await Favorites.findOne({ userId, isbn });
    if (existingFavorite) {
      console.log("added");
      return res.status(400).json({ message: 'Book is already in favorites' });
    }
    else
    {
    const newFavorite = new Favorites({
      userId,
      isbn,
    });

    await newFavorite.save();

    res.json({ message: 'Book added to favorites successfully' });
  }
  } catch (err) {
    console.error('Error adding book to favorites:', err.message);
    res.status(500).json({ error: err.message });
  }
});


const issuesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  isbn: { type: String, required: true },
  issueDate: { type: Date, default: Date.now }, // Current date as issue date
  dueDate: { type: Date, required: true },
  remainingDays: { type: Number, required: true },
});

const Issue = mongoose.model('Issue', issuesSchema);
app.post('/api/issue-books', async (req, res) => {
  try {
    const { userId, isbn } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!isbn) {
      return res.status(400).json({ error: 'ISBN is required' });
    }

    // Check if the book is already issued to the user
    const existingIssue = await Issue.findOne({ userId, isbn });
    if (existingIssue) {
      return res.status(400).json({ message: 'Book is already issued' });
    }

    // Find the book by ISBN
    const book = await Book.findOne({ isbn });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if there are available copies
    if (book.number_of_copies <= 0) {
      return res.status(400).json({ error: 'No copies available for issue' });
    }

    // Decrease the number of copies by 1
    book.number_of_copies -= 1;
    await book.save(); // Save the updated book information

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(issueDate.getDate() + 15); // Due date is 15 days from the issue date

    // Calculate remaining days
    const remainingDays = Math.ceil((dueDate - issueDate) / (1000 * 60 * 60 * 24));

    // Create and save new issue
    const newIssue = new Issue({
      userId,
      isbn,
      issueDate,
      dueDate,
      remainingDays,
    });

    await newIssue.save();

    res.json({ message: 'Book issued successfully', issuedBook: newIssue });
  } catch (err) {
    console.error('Error issuing book:', err.message);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/favorites', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const favoriteIds = await Favorites.find({ userId }).distinct('isbn');
    const favorites = await Book.find({ isbn: { $in: favoriteIds } });

    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites/:isbn', async (req, res) => {
  const { userId } = req.body;
  const { isbn } = req.params;

  try {
      await Favorites.findOneAndDelete({ userId, isbn });
      res.status(200).json({ message: 'Favorite removed successfully' });
  } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Error removing favorite' });
  }
});


app.delete('/api/issues/:isbn', async (req, res) => {
  const { userId } = req.body;
  const { isbn } = req.params;

  try {
      await Issue.findOneAndDelete({ userId, isbn });
      const book = await Book.findOne({ isbn });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if there are available copies
    if (book.number_of_copies <= 0) {
      return res.status(400).json({ error: 'No copies available for issue' });
    }

    // Decrease the number of copies by 1
    book.number_of_copies += 1;
    await book.save(); // Save the updated book information


      res.status(200).json({ message: 'Favorite removed successfully' });
      
  } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Error removing favorite' });
  }
});

app.get('/api/issues', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const issues = await Issue.find({ userId });
    const favoriteIsbns = issues.map(issue => issue.isbn);

    const favorites = await Book.find({ isbn: { $in: favoriteIsbns } });
    const booksWithIssueData = favorites.map(book => {
      const issue = issues.find(iss => iss.isbn === book.isbn);
      const currentDate = new Date();
      const dueDate = new Date(issue.dueDate);
      
      const remainingDays = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...book.toObject(),
        issueDate: issue.issueDate,
        dueDate: issue.dueDate,
        remainingDays: remainingDays > 0 ? remainingDays : 0,
      };
    });

    res.json(booksWithIssueData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





app.post("/addBook", async (req, res) => {
  const {
    title, authors, publisher, language, description, num_pages,
    format, genres, publication_date, rating_score, num_ratings,
    num_reviews, current_readers, want_to_read, price, url
  } = req.body;

  try {
    const newBook = new Book({
      title,
      authors,
      publisher,
      language,
      description,
      num_pages,
      format,
      genres,
      publication_date,
      rating_score,
      num_ratings,
      num_reviews,
      current_readers,
      want_to_read,
      price,
      url
    });

    await newBook.save();
    res.status(201).json({ message: "Book added successfully" });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ message: "Failed to add book" });
  }
});

app.get('/api/book', async (req, res) => {
  try {
    const favoriteIds = await Favorites.distinct('isbn');

    const books = await Book.find({isbn: { $in: favoriteIds } });
    const genresArray = books.map((book) => {
      if (book.genres && typeof book.genres === 'string') {
        let cleanedGenres = book.genres.trim();
        
        if (cleanedGenres.startsWith('[') && cleanedGenres.endsWith(']')) {
          cleanedGenres = cleanedGenres.slice(1, -1);
        }

        const genresArrayFromString = cleanedGenres
          .split(',')
          .map(genre => genre.trim())
          .filter(genre => genre);

        return genresArrayFromString;
      }
      return []; 
    }).flat();

    const genreCounts = genresArray.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});

    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1]) 
      .slice(0, 10); 

    const otherCount = Object.entries(genreCounts)
      .slice(10)
      .reduce((acc, [genre, count]) => acc + count, 0);

    if (otherCount > 0) {
      sortedGenres.push(['Other', otherCount]);
    }

    const genreChartData = sortedGenres.map(([name, value]) => ({
      name,
      value,
    }));

    res.json(genreChartData); 
  } catch (error) {
    console.error('Error fetching book data:', error);
    res.status(500).json({ message: 'Error fetching book data.' });
  }
});



app.get('/api/top-3-favorite-books', async (req, res) => {
  try {
    const topFavoriteBooks = await Favorites.aggregate([
      { $group: { _id: "$isbn", count: { $sum: 1 } } }, 
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    if (topFavoriteBooks.length > 0) {
      const bookDetails = await Book.find({
        isbn: { $in: topFavoriteBooks.map(book => book._id) }
      });
      res.json(bookDetails);
    } else {
      res.status(404).json({ message: "No favorites found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// In your Express backend
app.post('/api/users', async (req, res) => {
  const { query } = req.body;
  console.log(query);
  try {
      const user = await collection.findOne({email:query});
      if (user) {
          res.json(user);
      } else {
          res.status(404).json({ message: 'User not found' });
      }
  } catch (error) {
      res.status(500).json({ message: 'Error fetching user data' });
  }
});


app.delete('/api/book/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const deletedBook = await Book.findOneAndDelete({ isbn });

    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: `Book with ISBN ${isbn} successfully deleted.` });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Failed to delete the book' });
  }
});

// PUT: Update book by ISBN
app.put('/api/books/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const updatedBook = await Book.findOneAndUpdate({ isbn }, req.body, { new: true });
    console.log(isbn);
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully', book: updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Failed to update the book' });
  }
});

app.get('/api/books/:isbn', async (req, res) => {
  const { isbn } = req.params;
  try {
      const book = await Book.findOne({ isbn });
      if (!book) {
          return res.status(404).json({ message: 'Book not found' });
      }
      res.json(book);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching book', error });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
