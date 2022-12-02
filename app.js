import * as THREE from 'three'
import { LoadingManager, Vector3 } from 'three'
import { Text } from 'troika-three-text'
import WebSocketClient from './websocket'


const config = {
    line_caching: 50,

}

class Scene {
    constructor() {
        // VARIABLES
        this.container = document.getElementById('scene')
        this.width = this.container.offsetWidth
        this.height = this.container.offsetHeight
        this.frustumSize = 40
        this.aspect = this.width / this.height

        this.clock = new THREE.Clock()
        this.time = this.clock.getElapsedTime()

        this.x = 0
        this.y = 0
        this.z = 0
        this.priceGeom = null
        this.priceMesh = null
        this.gridLines = {
            vertical: [],
            horizontal: [],
        }

        // ORTHO CAMERA
        this.camera = new THREE.OrthographicCamera(
            (this.frustumSize * this.aspect) / -2,
            (this.frustumSize * this.aspect) / 2,
            this.frustumSize / 2,
            this.frustumSize / -2,
            0.1,
            100
        )
        this.camera.position.z = 10
        this.camera.lookAt(0, 0, 0)
        // Groups Container
        this.linesContainer = new THREE.Group()
        this.gridContainer = new THREE.Group()
        // SCENE
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x0f0f0f)
        this.scene.add(this.linesContainer)
        this.scene.add(this.gridContainer)
        // Init WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.container,
            antialias: true,
        })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(2)
        this.renderer.sortObjects = true
        // Setup Events
        this.setupEvents()
        // Init WebSocket
        this.ws = new WebSocketClient()
        this.ws.startListen()
        // General material
        this.material = (color, width, opacity = 1) =>
            new THREE.LineBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                linewidth: width,
                transparent: true,
                opacity: opacity,
            })
        // Basic lines coords
        this.xLinePoints = (x, z) => [new Vector3(x, -20, z), new Vector3(x, 20, z)]
        this.yLinePoints = (y, z) => [new Vector3(-38, y, z), new Vector3(38, y, z)]
        // Make a GRID
        this.createChartGrid()
        // Make a price line
        this.priceLine()
        // Init first point
        this.drawLine(2, 'init')
        // Start rendering
        this.render()

        setInterval(()=>this.draw(this.ws.btcPrice), 1000)
    }

    setupEvents() {
        // RESIZE
        window.addEventListener(
            'resize',
            function () {
                this.width = window.innerWidth
                this.height = window.innerHeight
                this.renderer.setSize(this.width, this.height)
                this.camera.updateProjectionMatrix()
            }.bind(this)
        )
        // BTC PRICE CHANGING
    }

    drawLine(y, mode = 'processing') {
        // Make points
        const startPoint = new THREE.Vector3(this.x, this.y, this.z)

        const newPoint = new THREE.Vector3(this.x + 1, y, this.z)

        const pointsInit = [startPoint, startPoint]
        const points = [startPoint, newPoint]
        // Make BufferGeometry from points
        const geometry = new THREE.BufferGeometry().setFromPoints(
            mode === 'init' ? pointsInit : points
        )
        // Make MESH
        const newLine = new THREE.Line(geometry, this.material(0xffffff, 2, 0.66))
        // Add to scene
        this.linesContainer.add(newLine)
        // Give actual data to PriceLine
        this.priceMesh.position.y = y
        this.priceText.position.y = y + 1
        this.priceText.text = this.ws ? this.ws.btcPrice : 'loading...'
        // Changing variable for continues cycle
        this.x += 1
        // and for actual Y-position of next line.
        this.y = y
    }

    priceLine(y = 0) {
        this.priceGroup = new THREE.Group()
        this.dashedMaterial = (
            color = 0x00ff00,
            lWidth = 1,
            scale = 32,
            dashSize = 12,
            gap = 8,
            opacity = 0.66
        ) =>
            new THREE.LineDashedMaterial({
                color: color,
                linewidth: lWidth,
                scale: scale,
                dashSize: dashSize,
                gapSize: gap,
                // side: THREE.DoubleSide,
                transparent: true,
                opacity: opacity,
            })
        this.priceGeom = new THREE.BufferGeometry().setFromPoints(this.yLinePoints(y, 0.11))
        this.priceMesh = new THREE.Line(this.priceGeom, this.dashedMaterial())
        this.priceMesh.computeLineDistances()
        this.priceText = this.createText(
            this.ws ? this.ws.btcPrice : 'loading',
            new THREE.Color('white'),
            0.6,
            1,
            {
                x: 28,
                y: y,
                z: 0.111,
            },
            0.2
        )
        this.priceGroup.add(this.priceMesh, this.priceText)
        this.scene.add(this.priceGroup)
    }

    createChartGrid() {
        // Set VARIABLES
        const GRID_SIZE = 21
        // Move grid to the back.
        const z = -0.001
        // Grid-creation-loop
        const g = new THREE.BufferGeometry()
        for (let i = 0; i < 21; i++) {
            // Make Y and X lines geometry
            let gy = g.clone().setFromPoints(this.yLinePoints(i * 2 - 20, z))
            let gx = g.clone().setFromPoints(this.xLinePoints(i * 4 - 40, z))
            // Creating MESHes
            const newLineHorz = new THREE.Line(gy, this.material(0x00006f, 1, 0.3))
            this.gridLines.horizontal.push(newLineHorz)
            const newLineVert = new THREE.Line(gx, this.material(0xff0000, 1, 0.1))
            this.gridLines.vertical.push(newLineVert)
            // Move all lines to group-container
            this.gridContainer.add(newLineHorz, newLineVert)
            // Create -RULER-
            this.createRuler(16900 + 25 * i, i * 2)
        }
    }

    createRuler(price, y) {
        const c = new THREE.Color('rgb(50, 175, 50)')
        const p = price - 200
        const text = this.createText(p, c, 0.6, 0.45, { x: 36.08, y: y - 17.61, z: 0.1 })
        this.gridContainer.add(text)
    }

    createText(string, color, size = 0.6, opacity = 0.45, pos, ls = 0) {
        const text = new Text()
        text.text = string
        text.fontSize = size
        text.material.transparent = true
        text.material.opacity = opacity
        text.position.x = pos.x
        text.position.y = pos.y
        text.position.z = pos.z
        text.color = color
        text.letterSpacing = ls
        // Update the rendering:
        text.sync()
        return text
    }

    draw(p) {
        let yRand = Math.floor(Math.random() * 4 - 2)

        

        this.drawLine(yRand)
    }

    

    animate() {
        // Make inf movement of the chart-lines to the left
        this.linesContainer.position.x = - this.time
        // Make inf movement of the vertical grid lines to the left
        this.gridLines.vertical.forEach((line) => {
            line.position.x = -this.time % 4
        })
        // Clear and remove invisible lines
        if (this.linesContainer.children.length > config.line_caching) {
            this.linesContainer.children[0].clear()
            this.linesContainer.children[0].removeFromParent()
        }
    }

    render() {
        this.animate()
        this.renderer.render(this.scene, this.camera)
        window.requestAnimationFrame(this.render.bind(this))

        this.time += 1 / 60
    }
}

new Scene()
