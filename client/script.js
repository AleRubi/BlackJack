const socket = io("multi-blackjack.glitch.me/");

document.getElementById('submit-username').addEventListener('click', () => {
    const username = document.getElementById('username-input').value.trim();
    if (username) {
        socket.emit('choose_name', { name: username });
    }
});

socket.on('name_chosen', (name) => {
    document.getElementById('player-heading').innerText = `${name}: `;
    document.getElementById('username-form').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
});

socket.on('room_full', (message) => {
    alert(message);
});

socket.on('update_game', (data) => {
    document.getElementById("dealer-sum").innerText = data.dealerSum ?? "";
    document.getElementById("player-heading").innerText = `${document.getElementById('player-heading').innerText.split(':')[0]}: ${data.yourSum}`;

    let dealerCards = document.getElementById("dealer-cards");
    dealerCards.innerHTML = "";
    data.dealerCards.forEach(card => {
        let img = document.createElement("img");
        img.src = card === "BACK" ? "https://cdn.glitch.global/454fcef4-a733-4f4e-a6cc-7cf2a577d545/BACK.png?v=1715966385973" : "https://cdn.glitch.global/454fcef4-a733-4f4e-a6cc-7cf2a577d545/" + card + ".png?v=1715966385973";
        dealerCards.appendChild(img);
    });

    let yourCards = document.getElementById("your-cards");
    yourCards.innerHTML = "";
    data.yourCards.forEach(card => {
        let img = document.createElement("img");
        img.src = "https://cdn.glitch.global/454fcef4-a733-4f4e-a6cc-7cf2a577d545/" + card + ".png?v=1715966385973";
        yourCards.appendChild(img);
    });

    let otherPlayersDiv = document.getElementById("other-players");
    otherPlayersDiv.innerHTML = "";
    data.otherPlayerCards.forEach((playerData, index) => {
        let playerDiv = document.createElement("div");
        playerDiv.className = "player-section";
        playerDiv.innerHTML = `<h2>${playerData.name}: ${playerData.sum}</h2><div class="player-cards"></div>`;
        let playerCardsDiv = playerDiv.querySelector('.player-cards');
        playerData.cards.forEach(card => {
            let img = document.createElement("img");
            img.src = "https://cdn.glitch.global/454fcef4-a733-4f4e-a6cc-7cf2a577d545/" + card + ".png?v=1715966385973";
            playerCardsDiv.appendChild(img);
        });
        otherPlayersDiv.appendChild(playerDiv);
    });

    document.getElementById("hit").disabled = !data.currentPlayer || data.gameEnded;
    document.getElementById("stay").disabled = !data.currentPlayer || data.gameEnded;
    document.getElementById("start").disabled = !data.gameEnded;

    document.getElementById("results").innerText = data.message;
});

document.getElementById("start").addEventListener("click", () => {
            document.getElementById("hit").disabled = false;
            document.getElementById("stay").disabled = false;
            document.getElementById("your-cards").innerHTML = "";
            document.getElementById("dealer-cards").innerHTML = '<img id="hidden" src="https://cdn.glitch.global/454fcef4-a733-4f4e-a6cc-7cf2a577d545/BACK.png?v=1715966385973">';
            document.getElementById("results").innerText = "";
            document.getElementById("start").disabled = true;

            document.getElementById("player-heading").innerText = `${document.getElementById('player-heading').innerText.split(':')[0]}: `;
            document.getElementById("dealer-sum").innerText = "";

            document.getElementById("other-players").innerHTML = "";

            socket.emit('start_game');
        });

document.getElementById("hit").addEventListener("click", () => {
    socket.emit('hit');
});

document.getElementById("stay").addEventListener("click", () => {
    socket.emit('stay');
});