
  // Handle form submission
  document.getElementById('fileForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const fileName = document.getElementById('fileName').value;
    const fileLink = document.getElementById('fileLink').value;

    // Send the file data to the backend to save in MongoDB
    const response = await fetch('http://localhost:3000/addFile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        fileLink
      })
    });

    const result = await response.json();

    // If the file is saved successfully, reload the file list
    if (result.success) {
      document.getElementById('fileName').value = '';
      document.getElementById('fileLink').value = '';
      loadFiles();  // Reload files after successful submission
    } else {
      alert('Failed to save the file. Please try again.');
    }
  });

  // Function to load and display files
  async function loadFiles() {
    const response = await fetch('http://localhost:3000/getFiles');
    const files = await response.json();
    
    const fileContainer = document.getElementById('fileContainer');
    fileContainer.innerHTML = ''; // Clear the container

    // Loop through each file and create the HTML structure
    files.forEach(file => {
      const fileElement = `
        <div class="post">
          <h2 class="file-name" onclick="toggleContent(this)">${file.fileName}</h2>
          <div class="content" style="display: none;">
            <iframe src="${file.fileLink}" width="960" height="569" allow="autoplay"></iframe>
          </div>
        </div>
      `;
      fileContainer.innerHTML += fileElement;
    });
  }

  // Load the files when the page loads
  window.onload = loadFiles;

  // Search functionality
  function searchPosts() {
    let input = document.getElementById('search-bar').value.toLowerCase();
    let posts = document.getElementsByClassName('post');

    if (input.trim() === "") {
        for (let i = 0; i < posts.length; i++) {
            posts[i].style.display = ""; // Show all posts
        }
        return;
    }

    // Filter posts based on the file name
    for (let i = 0; i < posts.length; i++) {
      let fileName = posts[i].getElementsByClassName('file-name')[0].innerText.toLowerCase();
      posts[i].style.display = fileName.includes(input) ? "" : "none"; // Show or hide the post
    }
  }

  // Check if the Enter key is pressed for searching
  function checkEnter(event) {
    if (event.key === "Enter") {
      searchPosts();
    }
  }

  // Toggle content visibility (expand/collapse file preview)
  function toggleContent(element) {
    const content = element.nextElementSibling;
    content.style.display = content.style.display === "none" ? "" : "none"; // Toggle visibility
  }

