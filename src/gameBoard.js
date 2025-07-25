export class GameBoard {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.boardImage = null
    this.isImageLoaded = false
    
    // Scale factor for responsive design
    this.scale = 1
    
    // Board dimensions (will be set when image loads)
    this.boardWidth = 0
    this.boardHeight = 0
    
    // Game state
    this.gameState = 'placement' // 'placement' or 'movement'
    this.currentPlayer = 'red' // 'red' or 'blue'
    this.redTokensPlaced = 0
    this.blueTokensPlaced = 0
    this.maxTokensPerPlayer = 15
    this.tokens = [] // Array of {x, y, color} objects
    this.selectedVertex = null // For movement phase
    this.gameWinner = null
    this.gameMessage = ''
    
    // Bind event handlers
    this.handleResize = this.handleResize.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  async init() {
    try {
      console.log('Starting GameBoard initialization...')
      
      await this.loadBoardImage()
      console.log('Board image loaded successfully')
      
      this.setupCanvas()
      console.log('Canvas setup complete')
      
      this.setupEventListeners()
      this.initializeBoardGeometry()
      console.log('Board geometry initialized')
      
      // Initialize game
      this.initializeGame()
      
      this.render()
      console.log('Rhombitrihexagonal tiling shape initialized successfully!')
    } catch (error) {
      console.error('Failed to initialize:', error)
      // Continue without board image
      this.boardWidth = 800
      this.boardHeight = 600
      this.isImageLoaded = true
      this.setupCanvas()
      this.setupEventListeners()
      this.initializeBoardGeometry()
      this.initializeGame()
      this.render()
    }
  }

  loadBoardImage() {
    return new Promise((resolve, reject) => {
      this.boardImage = new Image()
      this.boardImage.onload = () => {
        this.boardWidth = this.boardImage.width
        this.boardHeight = this.boardImage.height
        this.isImageLoaded = true
        console.log(`Board image loaded: ${this.boardWidth}x${this.boardHeight}`)
        resolve()
      }
      this.boardImage.onerror = (error) => {
        console.error('Failed to load board image:', error)
        reject(new Error('Failed to load board image'))
      }
      this.boardImage.src = '/Kensington_board.svg.png'
    })
  }

  setupCanvas() {
    // Reserve space for the UI panel on the right (200px)
    const uiPanelWidth = 200
    const availableWidth = window.innerWidth - uiPanelWidth
    
    // Set canvas size based on board image and viewport, leaving room for UI
    const maxWidth = Math.min(availableWidth * 0.9, this.boardWidth)
    const maxHeight = Math.min(window.innerHeight * 0.7, this.boardHeight)
    
    // Calculate scale to fit the board in the viewport
    this.scale = Math.min(maxWidth / this.boardWidth, maxHeight / this.boardHeight)
    
    // Set canvas size to include both board area and UI panel
    const boardCanvasWidth = this.boardWidth * this.scale
    const totalCanvasWidth = boardCanvasWidth + uiPanelWidth
    
    this.canvas.width = totalCanvasWidth
    this.canvas.height = this.boardHeight * this.scale
    
    // Store the board area width for UI positioning
    this.boardAreaWidth = boardCanvasWidth
    
    // Set CSS size for crisp rendering
    this.canvas.style.width = `${this.canvas.width}px`
    this.canvas.style.height = `${this.canvas.height}px`
    
    console.log(`Canvas setup: ${this.canvas.width}x${this.canvas.height}, scale: ${this.scale}, board area: ${this.boardAreaWidth}px`)
  }

  setupEventListeners() {
    window.addEventListener('resize', this.handleResize)
    this.canvas.addEventListener('click', this.handleClick)
  }

  initializeBoardGeometry() {
    // Define a rhombitrihexagonal tiling unit for demonstration
    this.tilingUnit = {
      center: { x: 0.5, y: 0.5 }, // Center of the canvas
      scale: 0.2 // Size of the tiling unit
    }
    
    console.log('Rhombitrihexagonal tiling unit initialized')
  }

  initializeGame() {
    this.gameMessage = `Red player's turn. ${this.maxTokensPerPlayer} tokens to place.`
  }

  handleResize() {
    this.setupCanvas()
    this.render()
  }

  render() {
    if (!this.isImageLoaded) {
      return
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Fill with slightly darker purple background
    this.ctx.fillStyle = '#e8e0ff'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Reset vertices for each render
    this.vertices = []
    
    // Draw rhombitrihexagonal tiling unit
    this.drawRhombitrihexagonalTiling()
    
    // Draw all vertices after all shapes are drawn
    this.drawVertices()
    
    // Draw separator line between board and UI
    this.ctx.save()
    this.ctx.strokeStyle = '#cccccc'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(this.boardAreaWidth + 10, 0)
    this.ctx.lineTo(this.boardAreaWidth + 10, this.canvas.height)
    this.ctx.stroke()
    this.ctx.restore()
    
    // Highlight selected vertex if any
    if (this.selectedVertex) {
      this.ctx.save()
      this.ctx.strokeStyle = '#ffff00'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.arc(this.selectedVertex.x, this.selectedVertex.y, 8, 0, 2 * Math.PI)
      this.ctx.stroke()
      this.ctx.restore()
    }
    
    // Draw game UI
    this.drawGameUI()
  }

  drawRhombitrihexagonalTiling() {
    const center = this.tilingUnit.center
    const scale = this.tilingUnit.scale
    // Center the board in the board area (left portion of canvas)
    const scaledX = center.x * this.boardAreaWidth
    const scaledY = center.y * this.canvas.height
    const unitSize = scale * Math.min(this.boardAreaWidth, this.canvas.height)
    
    // Calculate the distance between hexagon centers so that square 1 of left overlaps with square 4 of right
    const hexRadius = unitSize * 0.5
    const squareSide = hexRadius
    const squareDistance = (squareSide / Math.sqrt(2)) / 2
    
    // Square 1 is at angle 0 (top-right), Square 4 is at angle π (bottom-left)
    // Distance from hexagon center to square center for each
    const square1Angle = 0 // Square 1 angle
    const square4Angle = Math.PI // Square 4 angle (180 degrees)
    
    // Calculate the offset needed to align the squares
    const square1OffsetX = Math.cos(square1Angle) * (hexRadius + squareDistance)
    const square4OffsetX = Math.cos(square4Angle) * (hexRadius + squareDistance)
    
    // The distance between hexagon centers should be the difference in their square positions
    const hexagonSpacing = square1OffsetX - square4OffsetX
    
    // Calculate vertical spacing for the second row
    const verticalSpacing = unitSize * 1.2
    
    // Top row - Draw first Kensington Hexagon (left) - moved up slightly
    const topY = scaledY - verticalSpacing + unitSize * 0.01 // Small positive offset to move down a bit more
    const leftX = scaledX - hexagonSpacing / 2
    this.drawKensingtonHexagon(leftX, topY, unitSize, 1)
    
    // Top row - Draw second Kensington Hexagon (right)
    const rightX = scaledX + hexagonSpacing / 2
    this.drawKensingtonHexagon(rightX, topY, unitSize, 2)
    
    // Middle row - Draw three overlapping Kensington Hexagons
    const middleY = scaledY
    
    // Middle left hexagon
    const middleLeftX = scaledX - hexagonSpacing
    this.drawKensingtonHexagon(middleLeftX, middleY, unitSize, 3)
    
    // Middle center hexagon (overlaps with left and right)
    const middleCenterX = scaledX
    this.drawKensingtonHexagon(middleCenterX, middleY, unitSize, 4)
    
    // Middle right hexagon
    const middleRightX = scaledX + hexagonSpacing
    this.drawKensingtonHexagon(middleRightX, middleY, unitSize, 5)
    
    // Bottom row - Draw two more overlapping Kensington Hexagons
    const bottomY = scaledY + verticalSpacing - unitSize * 0.01 // Increased negative offset to move bottom row up more
    
    // Bottom left hexagon
    const bottomLeftX = scaledX - hexagonSpacing / 2
    this.drawKensingtonHexagon(bottomLeftX, bottomY, unitSize, 6)
    
    // Bottom right hexagon
    const bottomRightX = scaledX + hexagonSpacing / 2
    this.drawKensingtonHexagon(bottomRightX, bottomY, unitSize, 7)
  }

  drawKensingtonHexagon(centerX, centerY, unitSize, hexagonNumber = null) {
    // Initialize vertices array if it doesn't exist
    if (!this.vertices) {
      this.vertices = []
    }
    
    // Set drawing style
    this.ctx.strokeStyle = '#808080' // Gray for visibility
    this.ctx.lineWidth = 1 // Reduced line width for hexagon and squares
    
    // Set fill color based on hexagon number
    if (hexagonNumber === 1 || hexagonNumber === 2) {
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)' // More opaque red fill for hexagons 1 and 2
    } else if (hexagonNumber === 3 || hexagonNumber === 4 || hexagonNumber === 5) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)' // White fill for hexagons 3, 4, and 5
    } else if (hexagonNumber === 6 || hexagonNumber === 7) {
      this.ctx.fillStyle = 'rgba(0, 0, 255, 0.6)' // Blue fill for hexagons 6 and 7
    } else {
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)' // Semi-transparent red fill for others
    }
    
    // Draw central hexagon
    const hexRadius = unitSize * 0.5
    this.drawPolygon(centerX, centerY, hexRadius, 6, Math.PI / 6, true) // Rotate 30 degrees
    
    // Calculate square side length (same as hexagon side length)
    const squareSide = hexRadius // Square side = hexagon radius (which equals hexagon side length)
    
    // Draw 6 squares sharing sides with the hexagon
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6 - Math.PI / 6 // Hexagon side angles + 30 degree rotation - 30 degree clockwise movement
      
      // Calculate the center of the hexagon side
      const sideCenter = {
        x: centerX + Math.cos(angle) * hexRadius,
        y: centerY + Math.sin(angle) * hexRadius
      }
      
      // Position square so its inner side overlaps exactly with the hexagon side
      // The square's inner edge should be at the hexagon side, so center is at distance of half the square's diagonal from the hexagon side
      const squareDistance = (squareSide / Math.sqrt(2)) / 2 // Half the diagonal of the square
      const squareX = sideCenter.x + Math.cos(angle) * squareDistance
      const squareY = sideCenter.y + Math.sin(angle) * squareDistance
      
      // Draw square with rotation to align with corresponding hexagon side
      let squareRotation = Math.PI / 4 + Math.PI / 8 // Default 22.5 degree rotation
      if (i === 0) {
        // For square 1, rotate 45 degrees so its sides are parallel to side 1 of the hexagon
        squareRotation = Math.PI / 4 // 45 degrees to align with hexagon side 1
      } else if (i === 1) {
        // For square 2, rotate to align with side 2 of the hexagon
        squareRotation = Math.PI / 4 + Math.PI / 3 // 45 + 60 = 105 degrees
      } else if (i === 2) {
        // For square 3, rotate to align with side 3 of the hexagon
        squareRotation = Math.PI / 4 + 2 * Math.PI / 3 // 45 + 120 = 165 degrees
      } else if (i === 3) {
        // For square 4, rotate to align with side 4 of the hexagon
        squareRotation = Math.PI / 4 + Math.PI // 45 + 180 = 225 degrees
      } else if (i === 4) {
        // For square 5, rotate to align with side 5 of the hexagon
        squareRotation = Math.PI / 4 + 4 * Math.PI / 3 // 45 + 240 = 285 degrees
      } else if (i === 5) {
        // For square 6, rotate to align with side 6 of the hexagon
        squareRotation = Math.PI / 4 + 5 * Math.PI / 3 // 45 + 300 = 345 degrees
      }
      this.drawPolygon(squareX, squareY, squareSide / Math.sqrt(2), 4, squareRotation, false)
    }
    
    // Store square information for connecting lines and vertices
    const squares = []
    const squareCorners = [] // Store all corners for vertex processing
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6 - Math.PI / 6
      
      const sideCenter = {
        x: centerX + Math.cos(angle) * hexRadius,
        y: centerY + Math.sin(angle) * hexRadius
      }
      
      const squareDistance = (squareSide / Math.sqrt(2)) / 2
      const squareX = sideCenter.x + Math.cos(angle) * squareDistance
      const squareY = sideCenter.y + Math.sin(angle) * squareDistance
      
      // Calculate square rotation for this square
      let squareRotation = Math.PI / 4 + Math.PI / 8
      if (i === 0) {
        squareRotation = Math.PI / 4
      } else if (i === 1) {
        squareRotation = Math.PI / 4 + Math.PI / 3
      } else if (i === 2) {
        squareRotation = Math.PI / 4 + 2 * Math.PI / 3
      } else if (i === 3) {
        squareRotation = Math.PI / 4 + Math.PI
      } else if (i === 4) {
        squareRotation = Math.PI / 4 + 4 * Math.PI / 3
      } else if (i === 5) {
        squareRotation = Math.PI / 4 + 5 * Math.PI / 3
      }
      
      // Calculate all 4 corners of this square
      const squareRadius = squareSide / Math.sqrt(2)
      const corners = []
      for (let corner = 0; corner < 4; corner++) {
        const cornerAngle = squareRotation + (corner * Math.PI / 2)
        const cornerX = squareX + Math.cos(cornerAngle) * squareRadius
        const cornerY = squareY + Math.sin(cornerAngle) * squareRadius
        corners.push({ x: cornerX, y: cornerY })
        squareCorners.push({ x: cornerX, y: cornerY }) // Add to global corner list
      }
      
      squares.push({ corners })
    }
    
    // Draw lines connecting closest corners between adjacent squares (only outer corners)
    for (let i = 0; i < 6; i++) {
      const nextIndex = (i + 1) % 6 // Only connect to the next adjacent square
      
      // Find the closest outer corners between these two adjacent squares
      let minDistance = Infinity
      let closestCorner1 = null
      let closestCorner2 = null
      
      for (let corner1 of squares[i].corners) {
        for (let corner2 of squares[nextIndex].corners) {
          // Calculate distance from each corner to the hexagon center
          const corner1DistanceFromCenter = Math.sqrt(
            Math.pow(corner1.x - centerX, 2) + Math.pow(corner1.y - centerY, 2)
          )
          const corner2DistanceFromCenter = Math.sqrt(
            Math.pow(corner2.x - centerX, 2) + Math.pow(corner2.y - centerY, 2)
          )
          
          // Only consider corners that are farther from center (outer corners)
          // Use a higher threshold to truly get only the outermost corners
          const minDistanceFromCenter = hexRadius * 1.2 // Higher threshold for outer corners
          
          if (corner1DistanceFromCenter > minDistanceFromCenter && 
              corner2DistanceFromCenter > minDistanceFromCenter) {
            
            const distance = Math.sqrt(
              Math.pow(corner1.x - corner2.x, 2) + Math.pow(corner1.y - corner2.y, 2)
            )
            if (distance < minDistance) {
              minDistance = distance
              closestCorner1 = corner1
              closestCorner2 = corner2
            }
          }
        }
      }
      
      // Draw line between closest outer corners of adjacent squares
      if (closestCorner1 && closestCorner2) {
        this.ctx.strokeStyle = '#808080' // Gray color to match other lines
        this.ctx.lineWidth = 1 // Same width as square edges
        this.ctx.beginPath()
        this.ctx.moveTo(closestCorner1.x, closestCorner1.y)
        this.ctx.lineTo(closestCorner2.x, closestCorner2.y)
        this.ctx.stroke()
      }
    }
    
    // Process vertices for this hexagon's squares
    this.processVertices(squareCorners)
  }

  drawPolygon(x, y, radius, sides, rotation = 0, fill = false) {
    this.ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + rotation
      const px = x + radius * Math.cos(angle)
      const py = y + radius * Math.sin(angle)
      
      if (i === 0) {
        this.ctx.moveTo(px, py)
      } else {
        this.ctx.lineTo(px, py)
      }
    }
    this.ctx.closePath()
    
    if (fill) {
      this.ctx.fill()
    }
    this.ctx.stroke()
  }

  processVertices(corners) {
    const tolerance = 5 // Pixels tolerance for overlapping vertices
    
    for (let corner of corners) {
      // Check if this corner is close to any existing vertex
      let existingVertex = this.vertices.find(vertex => 
        Math.abs(vertex.x - corner.x) < tolerance && 
        Math.abs(vertex.y - corner.y) < tolerance
      )
      
      if (!existingVertex) {
        // Add new vertex
        this.vertices.push({
          x: corner.x,
          y: corner.y
        })
      }
    }
  }

  drawVertices() {
    // Draw all vertices as small circles
    this.ctx.save()
    
    for (let vertex of this.vertices) {
      // Check if vertex is occupied
      const token = this.getTokenAt(vertex.x, vertex.y)
      
      if (token) {
        // Draw token
        this.ctx.fillStyle = token.color === 'red' ? '#ff4444' : '#4444ff'
        this.ctx.strokeStyle = token.color === 'red' ? '#cc0000' : '#0000cc'
        this.ctx.lineWidth = 2
        
        this.ctx.beginPath()
        this.ctx.arc(vertex.x, vertex.y, 6, 0, 2 * Math.PI)
        this.ctx.fill()
        this.ctx.stroke()
      } else {
        // Draw empty vertex
        this.ctx.fillStyle = '#ffffff'
        this.ctx.strokeStyle = '#666666'
        this.ctx.lineWidth = 1
        
        this.ctx.beginPath()
        this.ctx.arc(vertex.x, vertex.y, 3, 0, 2 * Math.PI)
        this.ctx.fill()
        this.ctx.stroke()
      }
    }
    
    this.ctx.restore()
  }

  // Game methods
  handleClick(event) {
    if (this.gameWinner) return

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Find closest vertex
    const vertex = this.findClosestVertex(x, y, 10) // 10 pixel tolerance
    if (!vertex) return

    if (this.gameState === 'placement') {
      this.handlePlacement(vertex)
    } else if (this.gameState === 'movement') {
      this.handleMovement(vertex)
    }
  }

  findClosestVertex(x, y, tolerance) {
    let closestVertex = null
    let minDistance = tolerance

    for (let vertex of this.vertices) {
      const distance = Math.sqrt(Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2))
      if (distance < minDistance) {
        minDistance = distance
        closestVertex = vertex
      }
    }

    return closestVertex
  }

  handlePlacement(vertex) {
    // Check if vertex is already occupied
    if (this.getTokenAt(vertex.x, vertex.y)) return

    // Place token
    this.tokens.push({
      x: vertex.x,
      y: vertex.y,
      color: this.currentPlayer
    })

    if (this.currentPlayer === 'red') {
      this.redTokensPlaced++
    } else {
      this.blueTokensPlaced++
    }

    // Check for wins
    this.checkForWin()

    // Check if placement phase is over
    if (this.redTokensPlaced === this.maxTokensPerPlayer && this.blueTokensPlaced === this.maxTokensPerPlayer) {
      this.gameState = 'movement'
      this.gameMessage = 'Movement phase started! Click a token to select it, then click an adjacent empty vertex to move.'
    } else {
      // Switch players during placement phase
      this.switchPlayer()
    }
    this.render()
  }

  handleMovement(vertex) {
    const token = this.getTokenAt(vertex.x, vertex.y)

    if (!this.selectedVertex) {
      // Select a token
      if (token && token.color === this.currentPlayer) {
        this.selectedVertex = vertex
        this.gameMessage = `Selected ${this.currentPlayer} token. Click an adjacent empty vertex to move.`
        this.render()
      }
    } else {
      // Move the selected token
      if (token) {
        // Clicked on another token - select it if it's the current player's
        if (token.color === this.currentPlayer) {
          this.selectedVertex = vertex
          this.gameMessage = `Selected ${this.currentPlayer} token. Click an adjacent empty vertex to move.`
          this.render()
        }
      } else {
        // Try to move to empty vertex
        if (this.isAdjacent(this.selectedVertex, vertex)) {
          // Move the token
          const tokenIndex = this.tokens.findIndex(t => 
            Math.abs(t.x - this.selectedVertex.x) < 1 && Math.abs(t.y - this.selectedVertex.y) < 1
          )
          
          if (tokenIndex >= 0) {
            this.tokens[tokenIndex].x = vertex.x
            this.tokens[tokenIndex].y = vertex.y

            // Check for mills and wins
            const millsFormed = this.checkForMills(vertex.x, vertex.y)
            this.checkForWin()

            this.selectedVertex = null
            
            // Only switch players if no mills were formed
            if (!millsFormed) {
              this.switchPlayer()
            }
            this.render()
          }
        } else {
          this.gameMessage = `Cannot move there - vertices must be adjacent.`
        }
      }
    }
  }

  getTokenAt(x, y) {
    const tolerance = 1
    return this.tokens.find(token => 
      Math.abs(token.x - x) < tolerance && Math.abs(token.y - y) < tolerance
    )
  }

  isAdjacent(vertex1, vertex2) {
    // Two vertices are adjacent if they are connected by a line in the game board
    // For simplicity, we'll check if they're within a reasonable distance
    const distance = Math.sqrt(Math.pow(vertex1.x - vertex2.x, 2) + Math.pow(vertex1.y - vertex2.y, 2))
    // This threshold should be adjusted based on the actual board geometry
    return distance > 5 && distance < 50 // Adjust these values as needed
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red'
    if (this.gameState === 'placement') {
      const tokensLeft = this.maxTokensPerPlayer - (this.currentPlayer === 'red' ? this.redTokensPlaced : this.blueTokensPlaced)
      this.gameMessage = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} player's turn. ${tokensLeft} tokens left to place.`
    } else {
      this.gameMessage = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} player's turn. Click a token to move.`
    }
  }

  checkForMills(x, y) {
    const player = this.getTokenAt(x, y)?.color
    if (!player) return false

    // Check for triangle mills (3 tokens in a triangle formation)
    const triangleMills = this.checkTriangleMills(player)
    
    // Check for square mills (4 tokens in a square formation)
    const squareMills = this.checkSquareMills(player)
    
    const totalMills = triangleMills + squareMills
    if (totalMills > 0) {
      this.gameMessage = `${player.charAt(0).toUpperCase() + player.slice(1)} formed ${totalMills} mill${totalMills > 1 ? 's' : ''}! Remove an opponent's token.`
      // TODO: Allow player to remove opponent's token
      return true
    }
    return false
  }

  checkTriangleMills(player) {
    let millCount = 0
    
    // Define triangle patterns based on the rhombitrihexagonal tiling geometry
    // These are approximate triangle formations that can occur on the board
    const trianglePatterns = [
      // For each hexagon, there are triangular formations between adjacent squares
      // We'll check for triangles formed by vertices that are roughly equidistant
    ]
    
    // Get all vertices occupied by the player
    const playerVertices = this.vertices.filter(vertex => {
      const token = this.getTokenAt(vertex.x, vertex.y)
      return token && token.color === player
    })
    
    // Check all combinations of 3 vertices for triangle formations
    for (let i = 0; i < playerVertices.length - 2; i++) {
      for (let j = i + 1; j < playerVertices.length - 1; j++) {
        for (let k = j + 1; k < playerVertices.length; k++) {
          const v1 = playerVertices[i]
          const v2 = playerVertices[j]
          const v3 = playerVertices[k]
          
          if (this.isTriangleMill(v1, v2, v3)) {
            millCount++
          }
        }
      }
    }
    
    return millCount
  }

  checkSquareMills(player) {
    let millCount = 0
    
    // Get all vertices occupied by the player
    const playerVertices = this.vertices.filter(vertex => {
      const token = this.getTokenAt(vertex.x, vertex.y)
      return token && token.color === player
    })
    
    // Check all combinations of 4 vertices for square formations
    for (let i = 0; i < playerVertices.length - 3; i++) {
      for (let j = i + 1; j < playerVertices.length - 2; j++) {
        for (let k = j + 1; k < playerVertices.length - 1; k++) {
          for (let l = k + 1; l < playerVertices.length; l++) {
            const v1 = playerVertices[i]
            const v2 = playerVertices[j]
            const v3 = playerVertices[k]
            const v4 = playerVertices[l]
            
            if (this.isSquareMill(v1, v2, v3, v4)) {
              millCount++
            }
          }
        }
      }
    }
    
    return millCount
  }

  isTriangleMill(v1, v2, v3) {
    // Calculate distances between vertices
    const d12 = this.getDistance(v1, v2)
    const d23 = this.getDistance(v2, v3)
    const d13 = this.getDistance(v1, v3)
    
    // For a triangle mill, we expect relatively equal sides (equilateral or close to it)
    // Allow some tolerance for the geometric constraints of the board
    const tolerance = 15 // pixels
    const avgDistance = (d12 + d23 + d13) / 3
    
    // Check if it's roughly an equilateral triangle
    const isEquilateral = Math.abs(d12 - avgDistance) < tolerance &&
                         Math.abs(d23 - avgDistance) < tolerance &&
                         Math.abs(d13 - avgDistance) < tolerance
    
    // Also check if the triangle has a reasonable size (not too small or too large)
    return isEquilateral && avgDistance > 20 && avgDistance < 80
  }

  isSquareMill(v1, v2, v3, v4) {
    // Sort vertices to find potential square pattern
    const vertices = [v1, v2, v3, v4]
    
    // Calculate all pairwise distances
    const distances = []
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        distances.push(this.getDistance(vertices[i], vertices[j]))
      }
    }
    
    // Sort distances
    distances.sort((a, b) => a - b)
    
    // For a square, we should have:
    // - 4 equal sides (shorter distances)
    // - 2 equal diagonals (longer distances)
    const tolerance = 10 // pixels
    
    // Check if we have 4 roughly equal shorter distances (sides)
    const side1 = distances[0]
    const side2 = distances[1]
    const side3 = distances[2]
    const side4 = distances[3]
    
    // Check if we have 2 roughly equal longer distances (diagonals)
    const diag1 = distances[4]
    const diag2 = distances[5]
    
    const sidesEqual = Math.abs(side1 - side2) < tolerance &&
                       Math.abs(side2 - side3) < tolerance &&
                       Math.abs(side3 - side4) < tolerance
    
    const diagsEqual = Math.abs(diag1 - diag2) < tolerance
    
    // Diagonal should be approximately sqrt(2) times the side length
    const expectedDiag = side1 * Math.sqrt(2)
    const diagCorrect = Math.abs(diag1 - expectedDiag) < tolerance * 2
    
    // Check reasonable size
    const reasonableSize = side1 > 15 && side1 < 60
    
    return sidesEqual && diagsEqual && diagCorrect && reasonableSize
  }

  getDistance(v1, v2) {
    return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2))
  }

  checkForWin() {
    // TODO: Implement win condition checking
    // Check if any player has occupied all 6 vertices of a hexagon
  }

  drawGameUI() {
    this.ctx.save()
    
    // Use the actual board area width we calculated in setupCanvas
    const rightPanelX = this.boardAreaWidth + 20 // Start right panel 20px after board area
    
    // Draw game status on the right side
    this.ctx.fillStyle = '#000000'
    this.ctx.font = '16px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    
    // Game state info
    const stateText = `Phase: ${this.gameState === 'placement' ? 'Placement' : 'Movement'}`
    this.ctx.fillText(stateText, rightPanelX, 10)
    
    // Player info
    const redTokens = this.gameState === 'placement' ? this.redTokensPlaced : this.tokens.filter(t => t.color === 'red').length
    const blueTokens = this.gameState === 'placement' ? this.blueTokensPlaced : this.tokens.filter(t => t.color === 'blue').length
    this.ctx.fillStyle = '#ff4444'
    this.ctx.fillText(`Red: ${redTokens}/${this.maxTokensPerPlayer}`, rightPanelX, 35)
    this.ctx.fillStyle = '#4444ff'
    this.ctx.fillText(`Blue: ${blueTokens}/${this.maxTokensPerPlayer}`, rightPanelX, 60)
    
    // Current player and message (wrap long messages)
    this.ctx.fillStyle = this.currentPlayer === 'red' ? '#ff4444' : '#4444ff'
    this.drawWrappedText(this.gameMessage, rightPanelX, 85, this.canvas.width - rightPanelX - 10, 18)
    
    // Winner announcement
    if (this.gameWinner) {
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(`${this.gameWinner.toUpperCase()} WINS!`, this.canvas.width / 2, this.canvas.height - 50)
    }
    
    this.ctx.restore()
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ')
    let line = ''
    let currentY = y

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = this.ctx.measureText(testLine)
      const testWidth = metrics.width
      
      if (testWidth > maxWidth && n > 0) {
        this.ctx.fillText(line, x, currentY)
        line = words[n] + ' '
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    this.ctx.fillText(line, x, currentY)
  }
}
