const socket = io();
let currentUsername = ''; // Store the current user's username
let isAdmin = false; // Change based on your user authentication logic

// On page load, check if user is logged in
window.onload = function() {
    currentUsername = localStorage.getItem('username');
    if (currentUsername) {
        document.getElementById('auth').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'block';
        setupChat(); // Start chat functionality
        loadMessages(); // Load saved messages
    }
};

// Handle registration
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (response.ok) {
            alert('Registration successful!');
            document.getElementById('auth').style.display = 'none';
            document.getElementById('chat').style.display = 'block';
            document.getElementById('logoutButton').style.display = 'block';
            currentUsername = username;
            localStorage.setItem('username', currentUsername); // Save username locally
        } else {
            return response.text().then(text => { throw new Error(text); });
        }
    })
    .catch(error => {
        console.error('Error during registration:', error);
        alert('Registration error: ' + error.message);
    });
});

// Handle login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    currentUsername = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, password }),
    })
    .then(response => {
        if (response.ok) {
            return response.json(); // Expecting a JSON response with admin status
        } else {
            return response.text().then(text => { throw new Error(text); });
        }
    })
    .then(data => {
        alert('Login successful!');
        isAdmin = data.isAdmin; // Check if user is admin
        document.getElementById('auth').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'block';
        localStorage.setItem('username', currentUsername); // Store username in local storage
        setupChat(); // Start chat functionality
        loadMessages(); // Load saved messages from database
    })
    .catch(error => {
        console.error('Error during login:', error);
        alert('Login error: ' + error.message);
    });
});

// Load saved messages from local storage
function loadMessages() {
    const messagesDiv = document.getElementById('messages');
    const messages = JSON.parse(localStorage.getItem('messages')) || [];

    messages.forEach(({ _id, user, msg }) => {
        const deleteButton = isAdmin ? `<button onclick="deleteMessage('${_id}')">Delete</button>` : '';
        messagesDiv.innerHTML += `<p id="msg-${_id}"><strong>${user}:</strong> ${msg} ${deleteButton}</p>`;
    });
}

// Set up chat functionality
function setupChat() {
    socket.off('chat message'); // Remove previous event listeners

    // Send message when button is clicked
    document.getElementById('sendButton').onclick = function() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (message) {
            const messageData = { user: currentUsername, msg: message };
            socket.emit('chat message', messageData); // Emit message to server
            messageInput.value = ''; // Clear input
        } else {
            alert("Please enter a message.");
        }
    };

    // Listen for incoming chat messages
    socket.on('chat message', ({ _id, user, msg }) => {
        const messagesDiv = document.getElementById('messages');
        const messageElement = document.createElement('p');
        messageElement.id = `msg-${_id}`;

        const usernameElement = document.createElement('strong');
        usernameElement.textContent = `${user}:`;

        const messageText = document.createTextNode(` ${msg}`);

        messageElement.appendChild(usernameElement);
        messageElement.appendChild(messageText);

        // If the user is admin, add a delete button
        if (isAdmin) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteMessage(_id);
            messageElement.appendChild(deleteButton);
        }

        messagesDiv.appendChild(messageElement);
    });

    // Listen for message deletions
    socket.on('message deleted', (messageId) => {
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (messageElement) {
            messageElement.remove(); // Remove message from UI
            removeMessageFromStorage(messageId); // Remove from local storage
        }
    });
}

// Remove message from local storage
function removeMessageFromStorage(messageId) {
    const messages = JSON.parse(localStorage.getItem('messages')) || [];
    const updatedMessages = messages.filter(message => message._id !== messageId);
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
}

// Delete message function
function deleteMessage(messageId) {
    if (confirm("Are you sure you want to delete this message?")) {
        socket.emit('delete message', messageId, currentUsername); // Pass the username to the server
    }
}

// Handle logout
document.getElementById('logoutButton').addEventListener('click', function() {
    localStorage.removeItem('username');
    document.getElementById('auth').style.display = 'block';
    document.getElementById('chat').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'none';
});
