const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let deck;
let dealerState = {
    sum: 0,
    aceCount: 0,
    cards: [],
    hidden: ""
};
let players = {};
let currentPlayerIndex = 0;
let playersReady = 0;

app.use('/cards', express.static(path.join(__dirname, 'cards')));
app.use('/client/script.js', express.static(path.join(__dirname, 'client/script.js')));
app.use('/client/style.css', express.static(path.join(__dirname, 'client/style.css')));

io.on('connection', (socket) => {
    socket.on('choose_name', (name) => {
        if (Object.keys(players).length < 2) {
            players[socket.id] = {
                id: socket.id,
                name: name.name,
                sum: 0,
                aceCount: 0,
                cards: [],
                canHit: true,
                busted: false,
                hasStayed: false
            };
            socket.emit('name_chosen', name.name);
            console.log(`${name.name} connected with id: ${socket.id}`);

            if (Object.keys(players).length === 2) {
                startGame();
                updateGameForAll();
            }
        } else {
            socket.emit('room_full', 'The game room is full.');
        }
    });

    socket.on('start_game', () => {
        playersReady++;

        if (allPlayersReady()) {
            startGame();
            updateGameForAll();
        }
    });
    
    socket.on('hit', () => {
        let player = players[socket.id];
        if (player && player.canHit && getCurrentPlayerId() === socket.id) {
            console.log('Client', socket.id, 'has requested to hit');
            hit(player);
        }
    });
    
    socket.on('stay', () => {
        let player = players[socket.id];
        if (player && getCurrentPlayerId() === socket.id) {
            console.log('Client', socket.id, 'has decided to stay');
            player.canHit = false;
            player.hasStayed = true;
            if (allPlayersStayed()) {
                dealerPlays();
            } else {
                nextPlayer();
            }
            updateGameForAll();
        }
    });    

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log(`Client ${socket.id} disconnected`);
    });

    function startGame() {
        dealerState.sum = 0;
        dealerState.aceCount = 0;
        dealerState.cards = [];
        dealerState.hidden = "";
    
        initializeDeck();
        shuffleDeck();
    
        dealerState.hidden = deck.pop();
        dealerState.sum += getValue(dealerState.hidden);
        dealerState.aceCount += checkAce(dealerState.hidden);
    
        let visibleCard = deck.pop();
        dealerState.cards.push(visibleCard);
        dealerState.sum += getValue(visibleCard);
        dealerState.aceCount += checkAce(visibleCard);
    
        for (let playerId in players) {
            let player = players[playerId];
            player.message = "";
            player.sum = 0;
            player.aceCount = 0;
            player.cards = [];
            player.canHit = true;
            player.busted = false;
            player.hasStayed = false;
    
            let card = deck.pop();
            player.cards.push(card);
            player.sum += getValue(card);
            player.aceCount += checkAce(card);
    
            card = deck.pop();
            player.cards.push(card);
            player.sum += getValue(card);
            player.aceCount += checkAce(card);
            
            if (player.sum == 21) {
                player.canHit = false;
                player.hasStayed = true;
            }

            if(player.sum > 21) {
                let result = reduceAce(player.sum, player.aceCount);
                player.sum = result.sum;
                player.aceCount = result.aceCount;
            }
        }
    
        currentPlayerIndex = 0;
        playersReady = 0; // Reset the count of ready players
    }
    
    function allPlayersReady() {
        return Object.values(players).length === 2 && playersReady === 2;
    }

    function hit(player) {
        if (!player.canHit) return;

        let card = deck.pop();
        player.cards.push(card);
        player.sum += getValue(card);
        player.aceCount += checkAce(card);

        let result = reduceAce(player.sum, player.aceCount);
        player.sum = result.sum;
        player.aceCount = result.aceCount;
        console.log(player.aceCount)
        if (player.sum > 21) {
            player.busted = true;
            player.canHit = false;
            player.hasStayed = true;  // Ensure the player is marked as having stayed
        }

        if (allPlayersStayed()) {
            dealerPlays();
        }

        updateGameForAll();
    }

    function dealerPlays() {
        let result = reduceAce(dealerState.sum, dealerState.aceCount);
        dealerState.sum = result.sum;
        dealerState.aceCount = result.aceCount; // Initial adjustment if needed
        while (dealerState.sum < 17) {
            let card = deck.pop();
            dealerState.cards.push(card);
            dealerState.sum += getValue(card);
            dealerState.aceCount += checkAce(card);
            let result = reduceAce(dealerState.sum, dealerState.aceCount);
            dealerState.sum = result.sum;
            dealerState.aceCount = result.aceCount;
        }

        for (let playerId in players) {
            let player = players[playerId];
            player.message = determineWinner(player);
        }

        updateGameForAll();
    }

    function determineWinner(player) {
        if (player.sum > 21) {
            return "You Lose!";
        } else if (dealerState.sum > 21 || player.sum > dealerState.sum) {
            return "You Win!";
        } else if (player.sum === dealerState.sum) {
            return "Tie!";
        } else {
            return "You Lose!";
        }
    }

    function getValue(card) {
        let data = card.split("-");
        let value = data[0];

        if (isNaN(value)) {
            if (value === "A") {
                return 11;
            }
            return 10;
        }
        return parseInt(value);
    }

    function checkAce(card) {
        return card[0] === "A" ? 1 : 0;
    }

    function reduceAce(sum, aceCount) {
        while (sum > 21 && aceCount > 0) {
            sum -= 10;
            aceCount--;
        }
        return { sum, aceCount };
    }

    function initializeDeck() {
        let values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        let types = ["C", "D", "H", "S"];
        deck = [];

        for (let i = 0; i < types.length; i++) {
            for (let j = 0; j < values.length; j++) {
                deck.push(values[j] + "-" + types[i]);
            }
        }
    }

    function shuffleDeck() {
        for (let i = 0; i < deck.length; i++) {
            let j = Math.floor(Math.random() * deck.length);
            let temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }
        console.log(deck);
    }

    function updateGameForAll() {
        let dealerVisibleCards = dealerState.cards.length > 1 ? dealerState.cards : ["BACK", dealerState.cards[0]];
        let dealerVisibleSum = dealerState.cards.length > 1 ? dealerState.sum : getValue(dealerState.cards[0]);
    
        if (allPlayersStayed()) {
            dealerVisibleCards = [dealerState.hidden, ...dealerState.cards]; // Reveal dealer cards if all players stayed
            dealerVisibleSum = dealerState.sum;
        }
        
        for (let playerId in players) {
            let player = players[playerId];
            let data = {
                dealerSum: dealerVisibleSum,
                yourSum: player.sum,
                dealerCards: dealerVisibleCards,
                yourCards: player.cards,
                otherPlayerCards: Object.values(players).filter(p => p.id !== playerId).map(p => ({
                    name: p.name,
                    sum: p.sum,
                    cards: p.cards
                })),
                busted: player.busted,
                message: player.message || "",
                currentPlayer: getCurrentPlayerId() === player.id,
                gameEnded: allPlayersStayed() // Indicate if game has ended
            };
            io.to(player.id).emit('update_game', data);
        }
    }

    function getCurrentPlayerId() {
        return Object.keys(players)[currentPlayerIndex];
    }

    function nextPlayer() {
        currentPlayerIndex = (currentPlayerIndex + 1) % Object.keys(players).length;
    }

    function allPlayersStayed() {
        return Object.values(players).every(player => player.hasStayed);
    }
    
});

server.listen(5000, () => {
    console.log('Server is running on port 5000');
});

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/client/index.html");
});