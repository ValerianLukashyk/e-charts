




class WebSocketClient {
    constructor() {
        this.url = 'wss://stream.binance.com:9443'
        this.streams = 'btcusdt@trade'
        this.socket = new WebSocket(`${this.url}/stream?streams=${this.streams}`)
    
        this.btcPrice = '120000'
    }

    startListen() {
        this.bindEvents()
    }
    bindEvents() {
        this.socket.addEventListener('message', this.onMessage.bind(this))
        this.socket.addEventListener('error', this.errorHandler.bind(this))
    }
    errorHandler(event) {
        console.error(event)
    }
    setPrice(price) {
        this.btcPrice = price
    }
    getPrice() {
        return this.btcPrice
    }
    async onMessage(data) {
        const unparsed = await JSON.parse(data.data)
        const d = unparsed.data
        const price = Number(d.p).toFixed(2)
        this.setPrice(price)
    }
}

export default WebSocketClient