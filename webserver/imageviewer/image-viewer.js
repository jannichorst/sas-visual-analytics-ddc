class ImageZoomApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.basePath = './images/'; // Base path for images - can be configured
        this.shadowRoot.innerHTML = `
            <div id="app-container">
                <div id="image-container">
                    <img id="image" style="display: none; object-fit: contain;">
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
                </div>
            </div>
            <link rel="stylesheet" href="styles.css">
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
    }

    setupElements() {
        this.image = this.shadowRoot.querySelector('#image');
        this.imageContainer = this.shadowRoot.querySelector('#image-container');
        this.zoomInButton = this.shadowRoot.querySelector('#zoom-in');
        this.zoomOutButton = this.shadowRoot.querySelector('#zoom-out');
        this.zoomSlider = this.shadowRoot.querySelector('#zoom-slider');
        this.maximizeButton = this.shadowRoot.querySelector('#maximize');
        this.minimizeButton = this.shadowRoot.querySelector('#minimize');
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
        
        this.image.addEventListener('load', () => {
            this.errorMessage.style.display = 'none';
            this.image.style.display = 'block';
            this.toolbar.classList.remove('disabled');
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

        // Add message event listener for VA data
        if (window.addEventListener) {
            window.addEventListener("message", (event) => this.onMessage(event), false);
        } else {
            window.attachEvent("onmessage", (event) => this.onMessage(event));
        }
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
            this.showError("Too many parameters provided", JSON.stringify(vaData));
            return;
        }

        // Extract the image name from the first cell
        const imageName = vaData[0][0];
        if (typeof imageName !== 'string') {
            this.showError("Invalid image name format", JSON.stringify(vaData));
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
        this.isDragging = true;
        this.startX = event.clientX - this.imageX;
        this.startY = event.clientY - this.imageY;
        this.image.classList.remove('smooth');
        event.preventDefault();
    }

    drag(event) {
        if (!this.isDragging) return;
        this.imageX = event.clientX - this.startX;
        this.imageY = event.clientY - this.startY;
        this.updateImageTransform(false);
    }

    endDrag() {
        this.isDragging = false;
        this.image.classList.add('smooth');
    }

    updateZoomSlider() {
        this.zoomSlider.value = this.zoomLevel * 100;
    }

    updateImageTransform(smooth) {
        const transformValue = `translate(-50%, -50%) scale(${this.zoomLevel}) translate(${this.imageX / this.zoomLevel}px, ${this.imageY / this.zoomLevel}px)`;
        if (smooth) {
            this.image.classList.add('smooth');
        } else {
            this.image.classList.remove('smooth');
        }
        this.image.style.transform = transformValue;
    }

    loadImage(imageName) {
        this.image.src = this.basePath + imageName;
        // Reset error messages when trying to load a new image
        this.errorMessage.style.display = 'none';
        this.image.style.display = 'none'; // Hide image until it loads successfully
        this.toolbar.classList.add('disabled'); // Disable toolbar while loading
    }

    setBasePath(path) {
        this.basePath = path.endsWith('/') ? path : path + '/';
        const currentImage = this.image.src.split('/').pop();
        this.loadImage(currentImage);
    }
}

customElements.define('image-zoom-app', ImageZoomApp); 