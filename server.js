const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(__dirname));


// Define ports
const port = 3000;

// MongoDB Connection
mongoose.connect('mongodb+srv://mralinasir40:gcGboyClPeOJ5xZw@cluster0.a0exm.mongodb.net/live-chat?retryWrites=true&w=majority&appName=Cluster0')
.then((conn) => console.log('MongoDB connected', conn.connections[0].host))
.catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
    user: String, // MongoDB will use its built-in _id field for unique IDs
    msg: String
});
const Message = mongoose.model('Message', messageSchema);

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});
const User = mongoose.model('User', userSchema);

// File Schema for uploads
const fileSchema = new mongoose.Schema({
    fileName: String,
    fileLink: String
});
const File = mongoose.model('File', fileSchema);

// Endpoint to add a file
app.post('/addFile', async (req, res) => {
    const { fileName, fileLink } = req.body;
    const newFile = new File({ fileName, fileLink });
    await newFile.save();
    res.json(newFile);
       res.status(200).json({ success: true, message: 'File saved successfully!' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ success: false, message: 'Failed to save file' });
  }
});

// Endpoint to get all files
app.get('/getFiles', async (req, res) => {
    const files = await File.find();
    res.json(files);
});

// Routes
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).send('User already exists'); // Check if user already exists
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).send('User registered'); // Send success response
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            // If login is successful, send back the admin status
            res.json({ isAdmin: username === 'admin' });
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Socket.io
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send all messages to the new user
    Message.find().then(messages => {
        socket.emit('all messages', messages);
    }).catch(err => console.error('Error fetching messages:', err));

    // Handle receiving a new chat message
    socket.on('chat message', (data) => {
        const message = new Message(data);
        message.save().then(() => {
            io.emit('chat message', data); // Broadcast message to all users
        }).catch(err => console.error('Error saving message:', err));
    });

    // Handle deleting a message with admin validation
    socket.on('delete message', (messageId, username) => {
        // Check if the user is admin
        User.findOne({ username }).then(user => {
            if (user && user.username === 'admin') {
                Message.findOneAndDelete({ _id: messageId }).then(() => {
                    io.emit('message deleted', messageId); // Notify all clients to delete the message
                }).catch(err => console.error('Error deleting message:', err));
            } else {
                console.error('Unauthorized message deletion attempt by:', username);
                socket.emit('error', 'Unauthorized action. Admin privileges required.');
            }
        }).catch(err => console.error('Error during admin check:', err));
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
