import './style.css'
import { GameBoard } from './gameBoard.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Kensington</h1>
    <canvas id="game-canvas"></canvas>
    <div id="game-info">
      <p>Initializing...</p>
    </div>
  </div>
`

// Initialize the game board
const canvas = document.querySelector('#game-canvas')
const gameBoard = new GameBoard(canvas)
gameBoard.init()
