import { GameBoard } from './gameBoard.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Kensington</h1>
    <canvas id="game-canvas"></canvas>
    <div id="game-info">
      <p>Initializing rhombitrihexagonal tiling board game...</p>
    </div>
    <div id="mobile-ui" style="display: none;">
      <div id="mobile-status"></div>
      <div id="mobile-controls"></div>
    </div>
  </div>
`

// Initialize the game board
const canvas = document.querySelector('#game-canvas')
const gameBoard = new GameBoard(canvas)

// Make gameBoard globally accessible for mobile UI
window.gameBoard = gameBoard

// Add mobile UI update function
gameBoard.updateMobileUI = function() {
  const mobileUI = document.querySelector('#mobile-ui')
  const mobileStatus = document.querySelector('#mobile-status')
  const isMobile = window.innerWidth <= 480
  
  if (isMobile) {
    mobileUI.style.display = 'block'
    
    let phaseText = `Phase: ${this.gameState === 'placement' ? 'Placement' : 'Movement'}`
    if (this.millRemovalState === 'removing') {
      phaseText += ' (Mill Removal)'
    }
    
    mobileStatus.innerHTML = `
      <div style="background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
        <div style="text-align: center; font-size: 12px; margin-bottom: 8px; color: #ccc;">
          ${phaseText}
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #ff6666;">Red: ${this.gameState === 'placement' ? this.redTokensPlaced : this.tokens.filter(t => t.color === 'red').length}/${this.maxTokensPerPlayer}</span>
          <span style="color: #6666ff;">Blue: ${this.gameState === 'placement' ? this.blueTokensPlaced : this.tokens.filter(t => t.color === 'blue').length}/${this.maxTokensPerPlayer}</span>
        </div>
        ${this.millRemovalState === 'removing' ? `
          <div style="text-align: center; font-size: 12px; color: #ffaa44; margin-bottom: 5px;">
            Opponent moves remaining: ${this.remainingOpponentMoves}
          </div>
        ` : ''}
        <div style="text-align: center; font-size: 13px; line-height: 1.3;">
          ${this.gameMessage}
        </div>
        ${this.gameWinner ? `
          <div style="text-align: center; margin-top: 10px;">
            <div style="font-weight: bold; font-size: 18px; color: ${this.gameWinner === 'red' ? '#ff6666' : '#6666ff'};">
              ${this.gameWinner.toUpperCase()} WINS!
            </div>
            <button onclick="window.gameBoard.resetGame()" style="
              background: #4CAF50; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              font-size: 16px; 
              margin-top: 10px;
              cursor: pointer;
            ">New Game</button>
          </div>
        ` : ''}
      </div>
    `
  } else {
    mobileUI.style.display = 'none'
  }
}

// Override the render method to update mobile UI
const originalRender = gameBoard.render.bind(gameBoard)
gameBoard.render = function() {
  originalRender()
  this.updateMobileUI()
}

gameBoard.init()
