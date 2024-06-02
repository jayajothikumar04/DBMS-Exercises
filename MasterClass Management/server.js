const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '10012005',
    database: process.env.DB_NAME || 'mastery'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// Signup route
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
        await connection.promise().query(insertQuery, [username, hashedPassword]);

        return res.status(201).json({ message: 'User registered successfully!', redirectUrl: '/contents' });
    } catch (error) {
        console.error('Error signing up:', error);
        return res.status(500).json({ error: 'Failed to sign up.' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user exists
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];

        // Compare the hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        return res.status(200).json({ message: 'Logged in successfully!', redirectUrl: '/contents' });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Failed to log in.' });
    }
});


// Serve the enroll form page
//app.get('/enroll', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'enroll.html'));
//});
app.get('/enroll', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'enroll.html'));
});

// Enrollment route - GET and POST
app.post('/enroll', (req, res) => {
    //if (req.method === 'GET') {
        //res.sendFile(path.join(__dirname, 'public', 'enroll.html'));
    if (req.method === 'POST') {

    const { name, age, dob, sex, phone, course } = req.body;

        if (!name || !age || !dob || !sex || !phone || !course) {
            res.status(400).json({ status: 'error', message: 'All fields are required' });
            return;
        }

        const insertQuery = "INSERT INTO enrollments (name, age, dob, sex, phone, course) VALUES (?, ?, ?, ?,?,?)";
        connection.query(insertQuery, [name, age, dob, sex, phone, course], (err, result) => {
            if (err) {
                console.error('Failed to enroll:', err);
                res.status(500).json({ status: 'error', message: 'Failed to enroll' });
                return;
            }
            console.log('Enrollment successful:', result);
            //res.json({ status: 'success', message: 'Enrolled successfully' });
            res.status(200).json({ message: 'Successfully enrolled', redirectUrl: '/display' });
        });
    }else {
        res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }
});

// Unenroll route
/*app.delete('/unenroll/:course', (req, res) => {
    const course = req.params.course;
    const { name } = req.body;

    // Check if the user is enrolled in the course
    const checkQuery = 'SELECT * FROM enrollments WHERE name = ? AND course = ?';
    connection.query(checkQuery, [name, course], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not enrolled in this course' });
        }

        // If user is enrolled, proceed with unenrollment
        const deleteQuery = 'DELETE FROM enrollments WHERE name = ? AND course = ?';
        connection.query(deleteQuery, [name, course], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err });
            }
            res.json({ message: 'Unenrollment successful!' });
        });
    });
});*/


app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

app.post('/search', (req, res) => {
    const { name, dob } = req.body;

    const sql = 'SELECT * FROM enrollments WHERE name = ? AND dob = ?';
    connection.query(sql, [name, dob], (err, results) => {
        if (err) {
            console.error('Error during search:', err);
            return res.status(500).json({ message: 'Failed to search. Please try again later.' });
        }
        res.status(200).json(results);
    });
});

app.delete('/unenroll/:id', (req, res) => {
    const id = req.params.id;

    const sql = 'DELETE FROM enrollments WHERE id = ?';
    connection.query(sql, id, (err, result) => {
        if (err) {
            console.error('Error during unenrollment:', err);
            return res.status(500).json({ success: false });
        }
        res.status(200).json({ success: true });
    });
});



// Gracefully handle MySQL connection closure
process.on('SIGINT', () => {
    connection.end((err) => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
        } else {
            console.log('MySQL connection closed');
        }
        process.exit();
    });
});
