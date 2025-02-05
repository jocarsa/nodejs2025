// cliente.js

// Global Variables
let usuario = "";            // Current user's username
let userId = "";             // Current user's unique ID
let currentRoom = "global";  // Default chat room
let temporizador;            // Timer for fetching messages

// Utility Function: Convert a string to a color hue (0-360)
function stringToMod360(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

// Function: Register or Reconnect the user
function registerOrReconnectUser() {
  // Check if userId is stored in localStorage
  const storedUserId = localStorage.getItem('userId');
  const storedUsername = localStorage.getItem('username');

  if (storedUserId && storedUsername) {
    // Attempt to reconnect using stored userId and username
    console.log('Attempting to reconnect with stored userId and username...');
    fetch(`http://localhost:3000/register?username=${encodeURIComponent(storedUsername)}&userId=${encodeURIComponent(storedUserId)}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error('Reconnection failed:', data.error);
          // If reconnection fails, proceed to register a new user
          promptForUsername();
        } else {
          // Successful reconnection
          usuario = data.username;
          userId = data.id;
          console.log(`Reconnected as ${usuario} with ID ${userId}`);
          loadUserList();
          startReceiving();
        }
      })
      .catch(err => {
        console.error('Error during reconnection:', err);
        // If an error occurs, proceed to register a new user
        promptForUsername();
      });
  } else {
    // No stored userId, proceed to register a new user
    promptForUsername();
  }
}

// Function: Prompt the user to enter a username
function promptForUsername() {
  usuario = prompt("Por favor, ingresa tu nombre de usuario:");

  if (usuario) {
    // Send registration request to the server
    fetch(`http://localhost:3000/register?username=${encodeURIComponent(usuario)}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          // Username is taken or invalid, retry registration
          alert(data.error);
          promptForUsername();
        } else {
          // Successful registration
          usuario = data.username;
          userId = data.id;
          // Store userId and username in localStorage
          localStorage.setItem('userId', userId);
          localStorage.setItem('username', usuario);
          console.log(`Registered as ${usuario} with ID ${userId}`);
          loadUserList();
          startReceiving();
        }
      })
      .catch(err => {
        console.error('Error registering user:', err);
        alert("Error al registrar el usuario. Inténtalo de nuevo.");
        promptForUsername();
      });
  } else {
    // No username provided, retry registration
    promptForUsername();
  }
}

// Function: Load and display the user list
function loadUserList() {
  fetch('http://localhost:3000/users')
    .then(response => response.json())
    .then(data => {
      const usuariosUl = document.getElementById('usuarios');
      // Reset the user list, keeping the global room
      usuariosUl.innerHTML = '<li><a href="#" data-room="global">Sala Global</a></li>';

      data.forEach(user => {
        if (user.username !== usuario) { // Exclude current user from the list
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = "#";
          a.textContent = user.username;
          a.dataset.room = `private_${sortedRoomId(userId, user.id)}`; // Unique room identifier
          li.appendChild(a);
          usuariosUl.appendChild(li);
        }
      });
    })
    .catch(err => {
      console.error('Error fetching user list:', err);
    });
}

// Function: Generate a sorted room ID for private chats
function sortedRoomId(id1, id2) {
  // Ensure consistent ordering by sorting the IDs alphabetically
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

// Event Listener: Handle clicks on the user list to switch rooms
document.getElementById('usuarios').addEventListener('click', function(event) {
  event.preventDefault();
  if (event.target.tagName === 'A') {
    const clickedUsername = event.target.textContent;
    const room = event.target.dataset.room;
    currentRoom = room;

    if (room === 'global') {
      document.getElementById('current-room').textContent = 'Sala Global';
    } else {
      document.getElementById('current-room').textContent = `Chat Privado con ${clickedUsername}`;
    }

    // Clear existing messages and fetch messages for the selected room
    document.getElementById('mensajes').innerHTML = "";
    recibe();
  }
});

// Function: Send a message
function enviarMensaje() {
  let mensajeInput = document.querySelector("#mensaje");
  let mensaje = mensajeInput.value.trim();

  if (!mensaje) return; // Do not send empty messages
  mensajeInput.value = ""; // Clear the input field

  // Determine the target room
  let room = currentRoom;

  // Send the message to the server without modifying the room ID
  console.log(`Sending message to room: ${room}`);

  fetch(
    `http://localhost:3000/envia?mensaje=${encodeURIComponent(mensaje)}&usuario=${encodeURIComponent(usuario)}&room=${encodeURIComponent(room)}`
  )
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error('Error sending message:', data.error);
      alert("Error al enviar el mensaje.");
    }
  })
  .catch(err => {
    console.error('Error sending message:', err);
    alert("Error al enviar el mensaje.");
  });
}

// Event Listener: Handle click on the send button
document.querySelector("#enviar").onclick = enviarMensaje;

// Event Listener: Handle "Enter" key press in the message input
document.querySelector("#mensaje").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    enviarMensaje();
  }
});

// Function: Fetch and display messages for the current room
function recibe() {
  console.log(`Fetching messages from room: ${currentRoom}`);

  fetch(`http://localhost:3000/recibe?room=${encodeURIComponent(currentRoom)}`)
    .then((response) => response.json())
    .then((datos) => {
      let mensajesDiv = document.querySelector("#mensajes");
      mensajesDiv.innerHTML = ""; // Clear existing messages

      datos.forEach((dato) => {
        let articulo = document.createElement("article");
        let cabecera = document.createElement("h6");

        // Format the date
        const fecha = new Date(dato.fecha);
        cabecera.textContent = `${fecha.toLocaleString()} - ${dato.usuario}:`;
        articulo.appendChild(cabecera);

        let parrafo = document.createElement("p");
        parrafo.textContent = dato.mensaje;
        articulo.appendChild(parrafo);

        // Set a background color based on the user's name
        articulo.style.background = `hsl(${stringToMod360(dato.usuario)}deg, 50%, 90%)`;

        mensajesDiv.appendChild(articulo);
      });

      // Scroll to the bottom of the messages
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    })
    .catch(err => {
      console.error('Error fetching messages:', err);
    });

  // Reset the timer for the next fetch
  clearTimeout(temporizador);
  temporizador = setTimeout(recibe, 1000);
}

// Function: Start receiving messages
function startReceiving() {
  temporizador = setTimeout(recibe, 1000);
}

// Emoji Selector Functionality

// Toggle the visibility of the emoji container
document.querySelector("#emoji").onclick = function () {
  let emojiContainer = document.querySelector("#emojis");
  emojiContainer.style.display =
    emojiContainer.style.display === "block" ? "none" : "block";
};

// Handle emoji selection
document.getElementById("emojis").addEventListener("click", function (event) {
  const emoji = event.target.textContent;
  if (emoji) {
    document.querySelector("#mensaje").value += emoji;
  }
});

// Periodically update the user list (optional)
setInterval(loadUserList, 5000); // Refresh user list every 5 seconds

// Initialize the chat application when the page loads
window.onload = function() {
  registerOrReconnectUser();
};

