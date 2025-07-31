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
    
    // Mill removal state
    this.millRemovalState = null // null, 'removing', or 'completed'
    this.highlightedMillTokens = [] // Array of {vertex, type} objects where type is 'triangle', 'square', or 'both'
    this.millShapes = [] // Array of {vertices, type} objects for drawing mill shapes
    this.previousMills = new Set() // Track previously formed mills to ensure they only count once
    this.remainingOpponentMoves = 0 // Number of opponent tokens that can be moved
    this.movedOpponentTokens = [] // Track tokens moved during mill removal
    
    // Bind event handlers
    this.handleResize = this.handleResize.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    
    // Button hover state
    this.isHoveringNewGameButton = false
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
      this.boardImage.src = './Kensington_board.svg.png'
    })
  }

  setupCanvas() {
    // Detect if we're on a mobile device
    const isMobile = window.innerWidth <= 480
    const isTablet = window.innerWidth <= 768 && window.innerWidth > 480
    
    let uiPanelWidth
    let availableWidth
    let maxWidthMultiplier
    let maxHeightMultiplier
    
    if (isMobile) {
      // On mobile, stack UI below the board (no side panel)
      uiPanelWidth = 0
      availableWidth = window.innerWidth
      maxWidthMultiplier = 0.95 // Use more of the screen width
      maxHeightMultiplier = 0.6  // Leave room for UI below
    } else if (isTablet) {
      // On tablet, use a smaller side panel
      uiPanelWidth = 150
      availableWidth = window.innerWidth - uiPanelWidth
      maxWidthMultiplier = 0.92
      maxHeightMultiplier = 0.75
    } else {
      // Desktop: original layout with side panel
      uiPanelWidth = 200
      availableWidth = window.innerWidth - uiPanelWidth
      maxWidthMultiplier = 0.9
      maxHeightMultiplier = 0.7
    }
    
    // Set canvas size based on board image and viewport, leaving room for UI
    const maxWidth = Math.min(availableWidth * maxWidthMultiplier, this.boardWidth)
    const maxHeight = Math.min(window.innerHeight * maxHeightMultiplier, this.boardHeight)
    
    // Calculate scale to fit the board in the viewport
    this.scale = Math.min(maxWidth / this.boardWidth, maxHeight / this.boardHeight)
    
    // Set canvas size to include both board area and UI panel
    const boardCanvasWidth = this.boardWidth * this.scale
    const totalCanvasWidth = boardCanvasWidth + uiPanelWidth
    
    this.canvas.width = totalCanvasWidth
    this.canvas.height = this.boardHeight * this.scale
    
    // Store layout info for UI positioning
    this.boardAreaWidth = boardCanvasWidth
    this.uiPanelWidth = uiPanelWidth
    this.isMobileLayout = isMobile
    this.isTabletLayout = isTablet
    
    // Set CSS size for crisp rendering
    this.canvas.style.width = `${this.canvas.width}px`
    this.canvas.style.height = `${this.canvas.height}px`
    
    console.log(`Canvas setup: ${this.canvas.width}x${this.canvas.height}, scale: ${this.scale}, board area: ${this.boardAreaWidth}px, mobile: ${isMobile}, tablet: ${isTablet}`)
  }

  setupEventListeners() {
    window.addEventListener('resize', this.handleResize)
    this.canvas.addEventListener('click', this.handleClick)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
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

  resetGame() {
    // Reset all game state
    this.gameState = 'placement'
    this.currentPlayer = 'red'
    this.redTokensPlaced = 0
    this.blueTokensPlaced = 0
    this.tokens = []
    this.selectedVertex = null
    this.gameWinner = null
    this.gameMessage = `Red player's turn. ${this.maxTokensPerPlayer} tokens to place.`
    
    // Reset mill removal state
    this.millRemovalState = null
    this.highlightedMillTokens = []
    this.millShapes = []
    this.previousMills = new Set()
    this.remainingOpponentMoves = 0
    this.movedOpponentTokens = []
    
    // Re-render the board
    this.render()
  }

  handleResize() {
    this.setupCanvas()
    this.render()
  }

  handleMouseMove(event) {
    if (!this.gameWinner) return

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Check if hovering over "New Game" button
    const buttonArea = this.getNewGameButtonArea()
    const wasHovering = this.isHoveringNewGameButton
    this.isHoveringNewGameButton = (x >= buttonArea.x && x <= buttonArea.x + buttonArea.width &&
                                   y >= buttonArea.y && y <= buttonArea.y + buttonArea.height)
    
    // Change cursor style
    this.canvas.style.cursor = this.isHoveringNewGameButton ? 'pointer' : 'default'
    
    // Re-render if hover state changed
    if (wasHovering !== this.isHoveringNewGameButton) {
      this.render()
    }
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
    
    // Draw mill shapes on top of vertices (but not if game is won)
    if (!this.gameWon) {
      this.drawMillShapes()
    }
    
    // Draw separator line between board and UI (only for non-mobile layouts)
    if (!this.isMobileLayout) {
      this.ctx.save()
      this.ctx.strokeStyle = '#cccccc'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(this.boardAreaWidth + 10, 0)
      this.ctx.lineTo(this.boardAreaWidth + 10, this.canvas.height)
      this.ctx.stroke()
      this.ctx.restore()
    }
    
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
        // Check if this token is part of a highlighted mill and get its type
        const millHighlight = this.highlightedMillTokens.find(highlightedItem => 
          Math.abs(highlightedItem.vertex.x - vertex.x) < 1 && Math.abs(highlightedItem.vertex.y - vertex.y) < 1
        )
        
        // Draw token
        this.ctx.fillStyle = token.color === 'red' ? '#ff4444' : '#4444ff'
        this.ctx.strokeStyle = token.color === 'red' ? '#cc0000' : '#0000cc'
        this.ctx.lineWidth = millHighlight ? 4 : 2
        
        this.ctx.beginPath()
        this.ctx.arc(vertex.x, vertex.y, 6, 0, 2 * Math.PI)
        this.ctx.fill()
        this.ctx.stroke()
        
        // Add highlight glow for mill tokens with different colors
        if (millHighlight) {
          let glowColor
          switch (millHighlight.type) {
            case 'triangle':
              glowColor = '#ffff00'  // Yellow for triangle mills
              break
            case 'square':
              glowColor = '#00ff00'  // Green for square mills
              break
            case 'both':
              glowColor = '#800080'  // Purple for both triangle and square mills
              break
            default:
              glowColor = '#ffff00'  // Default to yellow
          }
          
          this.ctx.strokeStyle = glowColor
          this.ctx.lineWidth = 3
          this.ctx.beginPath()
          this.ctx.arc(vertex.x, vertex.y, 10, 0, 2 * Math.PI)
          this.ctx.stroke()
        }
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

  drawConnectionNumbers() {
    if (!this.vertices || this.vertices.length === 0) return
    
    this.ctx.save()
    this.ctx.font = '10px Arial'
    this.ctx.fillStyle = '#00aa00'  // Green color for numbers
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    let connectionNumber = 1
    const drawnConnections = new Set()
    
    // Find all connections between vertices that have actual drawn lines
    for (let i = 0; i < this.vertices.length; i++) {
      for (let j = i + 1; j < this.vertices.length; j++) {
        const vertex1 = this.vertices[i]
        const vertex2 = this.vertices[j]
        
        // Check if these vertices have an actual drawn line between them
        if (this.hasActualDrawnLine(vertex1, vertex2)) {
          // Create a unique key for this connection (order-independent)
          const connectionKey = `${Math.min(i, j)}-${Math.max(i, j)}`
          
          if (!drawnConnections.has(connectionKey)) {
            drawnConnections.add(connectionKey)
            
            // Calculate midpoint of the connection
            const midX = (vertex1.x + vertex2.x) / 2
            const midY = (vertex1.y + vertex2.y) / 2
            
            // Draw the connection number
            this.ctx.fillText(connectionNumber.toString(), midX, midY)
            connectionNumber++
          }
        }
      }
    }
    
    this.ctx.restore()
  }

  drawSquareNumbers() {
    this.ctx.save()
    this.ctx.fillStyle = '#ff6600' // Orange color
    this.ctx.font = '12px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    // Find squares by looking for sets of 4 vertices that form a square
    const squares = this.findAllSquares()
    
    squares.forEach((square, index) => {
      // Calculate center of the square
      const centerX = square.reduce((sum, vertex) => sum + vertex.x, 0) / 4
      const centerY = square.reduce((sum, vertex) => sum + vertex.y, 0) / 4
      
      this.ctx.fillText((index + 1).toString(), centerX, centerY)
    })
    
    this.ctx.restore()
  }

  findAllSquares() {
    const squares = []
    const foundSquares = new Set()
    
    // Look for sets of 4 vertices that form a square
    for (let i = 0; i < this.vertices.length; i++) {
      for (let j = i + 1; j < this.vertices.length; j++) {
        for (let k = j + 1; k < this.vertices.length; k++) {
          for (let l = k + 1; l < this.vertices.length; l++) {
            const fourVertices = [this.vertices[i], this.vertices[j], this.vertices[k], this.vertices[l]]
            
            if (this.isSquareShape(fourVertices) && this.isSquareInOuterHexagon(fourVertices)) {
              // Create a unique identifier for this square based on vertex positions
              const squareId = this.createSquareId(fourVertices)
              
              // Only add if we haven't seen this square before
              if (!foundSquares.has(squareId)) {
                foundSquares.add(squareId)
                squares.push(fourVertices)
              }
            }
          }
        }
      }
    }
    
    // Additional deduplication pass using geometric comparison
    const finalSquares = []
    for (let i = 0; i < squares.length; i++) {
      let isDuplicate = false
      
      for (let j = 0; j < finalSquares.length; j++) {
        if (this.areSquaresSame(squares[i], finalSquares[j])) {
          isDuplicate = true
          break
        }
      }
      
      if (!isDuplicate) {
        finalSquares.push(squares[i])
      }
    }
    
    return finalSquares
  }

  areSquaresSame(square1, square2) {
    // Check if two squares are the same by comparing their vertex positions more precisely
    
    // Sort both squares' vertices by position for consistent comparison
    const sortedSquare1 = square1.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    const sortedSquare2 = square2.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    // Check if all corresponding vertices are very close
    for (let i = 0; i < 4; i++) {
      const distance = Math.sqrt(
        Math.pow(sortedSquare1[i].x - sortedSquare2[i].x, 2) + 
        Math.pow(sortedSquare1[i].y - sortedSquare2[i].y, 2)
      )
      
      // If any vertex is more than 1 pixel away, they're different squares
      if (distance > 1) {
        return false
      }
    }
    
    return true
  }

  drawTriangleNumbers() {
    this.ctx.save()
    this.ctx.fillStyle = '#ff0000' // Red color
    this.ctx.font = '10px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    // Find triangles by looking for sets of 3 vertices that form a triangle
    const triangles = this.findAllTriangles()
    
    triangles.forEach((triangle, index) => {
      // Calculate center of the triangle (centroid)
      const centerX = triangle.reduce((sum, vertex) => sum + vertex.x, 0) / 3
      const centerY = triangle.reduce((sum, vertex) => sum + vertex.y, 0) / 3
      
      this.ctx.fillText((index + 1).toString(), centerX, centerY)
    })
    
    this.ctx.restore()
  }

  findAllTriangles() {
    const triangles = []
    const foundTriangles = new Set()
    
    // Look for sets of 3 vertices that form a triangle
    for (let i = 0; i < this.vertices.length; i++) {
      for (let j = i + 1; j < this.vertices.length; j++) {
        for (let k = j + 1; k < this.vertices.length; k++) {
          const threeVertices = [this.vertices[i], this.vertices[j], this.vertices[k]]
          
          if (this.isTriangleShape(threeVertices)) {
            // Create a unique identifier for this triangle based on vertex positions
            const triangleId = this.createTriangleId(threeVertices)
            
            // Only add if we haven't seen this triangle before
            if (!foundTriangles.has(triangleId)) {
              foundTriangles.add(triangleId)
              triangles.push(threeVertices)
            }
          }
        }
      }
    }
    
    // Additional deduplication pass using geometric comparison
    const finalTriangles = []
    for (let i = 0; i < triangles.length; i++) {
      let isDuplicate = false
      
      for (let j = 0; j < finalTriangles.length; j++) {
        if (this.areTrianglesSame(triangles[i], finalTriangles[j])) {
          isDuplicate = true
          break
        }
      }
      
      if (!isDuplicate) {
        finalTriangles.push(triangles[i])
      }
    }
    
    return finalTriangles
  }

  isTriangleShape(vertices) {
    if (vertices.length !== 3) return false
    
    // Calculate all distances between vertices (the 3 sides)
    const side1 = Math.sqrt(
      Math.pow(vertices[0].x - vertices[1].x, 2) + 
      Math.pow(vertices[0].y - vertices[1].y, 2)
    )
    const side2 = Math.sqrt(
      Math.pow(vertices[1].x - vertices[2].x, 2) + 
      Math.pow(vertices[1].y - vertices[2].y, 2)
    )
    const side3 = Math.sqrt(
      Math.pow(vertices[2].x - vertices[0].x, 2) + 
      Math.pow(vertices[2].y - vertices[0].y, 2)
    )
    
    // Check if it's an equilateral triangle (all sides equal)
    const tolerance = 3
    const sidesEqual = Math.abs(side1 - side2) < tolerance &&
                      Math.abs(side2 - side3) < tolerance &&
                      Math.abs(side3 - side1) < tolerance
    
    // Check that all 3 edges have actual drawn lines
    const hasAllTriangleEdges = this.hasAllTriangleEdges(vertices)
    
    // Check that the side length is within expected range for actual triangles
    const validSideLength = side1 > 15 && side1 < 40
    
    return sidesEqual && hasAllTriangleEdges && validSideLength
  }

  hasAllTriangleEdges(vertices) {
    // Check that all 3 edges of this potential triangle have actual drawn lines
    let edgeCount = 0
    
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        if (this.hasActualDrawnLine(vertices[i], vertices[j])) {
          edgeCount++
        }
      }
    }
    
    // A true triangle should have exactly 3 edges
    return edgeCount === 3
  }

  createTriangleId(vertices) {
    // Sort vertices by position to create consistent ID regardless of order
    const sortedVertices = vertices.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    // Create ID string from sorted vertex positions
    return sortedVertices.map(v => `${Math.round(v.x * 2) / 2},${Math.round(v.y * 2) / 2}`).join('|')
  }

  areTrianglesSame(triangle1, triangle2) {
    // Check if two triangles are the same by comparing their vertex positions
    
    // Sort both triangles' vertices by position for consistent comparison
    const sortedTriangle1 = triangle1.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    const sortedTriangle2 = triangle2.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) {
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    // Check if all corresponding vertices are very close
    for (let i = 0; i < 3; i++) {
      const distance = Math.sqrt(
        Math.pow(sortedTriangle1[i].x - sortedTriangle2[i].x, 2) + 
        Math.pow(sortedTriangle1[i].y - sortedTriangle2[i].y, 2)
      )
      
      // If any vertex is more than 1 pixel away, they're different triangles
      if (distance > 1) {
        return false
      }
    }
    
    return true
  }

  isSquareInOuterHexagon(vertices) {
    // Calculate the center of the square
    const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / 4
    const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / 4
    
    // Check distance from board center - inner hexagons are closer to center
    const boardCenterX = this.canvas.width / 2
    const boardCenterY = this.canvas.height / 2
    const distanceFromCenter = Math.sqrt(
      Math.pow(centerX - boardCenterX, 2) + Math.pow(centerY - boardCenterY, 2)
    )
    
    // Further reduced threshold to include squares closer to center
    // Some valid squares might be between inner and outer areas
    const minDistanceForOuterSquare = 20 // Reduced from 30 to catch squares near triangles
    
    return distanceFromCenter > minDistanceForOuterSquare
  }

  createSquareId(vertices) {
    // Sort vertices by position to create consistent ID regardless of order
    const sortedVertices = vertices.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) < 1) { // Increased tolerance for floating point comparison
        return a.y - b.y
      }
      return a.x - b.x
    })
    
    // Create ID string from sorted vertex positions with precise rounding
    // Use 0.5 precision to handle floating point variations better
    return sortedVertices.map(v => `${Math.round(v.x * 2) / 2},${Math.round(v.y * 2) / 2}`).join('|')
  }

  isSquareShape(vertices) {
    if (vertices.length !== 4) return false
    
    // Calculate all distances between vertices
    const distances = []
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const dist = Math.sqrt(
          Math.pow(vertices[i].x - vertices[j].x, 2) + 
          Math.pow(vertices[i].y - vertices[j].y, 2)
        )
        distances.push(dist)
      }
    }
    
    distances.sort((a, b) => a - b)
    
    // In a square: 4 equal sides and 2 equal diagonals
    // The 4 shortest distances should be equal (sides)
    // The 2 longest distances should be equal (diagonals)
    const tolerance = 4 // Further increased tolerance for edge cases
    
    const side1 = distances[0]
    const side2 = distances[1] 
    const side3 = distances[2]
    const side4 = distances[3]
    const diag1 = distances[4]
    const diag2 = distances[5]
    
    // Check if all sides are approximately equal
    const sidesEqual = Math.abs(side1 - side2) < tolerance &&
                      Math.abs(side2 - side3) < tolerance &&
                      Math.abs(side3 - side4) < tolerance
    
    // Check if diagonals are approximately equal
    const diagsEqual = Math.abs(diag1 - diag2) < tolerance
    
    // Check if diagonal is approximately sqrt(2) times the side length
    const expectedDiag = side1 * Math.sqrt(2)
    const diagRatio = Math.abs(diag1 - expectedDiag) < tolerance * 3 // More permissive diagonal ratio
    
    // Additional check: verify that all 4 vertices form actual square edges with drawn lines
    const hasAllSquareEdges = this.hasAllSquareEdges(vertices)
    
    // Also check that the side length is within expected range for actual squares
    const validSideLength = side1 > 10 && side1 < 45 // Further expanded range
    
    return sidesEqual && diagsEqual && diagRatio && hasAllSquareEdges && validSideLength
  }

  hasAllSquareEdges(vertices) {
    // Check that all 4 edges of this potential square have actual drawn lines
    let edgeCount = 0
    
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (this.hasActualDrawnLine(vertices[i], vertices[j])) {
          edgeCount++
        }
      }
    }
    
    // A true square should have exactly 4 edges (the 4 sides)
    // The 2 diagonals should NOT be drawn lines in our board
    // However, be slightly more permissive for edge cases
    return edgeCount >= 4 && edgeCount <= 5 // Allow up to 5 in case one diagonal is detected
  }

  hasActualDrawnLine(vertex1, vertex2) {
    // Check if there is an actual drawn line between these two vertices
    // Only detect lines that are edges of the square shapes on the board
    
    const distance = Math.sqrt(Math.pow(vertex1.x - vertex2.x, 2) + Math.pow(vertex1.y - vertex2.y, 2))
    const dx = Math.abs(vertex1.x - vertex2.x)
    const dy = Math.abs(vertex1.y - vertex2.y)
    
    // Very tight tolerance for square edge detection only
    const tolerance = 3 // Increased tolerance
    
    // Only detect square edges - the four sides of each square (including rotated squares)
    // Distance should be consistent with square side length
    if (distance > 15 && distance < 40) { // Expanded distance range
      
      // Horizontal square edge (same Y coordinate, different X)
      if (dy < tolerance && dx > 15 && dx < 40) {
        return true
      }
      
      // Vertical square edge (same X coordinate, different Y)
      if (dx < tolerance && dy > 15 && dy < 40) {
        return true
      }
      
      // 45-degree diagonal square edge (equal dx and dy)
      const diagonalRatio = Math.abs(dx - dy)
      if (diagonalRatio < tolerance && dx > 15 && dx < 35 && dy > 15 && dy < 35) {
        return true
      }
      
      // 30-degree and 60-degree rotated square edges
      // Calculate the angle more precisely
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const absAngle = Math.abs(angle)
      
      // Check for common angles in hexagonal geometry
      if ((absAngle > 25 && absAngle < 35) ||   // ~30 degrees
          (absAngle > 55 && absAngle < 65) ||   // ~60 degrees
          (absAngle > 115 && absAngle < 125) || // ~120 degrees
          (absAngle > 145 && absAngle < 155)) { // ~150 degrees
        return true
      }
      
      // Additional ratio-based detection for rotated edges
      const ratio = dx > 0 ? dy / dx : (dy > 0 ? Infinity : 1)
      
      // 30-degree angle (and its complement 150-degree)
      if ((ratio > 0.4 && ratio < 0.8) || (ratio > 1.25 && ratio < 2.5)) {
        return true
      }
      
      // 60-degree angle (and its complement 120-degree)  
      if ((ratio > 1.4 && ratio < 2.2) || (ratio > 0.45 && ratio < 0.8)) {
        return true
      }
    }
    
    return false
  }

  drawMillShapes() {
    if (this.millShapes.length === 0) return
    
    this.ctx.save()
    
    for (let millShape of this.millShapes) {
      let shapeColor
      let lineWidth = 4
      
      // Set color based on mill type
      switch (millShape.type) {
        case 'triangle':
          shapeColor = '#ffff00'  // Yellow for triangle mills
          break
        case 'square':
          shapeColor = '#00ff00'  // Green for square mills
          break
        default:
          shapeColor = '#ffff00'  // Default to yellow
      }
      
      this.ctx.strokeStyle = shapeColor
      this.ctx.lineWidth = lineWidth
      this.ctx.setLineDash([5, 5]) // Dashed line for visibility
      
      if (millShape.type === 'triangle' && millShape.vertices.length === 3) {
        // Draw triangle
        this.ctx.beginPath()
        this.ctx.moveTo(millShape.vertices[0].x, millShape.vertices[0].y)
        this.ctx.lineTo(millShape.vertices[1].x, millShape.vertices[1].y)
        this.ctx.lineTo(millShape.vertices[2].x, millShape.vertices[2].y)
        this.ctx.closePath()
        this.ctx.stroke()
      } else if (millShape.type === 'square' && millShape.vertices.length === 4) {
        // Draw square - need to find the correct order
        const vertices = millShape.vertices
        const orderedVertices = this.orderSquareVertices(vertices)
        
        if (orderedVertices.length === 4) {
          this.ctx.beginPath()
          this.ctx.moveTo(orderedVertices[0].x, orderedVertices[0].y)
          for (let i = 1; i < 4; i++) {
            this.ctx.lineTo(orderedVertices[i].x, orderedVertices[i].y)
          }
          this.ctx.closePath()
          this.ctx.stroke()
        }
      }
    }
    
    this.ctx.setLineDash([]) // Reset line dash
    this.ctx.restore()
  }

  orderSquareVertices(vertices) {
    // Order vertices to form a proper square shape
    // Find the correct sequence by testing different orderings
    const squareOrders = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], 
      [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1]
    ]
    
    for (let order of squareOrders) {
      let isValidOrder = true
      
      // Check if this order forms connected edges
      for (let i = 0; i < 4; i++) {
        const vertex1 = vertices[order[i]]
        const vertex2 = vertices[order[(i + 1) % 4]]
        
        if (!this.areVerticesConnected(vertex1, vertex2)) {
          isValidOrder = false
          break
        }
      }
      
      if (isValidOrder) {
        return order.map(i => vertices[i])
      }
    }
    
    // Fallback: return vertices in original order
    return vertices
  }

  // Game methods
  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Check if clicking on "New Game" button when game is won
    if (this.gameWinner) {
      const buttonArea = this.getNewGameButtonArea()
      if (x >= buttonArea.x && x <= buttonArea.x + buttonArea.width &&
          y >= buttonArea.y && y <= buttonArea.y + buttonArea.height) {
        this.resetGame()
        return
      }
    }

    if (this.gameWinner) return

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
      this.currentPlayer = 'red' // Red player goes first in movement phase
      this.gameMessage = 'Movement phase started! Red player goes first. Click a token to select it, then click an adjacent empty vertex to move.'
    } else if (!this.gameWinner) {
      // Switch players during placement phase only if no winner
      this.switchPlayer()
    }
    this.render()
  }

  handleMovement(vertex) {
    const token = this.getTokenAt(vertex.x, vertex.y)

    // Handle mill removal phase
    if (this.millRemovalState === 'removing') {
      if (!this.selectedVertex) {
        // Select an opponent token
        const opponentColor = this.currentPlayer === 'red' ? 'blue' : 'red'
        if (token && token.color === opponentColor) {
          this.selectedVertex = vertex
          this.gameMessage = `Selected opponent ${token.color} token. Click an empty vertex to move it there. ${this.remainingOpponentMoves} moves remaining.`
          this.render()
        }
      } else {
        // Move the selected opponent token
        if (token) {
          // Clicked on another token - select it if it's an opponent token
          const opponentColor = this.currentPlayer === 'red' ? 'blue' : 'red'
          if (token.color === opponentColor) {
            this.selectedVertex = vertex
            this.gameMessage = `Selected opponent ${token.color} token. Click an empty vertex to move it there. ${this.remainingOpponentMoves} moves remaining.`
            this.render()
          }
        } else {
          // Try to move opponent token to empty vertex
          const tokenIndex = this.tokens.findIndex(t => 
            Math.abs(t.x - this.selectedVertex.x) < 1 && Math.abs(t.y - this.selectedVertex.y) < 1
          )
          
          if (tokenIndex >= 0) {
            // Move the opponent token
            this.tokens[tokenIndex].x = vertex.x
            this.tokens[tokenIndex].y = vertex.y
            this.movedOpponentTokens.push(this.tokens[tokenIndex])
            this.remainingOpponentMoves--

            this.selectedVertex = null
            
            // Check for win conditions after moving opponent token
            this.checkForWin()
            
            if (this.remainingOpponentMoves > 0 && !this.gameWinner) {
              this.gameMessage = `Opponent token moved. Select another opponent token to move. ${this.remainingOpponentMoves} moves remaining.`
            } else if (!this.gameWinner) {
              // Mill removal phase complete
              this.millRemovalState = null
              this.highlightedMillTokens = []
              this.millShapes = []
              this.movedOpponentTokens = []
              // Note: previousMills is NOT cleared here as mills persist across turns
              this.checkForWin()
              
              if (!this.gameWinner) {
                this.switchPlayer()
              }
            }
            this.render()
          }
        }
      }
      return
    }

    // Normal movement phase
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
            
            // Only switch players if no mills were formed and no winner
            if (!millsFormed && !this.gameWinner) {
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
    // Two vertices are adjacent if they have an actual drawn line between them
    return this.hasActualDrawnLine(vertex1, vertex2)
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

    // Clear previous mill highlights
    this.highlightedMillTokens = []
    this.millShapes = []
    
    // Find all mills involving the moved token
    const triangleMills = this.findTriangleMills(player, x, y)
    const squareMills = this.findSquareMills(player, x, y)
    
    // Filter out mills that were already completed in previous turns
    const newTriangleMills = triangleMills.filter(mill => !this.wasMillPreviouslyFormed(mill, 'triangle'))
    const newSquareMills = squareMills.filter(mill => !this.wasMillPreviouslyFormed(mill, 'square'))
    
    // Update the set of previously formed mills
    this.updatePreviouslyFormedMills(triangleMills, squareMills)
    
    const totalTriangleMills = newTriangleMills.length
    const totalSquareMills = newSquareMills.length
    const totalMills = totalTriangleMills + totalSquareMills
    
    if (totalMills > 0) {
      // Create a map to track which vertices are in which types of mills
      const vertexMillTypes = new Map()
      
      // Process triangle mills - highlight in yellow
      for (let mill of newTriangleMills) {
        // Add triangle shape for drawing
        this.millShapes.push({ vertices: mill, type: 'triangle' })
        
        for (let vertex of mill) {
          const key = `${vertex.x},${vertex.y}`
          if (vertexMillTypes.has(key)) {
            // Already in a mill, mark as both
            vertexMillTypes.set(key, 'both')
          } else {
            vertexMillTypes.set(key, 'triangle')
          }
        }
      }
      
      // Process square mills - highlight in green (or purple if already triangle)
      for (let mill of newSquareMills) {
        // Add square shape for drawing
        this.millShapes.push({ vertices: mill, type: 'square' })
        
        for (let vertex of mill) {
          const key = `${vertex.x},${vertex.y}`
          if (vertexMillTypes.has(key)) {
            // Already in a mill, mark as both
            vertexMillTypes.set(key, 'both')
          } else {
            vertexMillTypes.set(key, 'square')
          }
        }
      }
      
      // Convert map to highlighted tokens array
      for (let [key, type] of vertexMillTypes) {
        const [x, y] = key.split(',').map(Number)
        this.highlightedMillTokens.push({ vertex: { x, y }, type })
      }
      
      // Calculate how many opponent tokens can be moved
      // Triangle mills allow 1 move, square mills allow 2 moves, max 2 total
      let allowedMoves = 0
      allowedMoves += totalTriangleMills * 1  // 1 move per triangle mill
      allowedMoves += totalSquareMills * 2    // 2 moves per square mill
      allowedMoves = Math.min(allowedMoves, 2) // Maximum 2 moves regardless
      
      // Set up mill removal state
      this.millRemovalState = 'removing'
      this.remainingOpponentMoves = allowedMoves
      this.movedOpponentTokens = []
      
      const millDescription = []
      if (totalTriangleMills > 0) {
        millDescription.push(`${totalTriangleMills} triangle mill${totalTriangleMills > 1 ? 's' : ''}`)
      }
      if (totalSquareMills > 0) {
        millDescription.push(`${totalSquareMills} square mill${totalSquareMills > 1 ? 's' : ''}`)
      }
      
      this.gameMessage = `${player.charAt(0).toUpperCase() + player.slice(1)} formed ${millDescription.join(' and ')}! You may move ${allowedMoves} opponent token${allowedMoves > 1 ? 's' : ''} to empty vertices.`
      return true
    }
    return false
  }

  wasMillPreviouslyFormed(mill, type) {
    // Create a unique identifier for this mill
    const millId = this.createMillId(mill, type)
    return this.previousMills.has(millId)
  }

  updatePreviouslyFormedMills(triangleMills, squareMills) {
    // Add all current mills to the previously formed set
    for (let mill of triangleMills) {
      const millId = this.createMillId(mill, 'triangle')
      this.previousMills.add(millId)
    }
    for (let mill of squareMills) {
      const millId = this.createMillId(mill, 'square')
      this.previousMills.add(millId)
    }
  }

  createMillId(mill, type) {
    // Create a unique identifier for a mill based on sorted vertex coordinates
    const sortedVertices = mill
      .map(vertex => `${Math.round(vertex.x)},${Math.round(vertex.y)}`)
      .sort()
      .join('|')
    return `${type}:${sortedVertices}`
  }

  findTriangleMills(player, x, y) {
    const mills = []
    const movedToken = { x, y }
    
    // Get all vertices occupied by the player
    const playerVertices = this.vertices.filter(vertex => {
      const token = this.getTokenAt(vertex.x, vertex.y)
      return token && token.color === player
    })
    
    // Check all combinations of 3 vertices that include the moved token
    for (let i = 0; i < playerVertices.length - 2; i++) {
      for (let j = i + 1; j < playerVertices.length - 1; j++) {
        for (let k = j + 1; k < playerVertices.length; k++) {
          const v1 = playerVertices[i]
          const v2 = playerVertices[j]
          const v3 = playerVertices[k]
          
          // Check if the moved token is part of this potential mill
          const includesMovedToken = [v1, v2, v3].some(v => 
            Math.abs(v.x - movedToken.x) < 1 && Math.abs(v.y - movedToken.y) < 1
          )
          
          if (includesMovedToken && this.isTriangleMill(v1, v2, v3)) {
            mills.push([v1, v2, v3])
          }
        }
      }
    }
    
    return mills
  }

  findSquareMills(player, x, y) {
    const mills = []
    const movedToken = { x, y }
    
    // Get all vertices occupied by the player
    const playerVertices = this.vertices.filter(vertex => {
      const token = this.getTokenAt(vertex.x, vertex.y)
      return token && token.color === player
    })
    
    // Check all combinations of 4 vertices that include the moved token
    for (let i = 0; i < playerVertices.length - 3; i++) {
      for (let j = i + 1; j < playerVertices.length - 2; j++) {
        for (let k = j + 1; k < playerVertices.length - 1; k++) {
          for (let l = k + 1; l < playerVertices.length; l++) {
            const v1 = playerVertices[i]
            const v2 = playerVertices[j]
            const v3 = playerVertices[k]
            const v4 = playerVertices[l]
            
            // Check if the moved token is part of this potential mill
            const includesMovedToken = [v1, v2, v3, v4].some(v => 
              Math.abs(v.x - movedToken.x) < 1 && Math.abs(v.y - movedToken.y) < 1
            )
            
            if (includesMovedToken && this.isSquareMill(v1, v2, v3, v4)) {
              mills.push([v1, v2, v3, v4])
            }
          }
        }
      }
    }
    
    return mills
  }

  checkTriangleMills(player) {
    let millCount = 0
    
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
    // First, verify that the player has tokens on all 3 vertices
    const vertices = [v1, v2, v3]
    
    // Get the color of the first token to check consistency
    const firstToken = this.getTokenAt(v1.x, v1.y)
    if (!firstToken) return false
    
    const playerColor = firstToken.color
    
    // Verify all 3 vertices have tokens of the same color
    for (let vertex of vertices) {
      const token = this.getTokenAt(vertex.x, vertex.y)
      if (!token || token.color !== playerColor) {
        return false
      }
    }
    
    // For a triangle mill, all three vertices must be connected by numbered lines (green connections)
    // Check if all edges of the triangle are actual numbered lines
    let connectedEdges = 0
    const connections = [
      this.hasActualDrawnLine(v1, v2),
      this.hasActualDrawnLine(v1, v3), 
      this.hasActualDrawnLine(v2, v3)
    ]
    
    for (let connected of connections) {
      if (connected) connectedEdges++
    }
    
    // A valid triangle mill must have all 3 edges as numbered lines
    return connectedEdges === 3
  }

  isSquareMill(v1, v2, v3, v4) {
    // First, verify that the player has tokens on all 4 vertices
    const vertices = [v1, v2, v3, v4]
    
    // Get the color of the first token to check consistency
    const firstToken = this.getTokenAt(v1.x, v1.y)
    if (!firstToken) return false
    
    const playerColor = firstToken.color
    
    // Verify all 4 vertices have tokens of the same color
    for (let vertex of vertices) {
      const token = this.getTokenAt(vertex.x, vertex.y)
      if (!token || token.color !== playerColor) {
        return false
      }
    }
    
    // For a square mill, we need to find an ordering where each vertex
    // is connected to exactly its two adjacent vertices in the sequence by numbered lines
    const squareOrders = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], 
      [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1]
    ]
    
    for (let order of squareOrders) {
      let isValidSquare = true
      
      // Check if this order forms a valid square cycle using numbered lines
      // Each vertex must connect to its two adjacent vertices in the sequence
      for (let i = 0; i < 4; i++) {
        const currentVertex = vertices[order[i]]
        const nextVertex = vertices[order[(i + 1) % 4]]
        
        // Check if current vertex connects to next vertex via a numbered line
        if (!this.hasActualDrawnLine(currentVertex, nextVertex)) {
          isValidSquare = false
          break
        }
      }
      
      // If we found a valid square ordering with all numbered line connections
      if (isValidSquare) {
        return true
      }
    }
    
    return false
  }

  areVerticesConnected(vertex1, vertex2) {
    // Two vertices are connected if they are adjacent based on the actual visible lines on the board
    // This should only return true for connections that have actual drawn lines
    const distance = Math.sqrt(Math.pow(vertex1.x - vertex2.x, 2) + Math.pow(vertex1.y - vertex2.y, 2))
    
    // Define more precise connection distances based on actual drawn lines
    const minDistance = 15  // Minimum to avoid same vertex
    const maxDistance = 50  // Maximum for any valid connection
    
    if (distance < minDistance || distance > maxDistance) {
      return false
    }
    
    const dx = Math.abs(vertex1.x - vertex2.x)
    const dy = Math.abs(vertex1.y - vertex2.y)
    
    // Very tight tolerance for actual line connections
    const tolerance = 2
    
    // Only count connections that correspond to actual drawn lines:
    
    // 1. Square side connections (horizontal and vertical square edges)
    if ((dy < tolerance && dx > 20 && dx < 40) || (dx < tolerance && dy > 20 && dy < 40)) {
      return true
    }
    
    // 2. Square diagonal connections (45-degree diagonals within squares) - NOT center connections
    const diagonalRatio = Math.abs(dx - dy)
    if (diagonalRatio < tolerance && dx > 20 && dx < 35 && dy > 20 && dy < 35) {
      return true
    }
    
    // 3. Outer connecting lines between adjacent squares (the lines drawn in drawKensingtonHexagon)
    // These are the lines that connect the closest outer corners between adjacent squares
    if (distance > 30 && distance < 50) {
      // Check if this is likely an outer connecting line based on position and angle
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const normalizedAngle = Math.abs(angle % 30)
      
      // Lines connecting outer corners tend to be at specific angles
      if (normalizedAngle < 8 || normalizedAngle > 22) {
        return true
      }
    }
    
    return false
  }

  areVerticesConnectedBySquareEdge(vertex1, vertex2) {
    // Check if two vertices are connected specifically along the edge of a square
    // Use the accurate line detection method
    return this.hasActualDrawnLine(vertex1, vertex2) && this.isSquareEdgeConnection(vertex1, vertex2)
  }

  isSquareEdgeConnection(vertex1, vertex2) {
    // Check if a connection is specifically a square edge (not an outer connecting line)
    const distance = Math.sqrt(Math.pow(vertex1.x - vertex2.x, 2) + Math.pow(vertex1.y - vertex2.y, 2))
    const dx = Math.abs(vertex1.x - vertex2.x)
    const dy = Math.abs(vertex1.y - vertex2.y)
    
    const tolerance = 1.5
    
    // Square edges are shorter and at specific angles
    if (distance > 20 && distance < 40) {
      // Horizontal, vertical, or 45-degree diagonal
      if ((dy < tolerance) || (dx < tolerance) || (Math.abs(dx - dy) < tolerance)) {
        return true
      }
    }
    
    return false
  }

  areVerticesConnectedByTriangleEdge(vertex1, vertex2) {
    // Check if two vertices are connected by either:
    // 1. A square edge, OR
    // 2. An outer edge connection (line connecting vertices on the outer perimeter)
    // Use the accurate line detection method
    return this.hasActualDrawnLine(vertex1, vertex2)
  }

  areVerticesConnectedByOuterEdge(vertex1, vertex2) {
    // Check if two vertices are connected along the outer edge of the board
    // Use the accurate line detection and exclude square edges
    return this.hasActualDrawnLine(vertex1, vertex2) && !this.isSquareEdgeConnection(vertex1, vertex2)
  }

  getDistance(v1, v2) {
    return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2))
  }

  checkForWin() {
    // Check win conditions for both players
    // Red wins if red tokens surround either a red (1,2) or white (3,4,5) hexagon
    // Blue wins if blue tokens surround either a blue (6,7) or white (3,4,5) hexagon
    
    const redWinHexagons = [1, 2, 3, 4, 5] // Red and white hexagons
    const blueWinHexagons = [3, 4, 5, 6, 7] // White and blue hexagons
    
    // Check if red player wins
    for (let hexNumber of redWinHexagons) {
      if (this.isHexagonSurrounded(hexNumber, 'red')) {
        this.gameWinner = 'red'
        this.gameMessage = `Red wins by surrounding hexagon ${hexNumber}!`
        return
      }
    }
    
    // Check if blue player wins
    for (let hexNumber of blueWinHexagons) {
      if (this.isHexagonSurrounded(hexNumber, 'blue')) {
        this.gameWinner = 'blue'
        this.gameMessage = `Blue wins by surrounding hexagon ${hexNumber}!`
        return
      }
    }
  }

  isHexagonSurrounded(hexagonNumber, playerColor) {
    // Get the hexagon center coordinates based on hexagon number
    const hexCenter = this.getHexagonCenter(hexagonNumber)
    if (!hexCenter) return false
    
    // Find all vertices that belong to this hexagon (vertices of the 6 surrounding squares)
    const hexagonVertices = this.getHexagonVertices(hexCenter)
    
    // Check if all vertices around this hexagon are occupied by the specified player
    let surroundedCount = 0
    let totalVertices = 0
    
    for (let vertex of hexagonVertices) {
      const token = this.getTokenAt(vertex.x, vertex.y)
      totalVertices++
      if (token && token.color === playerColor) {
        surroundedCount++
      }
    }
    
    // A hexagon is surrounded if all its surrounding vertices are occupied by the player
    // We need at least 6 vertices to form a complete surrounding
    return totalVertices >= 6 && surroundedCount === totalVertices
  }

  getHexagonCenter(hexagonNumber) {
    // Calculate the center coordinates for each hexagon based on the layout
    const center = this.tilingUnit.center
    const scale = this.tilingUnit.scale
    const scaledX = center.x * this.boardAreaWidth
    const scaledY = center.y * this.canvas.height
    const unitSize = scale * Math.min(this.boardAreaWidth, this.canvas.height)
    
    const hexRadius = unitSize * 0.5
    const squareSide = hexRadius
    const squareDistance = (squareSide / Math.sqrt(2)) / 2
    const square1OffsetX = Math.cos(0) * (hexRadius + squareDistance)
    const square4OffsetX = Math.cos(Math.PI) * (hexRadius + squareDistance)
    const hexagonSpacing = square1OffsetX - square4OffsetX
    const verticalSpacing = unitSize * 1.2
    
    switch (hexagonNumber) {
      case 1:
        return {
          x: scaledX - hexagonSpacing / 2,
          y: scaledY - verticalSpacing + unitSize * 0.01
        }
      case 2:
        return {
          x: scaledX + hexagonSpacing / 2,
          y: scaledY - verticalSpacing + unitSize * 0.01
        }
      case 3:
        return {
          x: scaledX - hexagonSpacing,
          y: scaledY
        }
      case 4:
        return {
          x: scaledX,
          y: scaledY
        }
      case 5:
        return {
          x: scaledX + hexagonSpacing,
          y: scaledY
        }
      case 6:
        return {
          x: scaledX - hexagonSpacing / 2,
          y: scaledY + verticalSpacing - unitSize * 0.01
        }
      case 7:
        return {
          x: scaledX + hexagonSpacing / 2,
          y: scaledY + verticalSpacing - unitSize * 0.01
        }
      default:
        return null
    }
  }

  getHexagonVertices(hexCenter) {
    // Find all vertices that are around this hexagon
    // These are the outer vertices of the 6 squares surrounding the hexagon
    const hexagonVertices = []
    const tolerance = 10 // pixels tolerance for finding nearby vertices
    const unitSize = this.tilingUnit.scale * Math.min(this.boardAreaWidth, this.canvas.height)
    const searchRadius = unitSize * 0.8 // Search within this radius of the hexagon center
    
    for (let vertex of this.vertices) {
      const distance = Math.sqrt(
        Math.pow(vertex.x - hexCenter.x, 2) + Math.pow(vertex.y - hexCenter.y, 2)
      )
      
      // Include vertices that are at the right distance from the hexagon center
      // (outer vertices of the surrounding squares)
      if (distance > unitSize * 0.4 && distance < searchRadius) {
        hexagonVertices.push(vertex)
      }
    }
    
    return hexagonVertices
  }

  getNewGameButtonArea() {
    // Calculate button position and size based on layout
    let buttonWidth, buttonHeight, buttonX, buttonY
    
    if (this.isMobileLayout) {
      // Mobile: button in overlay area
      buttonWidth = 100
      buttonHeight = 25
      buttonX = 15
      buttonY = 140 // After the winner text in overlay
    } else if (this.isTabletLayout) {
      // Tablet: smaller button in side panel
      buttonWidth = 100
      buttonHeight = 25
      buttonX = this.boardAreaWidth + 25
      buttonY = this.canvas.height - 70
    } else {
      // Desktop: original button in side panel
      buttonWidth = 120
      buttonHeight = 30
      buttonX = this.boardAreaWidth + 30
      buttonY = this.canvas.height - 80
    }
    
    return {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    }
  }

  drawGameUI() {
    this.ctx.save()
    
    let rightPanelX, fontSize, maxWidth
    
    if (this.isMobileLayout) {
      // Mobile: minimal overlay for current player only
      rightPanelX = 10
      fontSize = 12
      maxWidth = this.canvas.width - 20
    } else if (this.isTabletLayout) {
      // Tablet: smaller side panel
      rightPanelX = this.boardAreaWidth + 15
      fontSize = 14
      maxWidth = this.uiPanelWidth - 25
    } else {
      // Desktop: full side panel
      rightPanelX = this.boardAreaWidth + 20
      fontSize = 16
      maxWidth = this.uiPanelWidth - 30
    }
    
    // Draw game status
    this.ctx.fillStyle = this.isMobileLayout ? 'rgba(255, 255, 255, 0.9)' : '#000000'
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    
    let currentY = this.isMobileLayout ? 10 : 10
    
    // Add minimal background for mobile overlay (only current player info)
    if (this.isMobileLayout) {
      // No overlay for mobile - use HTML UI below canvas instead
      this.ctx.restore()
      return
    }
    
    // Game state info (non-mobile)
    let stateText = `Phase: ${this.gameState === 'placement' ? 'Placement' : 'Movement'}`
    if (this.millRemovalState === 'removing') {
      stateText += ' (Mill Removal)'
    }
    this.ctx.fillText(stateText, rightPanelX, currentY)
    currentY += fontSize + 5
    
    // Player info
    const redTokens = this.gameState === 'placement' ? this.redTokensPlaced : this.tokens.filter(t => t.color === 'red').length
    const blueTokens = this.gameState === 'placement' ? this.blueTokensPlaced : this.tokens.filter(t => t.color === 'blue').length
    this.ctx.fillStyle = '#ff4444'
    this.ctx.fillText(`Red: ${redTokens}/${this.maxTokensPerPlayer}`, rightPanelX, currentY)
    currentY += fontSize + 5
    this.ctx.fillStyle = '#4444ff'
    this.ctx.fillText(`Blue: ${blueTokens}/${this.maxTokensPerPlayer}`, rightPanelX, currentY)
    currentY += fontSize + 5
    
    // Mill removal info
    if (this.millRemovalState === 'removing') {
      this.ctx.fillStyle = '#ff8800'
      this.ctx.fillText(`Opponent moves: ${this.remainingOpponentMoves}`, rightPanelX, currentY)
      currentY += fontSize + 5
    }
    
    // Current player and message (wrap long messages)
    this.ctx.fillStyle = this.currentPlayer === 'red' ? '#ff4444' : '#4444ff'
    this.drawWrappedText(this.gameMessage, rightPanelX, currentY, maxWidth, fontSize + 2)
    
    // Winner announcement and New Game button
    if (this.gameWinner) {
      const winnerY = this.canvas.height - 120
      this.ctx.fillStyle = '#000000'
      this.ctx.font = `bold ${fontSize + 2}px Arial`
      this.ctx.textAlign = 'left'
      this.ctx.textBaseline = 'top'
      this.ctx.fillText(`${this.gameWinner.toUpperCase()}`, rightPanelX, winnerY)
      this.ctx.fillText('WINS!', rightPanelX, winnerY + fontSize + 5)
      
      // Draw New Game button
      const buttonArea = this.getNewGameButtonArea()
      
      // Button background (darker when hovering)
      this.ctx.fillStyle = this.isHoveringNewGameButton ? '#45a049' : '#4CAF50'
      this.ctx.fillRect(buttonArea.x, buttonArea.y, buttonArea.width, buttonArea.height)
      
      // Button border
      this.ctx.strokeStyle = '#45a049'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(buttonArea.x, buttonArea.y, buttonArea.width, buttonArea.height)
      
      // Button text
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = `bold ${fontSize - 2}px Arial`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('New Game', buttonArea.x + buttonArea.width / 2, buttonArea.y + buttonArea.height / 2)
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
