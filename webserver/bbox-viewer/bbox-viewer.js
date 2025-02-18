class ImageZoomApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.basePath = 'images/'; // Fixed path without leading ./
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                #app-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                #image-container {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    background-color: #f8f8f8;
                }
                #image {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform-origin: center;
                    max-width: 100%;
                    max-height: 100%;
                }
                #overlay {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform-origin: center;
                    pointer-events: auto;
                }
                #image.smooth, #overlay.smooth {
                    transition: transform 0.2s ease-out;
                }
                #error-message {
                    display: none;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                }
                #toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                    gap: 10px;
                    background: rgba(255, 255, 255, 0.9);
                    border-top: 1px solid #ddd;
                }
                #toolbar.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }
                .view-control {
                    cursor: pointer;
                    padding: 5px;
                }
                .view-control img {
                    width: 24px;
                    height: 24px;
                }
                #zoom-slider {
                    width: 150px;
                }
            </style>
            <div id="app-container">
                <div id="image-container">
                    <img id="image" style="display: none; object-fit: contain;">
                    <canvas id="overlay"></canvas>
                    <div id="error-message">
                        <h3>Failed to load image</h3>
                        <p id="error-path"></p>
                        <p id="error-details"></p>
                    </div>
                </div>
                <div id="toolbar">
                    <div class="view-control"><img id="zoom-out" src="icons/remove-outline.svg" alt="Zoom Out"></div>
                    <input type="range" id="zoom-slider" min="20" max="300" value="100">
                    <div class="view-control"><img id="zoom-in" src="icons/add-outline.svg" alt="Zoom In"></div>
                    <div class="view-control"><img id="maximize" src="icons/expand-outline.svg" alt="Maximize"></div>
                    <div class="view-control"><img id="minimize" src="icons/scan-outline.svg" alt="Minimize"></div>
                    <div class="view-control"><img id="toggle-mode" src="icons/prism-outline.svg" alt="Toggle Mode"></div>
                </div>
            </div>
        `;

        this.initializeProperties();
        this.setupElements();
        this.setupEventListeners();
        this.loadImage('img.jpg'); // Attempt to load initial image
    }

    initializeProperties() {
        this.zoomLevel = 1;
        this.imageX = 0;
        this.imageY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.isPointerMode = true;
        this.spaceKeyHeld = false;
        // Sample bounding boxes for development
        this.rectangles = [
            { x: 50, y: 50, width: 100, height: 100, hovered: false },
            { x: 200, y: 200, width: 150, height: 150, hovered: false }
        ];
    }

    setupElements() {
        this.image = this.shadowRoot.querySelector('#image');
        this.canvas = this.shadowRoot.querySelector('#overlay');
        this.imageContainer = this.shadowRoot.querySelector('#image-container');
        this.zoomInButton = this.shadowRoot.querySelector('#zoom-in');
        this.zoomOutButton = this.shadowRoot.querySelector('#zoom-out');
        this.zoomSlider = this.shadowRoot.querySelector('#zoom-slider');
        this.maximizeButton = this.shadowRoot.querySelector('#maximize');
        this.minimizeButton = this.shadowRoot.querySelector('#minimize');
        this.toggleModeButton = this.shadowRoot.querySelector('#toggle-mode');
        this.errorMessage = this.shadowRoot.querySelector('#error-message');
        this.errorPath = this.shadowRoot.querySelector('#error-path');
        this.toolbar = this.shadowRoot.querySelector('#toolbar');
    }

    setupEventListeners() {
        this.zoomInButton.addEventListener('click', () => this.zoomIn());
        this.zoomOutButton.addEventListener('click', () => this.zoomOut());
        this.zoomSlider.addEventListener('input', () => this.sliderZoom());
        this.maximizeButton.addEventListener('click', () => this.maximize());
        this.minimizeButton.addEventListener('click', () => this.minimize());
        this.toggleModeButton.addEventListener('click', () => this.toggleMode());
        
        this.image.addEventListener('load', () => {
            this.errorMessage.style.display = 'none';
            this.image.style.display = 'block';
            this.toolbar.classList.remove('disabled');
            this.updateCanvasSize();
            this.updateImageTransform(true);
        });
        
        this.image.addEventListener('error', (e) => {
            this.errorMessage.style.display = 'block';
            this.image.style.display = 'none';
            this.toolbar.classList.add('disabled');
            this.errorPath.textContent = `Path: ${e.target.src}`;
        });

        this.imageContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        this.imageContainer.addEventListener('mousemove', (e) => this.drag(e));
        this.imageContainer.addEventListener('mouseup', () => this.endDrag());
        this.imageContainer.addEventListener('mouseleave', () => this.endDrag());
        this.imageContainer.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Add message event listener for VA data
        if (window.addEventListener) {
            window.addEventListener("message", (event) => this.onMessage(event), false);
        } else {
            window.attachEvent("onmessage", (event) => this.onMessage(event));
        }
    }

    handleKeyDown(event) {
        if (event.key === ' ') {
            if (!this.spaceKeyHeld) {
                this.spaceKeyHeld = true;
                if (this.isPointerMode) {
                    this.toggleMode();
                }
            }
            event.preventDefault();
        }
    }

    handleKeyUp(event) {
        if (event.key === ' ') {
            if (this.spaceKeyHeld) {
                this.spaceKeyHeld = false;
                if (!this.isPointerMode) {
                    this.toggleMode();
                }
            }
            event.preventDefault();
        }
    }

    toggleMode() {
        this.isPointerMode = !this.isPointerMode;
        this.updateModeIndicator();
    }

    updateModeIndicator() {
        if (this.isPointerMode) {
            this.toggleModeButton.src = 'icons/prism-outline.svg';
            this.canvas.style.pointerEvents = 'auto';
        } else {
            this.toggleModeButton.src = 'icons/pricetag-outline.svg';
            this.canvas.style.pointerEvents = 'none';
        }
    }

    handleCanvasHover(event) {
        if (!this.isPointerMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.zoomLevel;
        const y = (event.clientY - rect.top) / this.zoomLevel;

        let hoveredAny = false;
        this.rectangles.forEach(rect => {
            if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                rect.hovered = true;
                hoveredAny = true;
            } else {
                rect.hovered = false;
            }
        });

        this.drawRectangles();
    }

    updateCanvasSize() {
        this.canvas.width = this.image.clientWidth;
        this.canvas.height = this.image.clientHeight;
        this.drawRectangles();
    }

    drawRectangles() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.rectangles.forEach(rect => {
            ctx.fillStyle = rect.hovered ? 'rgba(0, 0, 255, 0.5)' : 'rgba(0, 0, 0, 0)';
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        });
    }

    onMessage(event) {
        if (!event || !event.data) return;
        
        const vaData = event.data.data;
        
        if (!vaData || !Array.isArray(vaData) || vaData.length === 0) {
            this.showError("Invalid data format received");
            return;
        }

        // Check if we have more than one row or column
        if (vaData.length > 1 || (vaData[0] && vaData[0].length > 1)) {
            this.showError("Please select a single image to view", "Multiple values were provided: " + JSON.stringify(vaData));
            return;
        }

        // Extract the image name from the first cell
        const imageName = vaData[0][0];
        if (typeof imageName !== 'string') {
            this.showError("Please provide a valid image name", JSON.stringify(vaData));
            return;
        }

        this.loadImage(imageName);
    }

    showError(message, details = '') {
        this.errorMessage.style.display = 'block';
        this.image.style.display = 'none';
        this.toolbar.classList.add('disabled');
        this.errorPath.textContent = message;
        const errorDetails = this.shadowRoot.querySelector('#error-details');
        errorDetails.textContent = details ? `Raw data: ${details}` : '';
    }

    handleWheel(event) {
        if (this.toolbar.classList.contains('disabled')) return;
        event.preventDefault();
        if (event.deltaY < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }

    zoomIn() {
        if (this.toolbar.classList.contains('disabled')) return;
        this.zoomLevel = Math.min(3, this.zoomLevel + 0.15);
        this.updateZoomSlider();
        this.updateImageTransform(true);
    }

    zoomOut() {
        if (this.toolbar.classList.contains('disabled')) return;
        this.zoomLevel = Math.max(0.2, this.zoomLevel - 0.15);
        this.updateZoomSlider();
        this.updateImageTransform(true);
    }

    sliderZoom() {
        if (this.toolbar.classList.contains('disabled')) return;
        this.zoomLevel = this.zoomSlider.value / 100;
        this.updateImageTransform(false);
    }

    maximize() {
        if (this.toolbar.classList.contains('disabled')) return;
        const containerWidth = this.imageContainer.clientWidth;
        const containerHeight = this.imageContainer.clientHeight;
        const rect = this.image.getBoundingClientRect();
        const imageWidth = rect.width / this.zoomLevel;
        const imageHeight = rect.height / this.zoomLevel;

        if (imageWidth === 0 || imageHeight === 0) return; // Image not loaded yet

        const widthScale = containerWidth / imageWidth;
        const heightScale = containerHeight / imageHeight;

        // Use the larger scale to ensure the image fills the container
        this.zoomLevel = Math.max(widthScale, heightScale);
        this.imageX = 0;
        this.imageY = 0;
        this.updateZoomSlider();
        this.updateImageTransform(true);
    }

    minimize() {
        this.zoomLevel = 1;
        this.imageX = 0;
        this.imageY = 0;
        this.updateZoomSlider();
        this.updateImageTransform(true);
    }

    startDrag(event) {
        if (this.isPointerMode) return;
        
        this.isDragging = true;
        this.startX = event.clientX - this.imageX;
        this.startY = event.clientY - this.imageY;
        this.image.classList.remove('smooth');
        this.canvas.classList.remove('smooth');
        event.preventDefault();
    }

    drag(event) {
        if (this.isPointerMode || !this.isDragging) return;
        
        this.imageX = event.clientX - this.startX;
        this.imageY = event.clientY - this.startY;
        this.updateImageTransform(false);
    }

    endDrag() {
        if (this.isPointerMode) return;
        
        this.isDragging = false;
        this.image.classList.add('smooth');
        this.canvas.classList.add('smooth');
    }

    updateZoomSlider() {
        this.zoomSlider.value = this.zoomLevel * 100;
    }

    updateImageTransform(smooth) {
        const transformValue = `translate(-50%, -50%) scale(${this.zoomLevel}) translate(${this.imageX / this.zoomLevel}px, ${this.imageY / this.zoomLevel}px)`;
        if (smooth) {
            this.image.classList.add('smooth');
            this.canvas.classList.add('smooth');
        } else {
            this.image.classList.remove('smooth');
            this.canvas.classList.remove('smooth');
        }
        this.image.style.transform = transformValue;
        this.canvas.style.transform = transformValue;
        
        // Match the canvas size to the image size
        this.canvas.style.width = `${this.image.clientWidth}px`;
        this.canvas.style.height = `${this.image.clientHeight}px`;
        this.drawRectangles();
    }

    loadImage(imageName) {
        const imagePath = this.basePath + imageName;
        console.log('Attempting to load image:', imagePath);
        this.image.src = imagePath;
        // Reset error messages when trying to load a new image
        this.errorMessage.style.display = 'none';
        this.image.style.display = 'none'; // Hide image until it loads successfully
        this.toolbar.classList.add('disabled'); // Disable toolbar while loading

        // Add error event listener for more detailed error information
        this.image.onerror = (e) => {
            console.error('Failed to load image:', e);
            this.errorMessage.style.display = 'block';
            this.image.style.display = 'none';
            this.toolbar.classList.add('disabled');
            this.errorPath.textContent = `Failed to load: ${imagePath}`;
        };
    }

    setBasePath(path) {
        this.basePath = path.endsWith('/') ? path : path + '/';
        const currentImage = this.image.src.split('/').pop();
        this.loadImage(currentImage);
    }
}

customElements.define('image-zoom-app', ImageZoomApp); 